# Campooling (Carnpooling) Project Overview

Campooling is a specialized carpooling and taxi-sharing application designed for commuters, particularly focused on military base environments like Camp Humphreys. The app allows users to find, create, and join "pods" (sharing sessions) to split fares and share rides between key locations.

## Tech Stack

- **Framework:** [Next.js 16/19](https://nextjs.org/) (App Router)
- **Library:** [React 19](https://react.dev/)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS 4](https://tailwindcss.com/)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Fonts:** Geist & Geist Mono (via `next/font`)

## Project Structure

```text
/home/mooncreat/projects/campooling/
├── app/                  # Next.js App Router directory
│   ├── chat/[id]/        # Dynamic chat room for each pod
│   ├── components/       # Shared UI components (e.g., BottomNav)
│   ├── create/           # Pod creation workflow
│   ├── feed/             # Main feed of available pods
│   ├── profile/          # User profile and active room status
│   ├── signup/           # User signup and profile creation
│   ├── globals.css       # Global styles and Tailwind imports
│   ├── layout.tsx        # Root layout with font and metadata configuration
│   └── page.tsx          # Onboarding / Landing page (Google Login mock)
├── lib/                  # Shared utilities and helpers
│   └── userProfile.ts    # User profile data model and local storage logic
├── public/               # Static assets (SVGs, favicon)
├── tsconfig.json         # TypeScript configuration (path alias: @/* -> ./*)
├── package.json          # Dependencies and scripts
└── postcss.config.mjs    # PostCSS configuration for Tailwind CSS 4
```

## Key Commands

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the development server on `localhost:3000` |
| `npm run build` | Compiles the application for production |
| `npm run start` | Runs the built application in production mode |
| `npm run lint` | Executes ESLint to check for code quality issues |

## Development Conventions

- **Mobile-First Design:** The UI is optimized for mobile devices with a persistent `BottomNav` and responsive layouts.
- **Styling:** Use Tailwind CSS 4 utility classes for all styling. Avoid custom CSS unless necessary (manage via `globals.css`).
- **Icons:** Use `lucide-react` for consistent iconography.
- **Mock Data:** Currently, the app uses mock data for pods and some locations. User profile state (nickname, role) is managed via `localStorage`. Backend integration (e.g., real Google Auth, database) remains a TODO.
- **Type Safety:** Maintain strict TypeScript definitions for all props and state.
- **Path Aliases:** Use `@/` to reference the project root (e.g., `import BottomNav from '@/app/components/BottomNav'`).
- **Interactive Pages:** Use the `"use client"` directive at the top of files that require React hooks or client-side interactivity.

## Core Features

1.  **Onboarding & Signup:** A clean entry point with stylized branding and a mock Google Login, leading to a signup flow to define the user's nickname and role (KATUSA or U.S. Army).
2.  **Pod Feed:** Categorized list of available ride-sharing sessions with status indicators (Active/Full).
3.  **Pod Creation:** A step-by-step UI for selecting routes (origin/destination, including a custom/other location option), dates (next 7 days), times, and capacity.
4.  **Profile & Active Session:** Quick access to user information and the currently joined pod's chat/details.
5.  **Chatting:** Real-time communication within joined pods to coordinate pick-ups and ride details.
