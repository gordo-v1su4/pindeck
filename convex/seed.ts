import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const seedImages = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    // Sample images for demonstration
    const sampleImages = [
      {
        title: "Neon Cyberpunk Street",
        description: "A moody cyberpunk street scene with neon lights reflecting on wet pavement",
        imageUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=800&q=80",
        tags: ["cyberpunk", "neon", "street", "night", "urban"],
        category: "photography",
        source: "https://unsplash.com",
      },
      {
        title: "Minimalist Architecture",
        description: "Clean lines and geometric shapes in modern architecture",
        imageUrl: "https://images.unsplash.com/photo-1511818966892-d7d671e672a2?w=800&q=80",
        tags: ["architecture", "minimalist", "geometric", "modern"],
        category: "architecture",
        source: "https://unsplash.com",
      },
      {
        title: "Abstract Color Gradient",
        description: "Smooth color transitions in abstract digital art",
        imageUrl: "https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=800&q=80",
        tags: ["abstract", "gradient", "color", "digital"],
        category: "design",
        source: "https://unsplash.com",
      },
      {
        title: "Vintage Film Still",
        description: "Classic cinematography with warm tones and dramatic lighting",
        imageUrl: "https://images.unsplash.com/photo-1489599162810-1e666c2c4c5b?w=800&q=80",
        tags: ["vintage", "film", "cinematic", "portrait"],
        category: "film",
        source: "https://unsplash.com",
      },
      {
        title: "Nature Macro Detail",
        description: "Intricate patterns found in nature, captured in macro photography",
        imageUrl: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80",
        tags: ["nature", "macro", "patterns", "organic"],
        category: "photography",
        source: "https://unsplash.com",
      },
      {
        title: "Typography Poster",
        description: "Bold typography design with experimental letterforms",
        imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
        tags: ["typography", "poster", "design", "experimental"],
        category: "design",
        source: "https://unsplash.com",
      },
      {
        title: "Brutalist Concrete",
        description: "Raw concrete textures in brutalist architectural style",
        imageUrl: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&q=80",
        tags: ["brutalist", "concrete", "texture", "architecture"],
        category: "architecture",
        source: "https://unsplash.com",
      },
      {
        title: "Cinematic Landscape",
        description: "Epic landscape shot with cinematic color grading",
        imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
        tags: ["landscape", "cinematic", "epic", "nature"],
        category: "film",
        source: "https://unsplash.com",
      },
    ];

    // Get the first user (assuming there's at least one user)
    const users = await ctx.db.query("users").take(1);
    if (users.length === 0) {
      throw new Error("No users found. Please sign up first.");
    }
    
    const uploadedBy = users[0]._id;

    // Insert sample images
    for (const image of sampleImages) {
      await ctx.db.insert("images", {
        ...image,
        uploadedBy,
        likes: Math.floor(Math.random() * 50),
        views: Math.floor(Math.random() * 200),
      });
    }

    return "Sample images seeded successfully!";
  },
});
