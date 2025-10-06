# Visuals - Image Gallery Platform

A modern image gallery and sharing platform built with React, TypeScript, Tailwind CSS, and Convex.

## 🚀 Quick Start

This project uses **Bun** as its package manager.

```bash
# Install dependencies
bun install

# Start development servers (frontend + backend)
bun run dev

# Build for production
bun run build

# Run linting
bun run lint
```

## 🏗️ Project Structure

```
pindeck/
├── src/              # Frontend React application
│   ├── components/   # Reusable UI components
│   ├── lib/         # Utilities and helpers
│   └── App.tsx      # Main application component
├── convex/          # Backend logic and database schema
│   ├── auth.ts      # Authentication logic
│   ├── images.ts    # Image CRUD operations
│   ├── schema.ts    # Database schema
│   └── router.ts    # HTTP routes
└── dist/            # Production build output
```

## 🛠️ Technology Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS
- **Backend**: [Convex](https://convex.dev) (Backend-as-a-Service)
- **Authentication**: [Convex Auth](https://auth.convex.dev/)
- **Package Manager**: Bun
- **Icons**: Lucide React
- **Styling**: Tailwind CSS

## 🔐 Authentication

This app uses [Convex Auth](https://auth.convex.dev/) with Anonymous auth for easy sign-in. You may wish to configure additional auth providers before deploying to production.

## 📦 Available Scripts

- `bun run dev` - Start both frontend and backend development servers
- `bun run dev:frontend` - Start only the Vite frontend server
- `bun run dev:backend` - Start only the Convex backend server
- `bun run build` - Build the application for production
- `bun run lint` - Run TypeScript and ESLint checks

## 🌐 Convex Deployment

This project is connected to the Convex deployment: [`incredible-otter-369`](https://dashboard.convex.dev/t/gordo/pindeck/incredible-otter-369)

## 📚 Learn More

- [Convex Documentation](https://docs.convex.dev/)
- [Convex Overview](https://docs.convex.dev/understanding/)
- [Hosting and Deployment](https://docs.convex.dev/production/)
- [Best Practices](https://docs.convex.dev/understanding/best-practices/)
- [Chef Documentation](https://docs.convex.dev/chef)

## 🛣️ HTTP API

User-defined HTTP routes are defined in `convex/router.ts`. Authentication routes are separated in `convex/http.ts` for security.
