import { httpAction, internalAction, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { fal } from "@fal-ai/client";
import OpenAI from "openai";
import { getAuthUserId } from "@convex-dev/auth/server";

// Shot types: camera position/angle and framing variety (mix of close/medium/wide and angles)
const SHOT_TYPES = [
  "close-up",
  "extreme close-up",
  "close-up profile",
  "medium close-up",
  "macro of the hands",
  "profile",
  "from behind",
  "over-the-shoulder",
  "medium shot",
  "wide shot",
  "extreme wide shot",
  "low angle shot",
  "high angle shot",
  "bird's eye view",
  "dutch angle",
  "point of view shot",
] as const;

// Modification modes: concise prompts for Nano Banana Pro edit API
const MODE_PROMPTS: Record<string, (detail?: string) => string> = {
  // Same person, different camera angle/framing; "later in the scene" feel
  "shot-variation": (detail) =>
    detail
      ? `Later in the scene. ${detail} of the same subject.`
      : `Later in the scene. Different angle of the same subject.`,

  // B-ROLL: Same environment, no people (leave as is)
  "b-roll": (detail) =>
    detail
      ? `${detail}. Same location/environment. No people visible.`
      : `Establishing shot of the environment. No people. Same location and lighting.`,

  // Narrative moment: climax, performing shot, plot twist – same person
  "action-shot": (detail) =>
    detail
      ? `${detail}. Same person.`
      : `Dramatic action or performing moment. Same person.`,

  // Different scene/outfit/location, same face and likeness
  "style-variation": (detail) =>
    detail
      ? `Same person at ${detail}. Different outfit and location, same face.`
      : `Same person, different scene. Different outfit, different location, same face and likeness.`,

  // Later in the same scene – same story, different beat
  "subtle-variation": (detail) =>
    detail
      ? `Later in the scene: ${detail}. Same person and setting.`
      : `Later in the same scene. Same story, different moment – same person, different action or position.`,

  // Detail/object shots in the same world – things that could mean something
  "coverage": (detail) =>
    detail
      ? `${detail}. Same environment, no people.`
      : `Show something else in the same environment. A detail or object that could mean something – no people. Same world as the image.`,
};

function applyGroupContext(mode: string, prompt: string, group?: string) {
  if (!group || (mode !== "shot-variation" && mode !== "action-shot")) {
    return prompt;
  }

  if (group === "Music Video") {
    return `Later in the music video. ${prompt}`;
  }
  if (group === "Commercial") {
    return `Later in the commercial. ${prompt}`;
  }
  if (
    group === "Film" ||
    group === "TV Series" ||
    group === "Web Series"
  ) {
    // For shot-variation, the base prompt already starts with "Later in the scene."
    return mode === "action-shot" ? `Later in the scene. ${prompt}` : prompt;
  }

  return prompt;
}

function buildVariationPromptPlan({
  modificationMode,
  variationCount,
  variationDetail,
  group,
}: {
  modificationMode: string;
  variationCount: number;
  variationDetail?: string;
  group?: string;
}) {
  const count = Math.min(Math.max(variationCount ?? 0, 0), 12);
  if (count === 0) return [] as string[];

  const mode = modificationMode || "shot-variation";
  const userDetail = variationDetail?.trim();
  const promptBuilder = MODE_PROMPTS[mode] || MODE_PROMPTS["shot-variation"];
  const prompts: string[] = [];

  if (mode === "shot-variation" && !userDetail) {
    for (let i = 0; i < count; i++) {
      const shot = SHOT_TYPES[i % SHOT_TYPES.length];
      const prompt = promptBuilder(shot);
      prompts.push(applyGroupContext(mode, prompt, group));
    }
    return prompts;
  }

  const prompt = applyGroupContext(mode, promptBuilder(userDetail || undefined), group);
  for (let i = 0; i < count; i++) prompts.push(prompt);
  return prompts;
}

/** Returns the exact prompts that will be sent to Nano Banana Pro for the given options. */
export const getVariationPrompts = query({
  args: {
    modificationMode: v.string(),
    variationCount: v.number(),
    variationDetail: v.optional(v.string()),
    group: v.optional(v.string()),
  },
  returns: v.array(v.string()),
  handler: (_ctx, args) => {
    return buildVariationPromptPlan({
      modificationMode: args.modificationMode,
      variationCount: args.variationCount,
      variationDetail: args.variationDetail,
      group: args.group,
    });
  },
});

/** Returns exact generation prompts for a specific image using its current group context. */
export const getVariationPromptsForImage = query({
  args: {
    imageId: v.id("images"),
    modificationMode: v.string(),
    variationCount: v.number(),
    variationDetail: v.optional(v.string()),
  },
  returns: v.array(v.string()),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const image = await ctx.db.get(args.imageId);
    if (!image) throw new Error("Image not found");
    if (image.uploadedBy !== userId) throw new Error("Not authorized");

    return buildVariationPromptPlan({
      modificationMode: args.modificationMode,
      variationCount: args.variationCount,
      variationDetail: args.variationDetail,
      group: image.group,
    });
  },
});

