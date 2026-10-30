---
id: ADR-001
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

# ADR-001: Modular monolith with full-stack Next.js

## Status

Proposed (awaiting G1 approval)

## Context

Requirements: 1-week MVP (CON-002), free hosting only (CON-003), small team (3-15, NFR-001), minimal dependencies (CON-001). The system needs auth (FR-005), workspace management (FR-006), board (FR-002), comments/feed (FR-007, FR-008), AI suggestions (FR-003, FR-004), and search (FR-009).

## Decision

Use a **modular monolith** built on **Next.js App Router (full-stack)**: React UI + TypeScript + Next.js API routes (`/api/*`) in a single deployable, backed by Postgres via Prisma.

## Options considered

1. **Microservices** (Express + React separate deploys): Rejected — exceeds 1-week timeline (CON-002), introduces deployment overhead, requires separate hosting for backend and frontend.
2. **Serverless functions** (Vercel Functions only): Rejected — no persistent DB connection pooling; complex for relational data; limits Prisma usage.
3. **Monorepo with separate backend/frontend repos**: Rejected — unnecessary overhead for MVP scope (CON-004).

## Consequences

- Positive: Single deploy; minimal infrastructure cost; fast iteration for 1-week timeline; TypeScript end-to-end.
- Positive: Next.js App Router handles routing, API, and SSR/SSG out of the box.
- Risk: Less isolation between modules; mitigated by clear component/module boundaries (auth, workspace, board, comments/feed, AI adapter).
- Trade-off: Scaling beyond 15 members may require refactoring to microservices later, but this is acceptable for MVP.

## Requirements tied

- FR-001, FR-002, FR-005, FR-006, FR-007, FR-008 (core features delivered in single deploy)
- CON-002 (timeline), CON-003 (free tier), CON-004 (scope)
- NFR-001 (performance via single deploy), NFR-002 (simplicity via single framework)

## References

- arch/stack.md
