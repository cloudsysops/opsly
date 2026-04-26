# Validation report — 2026-04-12

**Repo:** Opsly monorepo (`intcloudsysops` / `cloudsysops/opsly`)  
**Package manager:** npm workspaces + Turbo (not pnpm).  
**Generado:** validación automática local + revisión de `ROADMAP.md` / `AGENTS.md`.

---

## 1. Summary por sección

| Sección                 | Estado | Notas                                                                                                                                                       |
| ----------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.1 Estructura crítica  | ✅     | ADR-020, `orchestrator-role`, `health-server`, `model.pkl`, `ARCHITECTURE-DISTRIBUTED.md`, tests en `src/__tests__/` (no en `apps/orchestrator/__tests__/`) |
| 1.2 Type-check          | ✅     | 12/12 workspaces                                                                                                                                            |
| 1.3 Lint                | 🟡     | `npm run lint` falla en `@intcloudsysops/web` (config ESLint / paths)                                                                                       |
| 1.4 Build orchestrator  | ✅     | `tsc` OK                                                                                                                                                    |
| 1.5 Tests orchestrator  | ✅     | 12 archivos, **70** tests; cobertura global **~35%** líneas (no >80% global)                                                                                |
| 1.6 Tests ML            | ✅     | **5** tests en 3 archivos                                                                                                                                   |
| 1.7 Vars `.env.example` | 🟡     | No hay líneas `OPSLY_ORCHESTRATOR_*` / `ORCHESTRATOR_HEALTH_PORT` en `.env.example` (documentar en backlog)                                                 |
| 1.8 Docker              | ✅     | `apps/orchestrator/Dockerfile`; compose bajo `infra/`                                                                                                       |
| 1.9 Git                 | ✅     | `main` limpio salvo `apps/orchestrator/coverage/` sin trackear (post `--coverage`)                                                                          |
| 1.10 Tailscale          | ✅     | `opsly-quantum`, `vps-dragon` visibles en `tailscale status`                                                                                                |
| 1.11 Doppler CLI        | ✅     | CLI responde (`doppler projects`; nombre de proyecto puede diferir de `ops-intcloudsysops` en docs)                                                         |

---

## 2. Métricas

| Métrica                           | Valor                                                      |
| --------------------------------- | ---------------------------------------------------------- |
| `npm run type-check`              | 12/12 OK                                                   |
| Orchestrator tests                | 70 passed                                                  |
| Orchestrator coverage (All files) | ~35.37% statements / ~73.57% branches (promedio reportado) |
| ML tests                          | 5 passed                                                   |
| ADR-020 menciones en `AGENTS.md`  | 2                                                          |

**Nota:** No existe `health-server.test.ts`; el health se ejerce vía integración/manual. La cobertura global baja por workers y módulos no ejercidos en unit tests.

---

## 3. Blockers (priorizados)

| #   | Bloqueante                           | Severidad | Mitigación                                                                                                         |
| --- | ------------------------------------ | --------- | ------------------------------------------------------------------------------------------------------------------ |
| 1   | Cloudflare Proxy OFF en DNS staging  | Alto      | Activar proxy naranja en registros acordes (`AGENTS.md`)                                                           |
| 2   | Resend dominio no verificado         | Alto      | CNAME en DNS; invitaciones externas pueden 500                                                                     |
| 3   | Imagen orchestrator ADR-020 en VPS   | Medio     | Verificar último deploy GH Actions + `curl` health en nodo orchestrator (`ORCHESTRATOR_HEALTH_PORT`, default 3011) |
| 4   | `npm run lint` monorepo              | Bajo      | Aislar: lint por workspace o arreglar `apps/web` ESLint                                                            |
| 5   | `.env.example` sin vars orchestrator | Bajo      | Añadir placeholders documentados (sin secretos)                                                                    |

---

## 4. Matriz componente → estado (Semana referencia ROADMAP)