export const internalGenerateRelatedImages = internalAction({
  args: {
    originalImageId: v.id("images"),
    storageId: v.optional(v.id("_storage")),
    imageUrl: v.optional(v.string()),
    description: v.string(),
    category: v.string(),
    style: v.optional(v.string()),
    title: v.optional(v.string()),
    aspectRatio: v.optional(v.string()),
    group: v.optional(v.string()),
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

    const imageUrl =
      args.imageUrl ||
      (args.storageId ? await ctx.storage.getUrl(args.storageId) : null);
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
    const prompts = buildVariationPromptPlan({
      modificationMode: mode,
      variationCount: count,
      variationDetail: args.variationDetail,
      group: args.group,
    });
    console.log(
      `[Gen Plan] image=${args.originalImageId} mode=${mode} count=${count} prompts=${JSON.stringify(prompts)}`
    );

    // Map aspect ratio
    const aspectRatioMap: Record<string, "16:9" | "9:16" | "1:1" | "4:3" | "3:4" | "auto"> = {
      "16:9": "16:9", "9:16": "9:16", "1:1": "1:1", "4:3": "4:3", "3:4": "3:4",
    };
    const aspectRatio = aspectRatioMap[args.aspectRatio || "16:9"] || "16:9";

    // Generate images
    const generatePromises = prompts.map((prompt, i) => {
      return (async () => {
        try {
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
    aspectRatio: v.optional(v.string()),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const image = await ctx.db.get(args.imageId);
    if (!image || image.uploadedBy !== userId) {
      throw new Error("Not authorized or image not found");
    }

    if (!image.storageId && !image.imageUrl) {
      throw new Error("Image has no source URL");
    }

    // Update image with variation settings
    await ctx.db.patch(args.imageId, {
      aiStatus: "processing",
      variationCount: args.variationCount,
      modificationMode: args.modificationMode,
      variationDetail: args.variationDetail,
    });

    // Schedule the generation
    await ctx.scheduler.runAfter(0, internal.vision.internalGenerateRelatedImages, {
      originalImageId: args.imageId,
      storageId: image.storageId,
      imageUrl: image.imageUrl,
      description: image.description || "",
      category: image.category,
      style: undefined,
      title: image.title,
      aspectRatio: args.aspectRatio,
      group: image.group,
      variationCount: args.variationCount,
      modificationMode: args.modificationMode,
      variationDetail: args.variationDetail,
    });

    return { success: true };
  },
});

export const internalSmartAnalyzeImage = internalAction({
  args: {
    storageId: v.optional(v.id("_storage")),
    imageUrl: v.optional(v.string()),
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
    const imageUrl =
      args.imageUrl ||
      (args.storageId ? await ctx.storage.getUrl(args.storageId) : null);
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
      "Abstract", "Architecture", "Art", "Blockbuster Film", "Character Design", 
      "Cinematic", "Commercial", "Design", "Environment", "Fashion", "Film", 
      "Gaming", "Headshot", "Indy Film", "Illustration", "Interior", "Landscape", 
      "Photography", "Sci-Fi", "Streetwear", "Technology", "Texture", "UI/UX", "Vintage"
    ];

    try {
      const prompt = `Analyze this image. Return JSON with: "title" (short catchy), "description" (concise), "tags" (5-10 specific descriptive tags), "colors" (5 hex codes), "category" (one of: ${categories.join(", ")}), "visual_style" (e.g., '35mm Film', 'CGI'), "group" ("Commercial"/"Film"/"Moodboard"/"Spec Commercial"/"Spec Music Video"/"Music Video"/"TV Series"/"Web Series"/"Video Game Cinematic" or null), "project_name" (if recognizable, else null), "moodboard_name" (if reference image, else null). Return ONLY valid JSON.`;

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
          // Try to fix common JSON issues before parsing again
          // Replace single quotes with double quotes (but not inside strings)
          // Remove trailing commas
          // This is a safer alternative to using Function constructor
          const fixedContent = cleanContent
            .replace(/'/g, '"') // Replace single quotes with double quotes
            .replace(/,(\s*[}\]])/g, '$1'); // Remove trailing commas
          
          try {
            parsed = JSON.parse(fixedContent);
          } catch {
            // If still fails, try to extract JSON object from the string
            const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              try {
                parsed = JSON.parse(jsonMatch[0]);
              } catch {
                // Last resort: return a basic structure with the raw content
                parsed = { description: cleanContent };
              }
            } else {
              parsed = { description: cleanContent };
            }
          }
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
          imageUrl: args.imageUrl,
          description,
          category: category || args.category,
          style: visual_style,
          title,
          group: group ?? undefined,
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
      storageId, imageUrl, imageId, userId, title, description, tags, category, source, sref,
      variationCount, modificationMode, variationType, variationDetail 
    } = await request.json();

    if (!imageId || !userId || (!storageId && !imageUrl)) {
      return new Response(JSON.stringify({ error: "imageId, userId, and storageId or imageUrl are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    await ctx.scheduler.runAfter(0, internal.vision.internalSmartAnalyzeImage, {
      storageId, imageUrl, imageId, userId, title, description, tags, category, source, sref,
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
    
    const image = await ctx.db.get(args.imageId);
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
