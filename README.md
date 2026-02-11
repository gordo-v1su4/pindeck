# Visuals - AI-Powered Image Gallery Platform

A modern image gallery and sharing platform built with React, TypeScript, Tailwind CSS, and Convex. Features AI-powered image analysis and generation using Gemini 3 Flash Preview.

## ✨ Features

- **AI-Powered Image Analysis**: Automatic title, description, tags, colors, and category detection using Gemini 3 Flash Preview
- **AI Image Generation**: Create cinematic variations with random shot type selection (9 different shot types)
- **Parent Image Lineage**: Suno-style remix links showing generation trail from parent to variations
- **Original Image Tagging**: Automatically tag user uploads; filter to show only original (non-AI) images
- **Image Gallery**: Responsive masonry grid layout with hover effects
- **Advanced Table View**: Sortable, filterable data table with ID column, parent column, and tag color coding
- **Pinterest-Style Boards**: Organize images into collections
- **Smart Search**: Real-time search across all image metadata
- **Color Extraction**: Automatic color palette generation
- **Social Features**: Likes, views, and collections
- **Responsive Design**: Full-width layout that adapts to any screen size

## 🚀 Quick Start

This project uses **Bun** as its package manager.

### Prerequisites

- [Bun](https://bun.sh/) installed
- [Convex](https://convex.dev/) account
- OpenRouter API key (for image analysis via any VLM model)
- fal.ai API key for Nano Banana Pro (for image generation)

### Installation

```bash
# Install dependencies
bun install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local and add your actual values
# Note: You can use either CONVEX_URL or VITE_CONVEX_URL (both are supported)

# Start development servers (frontend + backend)
bun run dev

# Build for production
bun run build

# Run linting
bun run lint
```

### Environment Variables

**Set these in your Convex Dashboard** (Settings → Environment Variables):
- `JWT_PRIVATE_KEY` - **Required for authentication** - PKCS#8 formatted private key (see [Authentication](#-authentication) section for generation instructions)
- `OPENROUTER_API_KEY` - Required for image analysis (any VLM model via OpenRouter)
- `OPENROUTER_VLM_MODEL` - Optional: VLM model to use (default: `"google/gemini-flash-1.5"`)
  - Examples: `"google/gemini-flash-1.5"`, `"google/gemini-pro-vision"`, `"anthropic/claude-3-opus"`, `"anthropic/claude-3-sonnet"`, `"openai/gpt-4-vision-preview"`
- `OPENROUTER_PROVIDER_SORT` - Optional: Provider routing (`"price"`, `"throughput"`, or `"latency"`)
- `FAL_KEY` - Required for image generation (Nano Banana Pro)

**For local frontend development**, create a `.env.local` file:
```
VITE_CONVEX_URL=your_convex_url_here
```

## 🏗️ Project Structure

```
pindeck/
├── src/                    # Frontend React application
│   ├── components/         # Reusable UI components
│   │   ├── ImageGrid.tsx   # Masonry grid layout
│   │   ├── ImageModal.tsx  # Image detail modal
│   │   ├── TableView.tsx    # Advanced data table
│   │   └── ...
│   ├── lib/                # Utilities and helpers
│   │   ├── colorExtraction.ts
│   │   └── utils.ts        # Tag color mapping
│   └── App.tsx             # Main application component
├── convex/                 # Backend logic and database schema
│   ├── auth.ts             # Authentication logic
│   ├── images.ts           # Image CRUD operations
│   ├── vision.ts           # AI analysis & generation (Gemini 3 Flash Preview)
│   ├── boards.ts           # Pinterest-style boards
│   ├── schema.ts           # Database schema
│   └── router.ts           # HTTP routes
└── dist/                   # Production build output
```

## 🛠️ Technology Stack

### Frontend
- **React 19** - Latest React with modern features
- **TypeScript 5.7** - Type-safe development
- **Vite 6** - Lightning-fast build tool
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Accessible component primitives
- **Radix Themes** - Consistent design system
- **TanStack Table** - Advanced data table functionality

### Backend
- **Convex 1.31.2** - Backend-as-a-Service with real-time updates (updated December 2024)
- **Convex Auth** - Built-in authentication system
- **OpenRouter API** - Access to any VLM model for image analysis (default: Gemini Flash 1.5)
- **@fal-ai/client 1.8.1** - Nano Banana Pro for image generation

### Development Tools
- **Bun** - Fast package manager and runtime
- **ESLint** - Code linting
- **TypeScript** - Type checking

## 🔐 Authentication

This app uses [Convex Auth](https://auth.convex.dev/) with Password and Anonymous auth providers.

### Generating JWT Private Key

Convex Auth requires an **RSA private key in PKCS#8 format** for JWT token signing. Generate a new key using:

**RSA Key (2048-bit) - Required**
```bash
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out jwt_private_key.pem
```

**Note:** Convex Auth specifically requires RSA keys. Ed25519 or other algorithms will not work.

**After generating the key:**

1. Copy the entire contents of `jwt_private_key.pem` (including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` lines)
2. Set it in **Convex Dashboard** → Production → Settings → Environment Variables:
   - Name: `JWT_PRIVATE_KEY`
   - Value: Paste the entire PEM key (multi-line format)
3. Ensure there's no leading/trailing whitespace

**Generating JWKS (JSON Web Key Set):**

If you need the `JWKS` environment variable, generate it from your public key:

1. Extract the public key from the private key:
```bash
openssl pkey -in jwt_private_key.pem -pubout -out jwt_public_key.pem
```

2. Convert the public key to JWKS format:
```bash
node -e "import { readFileSync } from 'fs'; import { importSPKI, exportJWK } from 'jose'; const spki = readFileSync('jwt_public_key.pem','utf8'); const key = await importSPKI(spki,'RS256'); const jwk = await exportJWK(key); jwk.use='sig'; jwk.alg='RS256'; jwk.kid='convex'; console.log(JSON.stringify({ keys: [jwk] }));"
```

3. Copy the JSON output and set it in **Convex Dashboard** → Production → Settings → Environment Variables:
   - Name: `JWKS`
   - Value: Paste the JSON output

**Important:** 
- The private key file (`jwt_private_key.pem`) is automatically ignored by git (see `.gitignore`)
- Never commit private keys to version control
- Keep your private key secure and never share it publicly

## 📦 Available Scripts

- `bun run dev` - Start both frontend and backend development servers
- `bun run dev:frontend` - Start only the Vite frontend server
- `bun run dev:backend` - Start only the Convex backend server
- `bun run build` - Build the application for production
- `bun run deploy:convex` - Deploy Convex functions to production
- `bun run lint` - Run TypeScript and ESLint checks
- `bun run discord:bot` - Start the Discord image bot
- `bun run discord:bot:dry-run` - Register Discord commands only and exit

## 🤖 Discord Image Bot

This repo includes a Discord bot at `services/discord-bot` for posting image presets.
It can also ingest existing Discord message images into Pindeck via `/images import` or custom emoji reactions.
RSS-forwarded posts are parsed on ingest (including `sref` number extraction).

Quick start:

1. Set these values in `.env.local`:
   - `DISCORD_TOKEN`
   - `DISCORD_CLIENT_ID` (recommended; auto-derived from token if omitted)
   - `DISCORD_GUILD_ID` (recommended for fast command updates)
   - `DISCORD_IMAGES_JSON` (JSON array of image presets)
   - `DISCORD_INGEST_EMOJIS` (comma-separated custom/unicode emoji triggers, e.g. `📥,<:pindeck:123...>`)
   - `INGEST_API_KEY` and optional `PINDECK_INGEST_URL`
2. Install bot dependency:
   - `bun install --cwd services/discord-bot`
3. Register commands (dry-run):
   - `cd services/discord-bot && DISCORD_DRY_RUN=1 bun src/index.js`
4. Run bot:
   - `bash ./scripts/run-discord-bot.sh`

Detailed setup and permission requirements:
- `services/discord-bot/README.md`

## 🌐 Deployment

### Convex Deployment

This project is connected to the Convex deployment: [`incredible-otter-369`](https://dashboard.convex.dev/t/gordo/pindeck/incredible-otter-369)

### Vercel Deployment

The project is configured for Vercel deployment with `vercel.json`. To deploy:

1. **Connect your GitHub repository** to Vercel
2. **Set Environment Variables** in **Vercel Dashboard** (NOT Convex):
   - Go to your Vercel project → Settings → Environment Variables
   - Add these variables:
     - `VITE_CONVEX_URL` - Copy the value from your Convex dashboard (you have `https://incredible-otter-369.convex.site` or similar)
     - `OPENROUTER_API_KEY` - Your OpenRouter API key (set in Convex Dashboard)
     - `OPENROUTER_VLM_MODEL` - Optional: VLM model to use (default: `"google/gemini-flash-1.5"`)
     - `FAL_KEY` - Your fal.ai API key for Nano Banana Pro (set in Convex Dashboard)
     - `CONVEX_SITE_URL` - Your Vercel site URL (set this after first deployment, e.g., `https://your-app.vercel.app`)
3. **Deploy** - Vercel will automatically build and deploy on push

**Important**: 
- **Convex environment variables** (`OPENROUTER_API_KEY`, `FAL_KEY`) are for your **backend functions** (like `vision.ts`)
- **Vercel environment variables** are for your **frontend build** (the React app needs `VITE_CONVEX_URL` to connect to Convex)
- Set `OPENROUTER_API_KEY` and `FAL_KEY` in **Convex Dashboard** → Settings → Environment Variables
- Optionally set `OPENROUTER_VLM_MODEL` to choose a specific VLM model (defaults to Gemini Flash 1.5)
- Set `VITE_CONVEX_URL` in **Vercel** for the frontend build process

## 📚 Learn More

- [Convex Documentation](https://docs.convex.dev/)
- [Convex Overview](https://docs.convex.dev/understanding/)
- [Hosting and Deployment](https://docs.convex.dev/production/)
- [Best Practices](https://docs.convex.dev/understanding/best-practices/)
- [Chef Documentation](https://docs.convex.dev/chef)

## 🤖 AI Features

### Image Analysis
When you upload an image, the system automatically uses OpenRouter's VLM models to:
- Generates a catchy title
- Creates a detailed description
- Extracts 5-10 descriptive tags
- Identifies dominant colors (5 hex codes)
- Detects visual style/medium (e.g., '35mm Film', 'VHS', 'CGI')
- Categorizes the image
- Suggests project name and mood board name

**Workflow:**
1. **Image Analysis** - OpenRouter with Qwen3 VL 8B Instruct (`qwen/qwen3-vl-8b-instruct`) analyzes the uploaded image
2. **Image Generation** - fal.ai Nano Banana Pro generates 2 cinematic variations using the analysis results

**Supported VLM Models** (via OpenRouter, default: Qwen3 VL 8B Instruct):
- Qwen3 VL 8B Instruct (default)
- Google Gemini Flash 1.5
- Google Gemini Pro Vision
- Anthropic Claude 3 Opus/Sonnet
- OpenAI GPT-4 Vision
- Any other VLM model available on OpenRouter

Configure the model via `OPENROUTER_VLM_MODEL` environment variable.

### Image Generation
After analysis, the system generates 2 cinematic variations using fal.ai's Nano Banana Pro:
- **Random Shot Type Selection**: Each variation uses a randomly assigned shot type from 9 options:
  - Extreme Long Shot, Long Shot, Medium Long Shot
  - Medium Shot, Medium Close-Up, Close-Up
  - Extreme Close-Up, Low Angle, High Angle
- **Image-to-Image**: Uses the original image as input for consistent subject and environment
- **Configurable**: 2K resolution with configurable aspect ratio (16:9, 9:16, 1:1, etc.)

## 🛣️ HTTP API

User-defined HTTP routes are defined in `convex/router.ts`. Authentication routes are separated in `convex/http.ts` for security.

## 📝 Notes

- **Parent Image Lineage**: AI-generated variations automatically store `parentImageId` reference to source image
- **Original Tagging**: User uploads automatically tagged with "original"; AI variations excluded
- **sref Field**: Style reference field is manually set by users, not auto-populated
- **Image ID**: Each image has a unique ID displayed in the table view
- **Tag Colors**: Tags use consistent color mapping across table and modal views
- **Responsive Design**: Full-width layout with no hard max-width constraints
- **Convex DB API**: Uses explicit table name syntax (`db.get("table", id)`) as of Convex 1.31.2
- **Convex Functions**: All 33+ functions include proper `args` and `returns` validators per Convex best practices
