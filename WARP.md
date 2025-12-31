# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

**Pindeck** (also known as "Visuals") is an AI-powered image gallery and sharing platform built with React 19, TypeScript, Tailwind CSS, Radix UI, and Convex backend. The application features AI-powered image analysis using configurable VLM models via OpenRouter (default: Gemini Flash 1.5) and AI image generation with cinematic shot type variations using fal.ai Nano Banana Pro.

## Development Commands

### Setup
```bash
bun install                  # Install dependencies
cp .env.example .env.local   # Create local environment file
```

### Development
```bash
bun run dev                  # Start both frontend (Vite) and backend (Convex) servers
bun run dev:frontend         # Start only Vite dev server (port 5173)
bun run dev:backend          # Start only Convex dev server
```

### Build & Quality
```bash
bun run build                # Build for production (runs convex dev --once, then vite build)
bun run lint                 # Run full lint: TypeScript checks (both frontend & backend), Convex validation, Vite build
```

### Port Management
The project includes a PowerShell script to kill ports before starting dev servers:
```bash
bun run kill-port            # Runs scripts/kill-port.ps1 to clear ports
```

## Environment Configuration

### Convex Dashboard (Backend Environment Variables)
Set these in **Convex Dashboard** → Settings → Environment Variables:
- `OPENROUTER_API_KEY` - Required for image analysis via OpenRouter VLM models
- `OPENROUTER_VLM_MODEL` - Optional: VLM model selection (default: `"google/gemini-flash-1.5"`)
  - Examples: `"google/gemini-flash-1.5"`, `"anthropic/claude-3-sonnet"`, `"openai/gpt-4-vision-preview"`, `"qwen/qwen3-vl-8b-instruct"`
- `OPENROUTER_PROVIDER_SORT` - Optional: Provider routing strategy (`"price"`, `"throughput"`, `"latency"`)
- `FAL_KEY` - Required for image generation via fal.ai Nano Banana Pro

### Local Development (.env.local)
For frontend development:
```env
VITE_CONVEX_URL=your_convex_url_here
```

## Architecture

### Frontend Structure (React 19 + TypeScript + Vite)
```
src/
├── components/             # Reusable UI components
│   ├── ImageGrid.tsx      # Masonry grid layout with hover effects
│   ├── ImageModal.tsx     # Image detail modal (transparent backdrop, tag colors)
│   ├── TableView.tsx      # Advanced data table (TanStack Table with ID column, tag colors)
│   ├── ImageUploadForm.tsx # Multi-image upload with AI analysis
│   ├── BoardsView.tsx     # Pinterest-style boards
│   ├── CategoryFilter.tsx # Category filtering
│   ├── SearchBar.tsx      # Real-time search
│   └── CreateBoardModal.tsx
├── lib/
│   ├── colorExtraction.ts # Browser-based color extraction
│   └── utils.ts           # Tailwind utilities & tag color mapping
├── App.tsx                # Main application with tabs (Gallery/Table/Boards)
├── main.tsx               # Entry point with Radix Theme provider
└── SignInForm.tsx / SignOutButton.tsx
```

### Backend Structure (Convex)
```
convex/
├── auth.config.ts / auth.ts  # Authentication (Convex Auth)
├── schema.ts                 # Database schema with indexes
├── images.ts                 # Image CRUD, search, likes, color extraction
├── boards.ts                 # Pinterest-style boards/collections
├── vision.ts                 # AI image analysis & generation
│                            # - OpenRouter VLM: title, description, tags, colors, category, visual style
│                            # - fal.ai Nano Banana Pro: 2 cinematic variations with random shot types
├── router.ts                 # HTTP API routes
└── http.ts                   # HTTP utilities & external APIs
```

### Database Schema (Convex)
Key tables:
- **images**: Main image records with metadata
  - Fields: `title`, `description`, `imageUrl`, `storageId`, `tags[]`, `category`, `colors[]`, `sref`, `uploadedBy`, `likes`, `views`, `status`, `aiStatus`, `group`, `projectName`, `moodboardName`, `uniqueId`, `parentImageId`
  - Indexes: `by_category`, `by_uploaded_by`, `by_likes`, `by_group`, `by_project_name`, `by_unique_id`, `by_parent`
  - Search: Full-text search on `title` with filters
  - **Lineage**: `parentImageId` tracks AI-generated variations back to source image
