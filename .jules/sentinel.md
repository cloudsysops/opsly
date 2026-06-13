## 2026-05-24 - [Missing Authorization in Peskids Portal API]
**Vulnerability:** Multiple endpoints under `apps/api/app/api/peskids/portal/[tenantSlug]/` were exposed without any authentication or authorization checks. Anyone with the `tenantSlug` (which is often public or predictable) could read and modify tenant-specific data, including form definitions, submissions, and webhook configurations.
**Learning:** New functional areas (like Peskids) were implemented using Next.js 15 Route Handlers but didn't consistently apply the established multi-tenant security patterns (`runTrustedPortalDalForPathSlug`) used in other parts of the `apps/api`. This likely happened during rapid MVP development where security wrappers were overlooked.
**Prevention:** Always use the `runTrustedPortalDalForPathSlug` (or similar) wrapper for any route that includes a `[tenantSlug]` or `[slug]` parameter in the portal API. Add a lint rule or a CI check to flag routes under `portal/` that don't use the trusted DAL wrappers.

## 2026-05-27 - [Hardcoded Audit Actors in Peskids API]
**Vulnerability:** Several sensitive operations (exports, webhooks, bulk-grading) in the Peskids Portal API used a hardcoded string ('teacher') as the actor ID in audit logs instead of the actual authenticated user's ID.
**Learning:** Even when security wrappers like `runTrustedPortalDalForPathSlug` are used, functional modules might still implement "security theater" by hardcoding metadata in audit trails, which defeats the purpose of non-repudiation.
**Prevention:** Always extract and use `session.user.id` (or equivalent) for audit logging. Perform a cross-module audit of `log_audit_event` calls to ensure real actor IDs are being captured.

## 2026-06-04 - [Missing Authorization in Mission Control Admin Endpoints]
**Vulnerability:** The `/api/admin/mission-control/orchestrator` and `/api/admin/mission-control/teams` endpoints were missing any authentication or authorization checks. They exposed sensitive internal data like Redis queue lengths and worker configurations.
**Learning:** High-level administrative dashboards sometimes omit security checks when they are assumed to be "internal-only," but in a web context, every route must be explicitly protected.
**Prevention:** Audit all routes under `app/api/admin/` to ensure they call `requireAdminAccess`. Use a shared template or linting tool to enforce mandatory authorization calls in the `GET/POST` handlers.

## 2026-06-04 - [IP Spoofing vector in Rate Limiter]
**Vulnerability:** The public tenant status endpoint extracted client IP by trusting the first element of `x-forwarded-for` or falling back to `x-real-ip`. This is vulnerable to spoofing if the application is fronted by a proxy (like Cloudflare) that doesn't strip existing `x-forwarded-for` headers.
**Learning:** Standard IP extraction logic in standard libraries or simple helper functions is often insufficient for security-critical operations like rate limiting or geo-fencing when behind a CDN.
**Prevention:** Prioritize platform-specific, verified headers like `cf-connecting-ip` (Cloudflare) or `x-envoy-external-address`. Never trust user-provided `x-forwarded-for` without verifying the proxy chain.

## 2026-06-05 - [Missing Authorization in Social Publish API]
**Vulnerability:** The `/api/social/publish` endpoint was exposed without any authentication or authorization checks. Anyone could trigger social media publishing by sending a POST request to this endpoint with valid content.
**Learning:** Functional modules (like Social Publish) might be implemented without considering the centralized security helpers (`requireAdminAccess`) if they are developed as independent features or "autonomous agent" tools.
**Prevention:** Audit all POST/PATCH/DELETE handlers in the API to ensure they explicitly call authorization helpers. Ensure that integration tests for these features actually test with and without valid authorization headers.

## 2026-06-06 - [Missing Authorization in API Keys endpoints]
**Vulnerability:** The `/api/v1/keys` endpoints (GET, POST, DELETE) were missing administrative authorization checks. Although they required a `x-tenant-id` header (a UUID), this was the only check performed. This allowed any user with a tenant UUID to manage that tenant's API keys.
**Learning:** Legacy or V1 API endpoints might be missed when applying system-wide security patterns if they use custom headers (`x-tenant-id`) instead of the standard JWT-based authorization used in the portal or the token/session-based authorization used in the admin panel.
**Prevention:** Audit all `v1` and legacy endpoints for proper authorization. Ensure that endpoints that manage credentials or security-sensitive resources (like API keys) always call `requireAdminAccess`. Use shared test utilities to verify authorization across all API versions.
