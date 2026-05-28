## 2026-05-24 - [Missing Authorization in Peskids Portal API]
**Vulnerability:** Multiple endpoints under `apps/api/app/api/peskids/portal/[tenantSlug]/` were exposed without any authentication or authorization checks. Anyone with the `tenantSlug` (which is often public or predictable) could read and modify tenant-specific data, including form definitions, submissions, and webhook configurations.
**Learning:** New functional areas (like Peskids) were implemented using Next.js 15 Route Handlers but didn't consistently apply the established multi-tenant security patterns (`runTrustedPortalDalForPathSlug`) used in other parts of the `apps/api`. This likely happened during rapid MVP development where security wrappers were overlooked.
**Prevention:** Always use the `runTrustedPortalDalForPathSlug` (or similar) wrapper for any route that includes a `[tenantSlug]` or `[slug]` parameter in the portal API. Add a lint rule or a CI check to flag routes under `portal/` that don't use the trusted DAL wrappers.

## 2026-05-27 - [Hardcoded Audit Actors in Peskids API]
**Vulnerability:** Several sensitive operations (exports, webhooks, bulk-grading) in the Peskids Portal API used a hardcoded string ('teacher') as the actor ID in audit logs instead of the actual authenticated user's ID.
**Learning:** Even when security wrappers like `runTrustedPortalDalForPathSlug` are used, functional modules might still implement "security theater" by hardcoding metadata in audit trails, which defeats the purpose of non-repudiation.
**Prevention:** Always extract and use `session.user.id` (or equivalent) for audit logging. Perform a cross-module audit of `log_audit_event` calls to ensure real actor IDs are being captured.

## 2026-05-28 - [Sensitive Data Leakage in Tenant Services API]
**Vulnerability:** The  database column, which contains sensitive credentials like `n8n_basic_auth_password`, was being returned raw in both public (`/api/public/tenants/status`) and authenticated (`/api/portal/me`) API endpoints.
**Learning:** Returning raw database JSON objects is a major security risk as it bypasses the "Defense in Depth" principle and often leaks internal configuration or credentials that the frontend does not need. Even authenticated endpoints should follow the principle of least privilege.
**Prevention:** Always use an explicit allow-list transformation for any database-backed JSON objects returned in API responses. Never return the raw object.

## 2026-05-28 - [Sensitive Data Leakage in Tenant Services API]
**Vulnerability:** The `tenants.services` database column, which contains sensitive credentials like `n8n_basic_auth_password`, was being returned raw in both public (`/api/public/tenants/status`) and authenticated (`/api/portal/me`) API endpoints.
**Learning:** Returning raw database JSON objects is a major security risk as it bypasses the "Defense in Depth" principle and often leaks internal configuration or credentials that the frontend does not need. Even authenticated endpoints should follow the principle of least privilege.
**Prevention:** Always use an explicit allow-list transformation for any database-backed JSON objects returned in API responses. Never return the raw object.
