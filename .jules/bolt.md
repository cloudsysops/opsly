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

## 2026-05-29 - [BullMQ Queue Metric Caching]
**Learning:** Sequential calls to multiple BullMQ queues to fetch job counts (waiting/active) can be slow due to multiple Redis roundtrips and object instantiation overhead. In an admin dashboard fetching metrics for 5+ queues, this adds significant latency. Caching the aggregated totals in Redis for 60s reduces the cost to a single O(1) cache lookup for most requests.
**Action:** Aggregate and cache queue metrics in the API layer when showing them on high-traffic or high-latency dashboards.
