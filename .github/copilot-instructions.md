# Opsly — Instrucciones para GitHub Copilot

<!--
Qué hace: orienta a Copilot (y herramientas que lean este archivo) sobre convenciones
  del repo Opsly y límites de arquitectura.
Cuándo se activa: Copilot lo usa como contexto al sugerir código en este repositorio.
Reutilizar en otro proyecto: sustituye nombres (Opsly → tu producto), rutas de config
  y lista de “qué NO hacer” según tus ADRs.
-->

Fuente de verdad operativa: `AGENTS.md` en la raíz del repo (y espejo bajo `.github/` cuando esté sincronizado).

## Convenciones Opsly

- **TypeScript:** estricto; **no uses `any`**.
- **Bash:** `set -euo pipefail`; scripts **idempotentes**; expón **`--dry-run`** cuando el script modifique estado o infra.
- **Secretos:** solo vía **Doppler** (proyecto `ops-intcloudsysops`, config `prd` en producción); nunca en código ni commits.
- **Config central:** valores no secretos y rutas de producto en `config/opsly.config.json` (sin credenciales).

Stack resumido: Next.js 15, Tailwind, Supabase, Stripe, Docker Compose, Traefik v3, Redis/BullMQ.

## Archivos de referencia

| Recurso | Uso |
|--------|-----|
| `VISION.md` | Norte del producto, fases, ICP, qué no haremos. |
| `AGENTS.md` | Estado de sesión, VPS, DNS, próximos pasos, decisiones fijas. |
| `config/opsly.config.json` | Dominios, IP VPS, nombres Doppler/GitHub, planes. |
| `docs/adr/` | Decisiones de arquitectura (Traefik, compose por tenant, Doppler, schemas). |
| `infra/terraform/` | IaC cuando exista; revisar plan antes de aplicar. |

## Qué NO hacer

- No proponer **Kubernetes**, **Docker Swarm** ni **nginx** como reemplazo del diseño acordado (compose + Traefik v3), salvo ADR nuevo explícito.
- No **hardcodear** URLs de producción, tokens, API keys ni contraseñas; usar Doppler y variables de entorno documentadas.
- No **saltarse** `./scripts/validate-config.sh` cuando el cambio afecte deploy, DNS o secretos esperados en `prd`.
- No aplicar **Terraform** sin **plan revisado** y sin entender impacto en VPS/tenants.
- No contradecir decisiones fijas tabuladas en `AGENTS.md` sin acuerdo del equipo.
