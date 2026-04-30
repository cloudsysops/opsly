# MCP Servers Configuration

Available MCP servers for Claude integrations:

## Data & Infrastructure

- **Supabase** (https://mcp.supabase.com/mcp)
  - Database queries, auth, storage
  - Use: `@supabase query table_name`

- **Stripe** (https://mcp.stripe.com)
  - Payment processing, invoicing, subscriptions
  - Use: `@stripe list customers`

- **DigitalOcean API** (custom or via API endpoints)
  - VPS management, droplets, networking
  - Use: SSH via bash_tool or direct API calls

## Development & Code

- **GitHub** (native, via git commands)
  - Repos, PRs, Actions
  - Use: git commands or web_fetch for API

- **Vercel** (https://mcp.vercel.com)
  - Deployments, projects, logs
  - Use: `@vercel list deployments`

- **Postman** (https://mcp.postman.com/minimal)
  - API collections, testing
  - Use: `@postman get collection`

## Design & Workflow

- **Figma** (https://mcp.figma.com/mcp)
  - Designs, components, files
  - Use: `@figma get design context`

- **n8n-MCP (community)** — [czlonkowski/n8n-mcp](https://github.com/czlonkowski/n8n-mcp)
  - MCP dedicado: nodos, plantillas, validación y API n8n (`N8N_API_URL` + `N8N_API_KEY`).
  - Integración Opsly: **[N8N-MCP-INTEGRATION.md](./N8N-MCP-INTEGRATION.md)** (Cursor + compose opcional).

- **n8n** (https://vps.smiletripcare.com/mcp-server/http)
  - Workflows, executions, triggers
  - Use: `@n8n get workflow status`

- **Canva** (https://mcp.canva.com/mcp)
  - Designs, templates, exports
  - Use: `@canva generate design`

## Productivity

- **Google Calendar** (https://gcal.mcp.claude.com/mcp)
  - Scheduling, events, availability
  - Use: `@calendar find meeting times`

- **Notion** (https://mcp.notion.com/mcp)
  - Databases, pages, content
  - Use: `@notion search databases`

---

## How to Use in Claude.ai

1. Open Claude.ai
2. Settings → Connected tools
3. Enable desired MCP servers
4. Use in prompt: @ServerName command

## For Cursor / CLI

En **Cursor**, los MCP se configuran en **`.cursor/mcp.json`** (local, no versionado). Ver ejemplo Opsly en `apps/mcp/README.md` y fragmento **n8n-mcp** en `docs/02-tools/examples/cursor-mcp-n8n-mcp.fragment.json`.

Sin MCP en CLI:

- API directa (`curl`, `fetch`)
- Paquetes SDK (`npm install …`)
- Scripts en `scripts/`

## Opsly-Specific MCP Tools

The `apps/mcp` directory contains OpenClaw MCP server with tools:

- `tenants_*` - Tenant management
- `health_*` - Health checks
- `metrics_*` - System metrics
- `onboard_*` - Tenant onboarding
- `invite_*` - Invitation management
- `suspend_*` - Tenant suspension
- `execute_prompt_*` - AI prompt execution
