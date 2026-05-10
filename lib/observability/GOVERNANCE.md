---
title: "lib/observability Governance"
description: "Module governance for observability layer"
---
# lib/observability Governance

## Ownership

- **Owner:** Claude (AI agent)
- **Maintainers:** Infrastructure & Observability Team
- **Escalation:** VP of Operations

## Observability Standards

All Opsly services MUST use `@intcloudsysops/observability` for:

1. **Logging** — All significant events (startup, error, state change)
2. **Metrics** — Execution count, latency, error rate per service
3. **Tracing** — Correlation IDs across service boundaries

### Required Metrics Per Service

| Metric | Type | Description |
|--------|------|-------------|
| `{service}_requests_total` | counter | Total requests |
| `{service}_request_duration_ms` | histogram | Request latency |
| `{service}_errors_total` | counter | Total errors |
| `{service}_queue_depth` | gauge | Pending work |

### Logging Levels

- **ERROR** — Unrecoverable failures, incidents
- **WARN** — Degradation, deprecated usage, recovery paths
- **INFO** — Significant state changes, milestones
- **DEBUG** — Detail, only enabled in local development

## Versioning

- Semantic versioning (MAJOR.MINOR.PATCH)
- Breaking changes require MAJOR bump
- New exporters (Jaeger, DataDog) are MINOR bumps

## Review Process

1. Changes to `lib/observability/` require 1 approval
2. New metrics/exporters need validation plan
3. Test coverage must remain >80%

## Alerting Policy

### Critical Alerts (PagerDuty)

- Observability service down (can't export metrics)
- Anomalous error rates (>5% above baseline)
- Data loss in metrics pipeline

### Warning Alerts (Slack)

- Slow metrics export (>5s latency)
- Missing metrics from known services
- Insufficient log retention

## Dependencies

- `pino` — Structured logging
- `prom-client` — Prometheus metrics
- OpenTelemetry libraries (optional, v2.0+)

## Adding New Metrics

1. Define in service setup: `initMetrics([{ name: 'my_metric', ... }])`
2. Document in service README
3. Update Prometheus scrape config
4. Add dashboard in Grafana
5. Set alert thresholds

## See Also

- `README.md` — API documentation
- `config/modules.json` — Module registry
