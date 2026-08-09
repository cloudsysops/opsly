---
status: canon
owner: operations
last_review: 2026-08-07
type: runbook
tags:
  - opsly/mission-control
  - opsly/tenant
---

# Mission Control — Tenant rollout

Cómo entregar un **Mission Control del cliente** reutilizando el kit (no copiar ICSO/Peskids enteros).

## Checklist

1. [ ] `tenant_slug` registrado en `platform.tenants` + `config/tenants/<slug>.json`
2. [ ] Profile: `config/mission-control/profiles/<slug>.json` desde `_template.tenant.json`
3. [ ] App tenant `apps/<slug>` depende de `@intcloudsysops/mission-control-kit`
4. [ ] Shell + nav desde profile; **datos de dominio** en lib/services del tenant
5. [ ] Auth del panel (Supabase staff) — no dejar open en prod
6. [ ] `dataBoundaries` excluyen platform-admin / otros tenants / Moon
7. [ ] Sin MRR ficticio; métricas con REAL | ESTIMADO | PROYECTADO
8. [ ] Smoke: empty states sin Supabase; no mocks en prod
9. [ ] Docs tenant + enlace desde portal “Abrir panel”

## Anti-patrones

- Copiar `apps/icso/mission-control` como fork permanente
- Meter leads Peskids en profile agency o viceversa
- Crear `apps/moon` o segundo control plane

## Validación

```bash
npm run test --workspace=@intcloudsysops/mission-control-kit
npm run type-check --workspace=@intcloudsysops/icso
```
