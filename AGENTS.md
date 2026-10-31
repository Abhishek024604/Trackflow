# AGENTS.md

Instructions for AI coding agents, and the people working with them, in this repository.
ParallelFlow keeps this file up to date: do not edit it. Put your own notes in AGENTS.local.md,
which ParallelFlow never changes, and read it too when it is there.

## What this repository is

The code and the approved documents of **Tracker Application**, built with ParallelFlow.

Task Tracker Application for software teams

## Read first

1. `docs/design/architecture/` and `docs/design/`: the architecture, HLD and LLDs. Follow them.
2. `docs/plan/`: the plan and the requirements. `docs/product/`: the product documents, backlog and stories.
3. `docs/design/architecture/decisions/`: the architecture decisions (ADRs).
4. `PROGRESS.md` (where the project is) and `STATE.md` (what the team discussed and decided).

## How to work

- One branch per story, named `feat/<story>-<slug>`, for example `feat/STORY-012-checkout-retry`.
- Small commits, each with a clear message.
- When the work is ready, open a pull request into the default branch. Say what changed and how you tested it.
- Never push to the default branch (main) and never merge a pull request: people review and merge.
- Do not edit README.md, PROGRESS.md, STATE.md, AGENTS.md or the documents under `docs/`: ParallelFlow
  writes them from approved documents. Suggest changes in the arena instead.

## Approved documents

- docs/design/architecture/decisions/ADR-0001-architecture-style.md
- docs/design/architecture/decisions/ADR-0002-postgres-prisma.md
- docs/design/architecture/00-drivers.md
- docs/design/architecture/model.yaml
- docs/design/architecture/stack.md
- docs/design/architecture/hld/containers.drawio
- docs/design/architecture/hld/context.drawio
- docs/design/architecture/hld/deployment.drawio
- docs/design/architecture/hld/flows/flw-001.drawio
- docs/design/architecture/hld/flows/flw-002.drawio
- docs/design/architecture/hld/flows/flw-003.drawio
- docs/design/architecture/hld/hld.md
- docs/design/architecture/lld/CMP-002/component.drawio
- docs/design/architecture/lld/CMP-002/openapi.yaml
- docs/design/architecture/lld/CMP-002/lld.md
- docs/design/architecture/lld/CMP-003/lld.md
- docs/design/architecture/lld/CMP-004/openapi.yaml
- docs/design/architecture/lld/CMP-004/lld.md
- docs/design/architecture/lld/CMP-005/lld.md
- docs/design/architecture/lld/CMP-006/lld.md
- docs/design/architecture/lld/CMP-007/lld.md
- docs/plan/plan-goal.md
- docs/plan/requirements-epic-001.md
- docs/plan/requirements-story-001.md
- docs/plan/requirements-story-002.md
- docs/plan/requirements-story-003.md
- docs/plan/requirements.md
