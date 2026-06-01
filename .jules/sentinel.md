## 2026-05-24 - [Missing Authorization in Peskids Portal API]
**Vulnerability:** Multiple endpoints under `apps/api/app/api/peskids/portal/[tenantSlug]/` were exposed without any authentication or authorization checks. Anyone with the `tenantSlug` (which is often public or predictable) could read and modify tenant-specific data, including form definitions, submissions, and webhook configurations.
**Learning:** New functional areas (like Peskids) were implemented using Next.js 15 Route Handlers but didn't consistently apply the established multi-tenant security patterns (`runTrustedPortalDalForPathSlug`) used in other parts of the `apps/api`. This likely happened during rapid MVP development where security wrappers were overlooked.
**Prevention:** Always use the `runTrustedPortalDalForPathSlug` (or similar) wrapper for any route that includes a `[tenantSlug]` or `[slug]` parameter in the portal API. Add a lint rule or a CI check to flag routes under `portal/` that don't use the trusted DAL wrappers.

## 2026-05-27 - [Hardcoded Audit Actors in Peskids API]
**Vulnerability:** Several sensitive operations (exports, webhooks, bulk-grading) in the Peskids Portal API used a hardcoded string ('teacher') as the actor ID in audit logs instead of the actual authenticated user's ID.
**Learning:** Even when security wrappers like `runTrustedPortalDalForPathSlug` are used, functional modules might still implement "security theater" by hardcoding metadata in audit trails, which defeats the purpose of non-repudiation.
**Prevention:** Always extract and use `session.user.id` (or equivalent) for audit logging. Perform a cross-module audit of `log_audit_event` calls to ensure real actor IDs are being captured.

## 2026-06-01 - [Missing Authentication in Administrative V1 API]
**Vulnerability:** Several administrative endpoints under `/api/v1/` (keys, tenants/[ref]/notebooklm) and `/api/social/publish` lacked any authentication or authorization checks. These endpoints allowed unauthorized management of API keys and social media publishing.
**Learning:** Legacy or secondary API paths (like `/api/v1/` which is rewritten from `/api/`) sometimes skip the standard middleware-based auth if the middleware only performs rate limiting and expects route handlers to enforce auth. Developers might forget to add `requireAdminAccess` to new handlers.
**Prevention:** Ensure all non-public route handlers in `apps/api` explicitly call `requireAdminAccess`. Use a specialized security test suite (`apps/api/__tests__/security/`) to verify all administrative paths are protected.
