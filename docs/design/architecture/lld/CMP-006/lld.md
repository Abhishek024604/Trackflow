---
id: LLD-CMP-006
status: draft
version: 1
owner: architect
component: CMP-006
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

# LLD: CMP-006 Comments & Feed Module

## Responsibility

Handles threaded comments with @mentions (FR-007, AC-003 to AC-006), edit/delete own comments, team-wide activity feed (FR-008, AC-007 to AC-011), and feed filtering (AC-009). Updates board comment count (AC-011). Delegates persistence to CMP-007; does NOT handle auth directly (uses CMP-002 middleware).

Satisfies: FR-007, FR-008; NFR-001 (performance via indexed queries); NFR-006 (no real-time dependency; refresh on page load per AC-010 MVP).

## Internal structure

- `comment-api`: POST / PATCH / DELETE comments; @mention parsing
- `feed-api`: Query feed events with filters (my/all team)
- `mention-parser`: Parses "@user" mentions; resolves user via CMP-003
- `feed-generator`: Creates feed events on comment/issue actions

## Interfaces it provides

`openapi.yaml`: `/api/issues/{id}/comments`, `/api/feed`.

Operations:
- `POST /api/issues/{id}/comments` — add comment/reply (FR-007, AC-001, AC-003)
- `PATCH /api/comments/{commentId}` — edit own comment (AC-005)
- `DELETE /api/comments/{commentId}` — delete own comment (AC-006)
- `GET /api/feed` — feed events with filter (`?filter=my` or `all`) (FR-008, AC-007, AC-009, AC-010)
- `GET /api/feed?filter=all` — team-wide feed

Dependencies (from model.yaml):
- CMP-002 Auth Module: session check (via middleware in CMP-001)
- CMP-003 Workspace Module: resolve team member for @mentions
- CMP-004 Board Module: comment count update; feed events link to issue
- CMP-007 Database: persist comments, feed events, mentions

## Data model (entities owned by CMP-007)

- Comment (id, text, issueId, authorId, parentCommentId [nullable for threading], createdAt, updatedAt)
- FeedEvent (id, teamId, actorId, action, targetType [issue/comment], targetId, description, timestamp)
- MentionTag (commentId, userId) — links mention to user for visibility in feed (MVP: visible in feed, no email notification per CON-004)

Indexes: Comment.issueId + Comment.createdAt DESC (for threading/loading); FeedEvent.teamId + FeedEvent.timestamp DESC (for feed load); MentionTag.userId (for filtering).

## Key sequences

- Add comment: CMP-001 → CMP-006 POST /api/issues/{id}/comments → parse @mentions → insert Comment + MentionTag + FeedEvent → update CMP-004 comment count → return.
- View feed: CMP-001 → CMP-006 GET /api/feed?filter=all → CMP-007 query FeedEvent by team → return chronological list with user avatar and description (AC-008).
- Real-time (AC-010): For MVP, refresh on page load (no WebSocket). Design supports future upgrade by adding event source.

## Error handling

- Empty comment (AC-002): return 400; no DB write.
- Edit/delete non-own comment: return 403.
- DB failure: return 500; no retry at API layer.
- Mention user not in team: ignore mention (no error; just no highlight).

Idempotency: `PATCH /api/comments/{id}` is idempotent; `POST /api/comments` creates new resource.

## Security

- Only comment author can edit/delete (enforced by comparing session.user.id to Comment.authorId).
- Guests (ACT-003) can view comments and feed but not create/edit/delete.
- Mention resolution uses CMP-003 team membership; no external user lookup by default (NFR-004).