- **collections**: User-created boards/collections
  - Fields: `name`, `description`, `userId`, `isPublic`, `imageIds[]`
- **likes**: User likes (userId + imageId)
- **users**: Authentication tables (from `@convex-dev/auth`)

## Technology Stack

### Core Dependencies
- **React 19.0.0** - Latest React with modern features
- **TypeScript 5.7.2** - Strict type checking
- **Vite 6.2.0** - Lightning-fast build tool
- **Convex 1.31.2** - Backend-as-a-Service (uses explicit table name API: `db.get("table", id)`)
- **Bun** - Package manager (specified in package.json: `"packageManager": "bun@1.3.2"`)

### UI & Styling
- **Radix UI Themes 3.2.1** + **Radix Icons 1.3.2** - Accessible component system
- **Tailwind CSS ~3** - Utility-first CSS
- **TanStack Table 8.21.3** - Advanced data table functionality
- **Lucide React 0.544.0** - Additional icons
- **clsx 2.1.1** + **tailwind-merge 3.1.0** - Class name utilities

### AI & APIs
- **@google/generative-ai 0.24.1** - Gemini SDK (for reference)
- **@fal-ai/client 1.8.1** - fal.ai image generation (Nano Banana Pro)
- **OpenRouter API** - Access to any VLM model for image analysis

## Key Development Patterns

### Convex Function Syntax (CRITICAL)
Always use the new function syntax with argument and return validators:

```typescript
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const myQuery = query({
  args: { id: v.id("images") },
  returns: v.union(v.object({ /* ... */ }), v.null()),
  handler: async (ctx, args) => {
    // Implementation
  },
});
```

### Convex Database API (Convex 1.31.2+)
Use explicit table name syntax:
```typescript
// ✅ Correct (Convex 1.31.2+)
const image = await ctx.db.get("images", imageId);
await ctx.db.patch("images", imageId, { likes: 10 });
await ctx.db.delete("images", imageId);

// ❌ Deprecated (old syntax)
const image = await ctx.db.get(imageId);
```

### Radix UI Gotchas

#### 1. Select.Item Cannot Use Empty Strings
```typescript
// ❌ Bad
<Select.Item value="">None</Select.Item>

// ✅ Good
<Select.Root value={value || "none"}>
  <Select.Item value="none">None</Select.Item>
</Select.Root>
```

#### 2. Use Radix Theme Colors, Not Tailwind Dark Mode
```typescript
// ❌ Bad
className="bg-gray-50 dark:bg-gray-900"

// ✅ Good
className="bg-gray-2 hover:bg-gray-3"  // Radix theme colors (gray-1 to gray-12)
```

#### 3. Dialog Requires Title and Description
```typescript
<Dialog.Root>
  <Dialog.Content>
    <Dialog.Title className="sr-only">Image Details</Dialog.Title>
    <Dialog.Description className="sr-only">View image details</Dialog.Description>
    {/* Content */}
  </Dialog.Content>
</Dialog.Root>
```

### UI Design Conventions

#### Color Theme
- **Primary**: Blue (matching navigation)
- **Button Opacity**: Use 0.7-0.9 for soft buttons, 1.0 only for selected states
- **Tag Colors**: Use `getTagColor()` utility from `src/lib/utils.ts` for consistent tag coloring
- **Sref Badges**: Blue color (not purple)

#### Modal Design
- **Transparent Backdrop**: `bg-black/60 backdrop-blur-md`
- **No Image Borders**: Images display with transparent background
- **Soft Buttons**: Use `variant="soft"` with opacity

#### Responsive Design
- **Full Width**: No hard `max-w-7xl` constraints
- **Responsive Padding**: `px-4 sm:px-6 lg:px-8`

### AI Features Architecture

#### Image Analysis (OpenRouter VLM)
- **Trigger**: Automatic on image upload
- **Model**: Configurable via `OPENROUTER_VLM_MODEL` (default: Gemini Flash 1.5)
- **Output**: Title, description, tags, colors, category, visual style, project name, moodboard name
- **Status**: Tracked via `aiStatus` field ("processing", "completed", "failed")

