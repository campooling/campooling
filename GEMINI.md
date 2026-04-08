# Campooling (Carnpooling) Project Overview

Campooling is a specialized carpooling and taxi-sharing application designed for commuters, specifically optimized for military base environments like Camp Humphreys. The app allows users to create and join "pods" (ride-sharing sessions) to split fares and share rides between key locations.

## Tech Stack

- **Framework:** [Next.js 16/19](https://nextjs.org/) (App Router, Turbopack)
- **Library:** [React 19](https://react.dev/)
- **Backend/Auth:** [Supabase](https://supabase.com/) (PostgreSQL + Realtime + Google OAuth)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS 4](https://tailwindcss.com/)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Fonts:** Geist & Geist Mono (via `next/font`)

## Project Structure

```text
/home/mooncreat/projects/campooling/
├── app/                  # Next.js App Router directory
│   ├── auth/callback/    # Server-side Google OAuth handler
│   ├── chat/[id]/        # Real-time WebSocket chat room
│   ├── components/       # Shared UI (BottomNav, etc.)
│   ├── create/           # Pod creation workflow
│   │   └── other-location/ # Manual location input UI
│   ├── feed/             # Main pod list (real-time SQL query)
│   ├── profile/          # User profile & joined active pods
│   ├── signup/           # User onboarding & profile record setup
│   ├── globals.css       # Tailwind 4 & global styles
│   ├── layout.tsx        # Root layout (Geist font, metadata)
│   └── page.tsx          # Landing page (Google Login trigger)
├── lib/                  # Shared utilities
│   ├── supabase/         # Supabase clients (client, server, middleware-helper)
│   └── userProfile.ts    # Legacy types & helper functions
├── proxy.ts              # Next.js 16 Proxy (Route protection/Session refresh)
├── supabase_schema.sql   # SQL schema for profiles, pods, members, and messages
├── package.json          # Deps & scripts (NODE_OPTIONS memory limit)
├── next.config.ts        # Next.js configuration
└── tsconfig.json         # TypeScript config (path alias: @/* -> ./*)
```

## Key Commands

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts dev server (Turbopack + 8GB memory limit) |
| `npm run build` | Compiles the application for production |
| `npm run start` | Runs the production build |
| `npm run lint` | Executes ESLint for code quality checks |

## Development Conventions

- **Mobile-First Design:** UI is optimized for mobile with a persistent `BottomNav` and responsive layouts.
- **Backend Architecture:** All persistent state (Auth, Pods, Messages) is managed via Supabase SQL. No data is stored in `localStorage` for primary app state.
- **Real-time:** The app uses Supabase Realtime (WebSockets) for the Chat and the Feed to ensure instant updates.
- **Route Protection:** Handled via `proxy.ts`. Unauthenticated users are redirected to `/`, and users without profiles are guided to `/signup`.
- **Database Logic:** 
    - `profiles`: Linked to `auth.users` via UUID.
    - `pods`: Ride sessions with `status` (active/full/completed).
    - `pod_members`: Junction table for pod participants.
    - `messages`: Chat logs linked to pods and users.
- **Automatic Cleanup:** (Planned/Trigger-based) Deleting empty pods when the last member leaves via PostgreSQL triggers.

## Core Features

1.  **Google Authentication:** Secure login via Google Cloud OAuth 2.0.
2.  **User Onboarding:** Cleanup flow to define nicknames and roles (KATUSA/USA_ARMY).
3.  **Dynamic Feed:** Real-time categorized list of available pods with live seat counts.
4.  **Pod Creation:** Integrated workflow with support for preset military base locations or custom "Other" locations.
5.  **Instant Coordination:** Real-time chat for joined pod members to organize pick-ups.
6.  **Profile Management:** Access to personal settings and active joined ride sessions.
