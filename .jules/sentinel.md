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

## 2026-06-12 - [Missing Authorization in Peskids Export API]
**Vulnerability:** The `GET /api/peskids/portal/[tenantSlug]/forms/[formId]/export` endpoint was publicly accessible without any authorization checks, risking unauthorized mass data extraction. Additionally, it used a hardcoded 'teacher' actor ID in audit logs.
**Learning:** Rapidly developed functional routes under `peskids/portal/` were missing the standard `runTrustedPortalDalForPathSlug` security wrapper, and audit logging relied on static strings instead of session identity.
**Prevention:** Always wrap portal-facing API routes with `runTrustedPortalDalForPathSlug` (or similar) and propagate `session.user.id` to all audit functions.

## 2026-06-16 - [Missing Authorization in Runtime API Endpoints]
**Vulnerability:** Several administrative runtime endpoints (`/api/runtime/health`, `/api/runtime/nodes/status`, `/api/runtime/capabilities`, and `/api/runtime/stream`) were exposed without any authentication or authorization checks. They provided direct visibility into orchestrator node status and capabilities.
**Learning:** Endpoints that act as pass-through proxies to internal services (like the orchestrator) are sometimes overlooked for security if the internal service itself is assumed to be "protected." However, the proxy endpoint in the public-facing API becomes the weak link if it doesn't enforce the same security perimeter.
**Prevention:** Always apply the `requireAdminAccessUnlessDemoRead` (or similar) authorization check to any endpoint that proxies data from internal services. When creating proxy routes, mandate a security review of the upstream service's sensitivity.

## 2026-06-16 - [Broken Access Control in Peskids Form Creation]
**Vulnerability:** The `POST /api/peskids/portal/[tenantSlug]/forms` endpoint was exposed without any authorization checks. An attacker could create arbitrary form records for any tenant by simply knowing their `tenantSlug`.
**Learning:** When using `runTrustedPortalDalForPathSlug`, it's critical to consistently apply it to all HTTP methods in a route handler. Rapidly developed endpoints might only secure `GET` while leaving `POST/PATCH/DELETE` wide open.
**Prevention:** Mandate the use of `runTrustedPortalDalForPathSlug` (or similar) for ALL methods in portal-facing routes. Use `PORTAL_WRITE_ACCESS` specifically for state-changing operations to ensure only 'owner', 'admin', or 'operator' roles can perform them.

## 2026-06-18 - [Missing Authorization in NotebookLM Tenant Configuration]
**Vulnerability:** The `/api/tenants/[slug]/notebooklm` and `/api/v1/tenants/[ref]/notebooklm` endpoints were exposed without any authentication or authorization checks. These routes provided access to sensitive AI configurations and source data for individual tenants.
**Learning:** Even when following a `[slug]` pattern, if the route is not wrapped in `runTrustedPortalDal` or explicitly calls `requireAdminAccess`, it remains public. Tenant-specific AI assets are as sensitive as database records and require the same level of perimeter protection.
**Prevention:** Conduct regular scans for route handlers in `apps/api` that do not import from `lib/auth` or `lib/portal-tenant-dal`. Mandate security tests that specifically verify 401/403 responses for all new tenant-facing functional areas.

## 2026-06-18 - [Dependency Vulnerabilities in hono and tmp]
**Vulnerability:** `npm audit` identified high-severity vulnerabilities in `hono` (Path traversal, etc. - GHSA-wwfh-h76j-fc44) and `tmp` (Path traversal - GHSA-7c78-jf6q-g5cm).
**Learning:** Even if the project's direct dependencies are secure, transitive dependencies or overrides might bring in vulnerable versions. The CI environment enforces a strict audit that blocks PRs on moderate+ vulnerabilities in non-dev dependencies.
**Prevention:** Regularly run `npm audit --audit-level=moderate --omit=dev` and update `overrides` in the root `package.json` to pin safe versions of problematic dependencies.

