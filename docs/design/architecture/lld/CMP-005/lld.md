---
id: LLD-CMP-005
status: draft
version: 1
owner: architect
component: CMP-005
inputs:
  - path: model.yaml
    hash: c0048499bc4e2541
  - path: hld/hld.md
    hash: 3266a94b7fd468fb
  - path: stack.md
    hash: ea0aaa1d54cb1e14
---

# LLD: CMP-005 AI Module

## Responsibility

Provides abstract adapter interface for on-demand AI suggestions (priority, category). Does not enforce changes; returns hints only. Delegates LLM calls to an external provider (LLM adapter interface). Does NOT persist data; reads issue data from CMP-004 request parameters.

Satisfies: FR-003, FR-004, NFR-006, CON-005.

## Internal structure

- `llm-adapter`: Abstract interface (`suggestPriority`, `suggestCategory`)
- `prompt-builder`: Constructs prompt from issue title + description (no other DB data per NFR-004)
- `provider-impl`: Specific LLM provider implementation (OpenAI, local, etc. — assumed; architect to confirm provider for G2)

## Interfaces it provides

Called synchronously by CMP-004 (`GET /api/ai/suggest`). No direct external API contract for CMP-005; the contract is between CMP-004 and CMP-005 (internal API route interaction).

No async events.

## Dependencies

| Component | Operation / event | Why | On failure |
| --------- | ----------------- | --- | ---------- |
| CMP-004 Board Module | `GET /api/ai/suggest` (internal) | Request AI suggestion | Return null suggestion; board unaffected |
| llm-provider (external) | LLM REST call | Generate suggestion | Return available=false; log error |

## Data model

No persistent DB entities owned by CMP-005. Reads issue title/description from CMP-004 request (not from DB directly, to minimize DB access and data exposure — NFR-004).

## Key sequences

1. CMP-001 sends request with issueId to CMP-004 (`GET /api/ai/suggest`).
2. CMP-004 fetches issue title/description from CMP-007 (optional; could be passed directly).
3. CMP-005 builds prompt; calls external LLM provider.
4. CMP-005 returns JSON `{priority: "high", category: "bug", available: true}`.
5. CMP-004 returns to CMP-001; user applies or ignores (CON-005: never enforced).

If LLM fails: `available: false`; user sees message; board continues normally (resilience, NFR-006).

## Security

- Only issue title and description transmitted to LLM provider; no team names, user emails, or other DB data (NFR-004).
- LLM API key stored in Vercel environment variables; not exposed in browser or DB.
- No persistent storage of LLM responses (optional; for MVP, no caching required — NFR-006 allows on-demand without caching).
