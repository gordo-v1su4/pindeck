import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

const DECK_TEMPLATE = {
  id: "deck:image-highlight",
  layout: "single-image",
};

export const listByBoard = query({
  args: { boardId: v.id("collections") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    return ctx.db
      .query("decks")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .filter((q) => q.eq(q.field("userId"), userId))
      .order("desc")
      .collect();
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    return ctx.db
      .query("decks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const getById = query({
  args: { deckId: v.id("decks") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const deck = await ctx.db.get("decks", args.deckId);
    if (!deck || deck.userId !== userId) {
      return null;
    }

    const board = await ctx.db.get("collections", deck.boardId);

    const slidesWithImages = await Promise.all(
      [...deck.slides]
        .sort((a, b) => a.order - b.order)
        .map(async (slide) => {
          const image = await ctx.db.get("images", slide.imageId);
          return {
            ...slide,
            image: image
              ? {
                  _id: image._id,
                  title: image.title,
                  imageUrl:
                    image.derivativeUrls?.large ||
                    image.derivativeUrls?.medium ||
                    image.previewUrl ||
                    image.imageUrl,
                  description: image.description,
                  tags: image.tags,
                  category: image.category,
                  sref: image.sref,
                  source: image.source,
                }
              : null,
          };
        })
    );

    return {
      ...deck,
      boardName: board?.name ?? null,
      slides: slidesWithImages,
    };
  },
});

export const createFromBoard = mutation({
  args: {
    boardId: v.id("collections"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in to create decks");
    }

    const board = await ctx.db.get("collections", args.boardId);
    if (!board || board.userId !== userId) {
      throw new Error("Board not found");
    }

    if (board.imageIds.length === 0) {
      throw new Error("Board has no images to convert");
    }

    const slides = board.imageIds.map((imageId, index) => ({
      imageId,
      layout: DECK_TEMPLATE.layout,
      order: index + 1,
    }));

    const deckId = await ctx.db.insert("decks", {
      boardId: board._id,
      userId,
      title: `${board.name} Deck`,
      subtitle: "",
      tag: "DRAFT",
      templateId: DECK_TEMPLATE.id,
      templateName: "Cinematic Treatment",
      scrollFx: "parallax",
      overlay: 0,
      palette: ["#0a0a0c", "#f5a524", "#b24418", "#e2a17a", "#1a0c08"],
      fontFamily: "archivo",
      logline: "",
      characterName: "",
      characterBody: "",
      outroTitle: "THANK YOU",
      outroEmail: "",
      blocks: [
        { id: "title", label: "PROJECT TITLE", on: true, locked: true, kind: "cold-open", variant: "bleed" },
        { id: "logline", label: "LOGLINE", on: true, locked: false, kind: "logline", variant: "split" },
        { id: "world", label: "WORLD & CONCEPT", on: true, locked: false, kind: "tone-grid", variant: "3x2" },
        { id: "character", label: "CHARACTER", on: true, locked: false, kind: "character", variant: "headshot" },
        { id: "tone", label: "TONE & STYLE", on: true, locked: false, kind: "key-art", variant: "ab" },
        { id: "motifs", label: "VISUAL MOTIFS", on: true, locked: false, kind: "sequence", variant: "filmstrip" },
        { id: "story", label: "STORY", on: true, locked: false, kind: "quote", variant: "center" },
        { id: "themes", label: "THEMES", on: false, locked: false, kind: "quote", variant: "kinetic" },
        { id: "stakes", label: "STAKES", on: true, locked: false, kind: "references", variant: "rows" },
        { id: "closing", label: "CLOSING", on: true, locked: false, kind: "outro", variant: "kinetic" },
      ],
      sourceImageIds: board.imageIds,
      slides,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return deckId;
  },
});

export const updateMeta = mutation({
  args: {
    deckId: v.id("decks"),
    title: v.optional(v.string()),
    subtitle: v.optional(v.string()),
    tag: v.optional(v.string()),
    templateId: v.optional(v.string()),
    templateName: v.optional(v.string()),
    scrollFx: v.optional(v.string()),
    overlay: v.optional(v.number()),
    palette: v.optional(v.array(v.string())),
    fontFamily: v.optional(v.string()),
    logline: v.optional(v.string()),
    characterName: v.optional(v.string()),
    characterBody: v.optional(v.string()),
    outroTitle: v.optional(v.string()),
    outroEmail: v.optional(v.string()),
    blocks: v.optional(v.array(v.object({
      id: v.string(),
      label: v.string(),
      on: v.boolean(),
      locked: v.boolean(),
      kind: v.string(),
      variant: v.string(),
    }))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Must be logged in");

    const deck = await ctx.db.get("decks", args.deckId);
    if (!deck || deck.userId !== userId) throw new Error("Deck not found");

    const { deckId, ...updates } = args;
    await ctx.db.patch(args.deckId, { ...updates, updatedAt: Date.now() });
    return args.deckId;
  },
});
