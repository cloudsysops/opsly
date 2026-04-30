# n8n-MCP (czlonkowski) — integración Opsly

Repositorio upstream: [czlonkowski/n8n-mcp](https://github.com/czlonkowski/n8n-mcp) (MIT). Expone un **servidor MCP** con documentación de nodos n8n, plantillas, validación y (opcional) gestión vía **API REST de n8n**.

## Relación con OpenClaw

| Componente | Rol |
| ------------ | --- |
| **`apps/mcp`** (OpenClaw) | MCP **oficial Opsly**: tenants, health, invitaciones, GitHub prompt, etc. ([ADR-009](../adr/ADR-009-openclaw-mcp-architecture.md)). |
| **n8n-mcp** | MCP **adicional** solo para **diseño y validación de workflows n8n**. No sustituye al MCP de plataforma. |

## Fase 1 — Cursor local (recomendado)

1. API de n8n del tenant (staging): URL base + API key (n8n **Settings → API**).
2. Secretos vía Doppler (no pegar keys en el repo):

   ```bash
   doppler secrets set N8N_API_URL="https://n8n-<slug>.<PLATFORM_DOMAIN>/" N8N_API_KEY="..." \
     --project ops-intcloudsysops --config prd
   ```

3. Copia el fragmento de [`examples/cursor-mcp-n8n-mcp.fragment.json`](examples/cursor-mcp-n8n-mcp.fragment.json) dentro de tu **`.cursor/mcp.json`** (el archivo real está en `.gitignore`; fusiona `mcpServers` con el bloque existente `opsly-openclaw`).
4. Para cargar env desde Doppler al arrancar Cursor:

   ```bash
   doppler run --project ops-intcloudsysops --config prd -- cursor .
   ```

   (O exporta solo `N8N_API_URL` / `N8N_API_KEY` en tu shell antes de abrir Cursor.)

### Uso seguro

- No editar workflows de **producción** con IA sin copia y prueba en staging (el upstream lo advierte explícitamente).
- Una instancia de n8n-mcp apunta a **un** `N8N_API_URL`; para otro tenant, otro perfil MCP o otra entrada `env`.

## Fase 2 — Contenedor opcional en el VPS (HTTP)

Overlay **no activo** por defecto: `infra/docker-compose.n8n-mcp.yml` con **profile** `n8n-mcp`.

```bash
cd infra
docker compose --env-file ../.env -f docker-compose.n8n-mcp.yml --profile n8n-mcp up -d n8n-mcp
```

Variables (Doppler / `.env`):

| Variable | Uso |
| -------- | --- |
| `N8N_API_URL` | Base URL de la instancia n8n (p. ej. tenant staging). |
| `N8N_API_KEY` | API key n8n (herramientas `n8n_*` del MCP). |
| `N8N_MCP_AUTH_TOKEN` | Token HTTP para proteger el endpoint del MCP (`AUTH_TOKEN` en el contenedor upstream). |

Imagen publicada: `ghcr.io/czlonkowski/n8n-mcp` (etiquetas por versión; en el compose se fija una tag acotada). Puerto interno del contenedor upstream: **3000**; en el overlay se publica **127.0.0.1:3020** para Traefik o túnel manual.

Si expones por Traefik, añade router TLS con allowlist IP / Cloudflare Access; **no** dejes el MCP HTTP sin auth en Internet.

## Referencias

- [README upstream](https://github.com/czlonkowski/n8n-mcp#readme) — herramientas, validación, self-host.
- [Paquete npm `n8n-mcp`](https://www.npmjs.com/package/n8n-mcp) — binario `n8n-mcp` (stdio).
- Opsly: [`apps/mcp/README.md`](../../apps/mcp/README.md), [`MCP-SERVERS.md`](MCP-SERVERS.md).
