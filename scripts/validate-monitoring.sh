#!/bin/bash
# scripts/validate-monitoring.sh - Validate monitoring stack
set -euo pipefail

echo "Validating monitoring stack..."

# Check Prometheus
if curl -sf http://localhost:9090/api/v1/query?query=up > /dev/null 2>&1; then
  echo "Prometheus: RUNNING"
else
  echo "Prometheus: NOT REACHABLE"
fi

# Check Grafana
if curl -sf http://localhost:3100/api/health > /dev/null 2>&1; then
  echo "Grafana: RUNNING"
else
  echo "Grafana: NOT REACHABLE"
fi

# Check AlertManager
if curl -sf http://localhost:9093/api/v1/alerts > /dev/null 2>&1; then
  echo "AlertManager: RUNNING"
else
  echo "AlertManager: NOT REACHABLE"
fi

echo "Monitoring validation complete"
