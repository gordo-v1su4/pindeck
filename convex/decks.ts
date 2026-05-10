import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query, type QueryCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

const DECK_TEMPLATE = {
  id: "deck:image-highlight",
  layout: "single-image",
};

async function imagePreviewUrl(
  ctx: QueryCtx,
  imageId: Id<"images">,
): Promise<string | null> {
  const image = await ctx.db.get("images", imageId);
  if (!image) {
    return null;
  }
  return (
    image.derivativeUrls?.large ||
    image.derivativeUrls?.medium ||
    image.previewUrl ||
    image.imageUrl ||
    null
  );
}

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

    const decks = await ctx.db
      .query("decks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    const maxStrip = 8;

    return Promise.all(
      decks.map(async (deck) => {
        const board = await ctx.db.get("collections", deck.boardId);
        const slides = [...deck.slides].sort((a, b) => a.order - b.order);

        const stripImageUrls: string[] = [];
        /** Parallel to `stripImageUrls` — same `images.colors[..5]` as table rows. */
        const stripPalettes: string[][] = [];
        const previewSlideTitles: string[] = [];

        const orderedIds: Id<"images">[] =
          slides.length > 0
            ? slides.map((s) => s.imageId)
            : deck.sourceImageIds;

        let idx = 0;
        while (idx < orderedIds.length && stripImageUrls.length < maxStrip) {
          const imageId = orderedIds[idx];
          const image = await ctx.db.get("images", imageId);
          idx += 1;
          if (!image) continue;

          const url =
            image.derivativeUrls?.large ||
            image.derivativeUrls?.medium ||
            image.previewUrl ||
            image.imageUrl ||
            null;
          if (!url) {
            continue;
          }

          stripImageUrls.push(url);
          stripPalettes.push(
            image.colors?.length
              ? image.colors.slice(0, 5).map((c) => String(c))
              : [],
          );
          if (previewSlideTitles.length < 5 && image.title?.trim()) {
            previewSlideTitles.push(image.title.trim());
          }
        }

        return {
          ...deck,
          boardName: board?.name ?? null,
          /** Ordered stills (library preview hero + thumbs). */
          stripImageUrls,
          /** Parallel `stripPalettes[i]` ≡ `images.colors` for slide `stripImageUrls[i]` (table parity). */
          stripPalettes,
          /** First few slide image titles — library card subtitle lines. */
          previewSlideTitles,
        };
      }),
    );
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
                  colors: image.colors,
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
      templateId: DECK_TEMPLATE.id,
      sourceImageIds: board.imageIds,
      slides,
      createdAt: Date.now(),
    });

    return deckId;
  },
});

export const createFromImages = mutation({
  args: {
    imageIds: v.array(v.id("images")),
    title: v.optional(v.string()),
  },
  returns: v.id("decks"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in to create decks");
    }

    const imageIds: Array<typeof args.imageIds[number]> = [];
    for (const imageId of args.imageIds) {
      const image = await ctx.db.get(imageId);
      if (!image || image.uploadedBy !== userId) continue;
      if (!imageIds.includes(imageId)) imageIds.push(imageId);
    }

    if (imageIds.length === 0) {
      throw new Error("Select at least one image you own.");
    }

    const name = args.title?.trim() || `Selection ${new Date().toLocaleDateString("en-US")}`;
    const boardId = await ctx.db.insert("collections", {
      name,
      description: "Created from a table selection for deck generation.",
      userId,
      isPublic: false,
      imageIds,
    });

    const slides = imageIds.map((imageId, index) => ({
      imageId,
      layout: DECK_TEMPLATE.layout,
      order: index + 1,
    }));

    return await ctx.db.insert("decks", {
      boardId,
      userId,
      title: `${name} Deck`,
      templateId: DECK_TEMPLATE.id,
      sourceImageIds: imageIds,
      slides,
      createdAt: Date.now(),
    });
  },
});
