import { httpAction, internalAction, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { fal } from "@fal-ai/client";
import OpenAI from "openai";
import { getAuthUserId } from "@convex-dev/auth/server";

// Shot type definitions for random assignment
const SHOT_TYPES = {
  1: "extreme wide shot",
  2: "wide shot", 
  3: "medium-wide shot",
  4: "medium shot",
  5: "medium close-up",
  6: "close-up",
  7: "extreme close-up",
  8: "low angle",
  9: "high angle"
} as const;

// Modification modes with their prompt templates
const MODE_PROMPTS: Record<string, (shotType: string, style?: string) => string> = {
  "shot-variation": (shotType, style) => 
    `${shotType} of the same scene.${style ? ` ${style} style.` : ""} Keep subjects and lighting consistent.`,
  
  "subtle-variation": (_, style) => 
    `Subtle variation. Same composition, minor pose/expression changes.${style ? ` ${style} style.` : ""}`,
  
  "style-variation": (_, style) => 
    `Same scene with ${style || "different"} visual style. Keep subjects identical.`,
};

export const internalGenerateRelatedImages = internalAction({
  args: {
    originalImageId: v.id("images"),
    storageId: v.id("_storage"),
    description: v.string(),
    category: v.string(),
    style: v.optional(v.string()),
    title: v.optional(v.string()),
    aspectRatio: v.optional(v.string()),
    // NEW: User-configurable options
    variationCount: v.optional(v.number()),
    modificationMode: v.optional(v.string()),
    variationType: v.optional(v.union(v.literal("shot_type"), v.literal("style"))),
    variationDetail: v.optional(v.string()),
  },
  returns: v.null(),
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

    fal.config({ credentials: falKey });

    const imageUrl = await ctx.storage.getUrl(args.storageId);
    if (!imageUrl) {
      console.error("Failed to get image URL from storage");
      await ctx.runMutation(internal.images.internalSetAiStatus, { 
        imageId: args.originalImageId, 
        status: "failed" 
      });
      return;
    }

    // Use user's count or default to 2, max 12
    const count = Math.min(Math.max(args.variationCount ?? 2, 0), 12);
    
    if (count === 0) {
      // User chose 0 variations - just mark complete
      await ctx.runMutation(internal.images.internalSetAiStatus, { 
        imageId: args.originalImageId, 
        status: "completed" 
      });
      return;
    }

    const mode = args.modificationMode || "shot-variation";
    const userShotType = args.variationType === "shot_type" && args.variationDetail?.trim();
    const userStyle = args.variationType === "style" ? args.variationDetail?.trim() : args.style;

    // Shuffle shot types for variety
    const shotTypeKeys = Object.keys(SHOT_TYPES).map(Number);
    const shuffledShots = [...shotTypeKeys].sort(() => Math.random() - 0.5);

    // Map aspect ratio
    const aspectRatioMap: Record<string, "16:9" | "9:16" | "1:1" | "4:3" | "3:4" | "auto"> = {
      "16:9": "16:9", "9:16": "9:16", "1:1": "1:1", "4:3": "4:3", "3:4": "3:4",
    };
    const aspectRatio = aspectRatioMap[args.aspectRatio || "16:9"] || "16:9";

    // Generate images
    const generatePromises = Array.from({ length: count }, (_, i) => {
      return (async () => {
        try {
          // Get shot type - use user's custom one or pick from shuffled list
          const shotTypeKey = shuffledShots[i % shuffledShots.length] as keyof typeof SHOT_TYPES;
          const shotType = userShotType || SHOT_TYPES[shotTypeKey];
          
          // Build SHORT prompt based on mode
          const promptBuilder = MODE_PROMPTS[mode] || MODE_PROMPTS["shot-variation"];
          const prompt = promptBuilder(shotType, userStyle);

          console.log(`[Gen ${i + 1}/${count}] Mode: ${mode}, Prompt: "${prompt}"`);

          const result = await fal.subscribe("fal-ai/nano-banana-pro/edit", {
            input: {
              prompt,
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

          if (!result.data?.images?.[0]?.url) {
            console.error(`[Gen ${i + 1}] No image returned`);
            return null;
          }

          return result.data.images[0].url;
        } catch (err) {
          console.error(`[Gen ${i + 1}] Error:`, err);
          return null;
        }
      })();
    });

    const results = await Promise.all(generatePromises);
    const validUrls = results.filter((r): r is string => r !== null);

    if (validUrls.length === 0) {
      console.error("No valid images generated");
      await ctx.runMutation(internal.images.internalSetAiStatus, { 
        imageId: args.originalImageId, 
        status: "failed" 
      });
      return;
    }

    const parentTitle = args.title || "Untitled";
    const generatedImages = [];

    for (let i = 0; i < validUrls.length; i++) {
      try {
        const imageResponse = await fetch(validUrls[i]);
        if (!imageResponse.ok) continue;

        const imageBlob = await imageResponse.blob();
        const uploadUrl = await ctx.runMutation(internal.images.internalGenerateUploadUrl);

        const uploadResponse = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": imageBlob.type || "image/png" },
          body: imageBlob,
        });

        if (!uploadResponse.ok) continue;

        const { storageId } = await uploadResponse.json();
        const finalImageUrl = await ctx.storage.getUrl(storageId);
        if (!finalImageUrl) continue;

        generatedImages.push({
          url: finalImageUrl,
          title: parentTitle,
          description: args.description,
        });
      } catch (err) {
        console.error(`Failed to save generated image ${i}:`, err);
      }
    }

    if (generatedImages.length > 0) {
      await ctx.runMutation(internal.images.internalSaveGeneratedImages, {
        originalImageId: args.originalImageId,
        images: generatedImages,
      });
    }
    
    return null;
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
    // NEW: Pass through user's variation settings
    variationCount: v.optional(v.number()),
    modificationMode: v.optional(v.string()),
    variationType: v.optional(v.union(v.literal("shot_type"), v.literal("style"))),
    variationDetail: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const imageUrl = await ctx.storage.getUrl(args.storageId);
    if (!imageUrl) {
      console.error("Image not found in storage");
      return;
    }

    const openRouterKey = process.env.OPEN_ROUTER_KEY || process.env.OPENROUTER_API_KEY;
    if (!openRouterKey) {
      console.error("OPENROUTER_API_KEY not set");
      await ctx.runMutation(internal.images.internalSetAiStatus, { 
        imageId: args.imageId, 
        status: "failed" 
      });
      return;
    }

    const vlmModel = process.env.OPENROUTER_VLM_MODEL || "qwen/qwen3-vl-8b-instruct";

    const categories = [
      "Abstract", "Architecture", "Art", "Black & White", "Character Design", 
      "Cinematic", "Cyberpunk", "Design", "Fashion", "Film", 
      "Food", "Gaming", "Illustration", "Interior", "Landscape", 
      "Minimalist", "Nature", "Photography", "Portrait", "Sci-Fi", 
      "Street", "Technology", "Texture", "Travel", "UI/UX", "Vintage"
    ];

    try {
      const prompt = `Analyze this image. Return JSON with: "title" (short catchy), "description" (concise), "tags" (5-10 specific descriptive tags), "colors" (5 hex codes), "category" (one of: ${categories.join(", ")}), "visual_style" (e.g., '35mm Film', 'CGI'), "group" ("Commercial"/"Film"/"Moodboard"/"Spec Commercial"/"Spec Music Video"/"Music Video"/"TV" or null), "project_name" (if recognizable, else null), "moodboard_name" (if reference image, else null). Return ONLY valid JSON.`;

      const openai = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: openRouterKey,
        defaultHeaders: {
          "HTTP-Referer": process.env.CONVEX_SITE_URL || "http://localhost:3000",
          "X-Title": "Visuals Image Gallery",
        },
      });

      const providerOptions: any = {};
      if (process.env.OPENROUTER_PROVIDER_SORT) {
        providerOptions.provider = {
          sort: process.env.OPENROUTER_PROVIDER_SORT as "price" | "throughput" | "latency",
        };
      }

      const completion = await openai.chat.completions.create({
        model: vlmModel,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
        ...providerOptions,
      });

      const messageContent = completion.choices[0]?.message?.content;
      if (!messageContent) throw new Error("No content in response");

      console.log(`VLM Analysis (${vlmModel}):`, messageContent);

      let title: string | undefined;
      let description = "No description generated.";
      let tags: string[] = [];
      let colors: string[] = [];
      let category: string | undefined;
      let visual_style: string | undefined;
      let group: string | undefined;
      let project_name: string | undefined;
      let moodboard_name: string | undefined;

      try {
        const cleanContent = messageContent.replace(/```(?:json)?\s*/g, "").replace(/```/g, "").trim();
        
        let parsed;
        try {
          parsed = JSON.parse(cleanContent);
        } catch {
          parsed = new Function("return " + cleanContent)();
        }

        title = parsed.title;
        description = typeof parsed.description === 'string' ? parsed.description : JSON.stringify(parsed.description);
        tags = parsed.tags || [];
        colors = parsed.colors || [];
        category = parsed.category;
        visual_style = parsed.visual_style;
        group = parsed.group || undefined;
        project_name = parsed.project_name || parsed.projectName || undefined;
        moodboard_name = parsed.moodboard_name || parsed.moodboardName || undefined;
      } catch (jsonError) {
        console.warn("JSON parse failed, using raw content", jsonError);
        description = messageContent;
      }

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
        sref: args.sref,
      });

      // Generate variations with user's settings
      await ctx.scheduler.runAfter(0, internal.vision.internalGenerateRelatedImages, {
        originalImageId: args.imageId,
        storageId: args.storageId,
        description,
        category: category || args.category,
        style: visual_style,
        title,
        // Pass through user's variation settings
        variationCount: args.variationCount,
        modificationMode: args.modificationMode,
        variationType: args.variationType,
        variationDetail: args.variationDetail,
      });
      
      return null;

    } catch (err: any) {
      console.error("Smart analysis failed:", err?.message || err);
      await ctx.runMutation(internal.images.internalSetAiStatus, { 
        imageId: args.imageId, 
        status: "failed" 
      });
      return null;
    }
  },
});

