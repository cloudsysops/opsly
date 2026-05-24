---
status: draft
owner: operations
last_review: 2026-05-23
type: tool-doc
tags:
  - opsly/tools
  - cursor
  - mcp
---

# Cursor MCP — research y navegador

Configuración local en **`.cursor/mcp.json`** (gitignored). Fragmento versionado para copiar/pegar: [`examples/cursor-mcp-research-browser.fragment.json`](examples/cursor-mcp-research-browser.fragment.json).

## Servidores incluidos

| ID | Paquete npm | API key |
|----|-------------|---------|
| `perplexity` | `@perplexity-ai/mcp-server` | `PERPLEXITY_API_KEY` |
| `firecrawl` | `firecrawl-mcp` | `FIRECRAWL_API_KEY` |
| `playwright` | `@playwright/mcp@latest` | — |
| `glif` | `@glifxyz/glif-mcp-server@latest` | `GLIF_API_TOKEN` |
| `chrome-devtools` | `chrome-devtools-mcp@latest` | — |

Además del bloque **`opsly-openclaw`** (stdio del monorepo).

## Variables de entorno

Exporta en tu shell o en **Cursor → Settings → MCP** (env del servidor):

```bash
export PERPLEXITY_API_KEY="pplx-..."   # https://www.perplexity.ai/settings/api
export FIRECRAWL_API_KEY="fc-..."    # https://www.firecrawl.dev/app/api-keys
export GLIF_API_TOKEN="..."          # https://glif.app
```

Opcional en Doppler (`ops-intcloudsysops` / `prd`):

```bash
doppler secrets set PERPLEXITY_API_KEY --project ops-intcloudsysops --config prd
doppler secrets set FIRECRAWL_API_KEY --project ops-intcloudsysops --config prd
doppler secrets set GLIF_API_TOKEN --project ops-intcloudsysops --config prd
```

Luego, en la misma terminal donde abres Cursor:

```bash
eval "$(doppler secrets download --no-file --format env --project ops-intcloudsysops --config prd)"
open -a Cursor
```

## Playwright (primera vez)

Si las herramientas de Playwright fallan por navegador ausente:

```bash
npx playwright install chromium
```

## Chrome vs Cursor Browser

- **`chrome-devtools`**: MCP oficial de Chrome DevTools (inspección CDP, performance, red).
- **`cursor-ide-browser`**: integración nativa de Cursor (pestaña en el IDE); no sustituye este JSON.

## Activar en Cursor

1. Fusiona el fragmento en `.cursor/mcp.json` (o usa el archivo del repo si ya está actualizado).
2. **Cursor → Settings → MCP** → recargar servidores (o reiniciar Cursor).
3. Comprueba que cada servidor aparece en verde; los que requieren API key fallan hasta exportar la variable.

## Smoke test (terminal)

```bash
npx -y @perplexity-ai/mcp-server --version 2>&1 | head -3
npx -y firecrawl-mcp --version 2>&1 | head -3
npx -y @playwright/mcp@latest --version 2>&1 | head -3
npx -y @glifxyz/glif-mcp-server@latest --version 2>&1 | head -3
npx -y chrome-devtools-mcp@latest --version 2>&1 | head -3
```
