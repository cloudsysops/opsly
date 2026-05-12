---
status: ready
owner: product
last_review: 2026-05-08
---

# Demo Runbook — Issue a PR con Agente Supervisado

## Objetivo

Mostrar en 8-12 minutos como Opsly convierte una solicitud de cambio en trabajo trazable: intake, agente asignado, terminal/IDE, diff, validacion, PR y reporte.

## Audiencia

Dueños de agencia, tech leads, consultores senior y operadores DevOps que ya usan GitHub, Cursor, VS Code, n8n o agentes locales.

## Narrativa

"Tu equipo sigue usando sus herramientas. Opsly pone el control plane: entiende la tarea, prepara contexto, asigna un agente, ejecuta con limites, valida, abre PR y deja evidencia para el cliente."

## Preparacion

- Repo demo limpio o rama `feat/demo-agent-delivery-desk`.
- Issue demo con alcance pequeno, por ejemplo: "Agregar healthcheck de tenant al portal" o "documentar runbook de deploy".
- API/Admin/Portal locales o staging visibles.
- Orchestrator/Hive/IDE Octopus disponibles para mostrar estado de agentes.
- GitHub CLI autenticado para crear PR si aplica.
- No usar secrets reales en pantalla.

## Flujo Demo

### 1. Intake

Abrir el issue o prompt de tarea y explicar:

- Criterio de hecho.
- Repos y carpetas permitidas.
- Validaciones requeridas.
- Limites: sin tocar deploy, secrets, migraciones prod ni billing live sin aprobacion.

### 2. Asignacion

Mostrar en Admin/IDE Octopus:

- Agente seleccionado.
- Terminal o sesion local asociada.
- Contexto cargado desde `AGENTS.md`, docs y runbooks.
- Queue/job id si el flujo pasa por Orchestrator o Hive.

### 3. Ejecucion Supervisada

Mostrar una terminal con:

```bash
git status --short
npm run type-check --workspace=@intcloudsysops/orchestrator
```

Si el cambio es documental, usar validaciones ligeras:

```bash
npm run validate-openapi
npm run validate-skills
```

### 4. Diff y Revision

Mostrar:

```bash
git diff --stat
git diff -- docs/ apps/ scripts/
```

Explicar que Opsly separa trabajo real de artefactos runtime y respeta cambios humanos existentes.

### 5. PR o Reporte

Crear PR cuando el cambio sea codigo/infra/test:

```bash
git push -u origin HEAD
gh pr create --title "demo: supervised agent delivery flow" --body "Demo flow with validation evidence."
```

Si el cambio es solo documental o ensayo local, generar reporte interno con:

- Que cambio.
- Que se valido.
- Que riesgos quedan.
- Cual es el siguiente paso humano.

## Criterios de Exito

- La tarea pasa de solicitud a diff revisable.
- Hay evidencia de validacion.
- El humano conserva aprobacion sobre merge/deploy.
- El cliente entiende el ahorro: menos cambio de contexto, mas trazabilidad, menos trabajo repetitivo.

## Mensaje de Cierre

"Esto no es un IDE nuevo. Es una mesa de entrega gestionada encima del stack que tu agencia ya usa."
