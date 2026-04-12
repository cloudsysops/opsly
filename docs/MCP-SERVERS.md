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

MCP servers are NOT directly available in Cursor CLI yet.
Use via:

- Direct API calls (curl, fetch)
- SDK packages (npm install @supabase/supabase-js, etc.)
- Shell commands (doppler, aws cli, etc.)
- This repo's scripts in `scripts/` directory

## Opsly-Specific MCP Tools

The `apps/mcp` directory contains OpenClaw MCP server with tools:

- `tenants_*` - Tenant management
- `health_*` - Health checks
- `metrics_*` - System metrics
- `onboard_*` - Tenant onboarding
- `invite_*` - Invitation management
- `suspend_*` - Tenant suspension
- `execute_prompt_*` - AI prompt execution
