## 2026-05-26 - [Caching of External Network Probes]
**Learning:** External network probes like service reachability checks can significantly slow down dashboard responses when performed synchronously on every request. Caching these results in Redis with a short TTL (e.g., 60s) provides a measurable performance boost without sacrificing accuracy for transient outages. Using `void setCache(...)` allows for non-blocking background cache updates.
**Action:** Always consider caching external probe results in the API layer, especially for multi-tenant dashboards that aggregate status from multiple services.

## 2026-05-27 - [LLM Usage Aggregation Caching]
**Learning:** Performing O(N) in-memory aggregation of database rows on every request (especially within critical paths like LLM budget checks) is a major scalability bottleneck. As usage grows, latency increases linearly. Caching these aggregates in Redis with a short TTL (e.g., 60s) converts a heavy database query into a constant-time O(1) cache lookup, which is essential for performance-critical gateway paths.
**Action:** Prefer caching aggregated metrics in the service layer when those metrics are used for real-time policy decisions (budgets, rate limits).

## 2026-05-30 - [O(N) SCAN to O(1) MGET Optimization]
**Learning:** For multi-tenant usage tracking where the metric keyspace is known and finite (e.g., specific billing metrics), using `SCAN` with `MATCH` followed by individual `GET` calls is an anti-pattern. It introduces unnecessary network roundtrips and increases latency linearly with the number of metrics. Replacing it with a single `MGET` call reduces network roundtrips from N+1 to 1, providing a constant-time O(1) fetch regardless of the number of metrics.
**Action:** Always use `MGET` instead of `SCAN` when the target Redis keys follow a predictable pattern based on a known constant list of suffixes/metrics.
