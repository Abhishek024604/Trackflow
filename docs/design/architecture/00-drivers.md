---
id: DRIVERS
status: draft
version: 1
owner: architect
inputs:
  - path: inputs/srs.md
    hash: cba792f25ffd162d
  - path: inputs/goal.md
    hash: 509a3c425027baf1
---

# Architecture drivers

## Context

TrackFlow is a lightweight, AI-powered issue tracker for small software teams (3-15 people) who find Jira too heavy. It provides Kanban boards, issue creation/assignment/search, AI priority/categorization suggestions, team workspace management, threaded comments with @mentions, and a team-wide activity feed. Users authenticate via email/password or GitHub OAuth and work in shared team workspaces. The system targets a 1-week MVP delivered on Vercel free tier with free hosting only (CON-003), backed by Postgres and minimal dependencies (CON-001, CON-004).

## Actors

| Actor | Kind (person / system) | What they do |
| ------ | ---------------------- | ------------ |
| Team Lead (ACT-001) | person | Creates teams, sets board columns (FR-006 / CON-004), manages members |
| Team Member (ACT-002) | person | Creates, assigns, resolves issues; comments; views feed (FR-001, FR-002, FR-010, FR-007, FR-008) |
| Guest (ACT-003) | person | View-only board access (FR-006) |
| Auth Provider (OAuth) | system | GitHub OAuth / email-password auth (FR-005) |

## Functional requirements

| ID | Requirement | Priority | Source |
| -- | ----------- | -------- | ------ |
| FR-001 | Issue Creation (title, description, priority) | must | srs.md §Functional |
| FR-002 | Issue Board (Kanban with customizable columns) | must | srs.md §Functional |
| FR-003 | AI-powered Prioritization (suggestion only) | should | srs.md §Functional |
| FR-004 | Auto-categorization (feature/bug/task) | should | srs.md §Functional |
| FR-005 | User Authentication (email/password + GitHub OAuth) | must | srs.md §Functional |
| FR-006 | Team Workspace (create/join, shared boards) | must | srs.md §Functional |
| FR-007 | Issue Comments (threaded, @mentions) | must | srs.md §Functional |
| FR-008 | Activity Feed (recent changes, filterable) | must | srs.md §Functional |
| FR-009 | Issue Search (full-text, filters) | could | srs.md §Functional |
| FR-010 | Issue Assignment (assign to team members) | must | srs.md §Functional |

## Quality scenarios

| ID | Quality attribute | Stimulus | Environment | Response | Measure | Priority | Source |
| - | ----------------- | -------- | ----------- | -------- | ------- | -------- | ------ |
| NFR-001 | Performance | Load board for team of 15 | Normal operation | Page renders | < 2 s | must | srs.md NFR-001 |
| NFR-002 | Simplicity / Usability | Create team + first issue | Normal operation | User completes flow | < 5 min | must | srs.md NFR-002 |
| NFR-003 | Reliability | Self-hosted Postgres deployment | Normal / degraded | System available | 99% uptime | must | srs.md NFR-003 |
| NFR-004 | Data Privacy | Any request | Normal operation | No external data transfer by default | Zero third-party calls by default | must | srs.md NFR-004 |
| NFR-005 | Mobile Responsive | Access via mobile browser | Normal operation | Layout adapts | Min 320px width renders correctly | should | srs.md NFR-005 |
| NFR-006 | AI Processing | User requests AI suggestion | Normal operation | Suggestion returned on-demand | Not real-time; avoids performance bottleneck | should | srs.md NFR-006 |

## Constraints

| ID | Constraint | Source |
| -- | ---------- | ------ |
| CON-001 | Tech: Node.js backend, Postgres DB; React frontend with minimal dependencies; deployment Vercel (free tier) or self-hosted (free only) | srs.md CON-001 / goal.md |
| CON-002 | Timeline: MVP deliverable in 1 week (development + AI prompt engineering) | srs.md CON-002 |
| CON-003 | Budget: Free hosting only; no paid third-party services in MVP | srs.md CON-003 |
| CON-004 | Scope: No billing, payments, notifications, mobile apps, integrations in MVP | srs.md CON-004 |
| CON-005 | AI Limitations: AI features are suggestions only; not deterministic enforcement | srs.md CON-005 |

## Integrations

| System | Direction | Protocol / data | Source |
| ------ | --------- | --------------- | ------ |
| GitHub OAuth | inbound (auth) | OAuth 2.0 / user profile + email | goal.md / CON-001 |
| Postgres (Neon) | outbound (DB) | SQL via Prisma ORM | goal.md / CON-001 |
| Vercel (deployment) | outbound (hosting) | HTTPS, Git deploy | goal.md / CON-003 |
| LLM Service (AI) | outbound (optional) | REST / prompt-response (assumed: free tier or minimal; on-demand only per NFR-006) | CON-005 / NFR-006 |

## Conflicts

No direct conflicts between inputs. Note: CON-003 (free hosting) and CON-005 (AI suggestions) conflict if AI requires a paid API; resolved by using on-demand, minimal-cost or self-hosted LLM integration with no real-time dependency (NFR-006) and no third-party data transfer by default (NFR-004). Assumption: free-tier LLM endpoint or cached/local inference.

## Questions and answers

| # | Question | Answer | Asked |
| - | -------- | ------ | ----- |
| Q1 | Target cloud / hosting? | Vercel (free tier); Postgres via Neon free tier; no paid services (CON-003) | Resolved by goal.md / CON-003 |
| Q2 | AI model / provider for suggestions? | Assumed: minimal/free LLM endpoint; on-demand only; no real-time (NFR-006); data not sent externally by default (NFR-004) — architect to confirm | Assumed; open for G1 |

## Open questions

- Q2 (AI provider / model): Does not block HLD design (suggestions are optional, non-deterministic). Blocks LLD contract definition for AI endpoint if a specific provider is chosen; for now, the LLD assumes an abstract `LLMService` adapter interface.
