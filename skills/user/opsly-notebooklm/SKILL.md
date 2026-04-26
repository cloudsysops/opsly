# Opsly NotebookLM Agent Skill

> **Triggers:** `notebooklm`, `podcast`, `audio`, `pdf`, `google`, `research`, `resumen`
> **Requires:** `NOTEBOOKLM_ENABLED=true`, `plan: business|enterprise`
> **Priority:** LOW (EXPERIMENTAL)
> **Skills relacionados:** `opsly-tenant`, `opsly-llm`

## Cuándo usar

Cuando un tenant necesite generar contenido a partir de documentos o investigación:

- PDFs → podcast + slides + infografía (workflow `report-to-podcast.py`)
- URLs / texto → fuentes en NotebookLM → quiz, chat, etc.
- Investigación web → resumen + importación de fuentes

Requiere `NOTEBOOKLM_ENABLED=true` y credenciales notebooklm-py (Google). **API no oficial** de Google.

## Acciones (TypeScript)

El paquete `@intcloudsysops/notebooklm-agent` expone `executeNotebookLM`:

```typescript
import { executeNotebookLM } from '@intcloudsysops/notebooklm-agent';

await executeNotebookLM({
  action: 'create_notebook',
  tenant_slug: 'localrank',
  name: 'Reporte Enero 2026',
});

await executeNotebookLM({
  action: 'add_source',
  tenant_slug: 'localrank',
  notebook_id: 'nb_xxx',
  source_type: 'url',
  url: 'https://example.com/doc',
});

await executeNotebookLM({
  action: 'generate_podcast',
  tenant_slug: 'localrank',
  notebook_id: 'nb_xxx',
  instructions: 'Resumen ejecutivo 10 min',
  output_path: '/tmp/localrank-podcast.mp3',
});
```

## MCP

Tool registrada: **`notebooklm`**, scope OAuth **`agents:write`**.

## Caso de uso LocalRank

1. Cliente sube PDF de reporte mensual (Drive u origen acordado).
2. n8n u orquestador invoca el workflow Python o `executeNotebookLM`.
3. Salidas: podcast, PDF de slides, infografía (según pipeline).
4. Entrega al cliente y notificación (email / WhatsApp / Discord según flujo).

## Advertencias

- Puede dejar de funcionar si Google cambia NotebookLM.
- Recomendado para planes **business** y **enterprise**; documentar uso en producción vía ADR-014.

## Instalación skill upstream (opcional)

CLI interactivo: `npx skills add teng-lin/notebooklm-py` (elegir agente destino).  
Python: `pip install "notebooklm-py[browser]"` y autenticación según docs del proyecto.

## Errores comunes

| Error         | Causa                | Solución                             |
| ------------- | -------------------- | ------------------------------------ |
| NOT_ENABLED   | Feature flag off     | `NOTEBOOKLM_ENABLED=true` en Doppler |
| PLAN_REQUIRED | Tier bajo            | Solo business/enterprise             |
| API changed   | Google actualizó API | ADR-014, reverificar                 |

## Testing

```bash
# Verificar feature flag
doppler secrets get NOTEBOOKLM_ENABLED --plain

# Test notebook creation
node -e "const {executeNotebookLM} = require('./apps/agents/notebooklm'); executeNotebookLM({action:'create_notebook',tenant_slug:'test',name:'Test'}).then(console.log)"

# Verificar MCP tool
curl -sf http://localhost:3003/tools | jq '.[] | select(.name=="notebooklm")'
```
