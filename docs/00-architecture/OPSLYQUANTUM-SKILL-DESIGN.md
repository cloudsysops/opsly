# Opsly Quantum — diseño del skill maestro

## Visión

**Opsly Quantum** es un skill **procedural** (Markdown + `manifest.json`) que orienta a agentes de IA a trabajar en Opsly con:

- **Contexto correcto** (`AGENTS.md`, `VISION.md`, `config/opsly.config.json`).
- **Acciones reales** (scripts y comandos ya existentes en el monorepo).
- **Orquestación** de otros skills bajo `skills/user/opsly-*` sin duplicar lógica ni inventar binarios.

No es un servicio HTTP ni un runtime aparte: el “CLI” opcional es **`scripts/opsly-quantum.sh`**, fino y auditable.

## Principios

1. **Repo-first:** la fuente de verdad sigue siendo git; el skill no auto-escribe `AGENTS.md` en cada invocación.
2. **Seguridad:** SSH al VPS solo por Tailscale; secretos en Doppler; sin `terraform apply` ni deploy implícito.
3. **Sin `any`:** no se añade un paquete TypeScript grande con stubs falsos (evita deuda y falsos positivos en “security scan”).

## Superpoderes (8) — implementación

| #   | Nombre            | Implementación real                                                                        |
| --- | ----------------- | ------------------------------------------------------------------------------------------ |
| 1   | Context master    | Leer `AGENTS.md`, `VISION.md`, `docs/adr/`, `ARCHITECTURE-DISTRIBUTED-FINAL.md` si aplica. |
| 2   | Diagnostic wizard | `./scripts/verify-platform-smoke.sh`, `disk-alert.sh`, logs con política de no secretos.   |
| 3   | Deploy master     | Runbooks + GitHub Actions; el agente no “despliega” desde un skill sin checklist humano.   |
| 4   | Metrics guru      | Endpoints y apps existentes (`apps/admin`, métricas API, LLM gateway logger).              |
| 5   | Security guardian | `docs/SECURITY_CHECKLIST.md`; revisión manual; no regex masiva de tokens en código.        |
| 6   | Doc writer        | Protocolo de cierre en `AGENTS.md`; plantillas en `skills/user/opsly-quantum/templates/`.  |
| 7   | Test master       | `npm run type-check`, tests por workspace, Vitest/Playwright según app.                    |
| 8   | Builder           | Patrones en `.github/copilot-instructions.md`, skills `opsly-api`, `opsly-bash`.           |

## Integración con skills existentes

```
opsly-quantum (maestro)
├── opsly-context
├── opsly-api
├── opsly-bash
├── opsly-llm
├── opsly-mcp
├── opsly-supabase
├── opsly-tenant
├── opsly-agent-teams
├── opsly-discord
└── ... (resto en skills/README.md)
```

## Configuración

No hay `config.yaml` con `access_secrets` en repo: los permisos los define el entorno humano (Doppler, SSH, CI).

## Referencias

- `skills/user/opsly-quantum/SKILL.md`
- `docs/OPSLYQUANTUM-USAGE.md`
- `skills/README.md`
