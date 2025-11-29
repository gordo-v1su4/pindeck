# Visuals - AI-Powered Image Gallery Platform

A modern image gallery and sharing platform built with React, TypeScript, Tailwind CSS, and Convex. Features AI-powered image analysis and generation using Gemini 3 Pro.

## ✨ Features

- **AI-Powered Image Analysis**: Automatic title, description, tags, colors, and category detection using Gemini 3 Pro
- **AI Image Generation**: Create cinematic variations with random shot type selection (9 different shot types)
- **Image Gallery**: Responsive masonry grid layout with hover effects
- **Advanced Table View**: Sortable, filterable data table with ID column and tag color coding
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
- Google API key for Gemini 3 Pro (for AI features)

### Installation

```bash
# Install dependencies
bun install

# Set up environment variables
cp env.example .env.local
# Edit .env.local and add your GOOGLE_API_KEY

# Start development servers (frontend + backend)
bun run dev

# Build for production
bun run build

# Run linting
bun run lint
```

### Environment Variables

Create a `.env.local` file with:
```
GOOGLE_API_KEY=your_google_api_key_here
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
│   ├── vision.ts           # AI analysis & generation (Gemini 3 Pro)
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
- **Convex 1.29.3** - Backend-as-a-Service with real-time updates
- **Convex Auth** - Built-in authentication system
- **Google Generative AI** - Gemini 3 Pro Image Preview for AI features

### Development Tools
- **Bun** - Fast package manager and runtime
- **ESLint** - Code linting
- **TypeScript** - Type checking

## 🔐 Authentication

This app uses [Convex Auth](https://auth.convex.dev/) with Anonymous auth for easy sign-in. You may wish to configure additional auth providers before deploying to production.

## 📦 Available Scripts

- `bun run dev` - Start both frontend and backend development servers
- `bun run dev:frontend` - Start only the Vite frontend server
- `bun run dev:backend` - Start only the Convex backend server
- `bun run build` - Build the application for production
- `bun run lint` - Run TypeScript and ESLint checks

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
     - `GOOGLE_API_KEY` - Your Google API key for Gemini 3 Pro (copy from Convex if already set there)
     - `CONVEX_SITE_URL` - Your Vercel site URL (set this after first deployment, e.g., `https://your-app.vercel.app`)
3. **Deploy** - Vercel will automatically build and deploy on push

**Important**: 
- **Convex environment variables** (what you see in Convex dashboard) are for your **backend functions** (like `vision.ts`)
- **Vercel environment variables** are for your **frontend build** (the React app needs `VITE_CONVEX_URL` to connect to Convex)
- You need to set `VITE_CONVEX_URL` in **both places**:
  - In Convex (for backend functions that might need it)
  - In Vercel (for the frontend build process)

## 📚 Learn More

- [Convex Documentation](https://docs.convex.dev/)
- [Convex Overview](https://docs.convex.dev/understanding/)
- [Hosting and Deployment](https://docs.convex.dev/production/)
- [Best Practices](https://docs.convex.dev/understanding/best-practices/)
- [Chef Documentation](https://docs.convex.dev/chef)

## 🤖 AI Features

### Image Analysis
When you upload an image, the system automatically:
- Generates a catchy title
- Creates a detailed description
- Extracts 5-10 descriptive tags
- Identifies dominant colors (5 hex codes)
- Detects visual style/medium (e.g., '35mm Film', 'VHS', 'CGI')
- Categorizes the image

### Image Generation
After analysis, the system generates 2 cinematic variations:
- **Random Shot Type Selection**: Each variation uses a randomly assigned shot type from 9 options:
  - Extreme Long Shot, Long Shot, Medium Long Shot
  - Medium Shot, Medium Close-Up, Close-Up
  - Extreme Close-Up, Low Angle, High Angle
- **Memory Optimized**: Handles images up to 10MB with chunked base64 conversion
- **Configurable**: 2K resolution with configurable aspect ratio

## 🛣️ HTTP API

User-defined HTTP routes are defined in `convex/router.ts`. Authentication routes are separated in `convex/http.ts` for security.

## 📝 Notes

- **sref Field**: Style reference field is manually set by users, not auto-populated
- **Image ID**: Each image has a unique ID displayed in the table view
- **Tag Colors**: Tags use consistent color mapping across table and modal views
- **Responsive Design**: Full-width layout with no hard max-width constraints
