## 2026-05-26 - [Caching of External Network Probes]
**Learning:** External network probes like service reachability checks can significantly slow down dashboard responses when performed synchronously on every request. Caching these results in Redis with a short TTL (e.g., 60s) provides a measurable performance boost without sacrificing accuracy for transient outages. Using `void setCache(...)` allows for non-blocking background cache updates.
**Action:** Always consider caching external probe results in the API layer, especially for multi-tenant dashboards that aggregate status from multiple services.

## 2026-05-27 - [LLM Usage Aggregation Caching]
**Learning:** Performing O(N) in-memory aggregation of database rows on every request (especially within critical paths like LLM budget checks) is a major scalability bottleneck. As usage grows, latency increases linearly. Caching these aggregates in Redis with a short TTL (e.g., 60s) converts a heavy database query into a constant-time O(1) cache lookup, which is essential for performance-critical gateway paths.
**Action:** Prefer caching aggregated metrics in the service layer when those metrics are used for real-time policy decisions (budgets, rate limits).

## 2026-05-28 - [Docker CLI Caching]
**Learning:** Calling the Docker CLI (e.g., `docker ps`) from within a container via a mounted socket can be surprisingly slow (~1.1s latency). When these metrics are shown on a dashboard, it significantly impacts responsiveness. Caching the count and the container list in Redis for 60s provides a massive speed boost. Adding a fail-safe timeout to these CLI calls is also critical to prevent the API from hanging if the Docker daemon becomes unresponsive.
**Action:** Always cache results of expensive CLI operations like Docker queries, especially when used in UI-facing API endpoints.

## 2026-05-29 - [Prometheus Metrics Caching & Collision Prevention]
**Learning:** Fetching system metrics often involves multiple parallel queries (e.g., 6 for CPU, RAM, Disk, Uptime). Caching the aggregated result in Redis for 60s provides a massive latency win. However, using a static cache key can cause collisions if the API supports multiple Prometheus backends.
**Action:** Always incorporate the source URL or unique identifier into the cache key when caching external metrics to prevent data leakage between different monitoring targets.

## 2026-05-30 - [Parallelizing and Caching BullMQ Queue Lookups]
**Learning:** Sequential calls to BullMQ queue statistics (waiting/active counts) introduce unnecessary latency, especially when multiple queues are involved. Parallelizing these calls with `Promise.all` and caching the results in Redis with a short TTL (60s) significantly improves response times for admin dashboard endpoints.
**Action:** Always parallelize multiple independent BullMQ or Redis operations and use short-term caching for aggregated statistics shown in the UI.

## 2026-06-01 - [Multi-Tenant Policy Caching]
**Learning:** Policy enforcement checks (like budget limits) are frequently called on critical write paths. Performing database aggregations and multi-table joins on every such call adds significant latency (~100ms) and DB load. Caching the finalized check result (e.g., `isOverBudget`) for 60s in Redis reduces latency to <5ms while maintaining sufficient accuracy for budget enforcement.
**Action:** Implement short-term Redis caching for all multi-tenant policy enforcement results that involve expensive database aggregations.

## 2026-06-05 - [Prometheus Metrics Caching]
**Learning:** Prometheus host metrics retrieval (CPU, RAM, Disk, Uptime) involved 6 parallel network calls on every request. Caching the result in Redis with a short TTL (60s) significantly improves dashboard responsiveness and reduces network overhead. Using the non-blocking `void setCache(...)` pattern ensures that cache updates don't add latency to the current response.
**Action:** Prefer caching aggregated infrastructure metrics in the API layer, especially when multiple external probes are required to build a single response.

## 2026-06-13 - [Caching Peskids Dashboard Summary]
**Learning:** Dashboard summary endpoints that aggregate multiple parallel Supabase queries (e.g., 5 parallel calls for leads, feedback, and alerts) can be a significant bottleneck as data grows. Implementing Redis caching with a short TTL (60s) provides a massive performance boost by collapsing these multiple network round-trips into a single O(1) cache lookup. Using `void setCache(...)` ensures the write doesn't block the response.
**Action:** Identify and cache aggregated dashboard summaries in the repository layer when they involve multiple independent database queries.

## 2026-06-18 - [Tenant Lookup Caching]
**Learning:** Tenant metadata lookups (by slug) are performed on almost every authorized portal request and public booking interaction. Caching these lookups in Redis for 60s significantly reduces Supabase load and latency for the most frequent API paths. Implementing negative caching for 'not_found' results is also critical to prevent DB exhaustion from invalid slug probes.
**Action:** Always cache tenant identity lookups that are part of the request authorization or routing path.

## 2026-06-22 - [Dashboard Assembly Caching]
**Learning:** Aggregated dashboards often mix highly optimized/cached data with minor uncached fetches (like simple counts or external status probes). These remaining synchronous calls become the new bottleneck and introduce latency variability.
**Action:** Ensure ALL data sources in high-traffic aggregation endpoints (like admin overviews) are independently cached to guarantee consistent sub-100ms response times.
