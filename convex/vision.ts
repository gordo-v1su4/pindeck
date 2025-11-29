import { httpAction, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

const VL_MODEL_API = "https://openrouter.ai/api/v1/chat/completions";

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
              { type: "text", text: "Describe this image concisely. Also, extract a maximum of 5 dominant colors from the image and return them as a JSON array of hex color codes, like [\"#RRGGBB\", ...]. Combine description and colors into a single JSON object with keys 'description' and 'colors'." },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    if (!modelResponse.ok) {
      const errorBody = await modelResponse.text();
      console.error(`VL model API request failed: ${modelResponse.status} - ${errorBody}`);
      return;
    }

    const responseData = await modelResponse.json();
    const messageContent = responseData.choices[0]?.message?.content;

    let description: string = "No description generated.";
    let colors: string[] = [];

    try {
      const parsedContent = JSON.parse(messageContent);
      description = parsedContent.description || description;
      colors = parsedContent.colors || colors;
    } catch (jsonError) {
      console.warn("VL model response was not pure JSON, using raw content as description.");
      description = messageContent;
    }

    // 3. Update the image document in the database
    await ctx.runMutation(internal.images.internalUpdateAnalysis, {
      imageId: args.imageId,
      description,
      colors,
    });

    // TODO: Implement Nano Banana image generation.
    // The `generate_image` tool cannot be called directly from Convex backend.
    // This would require either:
    // 1. Client-side generation: Client uploads original, gets description, calls generate_image, then uploads new images.
    // 2. A separate serverless function/httpAction: A service that receives the description, calls generate_image, and uploads to Convex.
    // For now, this part of the request (generating 2 additional images) will not be implemented in the backend.
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