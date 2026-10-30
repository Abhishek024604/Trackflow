---
id: LLD-CMP-002
status: draft
version: 1
owner: architect
component: CMP-002
inputs:
  - path: model.yaml
    hash: c0048499bc4e2541
  - path: hld/hld.md
    hash: 3266a94b7fd468fb
  - path: stack.md
    hash: ea0aaa1d54cb1e14
  - path: decisions/ADR-0001-architecture-style.md
    hash: d9dfbee2935977d2
---

# LLD: CMP-002 Auth Module

## Responsibility

Provides authentication and session management for Team Leads, Team Members, and Guests. Handles email/password login and GitHub OAuth (FR-005). Manages protected routes and session tokens. Does NOT manage team/workspace logic (delegated to CMP-003) or issue data (delegated to CMP-004).

Satisfies: FR-005 (auth), NFR-004 (data privacy — no external data transfer except OAuth handshake), CON-001 (Next.js + Auth.js tech stack).

## Internal structure

Modules:
- `auth-handler`: Auth.js config (email provider, GitHub OAuth provider, session strategy)
- `session-manager`: JWT session handling, cookie management, HTTP-only / secure flags
- `route-guard`: Middleware for protected API routes and pages
- `oauth-callback`: GitHub OAuth callback endpoint (`/api/auth/callback/github`)

Diagram: `component.drawio`.

## Interfaces it provides

`openapi.yaml`: Auth endpoints.

Operations:
- `GET /api/auth/session` — returns current user session (FR-005). Auth: cookie.
- `POST /api/auth/signin` — email/password sign-in (FR-005).
- `GET /api/auth/signin/github` — initiates GitHub OAuth (FR-005).
- `GET /api/auth/callback/github` — handles OAuth callback (FR-005).
- `POST /api/auth/signout` — clears session (FR-005).

No async events published by this component.

## Dependencies

| Component | Operation / event | Why | On failure |
| --------- | ----------------- | --- | ---------- |
| CMP-001 Web Client | uses navigation/forms | User interacts with auth UI | Show error message; redirect to sign-in |
| CMP-007 Database | queries user data (via Prisma through CMP-001 / API routes) | Verify email, store OAuth identity | Return 500 with error; log only (no PII in logs per security rules) |
| github-oauth (external) | OAuth handshake | Authentication provider | Show "OAuth unavailable" message; allow retry |

## Data model (entities it reads/uses, owned by CMP-007)

- User (id, email, name, githubId, createdAt, updatedAt) — query by email or githubId
- Session / JWT (managed by Auth.js; not a DB table for JWT strategy, but user reference is in JWT claims)

Indexes needed: unique index on User.email; unique index on User.githubId.

## Key sequences

Sequence: Email sign-in (`sequence-email-signin.drawio`)
1. User submits email + password in CMP-001 form.
2. CMP-002 validates credentials against DB user record.
3. CMP-002 creates JWT session cookie and redirects to workspace.

Sequence: GitHub OAuth (`sequence-github-oauth.drawio`)
1. User clicks "Sign in with GitHub" on CMP-001.
2. CMP-002 redirects to GitHub OAuth authorization URL.
3. User authorizes; GitHub redirects to `/api/auth/callback/github`.
4. CMP-002 exchanges code for token; creates/finds user in DB; creates session cookie.

## Error handling

- Invalid credentials: return 401 to client; no retry.
- OAuth failure: redirect to sign-in page with error parameter; no retry loop.
- DB connection failure (CMP-007): return 500; no automatic retry at auth layer (handled by Prisma connection pool).
- Session expired: middleware redirects to `/auth/signin`.

Idempotency: `POST /api/auth/signin` is idempotent in effect (same session created); `POST /api/auth/signout` idempotent (clears cookie regardless of state).

## Observability

- Logs: auth attempts (count only, no PII in production logs per security); session creation events (user id only).
- Metrics: sign-in success rate (assumed minimal for MVP; tracked manually if needed).
- Health: `GET /api/auth/session` can serve as auth health check.

## Security

- Auth: Auth.js handles password hashing (no raw passwords stored). OAuth: standard OAuth 2.0 flow.
- Authorization: route-guard middleware checks session cookie; guest routes (view-only) skip auth check (ACT-003).
- Input validation: email format validated; password length checked by Auth.js.
- Secrets: `AUTH_SECRET`, `GITHUB_ID`, `GITHUB_SECRET` stored in Vercel environment variables; never exposed in client code.
- Trust boundary: browser (HTTPS) → Vercel → Next.js API route → Auth.js → DB (PostgreSQL over TLS).
- Data privacy (NFR-004): OAuth request sends only authorization code and client ID; no DB data transmitted externally except user profile data returned by GitHub OAuth (required for authentication).

## Decisions

No new ADRs needed; uses ADR-0001 (full-stack) and ADR-0002 (Postgres + Prisma) for DB/user storage.

Open issue: Guest access rules (ACT-003) — confirm if guests can access protected pages without session; affects route-guard logic.
