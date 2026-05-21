# Peskids Platform — Standalone SaaS

Peskids is an after-school program management platform with **7 coordinated AI agents** that automate lead capture, documentation, messaging, security, and reporting.

**Status:** Extracted from Opsly monorepo, ready for client VPS deployment  
**Version:** 1.0.0  
**License:** Proprietary

## Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Configure environment
cp apps/web/.env.example apps/web/.env.local
# Edit .env.local with Supabase credentials

# Start development servers
npm run dev

# Open http://localhost:3004 (web app)
# Agents run on separate processes
```

### Docker (VPS Deployment)

```bash
# Build all services
npm run docker:build

# Start stack
npm run docker:up

# View logs
npm run docker:logs

# Stop
npm run docker:down
```

## Architecture

### 7 Coordinated AI Agents (via Redis BullMQ)

1. **Orchestrator Agent** — Routes tasks to other agents based on event type
2. **Social Media Agent** — Extracts leads from Instagram, Facebook, TikTok DMs
3. **Docs Generator Agent** — Generates weekly reports, analytics, summaries
4. **API Integration Agent** — Syncs with CRM systems (HubSpot, Pipedrive)
5. **Web Experience Agent** — Optimizes form UX and dashboard
6. **Messaging Agent** — **CRITICAL: Approval-first workflow** for WhatsApp, SMS, Email (NO auto-send)
7. **Security Agent** — Validates permissions, enforces RLS, audits access

### Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 (React + TypeScript + Tailwind) |
| Backend / API | Next.js API routes |
| Database | Supabase (PostgreSQL + RLS) |
| Agents | Node.js + BullMQ (Redis queues) |
| Workflows | n8n (optional) |
| Deployment | Docker Compose on client VPS |
| Monitoring | Uptime Kuma + health checks |

## Project Structure

```
peskids-platform/
├── apps/
│   ├── web/                        # Next.js app (landing + dashboard)
│   └── agents/
│       ├── orchestrator-agent/     # Task router
│       ├── social-media-agent/     # Lead extraction
│       ├── docs-generator-agent/   # Reports
│       ├── api-integration-agent/  # CRM sync
│       ├── web-experience-agent/   # Dashboard optimization
│       ├── messaging-agent/        # APPROVAL-FIRST messaging
│       └── security-agent/         # Audit & validation
├── infra/
│   ├── docker-compose.yml          # VPS stack
│   └── nginx.conf                  # Reverse proxy config
├── scripts/
│   ├── setup-client-vps.sh         # One-click VPS setup
│   ├── health-check.sh             # Verify all services
│   └── backup-database.sh          # Database backups
├── supabase/
│   └── migrations/                 # Database schema
├── workflows/                      # n8n exports
├── docs/                           # Operation guides
└── .env.example                    # Environment template
```

## Key Features

✅ **Lead Capture** — Multi-channel form submission (web, WhatsApp, Instagram, TikTok)  
✅ **Real-Time Dashboard** — Live metrics (leads, students, feedback, follow-ups)  
✅ **Approval-First Messaging** — NO auto-send without admin approval  
✅ **Multi-Tenant Isolation** — RLS at database layer  
✅ **AI-Coordinated Agents** — Redis-based BullMQ job distribution  
✅ **Automated Reports** — Weekly parent feedback summaries, analytics  
✅ **CRM Integration** — Sync with HubSpot, Pipedrive, custom APIs  
✅ **Security Audit** — RLS enforcement, permission validation  

## Deployment

### Phase 1: Client VPS Setup

```bash
# 1. SSH into client VPS
ssh user@client-vps

# 2. Clone this repo
git clone https://github.com/cloudsysops/peskids-platform.git
cd peskids-platform

# 3. Run setup script (one-click deployment)
./scripts/setup-client-vps.sh

# 4. Verify health
./scripts/health-check.sh

# 5. Access dashboard
# Open https://{client-domain}/admin
# Login with credentials provided by setup script
```

### Environment Variables

See `.env.example` for full template. Key variables:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Redis
REDIS_PASSWORD=
REDIS_URL=redis://:password@redis:6379

# External Services
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
RESEND_API_KEY=
INSTAGRAM_TOKEN=
FACEBOOK_TOKEN=
TIKTOK_TOKEN=

# VPS Configuration
CLIENT_DOMAIN=
DB_PASSWORD=
N8N_ENCRYPTION_KEY=
```

## Critical: Approval-First Messaging

**Messaging Agent requires explicit human approval before sending any message.**

Flow:
1. Inbound message (WhatsApp, Instagram, web) arrives
2. Messaging Agent prepares response + stores with `status='pending_approval'`
3. Admin views message preview in dashboard
4. Admin clicks "Approve & Send"
5. Messaging Agent sends via Twilio/Resend
6. Status updated to `'sent'`, logged

**NO messages are sent automatically. This is a hard requirement.**

## Documentation

- [ARCHITECTURE.md](docs/ARCHITECTURE.md) — System design + agent coordination
- [DEPLOYMENT.md](docs/DEPLOYMENT.md) — VPS setup guide
- [API.md](docs/API.md) — API routes reference
- [OPERATIONS.md](docs/OPERATIONS.md) — Runbook for client operations

## Monitoring

- **Web App:** http://localhost:3000 (dev) / https://{domain} (prod)
- **Admin Dashboard:** http://localhost:3000/admin (dev) / https://{domain}/admin (prod)
- **n8n:** http://localhost:5678 (dev) / https://{domain}:5678 (prod)
- **Uptime Kuma:** http://localhost:3001 (dev) / https://{domain}:3001 (prod)

## Support

For deployment issues, run health check:

```bash
./scripts/health-check.sh
```

This verifies:
- All 7 agents are running
- Redis and PostgreSQL are healthy
- Supabase connectivity
- n8n accessibility
- Required environment variables are set

## License

Proprietary. Copyright CloudSysOps 2026.
