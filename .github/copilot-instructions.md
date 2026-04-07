## PROTOCOLO OBLIGATORIO — INICIO DE SESION

Antes de CUALQUIER tarea, sin excepcion:

1. Leer `AGENTS.md` completo.
2. Leer `VISION.md` completo.
3. Verificar estado VPS:
   `ssh vps-dragon@157.245.223.7 "systemctl is-active cursor-prompt-monitor opsly-watcher && docker ps --format '{{.Names}}\t{{.Status}}' | grep -E 'n8n|uptime|infra|traefik'"`
4. Verificar vars criticas Doppler:
   `for VAR in DISCORD_WEBHOOK_URL RESEND_API_KEY GITHUB_TOKEN_N8N GOOGLE_DRIVE_TOKEN; do VAL=$(doppler secrets get $VAR --project ops-intcloudsysops --config prd --plain 2>/dev/null || echo ""); echo "$VAR: ${#VAL} chars"; done`
5. Reportar gaps antes de continuar.
6. No ejecutar nada hasta confirmar el reporte.

## FILOSOFIA DE TRABAJO

Planificar -> Documentar -> Tests -> Implementar -> Validar -> Notificar
NUNCA adivinar. NUNCA saltarse pasos.

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

## Patrones de diseño en Opsly

- **Repository:** toda lectura/escritura a **Supabase** va en `apps/api/lib/repositories/` (un archivo o carpeta por agregado). Los **route handlers** (`app/api/**/route.ts`) solo llaman a repositorios o casos de uso, **nunca** instancian el cliente Supabase para queries ad hoc.
  - Estructura sugerida: `lib/repositories/tenant.repository.ts` exporta funciones puras o clase pequeña con `findById`, `list`, `create`, etc.
- **Factory:** creación de **tenants**, **compose**, **configs** dinámicos → funciones factory en `apps/api/lib/factories/` (p. ej. `createTenantComposeEnv()`). Evitá bloques grandes de “armado” inline en handlers.
- **Observer / eventos:** eventos de dominio (tenant creado, pago recibido, backup completado) → **emitir** evento (Node `EventEmitter` acotado o **BullMQ** como cola). Los consumidores se registran aparte; **no** encadenar llamadas directas a notificaciones/email desde el mismo archivo que persiste datos.
- **Strategy:** proveedores intercambiables (**Stripe**, email, notificaciones) → interfaz común en `apps/api/lib/providers/` con implementaciones concretas; el handler o servicio recibe la estrategia por parámetro o registro de DI sencillo.

## Algoritmos — cuándo usar qué

- **Listas pequeñas (< ~100 ítems):** `Array.prototype.filter` / `find` en memoria; no micro-optimizar.
- **Listas grandes o datos persistentes:** **índices y consultas en Supabase**; nunca escanear tablas enteras en un loop en Node.
- **Reintentos:** **BullMQ** con `attempts` y **backoff exponencial**; no `setTimeout` en bucle manual para reintentos de negocio.
- **Paginación:** preferir **cursor-based** (keyset) para logs/tenants en crecimiento; evitar `OFFSET` alto en tablas grandes.
- **Caché:** **Redis** para resultados costosos **> ~100 ms**; siempre definir **TTL** explícito (ver `lib/constants.ts` → `CACHE_TTL`).

## Principios SOLID aplicados a Opsly

- **S — Single responsibility:** cada módulo bajo `lib/` tiene una responsabilidad clara (un tema por archivo cuando sea posible).
- **O — Open/closed:** nuevos **providers** o estrategias se añaden sin modificar el núcleo (interfaces + registro).
- **L — Liskov:** si una función acepta `TenantConfig`, cualquier subtipo válido debe comportarse sin romper llamadas.
- **I — Interface segregation:** preferir tipos pequeños (`Pick`, interfaces enfocadas) a un objeto “común” con decenas de campos opcionales.
- **D — Dependency inversion:** los route handlers dependen de **contratos** (funciones importadas desde `lib/`), no de implementaciones bajas mezcladas en el mismo archivo.

## Reglas de estilo obligatorias

- **Early return:** validar input y errores al inicio; el “camino feliz” al final.
- **Sin números mágicos:** usar `lib/constants.ts` u otras constantes nombradas.
- **Comentarios:** explicar el **por qué**, no lo obvio; el **qué** debe leerse en el código.
- **Nombres en inglés** en código; **comentarios en español** cuando ayuden al equipo.
- **Funciones puras** cuando no haya I/O; aislar efectos secundarios.

## Estructura de un archivo nuevo en `apps/api` (route handler)

1. **Imports:** tipos → `lib/` (repositorios, validación) → externos (`next/server`, etc.).
2. **Validación** del input (query/body) con **early return** (`400`/`422`).
3. **Lógica de negocio** delegada a `lib/` (repositorio, factory, servicio); **sin** SQL ni Supabase directo en el handler.
4. **Respuesta** `NextResponse.json(...)` con tipo explícito o `satisfies` cuando aplique.

## Estructura de un script bash nuevo (`scripts/` o `tools/`)

```bash
#!/usr/bin/env bash
# Propósito en una línea.
set -euo pipefail

DRY_RUN="${DRY_RUN:-false}"
log() { echo "[script] $*"; }

check_dependencies() {
  command -v jq >/dev/null || { echo "Falta jq" >&2; exit 2; }
}

main() {
  check_dependencies
  if [[ "${DRY_RUN}" == "true" ]]; then
    log "DRY-RUN: …"
    return 0
  fi
  # …
}

main "$@"
```
