# Handoff — preparación testing tenants y diagnóstico (2026-04-11)

## Completado

- Diagnóstico **SSH** por Tailscale (`100.120.151.91`): servicios de plataforma y stacks **localrank** / **jkboterolabs** visibles; `curl` a n8n **200**, uptime **302** (esperado).
- Directorio de compose en VPS: `/opt/opsly/tenants/` con `docker-compose.localrank.yml`, `docker-compose.jkboterolabs.yml`, etc.
- **Causa de `checks.supabase: degraded` en `/api/health`:** el probe llama a `.../auth/v1/health`; en proyecto Supabase hosted la respuesta puede ser **401** sin credenciales, y el handler anterior marcaba `degraded`. **Corregido** en `apps/api/app/api/health/route.ts`: **401/403** se consideran alcanzabilidad OK.
- Documentación **`docs/TENANT-TESTING-GUIDE.md`** (URLs, comandos, feedback existente, sin duplicar `/api/tenant-feedback`).
- **No** se creó tabla nueva ni ruta `tenant-feedback`: se mantiene **`POST/GET /api/feedback`**.

## Pendiente / atención humana

- **cadvisor** en el VPS puede mantener CPU alta (~80% observado en un instante); valorar límites de recurso o política de observabilidad en hosts pequeños. **No** se ejecutó `kill -9` ni `docker system prune -af` automáticamente.
- **Memoria:** presencia de **kswapd** sugiere presión de RAM; vigilar `free -h` y tamaño de cargas (Prometheus/Grafana/Loki).
- Revisar **Deploy** GHCR si aplica según `AGENTS.md`.

## Comandos útiles

```bash
# Salud API pública
curl -sS --max-time 10 "https://api.ops.smiletripcare.com/api/health" | jq .

# Tenants en VPS
ssh -o BatchMode=yes vps-dragon@100.120.151.91 "ls -la /opt/opsly/tenants/"
```

## URLs de testing (staging)

- LocalRank n8n: https://n8n-localrank.ops.smiletripcare.com  
- LocalRank uptime: https://uptime-localrank.ops.smiletripcare.com  
- jkboterolabs n8n: https://n8n-jkboterolabs.ops.smiletripcare.com  
- jkboterolabs uptime: https://uptime-jkboterolabs.ops.smiletripcare.com  

## Referencias de código

- Feedback: `apps/api/app/api/feedback/route.ts`, `apps/api/lib/feedback/`
- Health Supabase: `apps/api/app/api/health/route.ts`
