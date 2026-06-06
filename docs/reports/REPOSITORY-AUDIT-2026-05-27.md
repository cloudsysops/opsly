---
status: report
owner: operations
date: 2026-05-27
type: governance
---

# Repository Audit — 2026-05-27

Clasificación de entradas en raíz y artefactos de sesión de agentes.  
**Regla:** no ampliar `config/root-whitelist.json` para hacer pasar CI — items en REVIEW requieren decisión humana.

## KEEP (tracked / allowlisted)

| Entrada | Notas |
|---------|-------|
| Hubs markdown raíz | `AGENTS.md`, `README.md`, `ROADMAP.md`, `VISION.md`, … |
| Config lockfiles | `package.json`, `package-lock.json`, `turbo.json`, … |
| Symlinks | `context` → `runtime/context`, `skills` → `packages/skills` |
| Carpetas allowlisted | `apps/`, `docs/`, `runtime/`, `tools/`, `.githooks/`, … |
| `.archived/` | En `allowed_folders` + `allowed_hidden_folders` — destino local de archivos retirados |

## MOVE

| Entrada | Destino sugerido | Motivo |
|---------|------------------|--------|
| `analyze_n8n_nodes.py` | `runtime/tmp/` o `scripts/` (subcarpeta n8n) | Script ad-hoc en raíz |
| `diagnose_n8n_webhooks.py` | `runtime/tmp/` | Idem |
| `fix_lc_v2.py` | `runtime/tmp/` | Idem |
| `fix_lead_capture.py` | `runtime/tmp/` | Idem |
| `reimport_lead_capture.py` | `runtime/tmp/` | Idem |
| `*.png` / screenshots (cuando existan) | `runtime/tmp/` o `docs/artifacts/` | No son contrato de repo |
| `dump.rdb` | DELETE (gitignored) | Volcado Redis local |

## ARCHIVE

| Entrada | Destino |
|---------|---------|
| Scripts Python de sesión n8n (si se conservan) | `.archived/n8n-session-2026-05/` |

## DELETE

| Entrada | Motivo |
|---------|--------|
| `dump.rdb` | Artefacto Redis, ya en `.gitignore` |
| PNG temporales de debug (`.tmp-peskids-*.png`, etc.) | Basura de sesión |

## REVIEW

| Entrada | Motivo | Acción requerida |
|---------|--------|------------------|
| Nuevo symlink en raíz | Cualquier symlink distinto de `context`/`skills` | Revisión humana antes de allowlist |
| `config/capability-matrix.json` | Eliminado en rama `feat/brand-agent-ghl-provisioning` local; existe en remoto de esa rama | **No** re-añadir a raíz — pertenece a `config/` en rama producto, no ampliar whitelist aquí |
| `.playwright-mcp/`, `.superpowers/` | Gitignored; no en whitelist | OK como local-only; si algún día se trackean → REVIEW |
| `apps/orchestrator/.cursor/` (untracked) | Metadatos IDE dentro de workspace | **DELETE** o gitignore; no subir a raíz ni a apps tracked sin política |

## Gitignored (omitir en validate-structure)

- `.env`, `.env.local`, `.env.prod`, `.env*.local`
- `dump.rdb`
- `.agent-bootstrap-state/`, `.playwright-mcp/`, `.superpowers/`

## Resumen por acción

| Clase | Count (local Mac) |
|-------|-------------------|
| KEEP | Estructura canónica + symlinks |
| MOVE | 5× `.py` en raíz |
| DELETE | dump + PNG temp (cuando presentes) |
| REVIEW | 3 items (capability-matrix, symlinks nuevos, `.cursor` en apps) |
