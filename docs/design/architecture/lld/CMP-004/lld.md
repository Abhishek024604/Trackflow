---
id: LLD-CMP-004
status: draft
version: 1
owner: architect
component: CMP-004
inputs:
  - path: model.yaml
    hash: c0048499bc4e2541
  - path: hld/hld.md
    hash: 3266a94b7fd468fb
  - path: stack.md
    hash: ea0aaa1d54cb1e14
  - path: decisions/ADR-0002-postgres-prisma.md
    hash: 239a3fe60cb22553
---

# LLD: CMP-004 Board & Issue Module

## Responsibility

Core issue tracking: create/update/delete/search/assign issues; Kanban board rendering; priority and category fields; AI adapter calls (to CMP-005) for suggestions (FR-001, FR-002, FR-009, FR-010). Uses ADR-0002 (Postgres/Prisma) and ADR-0001 (full-stack).

Does NOT handle comments (CMP-006) or auth (CMP-002) directly.

## Internal structure

Modules:
- `issue-api`: CRUD endpoints (`/api/issues`)
- `board-api`: Board view query (`/api/boards/{teamId}` with columns and cards)
- `search-api`: Full-text search (`/api/search?q=` with filters)
- `assignment-api`: Assignment updates (`PATCH /api/issues/{id}`)
- `ai-adapter-caller`: Optional call to CMP-005 for suggestions

## Interfaces it provides

`openapi.yaml`: Issue and board endpoints (see `openapi.yaml`).

Operations (summarized):
- `GET /api/boards/{teamId}` — board with columns and issues (FR-002, FR-001, FR-009)
- `POST /api/issues` — create issue (FR-001)
- `PATCH /api/issues/{id}` — update issue (FR-010, FR-003/004 via AI adapter)
- `GET /api/issues/{id}` — issue detail
- `GET /api/search` — full-text search with filters (FR-009)
- `GET /api/ai/suggest` — AI priority/category suggestion (FR-003, FR-004) — delegates to CMP-005

Dependencies from model.yaml:
- CMP-005 AI Module: `GET /api/ai/suggest` (optional, on-demand per NFR-006)
- CMP-007 Database: query/persist issues, board columns
- CMP-003 Workspace Module: reads board column config
- CMP-002 Auth Module: session validation (via middleware)

## Data model (entities it owns in CMP-007)

- Issue (id, title, description, status, priority, category, assigneeId, teamId, createdAt, updatedAt)
- IssueSearchIndex (optional; for full-text search; may use Postgres full-text search or a separate index — for MVP, Postgres `tsvector` is sufficient)

Indexes: Issue.teamId + Issue.status (for board load); Issue.assigneeId; Issue.createdAt DESC (for search/feed). Full-text index on Issue.title + Issue.description.

## Key sequences

- Board load (`sequence-board-load.drawio`): User opens board → CMP-001 calls CMP-004 `GET /api/boards/{teamId}` → CMP-004 queries CMP-007 (issues by team + status, grouped by column) → returns JSON with columns and cards.
- Issue creation (`sequence-issue-create.drawio`): User submits form → CMP-004 validates → inserts into CMP-007 → updates board (optional real-time: page reload per AC-010 for MVP).
- AI suggestion (`sequence-ai-suggestion.drawio`): User clicks "Suggest" → CMP-001 → CMP-004 `GET /api/ai/suggest` → CMP-004 calls CMP-005 → LLM provider → returns priority/category hint → user applies or ignores (CON-005: not enforced).

## Error handling

- Moving issue to Done: if caller is not assignee or project admin (`TeamMember.role != LEAD`), return `403 Forbidden`; no DB write performed for status change. Idempotent retries safe — same 403 until authorization changes.

## Security


### State rules (update authorization)

Moving an issue to the "Done" status (or equivalent final column) is restricted:
- Only the current assignee (`Issue.assigneeId` matches session user id) OR a project admin (team role `LEAD` from TeamMember) may set `status` to `Done`.
- Any other user attempting to set `status` to `Done` receives `403 Forbidden`.
- Updating other fields (title, description, priority, category, assignee, other status values) remains allowed for any team member.
- Guests (ACT-003) cannot modify any issue fields (already enforced by middleware; `PATCH` returns `403` for guests).
