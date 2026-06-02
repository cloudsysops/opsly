## 2026-05-24 - [Missing Authorization in Peskids Portal API]
**Vulnerability:** Multiple endpoints under `apps/api/app/api/peskids/portal/[tenantSlug]/` were exposed without any authentication or authorization checks. Anyone with the `tenantSlug` (which is often public or predictable) could read and modify tenant-specific data, including form definitions, submissions, and webhook configurations.
**Learning:** New functional areas (like Peskids) were implemented using Next.js 15 Route Handlers but didn't consistently apply the established multi-tenant security patterns (`runTrustedPortalDalForPathSlug`) used in other parts of the `apps/api`. This likely happened during rapid MVP development where security wrappers were overlooked.
**Prevention:** Always use the `runTrustedPortalDalForPathSlug` (or similar) wrapper for any route that includes a `[tenantSlug]` or `[slug]` parameter in the portal API. Add a lint rule or a CI check to flag routes under `portal/` that don't use the trusted DAL wrappers.

## 2026-05-27 - [Hardcoded Audit Actors in Peskids API]
**Vulnerability:** Several sensitive operations (exports, webhooks, bulk-grading) in the Peskids Portal API used a hardcoded string ('teacher') as the actor ID in audit logs instead of the actual authenticated user's ID.
**Learning:** Even when security wrappers like `runTrustedPortalDalForPathSlug` are used, functional modules might still implement "security theater" by hardcoding metadata in audit trails, which defeats the purpose of non-repudiation.
**Prevention:** Always extract and use `session.user.id` (or equivalent) for audit logging. Perform a cross-module audit of `log_audit_event` calls to ensure real actor IDs are being captured.

## 2026-06-02 - [Missing Authorization on Social Publish Endpoint]
**Vulnerability:** The `/api/social/publish` endpoint in `apps/api` lacked any authentication or authorization checks. It was possible for any unauthenticated user to trigger multi-platform social media publishing by sending a POST request to this endpoint.
**Learning:** High-level orchestration endpoints (like social publishing) can sometimes be overlooked when they are built on top of internal adapters that themselves don't enforce auth. Even if the feature is meant for internal use, it must be gated by the platform's standard authorization helpers.
**Prevention:** Every new Route Handler in `apps/api` must explicitly call an authorization helper like `requireAdminAccess` or `resolveTrustedPortalSession` as its first action, unless it is intentionally public. Verified by `apps/api/app/api/social/__tests__/social-publish-auth.test.ts`.
