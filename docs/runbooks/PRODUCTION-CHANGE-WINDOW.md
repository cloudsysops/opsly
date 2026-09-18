---
status: canon
owner: operations
last_review: 2026-09-17
---

# Ventana de cambios en producción

Peskids y el control plane Opsly están operativos de día. La regla canónica separa integración de activación:

```text
merge != release != activation
```

`main` representa verdad de integración. Llegar a `main` no autoriza ni ejecuta un deploy de Peskids, una migración, una activación n8n ni una mutación de producción.

## Regla

| Acción | Cuándo |
|---|---|
| Integración automática de Content / Games / Health Travel / Platform sin `release:required` | Puede ocurrir de día con `merge:daytime` y todos los gates exact-head |
| Integración de Peskids, migraciones, control-plane o superficies sensibles | `merge:governed`; fuera del auto-merge diurno |
| Promoción/deploy a producción de runtime / infra / migraciones | Solo en ventana nocturna `America/Bogota` **22:00–06:00** salvo hotfix autorizado |
| Deploy a VPS / GHCR de Peskids u otros tenants en prod | Misma ventana nocturna salvo hotfix autorizado |
| Emergencia de producción | `hotfix-prod` + aprobación humana / contrato del workflow correspondiente |

## Ventana nocturna

- Zona: `America/Bogota`
- Permitida: **22:00 inclusive → 06:00 exclusive**
- Fuera de esa franja, los workflows de promoción/aplicación de producción deben fallar cerrados.
- Un merge a `main` no despliega Peskids.

## Clasificación de impacto

El clasificador confiable asigna labels por paths:

- `impact:peskids`
- `impact:health-travel`
- `impact:games`
- `impact:content`
- `impact:platform`
- `impact:shared-runtime`
- `impact:infra`
- `impact:control-plane`

Además asigna una ruta de integración y una obligación de release:

- `merge:daytime`: integración automática permitida si el PR está `state:ready`, sin blockers, mergeable y con revisión independiente sobre el head exacto;
- `merge:governed`: integración sensible; nunca entra a la cola diurna automática;
- `release:none`: el merge no deja una activación de producción pendiente;
- `release:required`: después del merge todavía se necesita un release/apply independiente y gobernado.

## Superficies protegidas

Peskids y cualquier superficie `release:required` quedan fuera del auto-merge diurno aunque alguien añada manualmente un label incorrecto. El admission gate vuelve a validar de forma independiente:

- `release:required` → bloquea daytime;
- `impact:peskids` → bloquea daytime;
- `impact:control-plane` → bloquea daytime;
- `merge:governed` junto a `merge:daytime` → bloquea daytime por conflicto.

Esto es defensa en profundidad frente a labels viejos o manuales.

## Peskids

Peskids es actualmente un tenant/producto protegido. Sus cambios se clasifican `merge:governed` y, cuando corresponda, `release:required`.

El flujo esperado es:

```text
PR Peskids
  → CI + revisión
  → governed merge
  → main
  → release candidate explícito
  → ventana de producción
  → deploy / smoke / rollback del release
```

No se encadena un Deploy de Peskids después de merges de Games, Content, Health Travel u otros dominios.

## Migraciones e infraestructura

`supabase/migrations/**`, scripts de deploy/rebuild y superficies equivalentes son `release:required + merge:governed`.

Mergear una migración significa versionar el cambio en `main`; no significa aplicarla.

## Night merge

`night-merge` significa **cola de integración nocturna**, no permiso de deploy. Solo se auto-etiquetan PRs gobernados que estén `state:ready`, sin blockers y con `opsly-independent-review=success` sobre el head exacto. Los cambios de control-plane requieren encolado explícito y no se auto-etiquetan.

Ver [NIGHT-MERGE.md](NIGHT-MERGE.md).

## Labels de excepción

| Label | Uso |
|---|---|
| `safe-daytime` | Compatibilidad/manual para cambios certificados como no operativos; no reemplaza la clasificación canónica |
| `hotfix-prod` | Emergencia real de producción; debe conservar aprobación humana y gates del workflow |
| `night-merge` | Cola nocturna de integración; no autoriza release |

## Comandos

```bash
# ¿Estamos en ventana? (exit 0 = sí)
node scripts/ci/check-production-change-window.mjs --check-now

# Clasificar paths sin mutar GitHub
node scripts/ci/change-impact.mjs --paths lib/content-studio/src/index.ts
node scripts/ci/change-impact.mjs --paths apps/peskids/app/page.tsx
```

## Enforcement

1. `Change impact classification` asigna rutas desde trusted `main`.
2. Daytime/Night admission vuelve a validar blockers, checks y revisión exact-head.
3. Peskids/release-required/control-plane no pueden entrar al daytime bot.
4. Los workflows de release/aplicación conservan la ventana nocturna y sus propias aprobaciones.
5. Un cambio de control-plane no puede certificarse ni mergearse a sí mismo mediante la automatización que introduce.

### Peskids Docker gotcha

- Next 15.5 en `apps/peskids`: `next build` ya usa webpack; no pasar `--webpack` ni `--turbopack` en `apps/peskids/Dockerfile`.
- Guard CI: `scripts/ci/check-peskids-docker-build-flags.sh`.
- Tras un governed merge, el deploy sigue siendo una acción de release separada.
