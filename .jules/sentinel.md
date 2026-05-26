
## 2026-05-26 - [Sensitive Data Leak in Public Status Endpoint]
**Vulnerability:** The public tenant status endpoint (`/api/public/tenants/status`) was leaking sensitive service credentials, including `n8n_basic_auth_password`, by returning the full `services` JSON object from the database.
**Learning:** Returning raw database JSON objects directly to public or less-privileged endpoints is a common source of data leaks. Even if the primary purpose of the endpoint is non-sensitive, the underlying data structure may contain credentials used for orchestration or internal service communication.
**Prevention:** Always use a data transfer object (DTO) or a explicit transformation layer to sanitize outgoing JSON responses, especially for public endpoints. Never return raw database records directly. Use allow-listing for allowed fields rather than deny-listing.
