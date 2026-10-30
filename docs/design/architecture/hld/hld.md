---
id: HLD
status: draft
version: 2
owner: architect
inputs:
  - path: 00-drivers.md
    hash: a331bd9c09a8a512
  - path: stack.md
    hash: ea0aaa1d54cb1e14
  - path: model.yaml
    hash: c0048499bc4e2541
  - path: decisions/ADR-0001-architecture-style.md
    hash: d9dfbee2935977d2
  - path: decisions/ADR-0002-postgres-prisma.md
    hash: 239a3fe60cb22553
---

# TrackFlow — High-level design (HLD)

## Overview

A modular monolith (ADR-0001) built on Next.js App Router (full-stack TypeScript) with a Postgres (Neon) database and Prisma ORM (ADR-0002). The deployable is a single Vercel free-tier instance serving both the React UI (CMP-001) and API routes (CMP-002 to CMP-006). The database and optional LLM adapter are external services.

The system covers three stories: Story 001 (auth & workspace), Story 002 (board & AI), Story 003 (comments & feed). Each story maps directly to a flow (FLW-001, FLW-002, FLW-003) and to components in model.yaml.

## Context

External actors: Team Lead, Team Member, Guest, GitHub OAuth provider, LLM provider. External systems: Neon Postgres (DB), Vercel (hosting), GitHub (auth). The system sits behind HTTPS on Vercel; data never leaves the DB by default (NFR-004) except for the optional, on-demand LLM call (FR-003/FR-004) which is abstracted behind CMP-005.

Diagram: `hld/context.drawio` (generated from model.yaml).

## Containers (components)

| Component | Responsibility | Technology | Satisfies | ADRs |
| --------- | -------------- | ---------- | --------- | ---- |
| CMP-001 Web Client | UI pages, navigation, responsive layout | Next.js App Router + TypeScript + Tailwind + shadcn/ui | FR-001, 002, 005, 006, 007, 008, 009, 010; NFR-002, 005 | ADR-0001, 0002 |
| CMP-002 Auth Module | Auth.js email/GitHub OAuth, session, protected routes | Auth.js (NextAuth) | FR-005; NFR-004 | ADR-0001 |
| CMP-003 Workspace Module | Team/workspace CRUD, board columns, members | Next.js API routes + Prisma | FR-002, 006, 010 | ADR-0001, 0002 |
| CMP-004 Board & Issue Module | Issue CRUD, Kanban logic, search, assignment | Next.js API routes + Prisma | FR-001, 002, 009, 010 | ADR-0001, 0002 |
| CMP-005 AI Module | On-demand priority/categorization via LLM adapter | TypeScript adapter interface + external LLM | FR-003, 004; NFR-006; CON-005 | ADR-0001 |
| CMP-006 Comments & Feed Module | Threaded comments, @mentions, edit/delete, feed events | Next.js API routes + Prisma | FR-007, 008; NFR-001, 006 | ADR-0001, 0002 |
| CMP-007 Database | Postgres (Neon) persistence for all entities | Postgres + Prisma schema | NFR-003; CON-001 | ADR-0002 |

Diagram: `hld/containers.drawio`.

## Key flows

### FLW-001 — Auth & Workspace Setup (STORY-001)

Trigger: Team Lead navigates to the app and creates a team/workspace.
Steps (see model.yaml): Web Client → Auth → DB → Workspace → Board initialization.
Quality: NFR-002 (<5 min onboarding). Failure: Auth error returns to sign-in page with message; workspace creation failure shows validation errors.

### FLW-002 — Issue Board & AI Suggestions (STORY-002)

Trigger: Team Member opens board or creates an issue.
Steps: Web Client fetches board (via CMP-004) → DB query; issue creation updates DB; AI request (optional) goes through CMP-005 adapter to LLM provider and returns a non-binding suggestion (CON-005). 
Quality: NFR-001 (<2s board load) requires efficient DB queries (index on team + status). NFR-006 requires AI to be called only on user action, never on page load or in real-time. CON-005 ensures suggestions are never enforced automatically.

### FLW-003 — Comments & Activity Feed (STORY-003)

Trigger: Team Member views issue detail, posts a comment, mentions a teammate.
Steps: Web Client → Comments Module → DB (persist comment + mention tag). Activity feed is generated as an event in DB; shown on page load (AC-010 MVP: refresh on load, not WebSocket). Filtering (my/all) is done at query time.
Quality: NFR-001 (<2s load) requires indexed feed queries. NFR-006 satisfied because feed updates only on request/reload.

Diagrams: `hld/flows/FLW-001.drawio`, `hld/flows/FLW-002.drawio`, `hld/flows/FLW-003.drawio`.

