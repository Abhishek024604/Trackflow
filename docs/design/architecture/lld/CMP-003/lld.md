---
id: LLD-CMP-003
status: draft
version: 1
owner: architect
component: CMP-003
inputs:
  - path: model.yaml
    hash: c0048499bc4e2541
  - path: hld/hld.md
    hash: 3266a94b7fd468fb
  - path: stack.md
    hash: ea0aaa1d54cb1e14
---

# LLD: CMP-003 Workspace Module

## Responsibility

Manages team creation, workspace settings, board column customization, and team members. Delegates authentication checks to CMP-002. Does NOT manage issue data (CMP-004) or comments (CMP-006).

Satisfies: FR-002 (board customization via columns), FR-006 (team/workspace), FR-010 (assignment references team members). Uses ADR-0002 (Prisma + Postgres).

## Internal structure

Modules:
- `team-api`: Team creation, member invite, settings
- `workspace-api`: Board column definitions (To Do, In Progress, Done + custom)
- `member-manager`: Member roles (Lead vs Member) and access rules

## Interfaces it provides

`openapi.yaml`: `/api/teams/*`, `/api/workspaces/*`.

## Dependencies

| Component | Operation / event | Why | On failure |
| --------- | ----------------- | --- | ---------- |
| CMP-002 Auth Module | session check (via middleware in CMP-001) | Verify user is team member or guest | Return 403; redirect to auth |
| CMP-007 Database | queries / writes team, workspace, member data | Persistence | Return 500; no automatic retry at module layer |
| CMP-004 Board Module | reads board column config; writes when team creates board | Board initialization and updates | If CMP-004 unavailable, workspace creation continues (columns initialized later) |

## Data model (entities it owns in CMP-007)

- Team (id, name, ownerId, createdAt)
- TeamMember (teamId, userId, role: LEAD | MEMBER, createdAt)
- BoardColumn (id, teamId, name, order, color)

Indexes: Team.name (optional); TeamMember.userId; BoardColumn.teamId + order.

## Key sequences

- Create team: CMP-001 → CMP-003 POST /api/teams → CMP-007 insert Team + TeamMember (owner as LEAD) → CMP-004 initialize default BoardColumns.
- Invite member: CMP-003 POST /api/teams/{id}/members → CMP-007 insert TeamMember; CMP-006 may trigger feed event (optional for MVP).

## Error handling

- Duplicate team name: return 409; do not retry.
- DB connection failure: return 500; log error (no PII).
- Invalid member role: return 400; no retry.

## Security

- Route guard (CMP-002 middleware) ensures only team members can modify workspace settings; guests (ACT-003) have read-only access to board (not workspace settings).
- Member invitation: only Team Leads (ACT-001) can invite; enforced in API route.
