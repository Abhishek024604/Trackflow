---
id: ADR-002
status: draft
version: 1
owner: architect
inputs:
  - path: 00-drivers.md
    hash: a331bd9c09a8a512
  - path: inputs/goal.md
    hash: 509a3c425027baf1
  - path: stack.md
    hash: ea0aaa1d54cb1e14
---

# ADR-002: Postgres (Neon) with Prisma ORM

## Status

Proposed (awaiting G1 approval)

## Context

Data model includes users, teams, workspaces, issues (with status, priority, category), comments (threaded), and feed events. Relational constraints apply (team membership, issue assignees, comment threads). Free-tier hosting required (CON-003), 99% uptime needed (NFR-003), and TypeScript end-to-end preferred (CON-001).

## Decision

Use **Postgres via Neon (free tier)** with **Prisma ORM** for schema definition, migrations, and type-safe queries.

## Options considered

1. **MongoDB / NoSQL**: Rejected — relational structure fits data model; Prisma has weaker MongoDB TypeScript support; no free-tier MongoDB aligns well.
2. **SQLite (embedded)**: Rejected — multi-user concurrent access requires server-side DB; SQLite insufficient for team workspace concurrency (NFR-003).
3. **Supabase (free tier)**: Considered but rejected — introduces external service with different auth model; Neon + Prisma + Auth.js keeps auth and DB separate (NFR-004, data privacy).
4. **Raw SQL (no ORM)**: Rejected — increases development time beyond 1-week timeline (CON-002); type safety needed.

## Consequences

- Positive: Type-safe schema; migrations tracked; Neon provides free tier with connection pooling; aligns with Node.js/Next.js.
- Positive: Prisma Client runs in API routes with minimal overhead (NFR-001).
- Risk: Neon free tier has connection limits; mitigated by connection pooling and single-deploy architecture.
- Trade-off: Vendor lock-in to Postgres; acceptable for MVP.

## References

- arch/stack.md
- FR-001, FR-002, FR-005, FR-006, FR-007, FR-008
- NFR-003, CON-001, CON-003
