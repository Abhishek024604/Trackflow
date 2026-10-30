# TrackFlow - Requirements

## YAML Frontmatter
id: 02-requirements
status: draft
version: 1.0
owner: AI Assistant
updated_at: 2026-10-30T06:45:00Z
inputs: pm-00-discovery.md, pm-evidence.md, pm-questions.md

## Functional Requirements (FR-*)

### FR-001: Issue Creation
Users can create issues/tasks with title, description, and priority.

### FR-002: Issue Board
Kanban-style board with customizable columns (To Do, In Progress, Done).

### FR-003: AI-powered Prioritization
AI suggests priority based on issue content and team patterns.

### FR-004: Auto-categorization
AI auto-categorizes issues into feature, bug, or task categories.

### FR-005: User Authentication
Email/password authentication for team members.

### FR-006: Team Workspace
Users can create/join teams with shared project boards.

### FR-007: Issue Comments
Threaded comments on issues with @mentions.

### FR-008: Activity Feed
Team activity feed showing recent changes (issue creation, updates, comments).

### FR-009: Issue Search
Full-text search across all issues with filters (status, priority, category, assignee).

### FR-010: Issue Assignment
Assign issues to team members.

## Non-Functional Requirements (NFR-*)

### NFR-001: Performance
Board loads in under 2 seconds for teams up to 15 members.

### NFR-002: Simplicity
Under 5 minutes to create a team and first issue.

### NFR-003: Reliability
99% uptime for self-hosted Postgres deployment.

### NFR-004: Data Privacy
No data sent to third parties by default (free hosting model).

### NFR-005: Mobile Responsive
Web app accessible on mobile browsers (minimum 320px width).

### NFR-006: AI Processing
AI suggestions run on demand, not real-time (avoid performance bottlenecks).

## Actors (ACT-*)

### ACT-001: Team Lead
Creates teams, sets board columns, manages members.

### ACT-002: Team Member
Creates, assigns, and resolves issues within team workspace.

### ACT-003: Guest
View-only access to team boards (read-only).

## Constraints (CON-*)

### CON-001: Tech Stack
- Backend: Node.js with Postgres
- Frontend: React with minimal dependencies
- Deployment: Free-tier hosting (Vercel/Netlify) or self-hosted

### CON-002: Timeline
MVP must be deliverable in 1 week (development + AI prompt engineering).

### CON-003: Budget
Free hosting only; no paid third-party services in MVP.

### CON-004: Scope
No billing, payments, notifications, mobile apps, or integrations in MVP.

### CON-005: AI Limitations
AI features are suggestions only, not deterministic enforcement.

## Glossary

| Term | Definition |
|------|-----------|
| Issue | A single task or bug report in TrackFlow |
| Board | Kanban-style column view of issues |
| Sprint | 2-week work cycle (team-defined) |
| AI Suggestion | AI-generated priority or category hint |
| Team Workspace | Shared area where team members collaborate on issues |

---
*Document ID: 02-requirements*
*Status: draft*
*Version: 1.0*
*Owner: AI Assistant*
*Updated: 2026-10-30T06:45:00Z*
*Inputs: pm-00-discovery.md, pm-evidence.md, pm-questions.md*