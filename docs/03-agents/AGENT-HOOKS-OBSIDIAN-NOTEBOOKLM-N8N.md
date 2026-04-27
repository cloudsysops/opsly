# Agent Hooks — Obsidian + NotebookLM + n8n

Integración unificada para agentes internos y externos:

- Catálogo de skills compartido (`/mnt/skills`)
- Bitácora operativa en Obsidian (`docs/obsidian/inbox`)
- Sync de conocimiento a NotebookLM
- Eventos operativos a n8n webhook

## Objetivo

Todas las herramientas (Claude, OpenCode, Hermes, Copilot, Decepticon, OpenClaude y nuevas) deben usar el mismo flujo de hooks para no divergir en contexto ni automatizaciones.

## Script central

`scripts/agent-hooks.sh`

Comandos:

```bash
# Bootstrap agente interno
npm run agents:hooks:bootstrap:internal

# Bootstrap agente externo
npm run agents:hooks:bootstrap:external

# Hook post-commit manual (además del .githooks/post-commit)
npm run agents:hooks:post-commit
```

## Qué hace cada hook

### bootstrap (internal/external)

1. Sincroniza catálogo de skills a `/mnt/skills` (`scripts/sync-skills-external.sh`)
2. Ejecuta `notebooklm:sync` si `NOTEBOOKLM_ENABLED=true`
3. Escribe nota de auditoría en `docs/obsidian/inbox/YYYY-MM-DD.md`
4. Envía evento a n8n (`agent_bootstrap_internal` / `agent_bootstrap_external`) si `N8N_WEBHOOK_URL` existe

### post-commit

1. Re-sincroniza skills
2. Re-sincroniza NotebookLM si está habilitado
3. Registra nota en Obsidian
4. Envía evento `agent_post_commit` a n8n

## Configuración requerida

Variables opcionales:

- `NOTEBOOKLM_ENABLED=true` (si se quiere sync automático)
- `N8N_WEBHOOK_URL=https://...` (si se quiere notificación webhook)

## Integración en git hooks

`.githooks/post-commit` ya invoca:

```bash
./scripts/agent-hooks.sh post-commit
```

Con `|| true` para no bloquear commits si falla un servicio externo.

## Obsidian

Se crea/actualiza:

- `docs/obsidian/inbox/YYYY-MM-DD.md`

Formato:

- título del evento
- timestamp UTC
- modo (`internal`/`external`)
- mensaje corto
- tags `#opsly #agents #hooks`

## Recomendación operativa

Para cada herramienta nueva:

1. Ejecutar bootstrap externo o interno según el caso
2. Verificar `/mnt/skills/index.json`
3. Confirmar que aplica regla reuse-first de skills
4. Revisar si n8n recibió evento