export const smartAnalyzeImage = httpAction(async (ctx, request) => {
  try {
    const { 
      storageId, imageId, userId, title, description, tags, category, source, sref,
      variationCount, modificationMode, variationType, variationDetail 
    } = await request.json();

    if (!storageId || !imageId || !userId) {
      return new Response(JSON.stringify({ error: "storageId, imageId, and userId are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    await ctx.scheduler.runAfter(0, internal.vision.internalSmartAnalyzeImage, {
      storageId, imageId, userId, title, description, tags, category, source, sref,
      variationCount, modificationMode, variationType, variationDetail,
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
    variationCount: v.optional(v.number()),
    modificationMode: v.optional(v.string()),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    
    const image = await ctx.db.get("images", args.imageId);
    if (!image || image.uploadedBy !== userId) {
      throw new Error("Not authorized or image not found");
    }

    await ctx.runMutation(internal.images.internalSetAiStatus, {
      imageId: args.imageId,
      status: "processing",
    });

    await ctx.scheduler.runAfter(0, internal.vision.internalSmartAnalyzeImage, {
      storageId: args.storageId,
      imageId: args.imageId,
      userId,
      title: args.title,
      description: args.description,
      tags: args.tags,
      category: args.category,
      source: args.source,
      sref: args.sref,
      group: args.group,
      projectName: args.projectName,
      moodboardName: args.moodboardName,
      variationCount: args.variationCount ?? image.variationCount,
      modificationMode: args.modificationMode ?? image.modificationMode,
      variationType: image.variationType,
      variationDetail: image.variationDetail,
    });

    return { success: true };
  },
});
