# Pindeck (Visuals) — AI-Powered Visual Asset Management Platform

Pindeck is a full-stack image gallery and creative asset management platform built for filmmakers, commercial directors, and visual creatives. It combines Pinterest-style organization with AI-powered image analysis and cinematic variation generation.

---

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 19, TypeScript 5.7, Vite 6, Tailwind CSS 4, Radix UI Themes, TanStack Table |
| **Backend** | Convex (real-time BaaS), Convex Auth (Password + Anonymous) |
| **AI** | OpenRouter VLM (default: Qwen3 VL 8B), fal.ai Nano Banana Pro |
| **Integrations** | Discord.js bot, NextCloud (WebDAV), Pinterest (planned) |
| **Deployment** | Vercel (frontend), Convex Cloud (backend), Bun (runtime) |

---

## Core Features

### 1. AI Image Analysis

When you upload an image, a Vision Language Model (via OpenRouter) automatically generates: title, description, 5-10 tags, 5-color palette, visual style/medium detection (e.g. "35mm Film", "VHS"), category, project name, and mood board suggestions.

### 2. AI Image Generation (Variations)

After analysis, fal.ai Nano Banana Pro generates cinematic variations using 6 modification modes:

- Shot Variation, B-Roll, Action Shot, Style Variation, Subtle Variation, Coverage
- 16 shot types (close-up, wide, dutch angle, bird's eye, etc.)
- Configurable aspect ratios (16:9, 9:16, 1:1, 21:9, etc.)
- Group-aware prompting — adapts to music video, commercial, film context

### 3. Parent-Child Image Lineage

AI-generated variations store a `parentImageId` reference, creating a Suno-style remix chain. You can trace the generation trail from original upload through all descendants, and filter to show only original (non-AI) images.

### 4. Gallery View

Responsive masonry grid with hover effects, like/view counters, category badges, and a full detail modal showing metadata, parent lineage, child variations, and generation actions.

### 5. Advanced Table View

Sortable, filterable data table (TanStack Table) with: global search, column-specific filters, tag/color filtering, "originals only" and "sref only" toggles, pagination, thumbnail previews, and tag color coding.

### 6. Pinterest-Style Boards

Organize images into collections (public/private), add/remove images, and convert boards into Storyboards or Pitch Decks using template-based generation.

### 7. Discord Bot Integration

A full Discord bot (`services/discord-bot`) that enables:

- **Image import** — react to messages with a configured emoji (e.g. 📥) or use `/images import`
- **Moderation queue** — imported images land as "pending"; approve/reject via `/images review`
- **Variation generation** — trigger AI variations directly from Discord
- **RSS parsing** — extracts titles, descriptions, source URLs, and `sref` style reference numbers from forwarded posts
- **Status webhooks** — posts notifications (queued, approved, rejected, generated) to a status channel
- **Lineage tracking** — Discord-origin variations are auto-queued, with depth capping at 12 levels

### 8. Upload Workflow

Multi-file drag-and-drop upload with draft state management. Images go through: `draft` → `pending` → `processing` (AI analysis) → `active`. Discord imports follow a separate approval queue before processing.

### 9. Search & Filtering

Real-time search across image titles (Convex search index), combined with category (genre) and group (type) filters. Categories include Film Stills, Commercial, Music Video, Architecture, Fashion, etc.

### 10. Authentication

Convex Auth with password and anonymous providers, JWT/RSA token signing, and user-scoped data access.

### 11. Optional NextCloud Storage

A media gateway service (`services/media-gateway`) uploads to self-hosted NextCloud via WebDAV as an alternative to Convex Storage for large files.

---

## Data Model

The Convex database includes tables for: **images** (with extensive metadata, status tracking, and parent-child relationships), **collections** (boards), **likes**, **profiles** (with Discord/Pinterest links), **importBatches**, **storyboards**, **decks**, and **generations**.

---

## Key Architectural Patterns

- **Real-time updates** — Convex subscriptions auto-refresh the UI when data changes
- **Full type safety** — TypeScript end-to-end with Convex-generated types and validators on all 33+ functions
- **Queue-based moderation** — Discord imports are queued, reviewed, then processed
- **Group-aware AI** — prompts adapt based on project type (music video vs. commercial vs. film)
- **Indexed queries** — fast filtering by category, group, user, parent, and unique ID
