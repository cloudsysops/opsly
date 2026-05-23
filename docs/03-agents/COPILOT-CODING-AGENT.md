---
status: canon
owner: agents
last_review: 2026-05-23
---

# GitHub Copilot Coding Agent — firewall y alcance

> **No confundir** con GitHub Copilot en el IDE (VS Code/Cursor) ni con el worker `local_copilot` (puerto 5003). Este documento cubre el **agente que comenta en PRs** en GitHub.com, que corre en un sandbox con firewall de salida.

## Qué es el aviso «Firewall rules blocked me…»

Copilot intentó conectar a una IP/host no permitido (típico: `100.120.151.91` vía `ssh vps-dragon@…`). Eso es **esperado**: el sandbox **no** tiene acceso a Tailscale ni a la red privada del VPS.

| Entorno | SSH Tailscale `100.120.151.91` | `npm run type-check` en repo |
| ------- | ------------------------------ | ---------------------------- |
| Copilot en comentario de PR (GitHub) | ❌ bloqueado | ✅ |
| Cursor / terminal local (con Tailscale) | ✅ | ✅ |
| GitHub Actions (`deploy.yml`, etc.) | ✅ con `TAILSCALE_AUTHKEY` + secrets | ✅ |

## Qué debe hacer Copilot en un PR

1. Leer `AGENTS.md`, `VISION.md` y este doc si hay dudas de red.
2. Cambios de código, tests, docs en el clon del PR.
3. Validación local en sandbox: `npm run type-check`, tests del workspace tocado, `npm run validate-structure` / `validate-openapi` cuando aplique.
4. Smoke HTTP **solo** a URLs públicas allowlisteadas por la org (p. ej. `https://api.op-sly.com/api/health`) — puede fallar si el dominio no está en la allowlist.
5. Si hace falta estado del VPS: citar `docs/04-infrastructure/PRODUCTION-STATUS-2026-05-15.md` y la sección 🔄 de `AGENTS.md`; **pedir al humano** verificación SSH.

## Qué no debe hacer Copilot en un PR

- `ssh vps-dragon@100.120.151.91` (ni cualquier IP `100.64.0.0/10`).
- `doppler secrets get` / leer secretos reales.
- `./scripts/validate-config.sh` si el objetivo es solo comprobar SSH/Doppler en prod (parte del script asume red operador).
- Deploy, `docker compose` en VPS, `./scripts/peskids-rebuild-vps.sh`, migraciones Supabase en prod.

Instrucciones resumidas para el modelo: [`.github/copilot-instructions.md`](../../.github/copilot-instructions.md).

## Allowlist de firewall (solo admin org/repo)

Ruta: **GitHub → Settings → Copilot → Coding agent → Firewall**

Documentación: [Troubleshoot firewall settings](https://docs.github.com/en/copilot/how-tos/troubleshoot-copilot/troubleshoot-firewall-settings)

Dominios útiles para Opsly (HTTP/HTTPS saliente):

| Host / patrón | Uso |
| ------------- | --- |
| `registry.npmjs.org` | `npm ci` |
| `raw.githubusercontent.com` | contexto raw `AGENTS.md` |
| `ghcr.io` | referencias de imágenes en docs/CI |
| `*.supabase.co` | API/migraciones si el job lo requiere |
| `*.op-sly.com` | health público staging/prod |

**No recomendado:** `100.120.151.91`, `100.64.0.0/10` ni abrir SSH al VPS desde el sandbox de GitHub (superficie de ataque innecesaria).

## Setup steps (Actions, antes del firewall del agente)

Workflow: [`.github/workflows/copilot-setup-steps.yml`](../../.github/workflows/copilot-setup-steps.yml)

Instala Node 20, `npm ci`, Python 3.11 y Playwright para Chromium. Se dispara en cambios a ese workflow o manualmente (`workflow_dispatch`). No sustituye deploy ni SSH.

## Matriz rápida: quién hace qué en Opsly

| Tarea | Copilot PR | Cursor local | GitHub Actions |
| ----- | ---------- | ------------ | -------------- |
| Fix TypeScript / tests | ✅ | ✅ | ✅ (CI) |
| Revisión de PR | ✅ | ✅ | — |
| SSH / `docker ps` en VPS | ❌ | ✅ | ✅ (deploy job) |
| Doppler secrets reales | ❌ | ✅ (humano) | ✅ (tokens CI) |
| Merge a `main` | ❌ (humano) | PR | — |

## Enlaces

- Multi-agente en paralelo: [`AGENTS-GUIDE.md`](AGENTS-GUIDE.md)
- SSH usuarios: [`SSH-USERS-FOR-AGENTS.md`](SSH-USERS-FOR-AGENTS.md)
- Guardrails: [`AGENT-GUARDRAILS.md`](AGENT-GUARDRAILS.md)