## 2026-06-24 - [Standardized IP Extraction for Security]
**Vulnerability:** Diverse implementations of IP extraction logic across the API prioritized `x-forwarded-for` or `x-real-ip` without verifying the proxy chain, creating an IP spoofing vector for rate limiting and audit logging.
**Learning:** Returning a placeholder string like 'unknown' for missing IPs can break database integrity for columns using `INET` or similar network address types. Centralized helpers must return `null` to signify a missing value while maintaining type safety for downstream systems.
**Prevention:** Use the centralized `extractIp` helper from `lib/audit.ts` which is verified to prioritize Cloudflare (`cf-connecting-ip`) and safely parse proxy headers. Ensure security tests verify that spoofed headers are ignored when verified platform headers are present.

## 2026-06-25 - [Untrusted Actor IDs in Public Audit Logs]
**Vulnerability:** Public endpoints (like Peskids form submissions) allowed users to provide a `userId` in the request body which was then used as the primary `actor_id` in audit logs. This allowed attackers to spoof actions as other users in the security history.
**Learning:** For public or unauthenticated endpoints, never use client-provided identifiers as the primary actor in audit logs. These fields must be system-generated (e.g., using client IP) or fixed (e.g., 'anonymous').
**Prevention:** Use `extractIp` to generate a verified actor identifier (e.g., `anonymous:${ip}`) for unauthenticated actions. Always treat client-provided identifiers as untrusted and relegate them to the `metadata` field of the audit event.

## 2026-06-27 - [Missing Rate Limiting and Audit Logging in Governance API]
**Vulnerability:** The `POST /api/governance/dsar` endpoint was exposed without rate limiting or audit logging. This allowed for potential mass-creation of DSAR requests (SLA-bound operations) and lacked a traceable history of these sensitive compliance actions.
**Learning:** Newer compliance-focused modules (like Governance) might be overlooked during security audits if they are perceived as "internal" or "administrative" even when they expose public handlers.
**Prevention:** Mandate rate limiting and audit logging for all public-facing mutation endpoints (`POST/PATCH/DELETE`). Extend CI security scans to verify that endpoints in `app/api/governance/` utilize the established `checkRateLimit` and `logAuditEvent` helpers.

## 2026-06-29 - [Missing Rate Limiting and Audit Logging in Peskids Public Endpoints]
**Vulnerability:** Public Peskids endpoints for lead capture and feedback (`/api/public/tenants/peskids/leads` and `/api/public/tenants/peskids/feedback`) lacked rate limiting and audit logging. This made them vulnerable to automated spam and resource exhaustion without a traceable record of the activity.
**Learning:** Even when core business logic (insertion) is validated via schemas, the endpoint remains vulnerable to abuse if it lacks perimeter protections like rate limiting. The existence of these protections in other "similar" endpoints (like DSAR) doesn't guarantee they are applied everywhere.
**Prevention:** Systematically apply `checkRateLimit` and `logAuditEvent` to all public, unauthenticated POST handlers. Utilize IP-based rate limiting keys (e.g., `peskids-lead:${ip}`) to prevent abuse while allowing legitimate traffic.

## 2026-07-11 - [Defense-in-Depth for Internal Governance Endpoints]
**Vulnerability:** The `/api/governance/breach` endpoint, while protected by a shared secret, lacked IP-based rate limiting and audit logging. This created a gap in non-repudiation for breach reporting and left the token vulnerable to brute-force attempts.
**Learning:** Internal-only or secret-protected endpoints are often excluded from standard perimeter defenses. However, for sensitive operations like breach reporting, multiple layers of defense (rate limiting + auth + logging) are required to ensure the integrity and availability of the reporting channel.
**Prevention:** Mandate `checkRateLimit` and `logAuditEvent` for all mutation endpoints in the Governance module, regardless of the primary authentication mechanism. Use localized security tests to verify that these "secondary" defenses are active.
