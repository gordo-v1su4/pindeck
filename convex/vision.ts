import { httpAction, internalAction, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { fal } from "@fal-ai/client";
import OpenAI from "openai";
import { getAuthUserId } from "@convex-dev/auth/server";

// Shot type definitions for random assignment
const SHOT_TYPES = [
  "extreme wide shot",
  "wide shot", 
  "medium-wide shot",
  "medium shot",
  "medium close-up",
  "close-up",
  "extreme close-up",
  "low angle shot",
  "high angle shot",
  "dutch angle",
  "over-the-shoulder",
  "point of view shot",
] as const;

// Modification modes with their SHORT prompt templates
// These are designed for image-to-image editing models that work best with concise prompts
const MODE_PROMPTS: Record<string, (detail?: string) => string> = {
  // Different camera angle of SAME people/subjects
  "shot-variation": (detail) => 
    detail 
      ? `${detail} of the same subjects. Different angle, same people and wardrobe.`
      : `Different camera angle. Same subjects, wardrobe, and lighting.`,
  
  // B-ROLL: Same scene/environment but NO people - exteriors, establishing shots
  "b-roll": (detail) => 
    detail
      ? `${detail}. Same location/environment. No people visible.`
      : `Establishing shot of the environment. No people. Same location and lighting.`,
  
  // Dynamic, action-oriented framing
  "action-shot": (detail) =>
    detail
      ? `${detail}. Dynamic motion blur, action framing.`
      : `Dynamic action shot. Motion blur, dramatic angle. Same subjects.`,
  
  // Different mood/color grade
  "style-variation": (detail) => 
    detail
      ? `Same scene. ${detail} color grade and mood.`
      : `Same scene with different color grading and mood.`,
  
  // Minor pose/expression changes only
  "subtle-variation": (detail) => 
    detail
      ? `Subtle variation. ${detail}. Same framing.`
      : `Subtle variation. Minor pose or expression change. Same framing.`,

  // Cinematic coverage - mix of angles for scene coverage
  "coverage": (detail) =>
    detail
      ? `${detail}. Cinematic scene coverage.`
      : `Cinematic coverage shot. Different framing for scene variety.`,
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
    // User-configurable options
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

    // Use user's count or default to 0 (NO AUTO-GENERATION)
    const count = Math.min(Math.max(args.variationCount ?? 0, 0), 12);
    
    if (count === 0) {
      // No variations requested - just mark complete
      await ctx.runMutation(internal.images.internalSetAiStatus, { 
        imageId: args.originalImageId, 
        status: "completed" 
      });
      return;
    }

    const mode = args.modificationMode || "shot-variation";
    const userDetail = args.variationDetail?.trim();

    // For shot-variation without user detail, pick random shot types
    const shuffledShots = [...SHOT_TYPES].sort(() => Math.random() - 0.5);

    // Map aspect ratio
    const aspectRatioMap: Record<string, "16:9" | "9:16" | "1:1" | "4:3" | "3:4" | "auto"> = {
      "16:9": "16:9", "9:16": "9:16", "1:1": "1:1", "4:3": "4:3", "3:4": "3:4",
    };
    const aspectRatio = aspectRatioMap[args.aspectRatio || "16:9"] || "16:9";

    // Generate images
    const generatePromises = Array.from({ length: count }, (_, i) => {
      return (async () => {
        try {
          // Build prompt based on mode
          const promptBuilder = MODE_PROMPTS[mode] || MODE_PROMPTS["shot-variation"];
          
          // For shot-variation, use random shot type if no user detail
          let detail = userDetail;
          if (mode === "shot-variation" && !detail) {
            detail = shuffledShots[i % shuffledShots.length];
          }
          
          const prompt = promptBuilder(detail);

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

// NEW: Standalone action to generate variations AFTER user reviews the image
export const generateVariations = mutation({
  args: {
    imageId: v.id("images"),
    variationCount: v.number(),
    modificationMode: v.string(),
    variationDetail: v.optional(v.string()),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const image = await ctx.db.get("images", args.imageId);
    if (!image || image.uploadedBy !== userId) {
      throw new Error("Not authorized or image not found");
    }

    if (!image.storageId) {
      throw new Error("Image has no storage ID");
    }

    // Update image with variation settings
    await ctx.db.patch("images", args.imageId, {
      aiStatus: "processing",
      variationCount: args.variationCount,
      modificationMode: args.modificationMode,
      variationDetail: args.variationDetail,
    });

    // Schedule the generation
    await ctx.scheduler.runAfter(0, internal.vision.internalGenerateRelatedImages, {
      originalImageId: args.imageId,
      storageId: image.storageId,
      description: image.description || "",
      category: image.category,
      style: undefined,
      title: image.title,
      variationCount: args.variationCount,
      modificationMode: args.modificationMode,
      variationDetail: args.variationDetail,
    });

    return { success: true };
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
    // Variation settings - but we won't auto-generate anymore
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

      // CHANGED: Only generate variations if user explicitly requested them (count > 0)
      const requestedCount = args.variationCount ?? 0;
      
      if (requestedCount > 0) {
        await ctx.scheduler.runAfter(0, internal.vision.internalGenerateRelatedImages, {
          originalImageId: args.imageId,
          storageId: args.storageId,
          description,
          category: category || args.category,
          style: visual_style,
          title,
          variationCount: requestedCount,
          modificationMode: args.modificationMode,
          variationType: args.variationType,
          variationDetail: args.variationDetail,
        });
      } else {
        // No variations requested - mark as completed immediately
        await ctx.runMutation(internal.images.internalSetAiStatus, { 
          imageId: args.imageId, 
          status: "completed" 
        });
      }
      
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
      variationCount: args.variationCount ?? 0, // Default to 0 - no auto generation
      modificationMode: args.modificationMode ?? image.modificationMode,
      variationType: image.variationType,
      variationDetail: image.variationDetail,
    });

    return { success: true };
  },
});