#### Image Generation (fal.ai Nano Banana Pro)
- **Model**: `fal-ai/nano-banana-pro/edit` (image-to-image)
- **Output**: 2 cinematic variations with random shot types
- **Shot Types**: 9 types (Extreme Long Shot, Long Shot, Medium Shot, Close-Up, etc.)
- **Config**: 2K resolution, configurable aspect ratio
- **Memory Optimization**: Chunked base64 conversion, 10MB image size limits
- **Lineage Tracking**: Generated variations automatically store `parentImageId` reference

#### Parent Image Lineage (Suno-style)
- **Schema**: `parentImageId` field links AI variations to source image
- **UI Display**: 
  - ImageModal shows "Generated from: [Parent Title]" link
  - TableView has "Parent" column with clickable links
  - Cross-component navigation via custom events
- **Navigation**: Click parent link to view source image in new modal

#### Original Image Tagging
- **Auto-tagging**: User uploads automatically get "original" tag added
- **AI Exclusion**: Generated variations do NOT get "original" tag
- **Filtering**: TableView toggle to show only original (non-AI) images
- **Logic**: Filter by `!parentImageId` OR "original" tag

### Authentication
- Uses **Convex Auth** with anonymous auth enabled
- User ID retrieval: `const userId = await getAuthUserId(ctx);`
- Protected operations: Check for `userId` before mutations

### File Storage
- Convex built-in storage for images
- Storage IDs tracked in `storageId` field
- URL generation: `ctx.storage.getUrl(storageId)`

## Testing & Validation

The lint command runs multiple checks:
1. Backend TypeScript compilation (`tsc -p convex`)
2. Frontend TypeScript compilation (`tsc -p .`)
3. Convex schema validation (`convex dev --once`)
4. Frontend build (`vite build`)

Always run `bun run lint` before committing changes.

## Common Operations

### Working with Images
```typescript
// List images with category filter
const images = await ctx.db
  .query("images")
  .withIndex("by_category", (q) => q.eq("category", category))
  .filter((q) => q.or(
    q.eq(q.field("status"), "active"),
    q.eq(q.field("status"), undefined)
  ))
  .order("desc")
  .take(50);

// Search with full-text
const results = await ctx.db
  .query("images")
  .withSearchIndex("search_content", (q) => 
    q.search("title", searchTerm).eq("category", category)
  )
  .take(50);

// Get with explicit table name
const image = await ctx.db.get("images", imageId);
```

### Tag Color Mapping
Always use the `getTagColor()` utility from `src/lib/utils.ts` for consistent tag styling across components:
```typescript
import { getTagColor } from "@/lib/utils";

const colorMap = getTagColor(tagName);
// Returns: { color: string, className: string }
```

## Important Notes

- **Bun as Package Manager**: This project uses Bun exclusively. Do not use npm/yarn/pnpm commands.
- **Convex Deployment**: Connected to `incredible-otter-369` deployment
- **Convex Functions**: All 33+ functions include proper `args` and `returns` validators (Convex 1.31.2+ compliance)
- **No npm Fallback**: All scripts assume Bun is available
- **Parent Lineage**: AI-generated images automatically link back to source via `parentImageId`
- **Original Tagging**: User uploads auto-tagged with "original"; AI variations excluded
- **sref Field**: Style reference is manually set by users, not auto-populated
- **Windows Environment**: Includes PowerShell scripts for port management
- **Path Aliases**: `@/*` maps to `./src/*` (configured in tsconfig.json)

## Deployment

### Vercel Frontend
Set environment variables in Vercel Dashboard:
- `VITE_CONVEX_URL` - Your Convex deployment URL
- `CONVEX_SITE_URL` - Your Vercel site URL (after first deployment)

### Convex Backend
Environment variables set in Convex Dashboard:
- `OPENROUTER_API_KEY`, `OPENROUTER_VLM_MODEL`, `OPENROUTER_PROVIDER_SORT`
- `FAL_KEY`

## References

- [Convex Documentation](https://docs.convex.dev/)
- [Radix UI Documentation](https://www.radix-ui.com/)
- [OpenRouter Models](https://openrouter.ai/models)
- [fal.ai Documentation](https://fal.ai/docs)
- Project README: `README.md` (comprehensive feature list and setup)
- Cursor Rules: `.cursor/rules/` (detailed development patterns)
