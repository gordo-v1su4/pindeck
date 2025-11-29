import { httpAction, internalAction, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { GoogleGenerativeAI, Part } from "@google/generative-ai";
import { getAuthUserId } from "@convex-dev/auth/server";

const VL_MODEL_API = "https://openrouter.ai/api/v1/chat/completions";

export const internalGenerateRelatedImages = internalAction({
  args: {
    originalImageId: v.id("images"),
    storageId: v.id("_storage"),
    description: v.string(),
    category: v.string(),
    style: v.optional(v.string()),
    title: v.optional(v.string()),
    aspectRatio: v.optional(v.string()),
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

    // Get image URL from storage
    const imageUrl = await ctx.storage.getUrl(args.storageId);
    if (!imageUrl) {
      console.error("Failed to get image URL from storage");
      await ctx.runMutation(internal.images.internalSetAiStatus, { 
        imageId: args.originalImageId, 
        status: "failed" 
      });
      return;
    }

    // Fetch image and convert to base64
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      console.error(`Failed to fetch image: ${imageResponse.statusText}`);
      await ctx.runMutation(internal.images.internalSetAiStatus, { 
        imageId: args.originalImageId, 
        status: "failed" 
      });
      return;
    }

    // Check content length to avoid memory issues
    const contentLength = imageResponse.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) { // 10MB limit
      console.error(`Image too large: ${contentLength} bytes. Skipping generation.`);
      await ctx.runMutation(internal.images.internalSetAiStatus, { 
        imageId: args.originalImageId, 
        status: "failed" 
      });
      return;
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    
    // Check actual buffer size
    if (imageBuffer.byteLength > 10 * 1024 * 1024) {
      console.error(`Image buffer too large: ${imageBuffer.byteLength} bytes. Skipping generation.`);
      await ctx.runMutation(internal.images.internalSetAiStatus, { 
        imageId: args.originalImageId, 
        status: "failed" 
      });
      return;
    }

    // More memory-efficient base64 conversion
    const bytes = new Uint8Array(imageBuffer);
    const chunkSize = 0x8000; // 32KB chunks
    let binaryParts: string[] = [];
    
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binaryParts.push(String.fromCharCode.apply(null, Array.from(chunk)));
    }
    
    const base64Image = btoa(binaryParts.join(''));
    const mimeType = imageResponse.headers.get("content-type") || "image/jpeg";

    const ai = new GoogleGenerativeAI(apiKey);
    const model = ai.getGenerativeModel({ 
      model: "gemini-3-pro-image-preview",
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
        imageConfig: {
          aspectRatio: args.aspectRatio || "16:9",
          imageSize: "2K"
        }
      } as any
    });

    // Generate 2 images
    // We run two requests in parallel to ensure we get 2 distinct images
    const prompt = `
<instruction>
Analyze the entire composition of the input image. Identify ALL key subjects present (whether it's a single person, a group/couple, a vehicle, or a specific object) and their spatial relationship/interaction.
Create 1 cinematic image of these subjects in the same environment, either from the same moment OR later in the scene (up to 5 minutes later), choosing from one of the following shot types. You must adapt the standard cinematic shot types to fit the content (e.g., if a group, keep the group together; if an object, frame the whole object):

**Establishing Context Options:**
1. **Extreme Long Shot (ELS):** The subject(s) are seen small within the vast environment.
2. **Long Shot (LS):** The complete subject(s) or group is visible from top to bottom (head to toe / wheels to roof).
3. **Medium Long Shot (American/3-4):** Framed from knees up (for people) or a 3/4 view (for objects).

**Core Coverage Options:**
4. **Medium Shot (MS):** Framed from the waist up (or the central core of the object). Focus on interaction/action.
5. **Medium Close-Up (MCU):** Framed from chest up. Intimate framing of the main subject(s).
6. **Close-Up (CU):** Tight framing on the face(s) or the "front" of the object.

**Details & Angles Options:**
7. **Extreme Close-Up (ECU):** Macro detail focusing intensely on a key feature (eyes, hands, logo, texture).
8. **Low Angle Shot (Worm's Eye):** Looking up at the subject(s) from the ground (imposing/heroic).
9. **High Angle Shot (Bird's Eye):** Looking down on the subject(s) from above.

**CRITICAL - RANDOM SELECTION REQUIREMENT:** You MUST randomly select ONE of the 9 shot types below. Do NOT choose based on what seems "most appropriate" - use RANDOM selection to ensure maximum variety. Each generation should pick a DIFFERENT random shot type.

**RANDOM SELECTION INSTRUCTIONS:**
- Generate a random number between 1-9 and select that corresponding shot type
- If the original is wide, you might randomly get a close-up (and vice versa) - this is INTENTIONAL for variety
- If the original is eye-level, you might randomly get a low or high angle - this creates visual interest
- The randomness ensures each generated image is UNIQUE and DIFFERENT from the original and from other variations

**SHOT TYPE SELECTION (Choose RANDOMLY from 1-9):**
Choose a shot type that provides MAXIMUM VISUAL CONTRAST and variety. The randomness is more important than matching the original framing. If depicting a later moment, show natural progression of the scene (slight position changes, continued actions, etc.). Ensure the same people/objects, same clothes, and same lighting as the original. The depth of field should be realistic for the chosen shot type (bokeh for close-ups, deeper focus for wide shots).
</instruction>

A professional cinematic image featuring the specific subjects/scene from the input image, either from the same moment or progressed 5 minutes later in the scene.
The image showcases the subjects in one carefully chosen focal length and framing style that provides visual variety and cinematic interest.
The frame features photorealistic textures, consistent cinematic color grading, and correct framing for the specific number of subjects or objects.
`;
    
    // Log the prompt being sent for debugging
    console.log("Prompt being sent to Gemini:", prompt);
    console.log("Image data length:", base64Image.length, "MIME type:", mimeType);
    
    // Generate random shot type numbers for each image (1-9) to force maximum variety
    const availableShotTypes = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const shuffledShotTypes = [...availableShotTypes].sort(() => Math.random() - 0.5);
    
    const generatePromises = [1, 2].map(async (index) => {
      try {
        // Assign a specific random shot type number to each image
        const assignedShotType = shuffledShotTypes[index % shuffledShotTypes.length];
        const shotTypeNames = {
          1: "Extreme Long Shot (ELS)",
          2: "Long Shot (LS)",
          3: "Medium Long Shot (American/3-4)",
          4: "Medium Shot (MS)",
          5: "Medium Close-Up (MCU)",
          6: "Close-Up (CU)",
          7: "Extreme Close-Up (ECU)",
          8: "Low Angle Shot (Worm's Eye)",
          9: "High Angle Shot (Bird's Eye)"
        };
        
        const variedPrompt = `${prompt}\n\n**MANDATORY SHOT TYPE ASSIGNMENT FOR THIS IMAGE:**\nYou MUST use shot type #${assignedShotType} - ${shotTypeNames[assignedShotType as keyof typeof shotTypeNames]}. This is a RANDOM assignment to ensure variety. Do NOT deviate from this shot type. Create the image using EXACTLY this framing and perspective. Ensure this image is VISUALLY DISTINCT and DIFFERENT from any other variations being generated simultaneously.`;
        
        const response = await model.generateContent([
          variedPrompt,
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType
            }
          }
        ]);

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
    const baseTitle = args.title ? `${args.title} - Var` : "Variation";

    for (let i = 0; i < validResults.length; i++) {
      const base64Data = validResults[i];
      // 1. Get upload URL
      const uploadUrl = await ctx.runMutation(internal.images.internalGenerateUploadUrl);

      // 2. Convert base64 to Blob
      // Convex runtime supports standard Web API Blob
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let j = 0; j < binaryString.length; j++) {
        bytes[j] = binaryString.charCodeAt(j);
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
        title: `${baseTitle} ${i + 1}`,
        description: `Cinematic sequel to: ${args.description.substring(0, 50)}...`,
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

    // 2. Call the Google Generative AI (Gemini)
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      console.error("GOOGLE_API_KEY environment variable not set");
      await ctx.runMutation(internal.images.internalSetAiStatus, { 
        imageId: args.imageId, 
        status: "failed" 
      });
      return;
    }

    const categories = [
      "Abstract", "Architecture", "Art", "Black & White", "Character Design", 
      "Cinematic", "Cyberpunk", "Design", "Fashion", "Film", 
      "Food", "Gaming", "Illustration", "Interior", "Landscape", 
      "Minimalist", "Nature", "Photography", "Portrait", "Sci-Fi", 
      "Street", "Technology", "Texture", "Travel", "UI/UX", "Vintage"
    ];

    try {
      // Fetch image data to convert to base64
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
      
      // Check content length to avoid memory issues (limit to 10MB to stay under 64MB memory limit)
      const contentLength = imageResponse.headers.get("content-length");
      if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) { // 10MB limit
        console.error(`Image too large: ${contentLength} bytes. Skipping analysis.`);
        await ctx.runMutation(internal.images.internalSetAiStatus, { 
          imageId: args.imageId, 
          status: "failed" 
        });
        return;
      }
      
      const imageBuffer = await imageResponse.arrayBuffer();
      
      // Check actual buffer size as well
      if (imageBuffer.byteLength > 10 * 1024 * 1024) {
        console.error(`Image buffer too large: ${imageBuffer.byteLength} bytes. Skipping analysis.`);
        await ctx.runMutation(internal.images.internalSetAiStatus, { 
          imageId: args.imageId, 
          status: "failed" 
        });
        return;
      }
      
      // More memory-efficient base64 conversion
      // Use Uint8Array directly with a more efficient conversion method
      const bytes = new Uint8Array(imageBuffer);
      // Convert in chunks to avoid creating huge intermediate strings
      const chunkSize = 0x8000; // 32KB chunks
      let binaryParts: string[] = [];
      
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        binaryParts.push(String.fromCharCode.apply(null, Array.from(chunk)));
      }
      
      const base64Image = btoa(binaryParts.join(''));
      
      const mimeType = imageResponse.headers.get("content-type") || "image/jpeg";

      const ai = new GoogleGenerativeAI(apiKey);
      const model = ai.getGenerativeModel({ model: "gemini-3-pro-image-preview" });

      const prompt = `Analyze this image. 1. Generate a short, catchy title. 2. Write a concise description. 3. Generate 5-10 specific descriptive tags (focus on objects, lighting, mood, composition, specific elements; do NOT use broad categories). 4. Extract 5 distinct and vibrant dominant colors (hex codes). 5. Identify the visual style/medium (e.g., '35mm Film', 'VHS', 'CGI', 'Oil Painting'). 6. Select the single most appropriate category from this list: ${categories.join(", ")}. Return ONLY a strict valid JSON object with keys: "title", "description", "tags" (array of strings), "colors" (array of hex strings), "category" (string), "visual_style" (string). Ensure all keys and string values use double quotes.`;

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: base64Image,
            mimeType: mimeType
          }
        }
      ]);

      const messageContent = result.response.text();
      console.log("Gemini Analysis Result:", messageContent);

      let title: string | undefined;
      let description: string = "No description generated.";
      let tags: string[] = [];
      let colors: string[] = [];
      let category: string | undefined;
      let visual_style: string | undefined;

      try {
        // Remove markdown code blocks if present
        const cleanContent = messageContent.replace(/```(?:json)?\s*/g, "").replace(/```/g, "").trim();
        
        let parsedContent;
        try {
          parsedContent = JSON.parse(cleanContent);
        } catch (e) {
          // Fallback: Try to parse as JS object (handles single quotes)
          // This is safe here as input comes from our own AI call
          parsedContent = new Function("return " + cleanContent)();
        }

        title = parsedContent.title;
        description = typeof parsedContent.description === 'string' ? parsedContent.description : JSON.stringify(parsedContent.description);
        if (description.startsWith('```json')) {
          description = description.replace(/```json\n?|```/g, '').trim();
        } else if (description.startsWith('{') && description.endsWith('}')) {
          try {
            const tempDesc = JSON.parse(description);
            if (typeof tempDesc.description === 'string') {
              description = tempDesc.description;
            }
          } catch (e) {
            // ignore
          }
        }
        tags = parsedContent.tags || tags;
        colors = parsedContent.colors || colors;
        category = parsedContent.category;
        visual_style = parsedContent.visual_style;
      } catch (jsonError) {
        console.warn("Gemini response parsing failed, using raw content as description.", jsonError);
        description = messageContent;
      }

      // 3. Update the image document in the database
      await ctx.runMutation(internal.images.internalUpdateAnalysis, {
        imageId: args.imageId,
        title,
        description,
        tags,
        colors,
        category,
      });

      // 4. Generate related images
      await ctx.scheduler.runAfter(0, internal.vision.internalGenerateRelatedImages, {
        originalImageId: args.imageId,
        storageId: args.storageId,
        description,
        category: category || args.category,
        style: visual_style,
        title, 
      });

    } catch (err) {
      console.error("Smart analysis failed:", err);
      await ctx.runMutation(internal.images.internalSetAiStatus, { 
        imageId: args.imageId, 
        status: "failed" 
      });
    }
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

export const rerunSmartAnalysis = mutation({
  args: {
    imageId: v.id("images"),
    storageId: v.id("_storage"),
    title: v.string(),
    description: v.optional(v.string()),
    tags: v.array(v.string()),
    category: v.string(),
    source: v.optional(v.string()),
    sref: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    const image = await ctx.db.get(args.imageId);
    if (!image || image.uploadedBy !== userId) {
      throw new Error("Not authorized or image not found");
    }

    // Set status back to processing
    await ctx.runMutation(internal.images.internalSetAiStatus, {
      imageId: args.imageId,
      status: "processing",
    });

    // Schedule the analysis again
    await ctx.scheduler.runAfter(0, internal.vision.internalSmartAnalyzeImage, {
      storageId: args.storageId,
      imageId: args.imageId,
      userId: userId,
      title: args.title,
      description: args.description,
      tags: args.tags,
      category: args.category,
      source: args.source,
      sref: args.sref,
    });

    return { success: true };
  },
});