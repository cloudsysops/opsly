## 2026-05-26 - [Caching of External Network Probes]
**Learning:** External network probes like service reachability checks can significantly slow down dashboard responses when performed synchronously on every request. Caching these results in Redis with a short TTL (e.g., 60s) provides a measurable performance boost without sacrificing accuracy for transient outages. Using `void setCache(...)` allows for non-blocking background cache updates.
**Action:** Always consider caching external probe results in the API layer, especially for multi-tenant dashboards that aggregate status from multiple services.

## 2026-05-27 - [LLM Usage Aggregation Caching]
**Learning:** Performing O(N) in-memory aggregation of database rows on every request (especially within critical paths like LLM budget checks) is a major scalability bottleneck. As usage grows, latency increases linearly. Caching these aggregates in Redis with a short TTL (e.g., 60s) converts a heavy database query into a constant-time O(1) cache lookup, which is essential for performance-critical gateway paths.
**Action:** Prefer caching aggregated metrics in the service layer when those metrics are used for real-time policy decisions (budgets, rate limits).

## 2026-05-28 - [Docker CLI Caching]
**Learning:** Calling the Docker CLI (e.g., `docker ps`) from within a container via a mounted socket can be surprisingly slow (~1.1s latency). When these metrics are shown on a dashboard, it significantly impacts responsiveness. Caching the count and the container list in Redis for 60s provides a massive speed boost. Adding a fail-safe timeout to these CLI calls is also critical to prevent the API from hanging if the Docker daemon becomes unresponsive.
**Action:** Always cache results of expensive CLI operations like Docker queries, especially when used in UI-facing API endpoints.

## 2026-05-29 - [Parallel Prometheus Query Caching]
**Learning:** Functions that aggregate multiple metrics via parallel network calls (e.g., `fetchHostMetricsFromPrometheus` doing 6 parallel queries) can become a dashboard bottleneck if not cached. Even if queries are fast individually, the overhead of multiple HTTP requests and TSDB lookups scales poorly. Caching the entire aggregated object in Redis with `CACHE_TTL.SHORT` (60s) and using non-blocking background updates (`void setCache`) is the most efficient way to keep dashboards snappy.
**Action:** Identify and wrap parallel network probe aggregators with a short-lived Redis cache.
