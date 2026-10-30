---
id: DB-SCHEMA
status: draft
version: 1
owner: architect
inputs:
  - path: model.yaml
    hash: c0048499bc4e2541
  - path: lld/CMP-002/lld.md
    hash: 6830b7bb8979804c
  - path: lld/CMP-003/lld.md
    hash: 63cdd250fb566741
  - path: lld/CMP-004/lld.md
    hash: 85b7d2a079319185
  - path: lld/CMP-006/lld.md
    hash: 76c9cfb59a8ef194
  - path: decisions/ADR-0002-postgres-prisma.md
    hash: 239a3fe60cb22553
---

# Database Schema (Prisma) — CMP-007

## Technology
Postgres (Neon) + Prisma ORM (ADR-0002)

## Entities and relationships

See `prisma/schema.prisma` for full definition. Key entities:

| Entity | Fields | Relationships |
| ------ | ------ | ------------- |
| User | id, email, name, githubId, createdAt, updatedAt | TeamMember[].members, Comment[].author, Issue[].assignee, FeedEvent[].actor, MentionTag[].user |
| Team | id, name, ownerId, createdAt | TeamMember[], Issue[], BoardColumn[], FeedEvent[] |
| TeamMember | id, teamId, userId, role (LEAD/MEMBER), createdAt | Team, User |
| BoardColumn | id, teamId, name, order, color | Team, Issue[] |
| Issue | id, title, description, status (maps to column name or enum), priority, category, assigneeId, teamId, createdAt, updatedAt | Team, User (assignee), BoardColumn?, Comment[] |
| Comment | id, text, issueId, authorId, parentId (threading), createdAt, updatedAt | Issue, User (author), Comment (parent), MentionTag[] |
| MentionTag | id, commentId, userId | Comment, User |
| FeedEvent | id, teamId, actorId, action, targetType, targetId, description, timestamp | Team, User (actor) |

## Key indexes

- User.email (unique), User.githubId (unique)
- TeamMember.(teamId + userId) unique; TeamMember.userId
- Issue.(teamId + status), Issue.assigneeId, Issue.createdAt DESC
- Comment.(issueId + createdAt DESC)
- FeedEvent.(teamId + timestamp DESC), FeedEvent.actorId
- Full-text index on Issue.(title + description) for FR-009

## Constraints

- Issue.assigneeId references User; null allowed (unassigned).
- Comment.parentId references Comment for threading; null = top-level.
- TeamMember.role limited to LEAD / MEMBER (enforced in application layer; could add DB check constraint).
- Issue.status references BoardColumn.name or a status enum; design decision: map status to column name for Kanban simplicity.

## Schema file

Full Prisma schema saved separately (see workspace files; saved as `prisma/schema.prisma` in repo root per Next.js convention). The file above (under `arch/`) describes the design; the actual `.prisma` file is part of the repo.
