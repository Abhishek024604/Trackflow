# TrackFlow - Story 003

## YAML Frontmatter
id: 01-story-003
status: draft
version: 1.0
owner: AI Assistant
updated_at: 2026-10-30T06:53:00Z
inputs: pm-00-discovery.md, pm › requirements.md, pm › backlog › EPIC-001.md, pm › backlog › STORY-001.md, pm › backlog › STORY-002.md

## Story

**Title**: Comments & Team Activity Feed

**User Story**: As a Team Member, I want to comment on issues and see team activity, so that I can collaborate effectively and stay informed.

**Epic**: EPIC-001
**Story ID**: STORY-003

**Description**:
This story covers team collaboration features. Users can add threaded comments to issues with @mentions, and view a team-wide activity feed showing recent changes (issue creation, updates, comments). This keeps the team aligned without external communication tools.

**Related Requirements**:
- FR-007: Issue Comments
- FR-008: Activity Feed
- NFR-001: Performance
- NFR-002: Simplicity

**Acceptance Criteria**:

### AC-001: Add Comment to Issue
- **Given** I am viewing an issue detail page
- **When** I type in the comment box and click "Post"
- **Then** my comment appears below the issue with my name and timestamp

### AC-002: Empty Comment Validation
- **Given** I am on an issue detail page
- **When** I click "Post" without typing anything
- **Then** I see an error: "Comment cannot be empty"

### AC-003: Threaded Replies
- **Given** an existing comment on an issue
- **When** I click "Reply" and submit my response
- **Then** my reply appears indented under the original comment

### AC-004: @Mention Team Member
- **Given** I am typing a comment
- **When** I type "@" and select a team member from the autocomplete
- **Then** the mention is highlighted and the mentioned user is notified (in MVP: visible in feed)

### AC-005: Edit Own Comment
- **Given** I posted a comment
- **When** I click the "Edit" icon on my comment
- **Then** I can modify the text and save changes

### AC-006: Delete Own Comment
- **Given** I posted a comment
- **When** I click the "Delete" icon and confirm
- **Then** the comment is removed with a "Comment deleted" placeholder

### AC-007: View Activity Feed
- **Given** I am on the team workspace dashboard
- **When** I view the activity feed sidebar
- **Then** I see a chronological list of recent team actions

### AC-008: Activity Feed Events
- **Given** various team actions occur
- **When** an issue is created, updated, or commented on
- **Then** the feed shows: user avatar, action description ("created issue X", "commented on Y"), and timestamp

### AC-009: Activity Feed Filtering
- **Given** I am viewing the activity feed
- **When** I filter by "My Activity" or "All Team"
- **Then** the feed updates to show only my actions or all team actions

### AC-010: Real-time Feed Updates
- **Given** I am viewing the activity feed
- **When** another team member performs an action
- **Then** the new event appears in the feed without page refresh (MVP: refresh on page load)

### AC-011: Comment Count on Board
- **Given** I am on the board view
- **When** an issue has comments
- **Then** a comment count badge appears on the issue card

### AC-012: Markdown Support in Comments
- **Given** I am writing a comment
- **When** I use basic markdown (bold, code blocks, links)
- **Then** the rendered comment displays the formatted text

**Edge Cases**:
- User @mentions someone not in the team → Autocomplete only shows team members
- Comment exceeds 5000 characters → Truncate with "Show more" link
- User deletes a parent comment with replies → Replies remain with "Parent comment deleted"
- Activity feed shows 50 events max → Load more button for pagination
- Guest user tries to comment → Block with "Upgrade to member to comment"

**Technical Notes**:
- Comments table: id, issue_id, user_id, parent_comment_id, content, created_at
- Activity feed: denormalized table or computed view for performance
- Use markdown-it or similar for safe markdown rendering
- @mention autocomplete from team_memberships
- Consider WebSocket for real-time feed (MVP: simple polling or page refresh)

---
*Document ID: 01-story-003*
*Status: draft*
*Version: 1.0*
*Owner: AI Assistant*
*Updated: 2026-10-30T06:53:00Z*
*Inputs: pm-00-discovery.md, pm › requirements.md, pm › backlog › EPIC-001.md, pm › backlog › STORY-001.md, pm › backlog › STORY-002.md*