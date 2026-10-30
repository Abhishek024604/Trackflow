---
id: stack
status: draft
version: 1
owner: architect
inputs:
  - path: 00-drivers.md
    hash: a331bd9c09a8a512
  - path: inputs/goal.md
    hash: 509a3c425027baf1
  - path: inputs/srs.md
    hash: cba792f25ffd162d
---

# Technology stack

## Architecture style

**Modular monolith (full-stack Next.js)** — chosen for a 1-week MVP (CON-002), minimal dependencies (CON-001), free-tier hosting (CON-003), and small team size (3-15, NFR-001). A single deployable with clear module boundaries (auth, workspace, board, comments/feed, AI) avoids microservice overhead. See ADR-001.

## Stack by layer

| Layer | Technology | Choice reason | Constraint / source |
| ----- | ---------- | ------------- | ------------------- |
| Runtime / Framework | Next.js (App Router) + TypeScript | Full-stack framework: API routes + React UI in one deploy; free-tier Vercel support; minimal dependency overhead | CON-001, CON-003 |
| Database | Postgres (Neon) | Free tier available; relational data fits team/workspace/issue/comment/feed model; Prisma ORM support | CON-001, CON-003, NFR-003 |
| ORM / Schema | Prisma | Type-safe schema with Postgres; migrations; aligns with TypeScript | CON-001 |
| Auth | Auth.js (NextAuth v5 / Auth.js) | Email/password + GitHub OAuth built-in; minimal config; fits free tier | CON-001, FR-005 |
| UI / Styling | Tailwind CSS + shadcn/ui | Minimal dependencies; responsive components (NFR-005, 320px); fast build | CON-001, NFR-005 |
| Deployment | Vercel (free tier) | Git-based deploy; zero-config for Next.js; free hosting (CON-003) | CON-003 |
| AI / LLM | Adapter interface (`LLMService`) | On-demand calls only (NFR-006); no real-time dependency; abstracted to allow any free/minimal endpoint; avoids paid service lock-in (CON-003) | CON-005, NFR-006 |
| Storage | Postgres only (no S3 / file uploads) | Free tier; avoids external paid storage (CON-003, CON-004) | CON-003, CON-004 |
| Testing / Quality | TypeScript (compile-time), minimal runtime tests for MVP (assumed) | 1-week delivery (CON-002) | CON-002 |

## Deployment model

Single Vercel deploy (free tier): Next.js App Router serves both UI pages and `/api/*` endpoints. Postgres (Neon) is an external managed service. No separate container orchestration needed; free-tier constraints (CON-003) prevent container clusters.

## Not chosen (and why)

- Microservices: Overhead exceeds 1-week timeline (CON-002) and small team (NFR-002).
- MongoDB / NoSQL: Unnecessary for structured team/workspace/issue relationships; Prisma + Postgres faster for MVP.
- External file storage (S3): No file uploads required by stories; avoids paid service (CON-003, CON-004).
- Separate backend (Express/FastAPI): Next.js App Router covers API needs; reduces deploy surface.
- Real-time WebSockets: Not required by stories; activity feed updates on page load per AC-010 (MVP).
