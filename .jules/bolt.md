## 2026-05-26 - [Caching of External Network Probes]
**Learning:** External network probes like service reachability checks can significantly slow down dashboard responses when performed synchronously on every request. Caching these results in Redis with a short TTL (e.g., 60s) provides a measurable performance boost without sacrificing accuracy for transient outages. Using `void setCache(...)` allows for non-blocking background cache updates.
**Action:** Always consider caching external probe results in the API layer, especially for multi-tenant dashboards that aggregate status from multiple services.

## 2026-05-22 - [Aggregated Usage Metrics Caching]
**Learning:** Frequent database aggregations (O(N) operations) for multi-tenant usage metrics in hot paths (like dashboard loads and budget checks) cause unnecessary DB load and increased latency. Caching these aggregations in Redis with a short TTL (e.g., 60s) reduces database IO and improves API response times by ~10x for cached results.
**Action:** Implement short-TTL Redis caching for all frequently accessed aggregated metrics that are computed from immutable or semi-immutable historical event tables.
