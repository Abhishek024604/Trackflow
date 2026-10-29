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

None yet.
