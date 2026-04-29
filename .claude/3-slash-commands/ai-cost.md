# /ai-cost — Consumo de Tokens

Muestra costos LLM. Ver `AGENTS.md` (sección "Ecosistema IA") y `docs/COST-DASHBOARD.md`.

## Portal (sesión tenant)
```bash
JWT_TOKEN=$(curl -s -X POST "https://api.ops.smiletripcare.com/api/portal/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "<email>", "password": "<password>"}' | jq -r '.session.access_token')

# Hoy
curl -H "Authorization: Bearer $JWT_TOKEN" \
  "https://api.ops.smiletripcare.com/api/portal/usage?period=today"

# Mes actual
curl -H "Authorization: Bearer $JWT_TOKEN" \
  "https://api.ops.smiletripcare.com/api/portal/tenant/<slug>/usage?period=month"
```

## Admin (todos los tenants)
```bash
curl -H "Authorization: Bearer $PLATFORM_ADMIN_TOKEN" \
  "https://admin.ops.smiletripcare.com/api/admin/costs"
```

## LLM Gateway (directo)
```bash
# Logs estructurados
ssh vps-dragon@100.120.151.91 "docker logs infra-llm-gateway-1 --tail 50 | grep 'llm_call'"

# usage_events en Supabase
doppler run --project ops-intcloudsysops --config prd -- \
  npx supabase db query "SELECT DATE(created_at) as day, model, SUM(tokens_in + tokens_out) as tokens, SUM(cost_usd) as cost FROM platform.usage_events WHERE created_at >= NOW() - INTERVAL '7 days' GROUP BY DATE(created_at), model ORDER BY day DESC;"
```

## Referencias
- `AGENTS.md` → "Ecosistema IA — OpenClaw", "Dashboard de costos"
- `apps/api/lib/admin-costs.ts` — lógica admin
- `apps/llm-gateway/src/logger.ts` — `logUsage()`
- `docs/COST-DASHBOARD.md` — documentación completa
- `GET /api/metrics/tenant/:slug` — métricas detalladas
