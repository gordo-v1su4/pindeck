import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  images: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    imageUrl: v.string(),
    storageId: v.optional(v.id("_storage")),
    tags: v.array(v.string()),
    category: v.string(),
    source: v.optional(v.string()),
    sref: v.optional(v.string()),
    colors: v.optional(v.array(v.string())),
    uploadedBy: v.id("users"),
    likes: v.number(),
    views: v.number(),
    status: v.optional(v.string()),
    aiStatus: v.optional(v.string()),
    uploadedAt: v.optional(v.number()),
    group: v.optional(v.string()), // e.g., "Commercial", "Film", "Moodboard", "Spec Commercial", "Spec Music Video"
    projectName: v.optional(v.string()), // e.g., "Kitty Bite Back" (the actual project/movie/music video name)
    moodboardName: v.optional(v.string()), // e.g., "pink girl smoking" (moodboard/reference name)
    uniqueId: v.optional(v.string()), // Auto-generated or user-specified unique identifier
    // AI variation metadata
    variationCount: v.optional(v.number()),
    variationType: v.optional(
      v.union(v.literal("shot_type"), v.literal("style"))
    ),
    variationDetail: v.optional(v.string()),
    // Relationship to original image (for AI-generated variations)
    parentImageId: v.optional(v.id("images")),
  })
    .index("by_category", ["category"])
    .index("by_uploaded_by", ["uploadedBy"])
    .index("by_likes", ["likes"])
    .index("by_group", ["group"])
    .index("by_project_name", ["projectName"])
    .index("by_unique_id", ["uniqueId"])
    .searchIndex("search_content", {
      searchField: "title",
      filterFields: ["category", "uploadedBy", "group", "projectName"],
    }),

  collections: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    userId: v.id("users"),
    isPublic: v.boolean(),
    imageIds: v.array(v.id("images")),
  }).index("by_user", ["userId"]),

  storyboards: defineTable({
    boardId: v.id("collections"),
    userId: v.id("users"),
    title: v.string(),
    templateId: v.string(),
    sourceImageIds: v.array(v.id("images")),
    panels: v.array(
      v.object({
        imageId: v.id("images"),
        layout: v.string(),
        order: v.number(),
      })
    ),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_board", ["boardId"]),

  decks: defineTable({
    boardId: v.id("collections"),
    userId: v.id("users"),
    title: v.string(),
    templateId: v.string(),
    sourceImageIds: v.array(v.id("images")),
    slides: v.array(
      v.object({
        imageId: v.id("images"),
        layout: v.string(),
        order: v.number(),
      })
    ),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_board", ["boardId"]),

  likes: defineTable({
    userId: v.id("users"),
    imageId: v.id("images"),
  })
    .index("by_user", ["userId"])
    .index("by_image", ["imageId"])
    .index("by_user_and_image", ["userId", "imageId"]),

  generations: defineTable({
    imageId: v.id("images"),
    type: v.union(v.literal("storyboard"), v.literal("deck")),

    templateId: v.string(),
    templateName: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    content: v.string(),
    createdBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_image", ["imageId"])
    .index("by_created_by", ["createdBy"])
    .index("by_type", ["type"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
