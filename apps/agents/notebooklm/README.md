# NotebookLM Agent (Opsly)

Integración **experimental** con [notebooklm-py](https://github.com/teng-lin/notebooklm-py) (API no oficial de Google NotebookLM).

## Requisitos

- Python 3.12+
- `pip install -r requirements.txt` y `playwright install chromium` si usas `[browser]`
- Autenticación Google: seguir documentación de `notebooklm-py` (`NotebookLMClient.from_storage()`)
- `NOTEBOOKLM_ENABLED=true` en el entorno (Doppler) antes de ejecutar

## Uso desde TypeScript (monorepo)

```typescript
import { executeNotebookLM } from "@intcloudsysops/notebooklm-agent";

await executeNotebookLM({
  action: "create_notebook",
  tenant_slug: "localrank",
  name: "Reporte",
});
```

Stdin → `client.py` recibe un JSON con `action`, `tenant_slug`, etc.

## Docker

```bash
docker build -t opsly-notebooklm ./apps/agents/notebooklm
```

Montar credenciales de notebooklm donde la librería las espera (perfil / `NOTEBOOKLM_AUTH_JSON`).

## Planes

Pensado para **business** y **enterprise**; validación de plan puede hacerse en API/MCP antes de llamar al agente.

Ver `docs/adr/ADR-014-notebooklm-agent.md`.
