# TrackFlow - Story 002

## YAML Frontmatter
id: 01-story-002
status: draft
version: 1.0
owner: AI Assistant
updated_at: 2026-10-30T06:52:00Z
inputs: pm-00-discovery.md, pm › requirements.md, pm › backlog › EPIC-001.md, pm › backlog › STORY-001.md

## Story

**Title**: Tasks & Priorities on a Project Board

**User Story**: As a Team Lead, I want to track tasks on a board with clear priorities and columns, so that my team can see what needs attention and when.

**Epic**: EPIC-001
**Story ID**: STORY-002

**Description**:
This story covers the core task management workflow. It includes creating issues/tasks with titles, descriptions, and priorities; moving issues between board columns (To Do, In Progress, Done); assigning tasks to team members; and using AI to suggest priority based on issue content.

**Related Requirements**:
- FR-001: Issue Creation
- FR-002: Issue Board
- FR-003: AI-powered Prioritization
- FR-007: Issue Comments (partially covered here)
- FR-010: Issue Assignment
- NFR-001: Performance

**Acceptance Criteria**:

### AC-001: Create Issue
- **Given** I am a Team Lead in a workspace
- **When** I click "New Issue" and fill in a title and description
- **Then** an issue is created with default column "To Do" and default priority "Medium"

### AC-002: Issue Title Validation
- **Given** I am creating an issue with the title field focused
- **When** I leave the title empty and click "Create"
- **Then** I see an error: "Title is required"

### AC-003: Assign Issue
- **Given** I am creating or editing an issue
- **When** I select an assignee from the dropdown of team members
- **Then** the assignee is saved with the issue

### AC-004: Move Issue Between Columns
- **Given** I am viewing the board view
- **When** I drag an issue card from "To Do" to "In Progress"
- **Then** the issue moves to the "In Progress" column with no data loss

### AC-005: Set Custom Priority
- **Given** I am editing an issue
- **When** I change the priority dropdown to "High" or "Low"
- **Then** the board row highlights with a different color code

### AC-006: Change Default Column Settings
- **Given** I am the Team Lead
- **When** I click "Board Settings" and rename a column
- **Then** all issues move into the new column name

### AC-007: AI Priority Suggestion
- **Given** I create a new issue with description text
- **When** I wait for the AI processing
- **Then** the system suggests a priority level (High, Medium, or Low) based on content analysis

### AC-008: AI Suggestion Override
- **Given** AI has suggested a priority for an issue
- **When** I manually change the priority
- **Then** my override is saved and does not revert after next AI processing

### AC-009: View Issue Details
- **Given** I click on an issue card on the board
- **When** I click "View Details"
- **Then** I see the full issue including title, description, assignee, priority, and column

### AC-010: Search Issues
- **Given** I have multiple issues in my workspace
- **When** I use the search bar with a keyword
- **Then** only matching issues appear in results

### AC-011: Filter by Assignee
- **Given** I have issues assigned to multiple people
- **When** I filter by a specific assignee name
- **Then** only that person's issues are shown on the board

### AC-012: View Board Loading Time
- **Given** I have up to 15 team members and a moderate number of issues (up to 50)
- **When** I load the board
- **Then** the page loads in under 2 seconds

**Edge Cases**:
- User tries to move an issue outside standard columns → Show validation error: "Column not valid"
- Multiple issues assigned to same user → Allow assignment, list them individually
- Board column renamed while issues are assigned → Issues retain correct column reference
- AI suggestions timeout → Proceed without suggestion, don't block issue creation
- Very long title (>200 chars) → Truncate display with ellipsis, store full text

**Technical Notes**:
- Use React Drag and Drop for board interactions
- Postgres queries with proper indexing on status, assignee, and priority
- AI prompt engineering for content analysis
- Default board columns: To Do → In Progress → Done

---
*Document ID: 01-story-002*
*Status: draft*
*Version: 1.0*
*Owner: AI Assistant*
*Updated: 2026-10-30T06:52:00Z*
*Inputs: pm-00-discovery.md, pm › requirements.md, pm › backlog › EPIC-001.md, pm › backlog › STORY-001.md*