| Componente                      | Status | Verificación                            | Semana (ROADMAP) |
| ------------------------------- | ------ | --------------------------------------- | ---------------- |
| Orchestrator role/mode          | 🟢     | Tests + código                          | —                |
| Health `GET /health`            | 🟢     | `health-server.ts`                      | —                |
| ADR-020                         | 🟢     | `docs/adr/ADR-020-*.md`                 | —                |
| Classifier sandbox              | 🟢     | `model.pkl` + ML tests                  | —                |
| LLM Gateway / metering Semana 1 | 🟡     | Ejecutar tareas `ROADMAP.md` § Semana 1 | 1                |
| VPS deploy / validación         | 🟡     | Manual / CI                             | 1                |
| Workers remotos + Tailscale     | 🟡     | `ARCHITECTURE-DISTRIBUTED.md`           | 1–2              |
| Feedback loop producto          | ⏳     | `ROADMAP` Semana 5                      | Posterior        |

---

## 5. Plan Semana 1–4 (alineado a `ROADMAP.md`)

### Semana 1 — Routing y costes visibles (`ROADMAP.md`)

- Revisar proveedores y health en `apps/llm-gateway` (`providers.ts`, `llm-direct.ts`).
- Metering / `usage_events` + trazas con `tenant_slug` + `request_id`.
- Tests regresión gateway.
- Operación: validar orchestrator en VPS (`role`/`mode`) y `REDIS_URL` según `ARCHITECTURE-DISTRIBUTED.md`.

### Semana 2 — Planner + workers + NotebookLM (límites)

- `planner-client.ts`, rutas gateway; flags `NOTEBOOKLM_ENABLED`.

### Semana 3 — Context Builder + continuidad

- Cliente context-builder; `scripts/index-knowledge.sh`.

### Semana 4 — Cost transparency (admin)

- `GET /api/admin/costs`, coherencia con datos reales.

_(Semanas 2–4 del prompt del usuario “Router agent / load testing” son orientativas; priorizar filas explícitas en `ROADMAP.md` antes de ADR-021/022 no escritos.)_

---

## 6. Top 5 next actions

1. **Cloudflare + Resend** — desbloquear invitaciones y ocultar origen.
2. **Confirmar deploy** — pipeline verde; health orchestrator en VPS con imagen reciente.
3. **Semana 1 ROADMAP** — gateway + metering + tests gateway (`npm run test --workspace=@intcloudsysops/llm-gateway` si aplica).
4. **Documentar env** — añadir a `.env.example` solo nombres: `OPSLY_ORCHESTRATOR_ROLE`, `OPSLY_ORCHESTRATOR_MODE`, `ORCHESTRATOR_HEALTH_PORT`.
5. **Lint web** — corregir configuración ESLint en `apps/web` o excluir del lint raíz hasta fix.

---

## 7. Decisiones / ADRs pendientes

| ID      | Tema                           | Estado                                    |
| ------- | ------------------------------ | ----------------------------------------- |
| ADR-020 | Control vs worker + alias MODE | ✅ Aceptado en repo                       |
| ADR-021 | Agent Router (prompt usuario)  | No iniciado — requiere problema + alcance |
| ADR-022 | Feedback loop ML               | Parcialmente cubierto por roadmap Fase 2  |
| ADR-023 | Multi-VPS HA                   | Diferido (`VISION.md` / reglas AGENTS)    |

---

## 8. Comandos de reproducción (extracto)

```bash
npm run type-check
npm run build --workspace=@intcloudsysops/orchestrator
npm run test --workspace=@intcloudsysops/orchestrator
npm run test --workspace=@intcloudsysops/ml
# Opcional cobertura (genera apps/orchestrator/coverage/)
npm run test --workspace=@intcloudsysops/orchestrator -- --coverage
```

---

## 9. Salida consola (≤100 líneas — resumen)

```
ESTRUCTURA: ADR-020, orchestrator-role, health-server, model.pkl, ARCHITECTURE-DISTRIBUTED — OK
TYPE-CHECK: 12/12 — OK
BUILD orchestrator: OK
TESTS: orchestrator 70/70, ML 5/5 — OK
COVERAGE orchestrator: ~35% statements (global; no >80%)
LINT root: FAIL (apps/web)
GIT: main, clean except untracked orchestrator/coverage/
TAILSCALE: opsly-quantum, vps-dragon — OK
REPORTE: este archivo
```

---

_Fin del informe._
