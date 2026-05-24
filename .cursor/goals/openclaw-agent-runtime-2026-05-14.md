---
status: active
owner: codex-orchestrator
created_at: 2026-05-14
priority: high
---

# Goal: Opsly OpenClaw Agent Runtime Operativo

## Objetivo
Dejar Opsly capaz de recibir jobs OpenClaw/local-agents, enrutar a agentes locales registrados y validar frontend/admin sin intervención manual pesada.

## Resultado esperado hoy
- OpenClaw tmux cockpit activo.
- 11 agentes locales con `/health` OK: cursor, claude, copilot, opencode, codex, openai, hermes, decepticon, aider, goose, playwright.
- Orchestrator puede cargar `agent-services.yaml` dentro y fuera de Docker.
- Un reviewer revisa seguridad del bridge.
- Un QA runner valida smoke frontend.
- Un architect produce siguiente plan mínimo.

## Asignaciones
- codex: implementar fix, tests y coordinación.
- decepticon: revisar riesgos de `/execute` y config remota.
- playwright: ejecutar smoke/E2E frontend cuando los servicios estén disponibles.
- claude/hermes: sintetizar arquitectura siguiente.
- aider/goose/opencode: reservar para patches acotados después de review.

## Guardrails
- No exponer `/execute` fuera de localhost/Tailscale sin token.
- No tocar secretos ni imprimirlos.
- No detener tmux/agentes vivos salvo que un proceso esté colgado.
- No desplegar cambios al VPS hasta pasar type-check/test local.

---

## Enlaces relacionados

- [[.cursor/index|.cursor]]
- [[README|Inicio]]
