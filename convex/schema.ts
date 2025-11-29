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
  })
    .index("by_category", ["category"])
    .index("by_uploaded_by", ["uploadedBy"])
    .index("by_likes", ["likes"])
    .searchIndex("search_content", {
      searchField: "title",
      filterFields: ["category", "uploadedBy"],
    }),

  collections: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    userId: v.id("users"),
    isPublic: v.boolean(),
    imageIds: v.array(v.id("images")),
  }).index("by_user", ["userId"]),

  likes: defineTable({
    userId: v.id("users"),
    imageId: v.id("images"),
  })
    .index("by_user", ["userId"])
    .index("by_image", ["imageId"])
    .index("by_user_and_image", ["userId", "imageId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
