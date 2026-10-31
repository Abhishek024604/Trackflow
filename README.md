# TrackFlow

Lightweight AI-powered issue tracker for small software teams (3-15 people) with Kanban boards, team workspaces, threaded comments, activity feeds, and AI-driven priority/categorization suggestions.

## Tech Stack

- **Framework**: Next.js 14 (App Router) + TypeScript
- **Database**: PostgreSQL (Neon) + Prisma ORM
- **Authentication**: Auth.js (NextAuth v5) - Email/Password + GitHub OAuth
- **Styling**: Tailwind CSS + shadcn/ui components
- **Deployment**: Vercel (free tier)
- **Testing**: Jest + React Testing Library

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (local or Neon)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy the environment file:
   ```bash
   cp .env.example .env
   ```
4. Update `.env` with your database URL and auth secrets
5. Set up the database:
   ```bash
   npm run db:generate
   npm run db:push
   ```
6. Start the development server:
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema to database
- `npm run db:migrate` - Run migrations
- `npm run db:studio` - Open Prisma Studio

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   │   ├── auth/          # Authentication endpoints
│   │   └── teams/         # Team management endpoints
│   ├── auth/              # Auth pages (signin, signup)
│   ├── dashboard/         # User dashboard
│   └── teams/             # Team workspace pages
├── components/
│   └── ui/                # Reusable UI components
├── lib/                   # Utility functions and configurations
│   ├── auth.ts            # Auth.js configuration
│   ├── prisma.ts          # Prisma client
│   └── utils.ts           # Helper functions
├── middleware.ts          # Route protection middleware
└── prisma/
    └── schema.prisma      # Database schema
```

## Features Implemented (STORY-001)

- ✅ User Sign Up with email/password
- ✅ User Sign In with email/password
- ✅ GitHub OAuth (configured, requires credentials)
- ✅ Create Team workspace
- ✅ Invite team members
- ✅ View team members with roles
- ✅ Sign Out
- ✅ Session persistence (30 days)
- ✅ Error handling (duplicate email, invalid credentials, etc.)
- ✅ Password validation (min 8 characters)
- ✅ Route protection middleware

## Architecture

This project follows the ParallelFlow SWA (Structured Software Architecture) methodology:

- **CMP-001**: Web Client (Next.js App Router)
- **CMP-002**: Auth Module (Auth.js)
- **CMP-003**: Workspace Module (Teams, Members)
- **CMP-004**: Board & Issue Module
- **CMP-005**: AI Module
- **CMP-006**: Comments & Feed Module
- **CMP-007**: Database (Prisma + Postgres)

## License

MIT