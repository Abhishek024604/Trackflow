# TrackFlow - Project Goal

## YAML Frontmatter
id: 01-goal
status: draft
version: 1.0
owner: AI Assistant
updated_at: 2026-10-30T09:25:00Z
inputs: pm-00-discovery.md, pm-evidence.md, pm-questions.md

## Goal Statement

Create an AI-powered, lightweight Linear-style issue tracker for small software teams (3-15 people) who find Jira too heavy.

## Outcomes

- Team members can securely access their workspace via email/password and GitHub OAuth
- Teams can track work visually on a Kanban board with customizable columns
- Team members can collaborate through threaded comments with @mentions
- Team-wide activity feed shows recent changes (issue creation, updates, comments)
- AI suggests priority and categorization for issues on demand
- All features work within free-tier hosting constraints

## MVP Scope (from requirements)

**Core Features (3 Stories):**
1. **Story 001**: Authentication & Team Workspace - User auth (email/password + GitHub), team creation/join, workspace dashboard
2. **Story 002**: Issue Board & AI - Kanban board, issue CRUD, AI priority/categorization suggestions, search, assignment
3. **Story 003**: Comments & Activity Feed - Threaded comments with @mentions, edit/delete own comments, activity feed with filtering

**Tech Stack (CON-001):**
- Backend: Node.js with Postgres (Neon), Prisma ORM
- Frontend: Next.js App Router + TypeScript, Tailwind + shadcn/ui
- Auth: Auth.js (email + GitHub)
- Deployment: Vercel (free tier)

**Constraints:**
- 1 week delivery timeline (CON-002)
- Free hosting only (CON-003)
- No billing, payments, notifications, mobile apps, integrations (CON-004)
- AI features are suggestions only (CON-005)

## Success Metrics

- Board loads in < 2 seconds for teams up to 15 (NFR-001)
- Team setup + first issue in < 5 minutes (NFR-002)
- 99% uptime (NFR-003)
- Mobile responsive down to 320px (NFR-005)
- AI runs on-demand, not real-time (NFR-006)

---
*Document ID: 01-goal*
*Status: draft*
*Version: 1.0*
*Owner: AI Assistant*
*Updated: 2026-10-30T09:25:00Z*