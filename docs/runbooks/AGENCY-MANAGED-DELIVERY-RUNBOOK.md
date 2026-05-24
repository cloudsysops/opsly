---
status: ready
owner: operations
last_review: 2026-05-08
---

# Runbook — Opsly Managed Agent Delivery Desk

## Objetivo

Operar un piloto gestionado para una agencia o consultora usando Opsly como control plane de agentes, terminales, IDE, PRs, validaciones y reportes.

## Principios

- Integrar, no duplicar: el cliente conserva su IDE, GitHub, suscripciones y repos.
- Minimo privilegio: cada agente solo ve repos, ramas, carpetas y comandos permitidos.
- Supervisado por defecto: no merge, deploy, migracion prod ni secreto sin aprobacion humana.
- Trazabilidad completa: cada tarea termina con diff, validacion y reporte.

## Onboarding del Piloto

### 1. Alcance

Registrar:

- Nombre de agencia y responsable.
- Repo(s) incluidos.
- 3 a 5 tareas piloto.
- Ventana de ejecucion.
- Persona que aprueba PRs y deploys.
- Canales de comunicacion: GitHub issues, Slack/Discord, Drive o MCP.

### 2. Accesos

Checklist:

- [ ] GitHub repo con permisos minimos.
- [ ] Rama de trabajo acordada: `feat/opsly-pilot-*` o `fix/opsly-pilot-*`.
- [ ] Secrets fuera del repo; Doppler o gestor del cliente.
- [ ] IDE/local agent definido si se ejecuta en PC del cliente.
- [ ] Comandos permitidos y comandos prohibidos documentados.
- [ ] Politica de PR: revision humana obligatoria.

### 3. Configuracion Opsly

Usar capacidades existentes:

- `apps/admin`: vista operativa.
- `apps/portal`: vista cliente si aplica.
- `apps/orchestrator`: cola, Hive, workers y jobs.
- `apps/mcp`: herramientas controladas para agentes.
- `apps/llm-gateway`: routing, costo y fallback.
- `docs/03-agents/AGENT-GUARDRAILS.md`: zonas rojas/ambar.

No crear un sistema paralelo de agentes ni un segundo context builder.

## Ejecucion de Tareas

### Intake

Cada tarea debe tener:

- Descripcion en una frase.
- Criterio de hecho.
- Archivos o modulos permitidos.
- Validacion esperada.
- Riesgos conocidos.

### Preparacion

```bash
git status --short --branch
git fetch origin
git pull --ff-only
```

Si hay cambios humanos locales, no revertirlos. Separar rama o pedir revision solo si bloquean la tarea.

### Ejecucion

1. Crear o usar rama acotada.
2. Cargar contexto: `AGENTS.md`, plan activo y runbooks del modulo.
3. Ejecutar cambios pequenos.
4. Validar segun riesgo.
5. Preparar PR o reporte.

### Validacion Minima

Para docs:

```bash
npm run validate-skills
npm run validate-openapi
```

Para codigo:

```bash
npm run type-check
npm run test --workspace=<workspace-tocado>
```

Para infra/deploy:

```bash
./scripts/validate-config.sh
```

Usar `--dry-run` en scripts que modifiquen estado cuando exista.

## Limites de Seguridad

Prohibido sin aprobacion explicita:

- `git push --force`.
- `git reset --hard`.
- Migraciones aplicadas a prod.
- Cambios en secretos Doppler.
- Deploy de prod.
- Stripe live.
- UFW/DNS/SSH de produccion.
- Archivos con credenciales.

## Cierre de Tarea

Cada cierre debe incluir:

- Resumen de cambio.
- Archivos principales.
- Validaciones ejecutadas y resultado.
- Riesgos pendientes.
- Link a PR o commit.
- Siguiente accion humana.

Plantilla:

```markdown
## Entrega
Cambio:
Validacion:
Riesgos:
PR/commit:
Siguiente accion:
```

## Cierre del Piloto

Medir:

- Tareas completadas.
- Tiempo medio issue -> PR.
- Horas estimadas ahorradas.
- PRs aceptados.
- Re-trabajo requerido.
- Costo LLM.
- Incidentes o bloqueantes.

Decidir:

- Continuar a retainer.
- Extender piloto 14 dias.
- Cerrar sin continuidad y documentar aprendizajes.

## Reporte al Cliente

Enviar una pagina con:

- Que se hizo.
- Evidencia: PRs, logs, validaciones.
- Cuanto tiempo se ahorro.
- Donde hubo riesgo o friccion.
- Recomendacion para el siguiente mes.

---

## Enlaces relacionados

- [[runbooks/README|runbooks]]
- [[brain/README|Brain Central]]
