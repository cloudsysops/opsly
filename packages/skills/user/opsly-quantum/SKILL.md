# Opsly Quantum Skill

> **Triggers:** `orquestación`, `diagnóstico completo`, `multi-skill`, `quantum`, `maestro`, `visión global`
> **Priority:** CRITICAL
> **Skills relacionados:** `opsly-context`, `opsly-api`, `opsly-bash`, `opsly-llm`, `opsly-mcp`, `opsly-supabase`, `opsly-tenant`, `opsly-agent-teams`

## Cuándo usar

Cuando el agente necesita **visión completa** del monorepo Opsly: contexto, diagnóstico seguro, enlaces a otros skills, y **acciones reales** vía scripts ya existentes (nunca inventar comandos que no estén en el repo).

**Orden:** tras `opsly-context` (sesión); Opsly Quantum **orquesta** lecturas y comandos, no sustituye decisiones de `AGENTS.md` ni `VISION.md`.

## Superpoderes (mapeo a repo real)

| Poder                 | Qué hacer en Opsly                                                                                                                            |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Context master**    | Leer `AGENTS.md`, `VISION.md`, `config/opsly.config.json`, `docs/adr/` según la tarea.                                                        |
| **Diagnostic wizard** | `./scripts/verify-platform-smoke.sh`; VPS solo Tailscale `100.120.151.91`; disco: `scripts/disk-alert.sh` / `docs/OPS-CLEANUP-PROCEDURES.md`. |
| **Deploy / infra**    | CI: `.github/workflows/deploy.yml`; VPS: runbooks en `docs/` — **no** `docker` destructivo sin runbook.                                       |
| **Métricas**          | API admin/metrics según producto; LLM: `apps/llm-gateway`; costos en dashboard si aplica.                                                     |
| **Seguridad**         | `docs/SECURITY_CHECKLIST.md`; sin escanear el repo con regex agresiva de “secretos” (falsos positivos). Secretos: Doppler.                    |
| **Documentación**     | Actualizar `AGENTS.md` al **cierre de sesión** según protocolo; ADRs en `docs/adr/`.                                                          |
| **Tests**             | `npm run type-check`; tests por workspace (`npm run test --workspace=@intcloudsysops/api`, etc.).                                             |
| **Builder**           | Patrones en `.github/copilot-instructions.md`; API: `skills/user/opsly-api/SKILL.md`.                                                         |

## Skills que combina (lectura)

- `opsly-context` — bootstrap de sesión.
- `opsly-api` — rutas `apps/api`.
- `opsly-bash` — scripts `scripts/`.
- `opsly-llm` — LLM Gateway.
- `opsly-mcp` — MCP OpenClaw.
- `opsly-supabase` — migraciones SQL.
- `opsly-tenant` — onboarding.
- `opsly-agent-teams` — BullMQ / orchestrator.

## CLI opcional (raíz del repo)

```bash
./scripts/opsly-quantum.sh help
./scripts/opsly-quantum.sh context
./scripts/opsly-quantum.sh status      # npm run type-check
./scripts/opsly-quantum.sh smoke       # verify-platform-smoke (requiere red/SSH)
./scripts/opsly-quantum.sh skills      # lista skills/user
```

## Lo que Opsly Quantum **no** hace

- No ejecuta deploy a producción ni `terraform apply` sin runbook explícito.
- No escribe en `AGENTS.md` automáticamente en cada comando (solo el humano/agente al cierre de sesión según protocolo).
- No sustituye **Doppler** ni expone secretos.

## Reglas

- Nunca ejecutar deploy a producción ni `terraform apply` sin runbook explícito.
- No escribir en `AGENTS.md` automáticamente — solo el humano/agente al cierre de sesión.
- No sustituir Doppler ni exponer secretos.
- No inventar comandos que no existan en el repo — usar solo scripts existentes en `scripts/`.
- Siempre ejecutar `opsly-context` antes de Quantum.

## Errores comunes

| Error                  | Causa               | Solución                                  |
| ---------------------- | ------------------- | ----------------------------------------- |
| Script no existe       | Inventó un comando  | Verificar `ls scripts/` antes de ejecutar |
| Deploy sin runbook     | Saltó validación    | Buscar runbook en `docs/` primero         |
| Diagnóstico incompleto | No cargó contexto   | Ejecutar `opsly-context` antes            |
| Secreto expuesto       | Leyó config directo | Usar Doppler, nunca cat de .env           |

## Referencias

- `docs/OPSLYQUANTUM-SKILL-DESIGN.md`
- `docs/OPSLYQUANTUM-USAGE.md`
- `skills/user/opsly-quantum/templates/runbook.md`
