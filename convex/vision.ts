import { httpAction, internalAction, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { fal } from "@fal-ai/client";
import OpenAI from "openai";
import { getAuthUserId } from "@convex-dev/auth/server";

export const internalGenerateRelatedImages = internalAction({
  args: {
    originalImageId: v.id("images"),
    storageId: v.id("_storage"),
    description: v.string(),
    category: v.string(),
    style: v.optional(v.string()),
    title: v.optional(v.string()),
    aspectRatio: v.optional(v.string()),
    variationCount: v.optional(v.number()),
    variationType: v.optional(v.string()),
    variationDetail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const falKey = process.env.FAL_KEY;
    if (!falKey) {
      console.error("FAL_KEY not set, skipping image generation");
      await ctx.runMutation(internal.images.internalSetAiStatus, { 
        imageId: args.originalImageId, 
        status: "failed" 
      });
      return;
    }

    // Configure fal.ai client
    fal.config({
      credentials: falKey
    });

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

    const requestedCount = args.variationCount ?? 2;
    if (requestedCount <= 0) {
      await ctx.runMutation(internal.images.internalSetAiStatus, { 
        imageId: args.originalImageId, 
        status: "completed" 
      });
      return;
    }

    const trimmedVariationDetail = args.variationDetail?.trim();
    const useCustomShotType = args.variationType === "shot_type" && trimmedVariationDetail;
    const styleDirection = args.variationType === "style" && trimmedVariationDetail
      ? `\n\nAdditional style direction: ${trimmedVariationDetail}.`
      : "";

    // Generate random shot type numbers for each image (1-9) to force maximum variety
    const availableShotTypes = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const shuffledShotTypes = [...availableShotTypes].sort(() => Math.random() - 0.5);
    
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

    // Generate requested images with different random shot types
    const generatePromises = Array.from({ length: requestedCount }, (_, index) => index + 1).map(async (index) => {
      try {
        const assignedShotType = shuffledShotTypes[index % shuffledShotTypes.length];
        const shotTypeName = shotTypeNames[assignedShotType as keyof typeof shotTypeNames];
        const shotTypeInstruction = useCustomShotType
          ? `**MANDATORY SHOT TYPE ASSIGNMENT:** You MUST use the following shot type: ${trimmedVariationDetail}. Create the image using EXACTLY this framing and perspective. Ensure this image is VISUALLY DISTINCT and DIFFERENT from any other variations.`
          : `**MANDATORY SHOT TYPE ASSIGNMENT:** You MUST use shot type #${assignedShotType} - ${shotTypeName}. This is a RANDOM assignment to ensure variety. Create the image using EXACTLY this framing and perspective. Ensure this image is VISUALLY DISTINCT and DIFFERENT from any other variations.`;
        
        // Create prompt with specific shot type assignment
        const prompt = `Create a cinematic image variation of the input image. Analyze the entire composition and identify ALL key subjects present (whether it's a single person, a group/couple, a vehicle, or a specific object) and their spatial relationship/interaction.

${shotTypeInstruction}

The image should feature the same subjects in the same environment, either from the same moment OR later in the scene (up to 5 minutes later). Ensure the same people/objects, same clothes, and same lighting as the original. The depth of field should be realistic for the chosen shot type (bokeh for close-ups, deeper focus for wide shots).

The frame features photorealistic textures, consistent cinematic color grading, and correct framing for the specific number of subjects or objects.${styleDirection}`;

        // Map aspect ratio - fal.ai accepts specific enum values
        const aspectRatioMap: Record<string, "16:9" | "9:16" | "1:1" | "4:3" | "3:4" | "auto"> = {
          "16:9": "16:9",
          "9:16": "9:16",
          "1:1": "1:1",
          "4:3": "4:3",
          "3:4": "3:4",
        };
        const aspectRatio = aspectRatioMap[args.aspectRatio || "16:9"] || "16:9";

        const logShotType = useCustomShotType ? trimmedVariationDetail : `${assignedShotType} (${shotTypeName})`;
        console.log(`Generating image ${index} with shot type ${logShotType}`);

        // Call fal.ai Nano Banana Pro
        const result = await fal.subscribe("fal-ai/nano-banana-pro/edit", {
          input: {
            prompt: prompt,
            image_urls: [imageUrl],
            num_images: 1,
            aspect_ratio: aspectRatio,
            resolution: "2K",
            output_format: "png",
          },
          logs: true,
          onQueueUpdate: (update) => {
            if (update.status === "IN_PROGRESS") {
              update.logs?.map((log) => log.message).forEach(console.log);
            }
          },
        });

        if (!result.data?.images || result.data.images.length === 0) {
          console.error("No images returned from fal.ai");
          return null;
        }

        // Return the first image URL
        return result.data.images[0].url;
      } catch (err: any) {
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

    // Use parent's title directly - it's already passed from the analysis
    const parentTitle = args.title || "Untitled";

    const generatedImages = [];

    for (let i = 0; i < validResults.length; i++) {
      const imageUrl = validResults[i];
      
      // Download the generated image and upload to Convex storage
      try {
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
          console.error("Failed to fetch generated image from fal.ai");
          continue;
        }

        const imageBlob = await imageResponse.blob();

        // 1. Get upload URL
        const uploadUrl = await ctx.runMutation(internal.images.internalGenerateUploadUrl);

        // 2. Upload to Convex storage
        const uploadResponse = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": imageBlob.type || "image/png" },
          body: imageBlob,
        });

        if (!uploadResponse.ok) {
          console.error("Failed to upload generated image to Convex storage");
          continue;
        }

        const { storageId } = await uploadResponse.json();

        // 3. Get URL
        const finalImageUrl = await ctx.storage.getUrl(storageId);
        if (!finalImageUrl) continue;

        generatedImages.push({
          url: finalImageUrl,
          title: parentTitle, // Inherit parent's exact title
          description: args.description, // Use parent's full description (will be inherited in internalSaveGeneratedImages)
        });
      } catch (err) {
        console.error(`Failed to process generated image ${i}:`, err);
        continue;
      }
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
    group: v.optional(v.string()),
    projectName: v.optional(v.string()),
    moodboardName: v.optional(v.string()),
    variationCount: v.optional(v.number()),
    variationType: v.optional(v.string()),
    variationDetail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 1. Get image URL from storageId
    const imageUrl = await ctx.storage.getUrl(args.storageId);
    if (!imageUrl) {
      console.error("Image not found in storage");
      return;
    }

    // 2. Call OpenRouter VLM API using OpenAI SDK
    const openRouterKey = process.env.OPEN_ROUTER_KEY || process.env.OPENROUTER_API_KEY;
    if (!openRouterKey) {
      console.error("OPEN_ROUTER_KEY or OPENROUTER_API_KEY environment variable not set");
      await ctx.runMutation(internal.images.internalSetAiStatus, { 
        imageId: args.imageId, 
        status: "failed" 
      });
      return;
    }

    // Use Qwen3 VL 8B Instruct for image analysis (default)
    const vlmModel = process.env.OPENROUTER_VLM_MODEL || "qwen/qwen3-vl-8b-instruct";

    const categories = [
      "Abstract", "Architecture", "Art", "Black & White", "Character Design", 
      "Cinematic", "Cyberpunk", "Design", "Fashion", "Film", 
      "Food", "Gaming", "Illustration", "Interior", "Landscape", 
      "Minimalist", "Nature", "Photography", "Portrait", "Sci-Fi", 
      "Street", "Technology", "Texture", "Travel", "UI/UX", "Vintage"
    ];

    try {
      const prompt = `Analyze this image. 1. Generate a short, catchy title. 2. Write a concise description. 3. Generate 5-10 specific descriptive tags (focus on objects, lighting, mood, composition, specific elements; do NOT use broad categories). 4. Extract 5 distinct and vibrant dominant colors (hex codes). 5. Identify the visual style/medium (e.g., '35mm Film', 'VHS', 'CGI', 'Oil Painting'). 6. Select the single most appropriate category from this list: ${categories.join(", ")}. 7. Determine the group type: "Commercial", "Film", "Moodboard", "Spec Commercial", "Spec Music Video", "Music Video", "TV", or null if unclear. 8. If this appears to be from a specific project/movie/music video, suggest a project name (e.g., "Kitty Bite Back"). 9. If this appears to be a reference/moodboard image, suggest a moodboard name (e.g., "pink girl smoking"). Return ONLY a strict valid JSON object with keys: "title", "description", "tags" (array of strings), "colors" (array of hex strings), "category" (string), "visual_style" (string), "group" (string or null), "project_name" (string or null), "moodboard_name" (string or null). Ensure all keys and string values use double quotes.`;

      // Initialize OpenAI client configured for OpenRouter
      const openai = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: openRouterKey,
        defaultHeaders: {
          "HTTP-Referer": process.env.CONVEX_SITE_URL || "http://localhost:3000",
          "X-Title": "Visuals Image Gallery",
        },
      });

      // Prepare provider routing options if configured
      const providerOptions: any = {};
      if (process.env.OPENROUTER_PROVIDER_SORT) {
        providerOptions.provider = {
          sort: process.env.OPENROUTER_PROVIDER_SORT as "price" | "throughput" | "latency",
        };
      }

      // Call OpenRouter API using OpenAI SDK
      const completion = await openai.chat.completions.create({
        model: vlmModel,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt,
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl,
                },
              },
            ],
          },
        ],
        ...providerOptions,
      });

      const messageContent = completion.choices[0]?.message?.content;
      
      if (!messageContent) {
        throw new Error("No content in OpenRouter response");
      }

      console.log(`OpenRouter VLM Analysis Result (${vlmModel}):`, messageContent);

      let title: string | undefined;
      let description: string = "No description generated.";
      let tags: string[] = [];
      let colors: string[] = [];
      let category: string | undefined;
      let visual_style: string | undefined;
      let group: string | undefined;
      let project_name: string | undefined;
      let moodboard_name: string | undefined;

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
        group = parsedContent.group || undefined;
        project_name = parsedContent.project_name || parsedContent.projectName || undefined;
        moodboard_name = parsedContent.moodboard_name || parsedContent.moodboardName || undefined;
      } catch (jsonError) {
        console.warn("VLM response parsing failed, using raw content as description.", jsonError);
        description = messageContent;
      }

      // 3. Update the image document in the database
      // Preserve sref from original upload - don't let AI overwrite it
      await ctx.runMutation(internal.images.internalUpdateAnalysis, {
        imageId: args.imageId,
        title,
        description,
        tags,
        colors,
        category,
        group,
        projectName: project_name,
        moodboardName: moodboard_name,
        sref: args.sref, // Preserve user-entered sref
      });

      // 4. Generate related images
      await ctx.scheduler.runAfter(0, internal.vision.internalGenerateRelatedImages, {
        originalImageId: args.imageId,
        storageId: args.storageId,
        description,
        category: category || args.category,
        style: visual_style,
        title, 
        variationCount: args.variationCount,
        variationType: args.variationType,
        variationDetail: args.variationDetail,
      });

    } catch (err: any) {
      const errorMessage = err?.message || String(err);
      console.error("Smart analysis failed:", errorMessage, err);
      await ctx.runMutation(internal.images.internalSetAiStatus, { 
        imageId: args.imageId, 
        status: "failed" 
      });
      // Log detailed error for debugging
      console.error("Full error details:", {
        imageId: args.imageId,
        error: errorMessage,
        stack: err?.stack
      });
    }
  },
});

export const smartAnalyzeImage = httpAction(async (ctx, request) => {
  try {
    const {
      storageId,
      imageId,
      userId,
      title,
      description,
      tags,
      category,
      source,
      sref,
      variationCount,
      variationType,
      variationDetail,
    } = await request.json();

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
        sref,
        variationCount,
        variationType,
        variationDetail,
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
    group: v.optional(v.string()),
    projectName: v.optional(v.string()),
    moodboardName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    const image = await ctx.db.get("images", args.imageId);
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
      group: args.group,
      projectName: args.projectName,
      moodboardName: args.moodboardName,
      variationCount: image.variationCount,
      variationType: image.variationType,
      variationDetail: image.variationDetail,
    });

    return { success: true };
  },
});
