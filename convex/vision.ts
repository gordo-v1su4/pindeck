import { httpAction, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { GoogleGenerativeAI, Part } from "@google/generative-ai";

const VL_MODEL_API = "https://openrouter.ai/api/v1/chat/completions";

export const internalGenerateRelatedImages = internalAction({
  args: {
    originalImageId: v.id("images"),
    description: v.string(),
    category: v.string(),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      console.error("GOOGLE_API_KEY not set, skipping image generation");
      await ctx.runMutation(internal.images.internalSetAiStatus, { 
        imageId: args.originalImageId, 
        status: "failed" 
      });
      return;
    }

    const ai = new GoogleGenerativeAI(apiKey);
    const model = ai.getGenerativeModel({ model: "gemini-3-pro-image-preview" });

    // Generate 2 images
    // We run two requests in parallel to ensure we get 2 distinct images
    const prompt = `Create a photorealistic image that looks like the next scene in a movie sequence, following this scene: ${args.description}. Maintain the same visual style, lighting, and cinematic quality. Aspect ratio 16:9.`;
    
    const generatePromises = [1, 2].map(async () => {
      try {
        const response = await model.generateContent(prompt);

        // Extract image data
        const part = response.response.candidates?.[0]?.content?.parts?.find((p: Part) => p.inlineData);
        if (!part || !part.inlineData || !part.inlineData.data) {
          console.error("No image data in response");
          return null;
        }

        return part.inlineData.data; // Base64 string
      } catch (err) {
        console.error("Error generating image:", err);
        return null;
      }
    });

    const results = await Promise.all(generatePromises);
    const validResults = results.filter((r: string | null) => r !== null) as string[];

    if (validResults.length === 0) {
      console.error("No valid images generated");
      await ctx.runMutation(internal.images.internalSetAiStatus, { 
        imageId: args.originalImageId, 
        status: "failed" 
      });
      return;
    }

    const generatedImages = [];

    for (const base64Data of validResults) {
      // 1. Get upload URL
      const uploadUrl = await ctx.runMutation(internal.images.internalGenerateUploadUrl);

      // 2. Convert base64 to Blob
      // Convex runtime supports standard Web API Blob
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: "image/png" });

      // 3. Upload to storage
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": "image/png" },
        body: blob,
      });

      if (!uploadResponse.ok) {
        console.error("Failed to upload generated image");
        continue;
      }

      const { storageId } = await uploadResponse.json();

      // 4. Get URL (optional, but we store storageId)
      const imageUrl = await ctx.storage.getUrl(storageId);
      if (!imageUrl) continue;

      generatedImages.push({
        url: imageUrl,
        title: "Generated Variation",
        description: `Variation based on: ${args.description}`,
      });
    }

    if (generatedImages.length > 0) {
      await ctx.runMutation(internal.images.internalSaveGeneratedImages, {
        originalImageId: args.originalImageId,
        images: generatedImages,
      });
    }
  },
});

export const internalSmartAnalyzeImage = internalAction({
  args: {
    storageId: v.id("_storage"),
    imageId: v.id("images"),
    userId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    tags: v.array(v.string()),
    category: v.string(),
    source: v.optional(v.string()),
    sref: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 1. Get image URL from storageId
    const imageUrl = await ctx.storage.getUrl(args.storageId);
    if (!imageUrl) {
      console.error("Image not found in storage");
      return;
    }

    // 2. Call the external VL model API
    const openRouterKey = process.env.OPEN_ROUTER_KEY;
    if (!openRouterKey) {
      console.error("OPEN_ROUTER_KEY environment variable not set");
      await ctx.runMutation(internal.images.internalSetAiStatus, { 
        imageId: args.imageId, 
        status: "failed" 
      });
      return;
    }

    const modelResponse = await fetch(VL_MODEL_API, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openRouterKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "xai/grok-1",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze this image. 1. Generate a short, catchy title. 2. Write a concise description. 3. Generate 5-10 relevant tags. 4. Extract 5 dominant colors (hex codes). Return ONLY a JSON object with keys: 'title', 'description', 'tags' (array of strings), 'colors' (array of hex strings)." },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!modelResponse.ok) {
      const errorBody = await modelResponse.text();
      console.error(`VL model API request failed: ${modelResponse.status} - ${errorBody}`);
      await ctx.runMutation(internal.images.internalSetAiStatus, { 
        imageId: args.imageId, 
        status: "failed" 
      });
      return;
    }

    const responseData = await modelResponse.json();
    const messageContent = responseData.choices[0]?.message?.content;

    let title: string | undefined;
    let description: string = "No description generated.";
    let tags: string[] = [];
    let colors: string[] = [];

    try {
      // Remove markdown code blocks if present
      const cleanContent = messageContent.replace(/```json\n?|\n?```/g, "").trim();
      const parsedContent = JSON.parse(cleanContent);
      title = parsedContent.title;
      description = parsedContent.description || description;
      tags = parsedContent.tags || tags;
      colors = parsedContent.colors || colors;
    } catch (jsonError) {
      console.warn("VL model response was not pure JSON, using raw content as description.", jsonError);
      description = messageContent;
    }

    // 3. Update the image document in the database
    // We only update title/tags if the original was generic or empty (though we can't easily check that here without reading the doc again)
    // For now, we'll just update them. The user can edit later.
    await ctx.runMutation(internal.images.internalUpdateAnalysis, {
      imageId: args.imageId,
      title,
      description,
      tags,
      colors,
    });

    // 4. Generate related images
    await ctx.scheduler.runAfter(0, internal.vision.internalGenerateRelatedImages, {
      originalImageId: args.imageId,
      description,
      category: args.category,
    });
  },
});

export const smartAnalyzeImage = httpAction(async (ctx, request) => {
  try {
    const { storageId, imageId, userId, title, description, tags, category, source, sref } = await request.json();

    if (!storageId || !imageId || !userId) {
      return new Response(JSON.stringify({ error: "storageId, imageId, and userId are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Schedule the internal action to run
    await ctx.scheduler.runAfter(0, internal.vision.internalSmartAnalyzeImage, {
        storageId,
        imageId,
        userId,
        title,
        description,
        tags,
        category,
        source,
        sref
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in smartAnalyzeImage:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});