## Data

Main entities (owned by CMP-007, schema in `prisma/schema.prisma`):
- User (auth identity, email, GitHub ID)
- Team (name, members, settings)
- Workspace / Board Columns (team-linked column definitions)
- Issue (title, description, priority, category, status/column, assignee, team FK)
- Comment (text, author, issue FK, parent comment FK for threading, createdAt)
- Feed Event (actor, action description, target issue/comment, team FK, timestamp)
- Mention / Mention Tag (comment reference to user for notification hints; MVP: visible in feed only)

Retention/residency: All persistent data in Neon Postgres (free tier, EU/US region depending on Neon config — architect to confirm). No data sent to third parties by default (NFR-004). Optional LLM call (FR-003/FR-004) sends only the issue title/content; no other DB data is transmitted. Data residency: architect to confirm region for G2 approval.

## Deployment

Single Vercel deploy (free tier): all CMP-001 to CMP-006 run in the same Next.js app. No container orchestration needed. Neon Postgres is an external managed service. LLM provider is called via HTTPS from the server (API route), not the browser, keeping API keys server-side.

Diagram: `hld/deployment.drawio`.

Environments: Production only for MVP (CON-002, 1-week timeline). No staging environment required; testing done locally or via preview deploys on Vercel.

Scaling: Free-tier limits apply (Vercel function execution limits, Neon connection limits). Design assumption: team up to 15 members, no concurrent load beyond single-user patterns (NFR-001). If load exceeds free-tier limits, upgrade path: paid Vercel tier or separate backend deploy.

Failover: Vercel handles deploy-level failover. Postgres failover handled by Neon managed service. For MVP, no custom failover logic required (CON-003, CON-002).

## Cross-cutting concerns

### Security (identity, trust boundaries, secrets)
- Auth.js manages identity; session tokens stored in cookies (HTTP-only, secure). Trust boundary: browser → Vercel (HTTPS) → Next.js app → Neon DB. No external calls except GitHub OAuth and optional LLM.
- Secrets (DB URL, Auth.js secrets, LLM API key) stored in Vercel environment variables; not committed. NFR-004 (no data to third parties by default) enforced by making LLM adapter optional and explicit.
- Guest access (ACT-003) enforced by middleware checking workspace visibility rules.

### Observability
- Minimal for MVP (CON-002). Next.js provides server logs; Vercel provides deploy logs. No dedicated monitoring service (free tier constraint, CON-003). Errors captured in API responses; no external error tracking.

### Resilience
- DB connection pooling via Prisma; Neon manages connection limits. If DB unreachable, API routes return 500 with error message.
- LLM adapter failure handled gracefully: if LLM provider fails, AI feature shows "suggestion unavailable" rather than blocking the board (NFR-006, CON-005).

### Configuration
- Environment variables (Vercel): DATABASE_URL, AUTH_SECRET, GITHUB_ID, GITHUB_SECRET, LLM_API_KEY (optional). No external config service.

## Quality scenarios

| Scenario | How the design meets it | Components |
| -------- | ----------------------- | ---------- |
| NFR-001 (<2s board load) | Indexed DB queries (team + status + assignee); single deploy reduces network hops; Prisma query optimization | CMP-001, CMP-004, CMP-007 |
| NFR-002 (<5 min onboarding) | Auth.js pre-built flows; minimal form fields; default board columns; no extra setup steps | CMP-001, CMP-002, CMP-003 |
| NFR-003 (99% uptime) | Neon managed Postgres; Vercel deploy with built-in redundancy; no custom infrastructure to maintain | CMP-007, Vercel |
| NFR-004 (no third-party data) | Default mode: no LLM call; data only in DB; optional LLM adapter only sends title/content, never full DB | CMP-005, CMP-007 |
| NFR-005 (mobile responsive) | Tailwind responsive utilities; shadcn/ui components responsive by default; min-width 320px tested | CMP-001 |
| NFR-006 (AI on-demand) | AI adapter called only from user-initiated API endpoint (`/api/ai/suggest`); not triggered by page load or webhook | CMP-005 |

## Open issues

- LLM provider / API endpoint (Q2 from 00-drivers.md): Does not block HLD; design uses abstract adapter. Confirm provider and key storage for G2 / LLD.
- Data residency / region for Neon Postgres: Confirm for G2 (affects NFR-003, NFR-004).
- Guest access rules (ACT-003): Confirm if guests can see comments/feed or only board; affects CMP-006 query filters.
- Real-time feed vs. refresh-on-load (AC-010): Design assumes refresh-on-load for MVP; confirm if WebSocket upgrade is planned for future.
