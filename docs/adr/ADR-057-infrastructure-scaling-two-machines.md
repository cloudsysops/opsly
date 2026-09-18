# Infrastructure Scaling Plan -- Two Machines

Date: 2026-09-07
Status: APPROVED DIRECTION (pending VPS resize)

## Current state (1 machine)

VPS DigitalOcean: **4 GiB / 2 vCPU / ~$12/mo**. Running at capacity (~95% swap events documented).

Running today:
- Traefik v3 (reverse proxy)
- API (Next.js, port 3000)
- Admin (Next.js, port 3001)
- Portal (Next.js, port 3002)
- Peskids (Next.js, port 3004)
- Redis (port 6379)
- Orchestrator (BullMQ, port 3011)
- LLM Gateway (port 3010)
- MCP (port 3003)
- 5x n8n containers (smiletripcare, localrank, legalvial, peskids, intcloudsysops)
- 5x Uptime Kuma containers
- Context Builder (port 3012)

## Target state (2 machines)

### Machine A: VPS Production (8 GiB / 4 vCPU, ~$48/mo)

Control plane + tenant apps + platform services.

| Service | RAM | Purpose |
|---------|-----|---------|
| Traefik v3 | 128 MB | Reverse proxy, TLS |
| API | 512 MB | Control plane |
| Peskids | 256 MB | Flagship tenant app |
| Admin | 256 MB | Platform admin dashboard |
| Portal | 256 MB | Tenant portal |
| Redis | 128 MB | Queues, cache |
| n8n x3 (peskids, smiletripcare, localrank) | 1.1 GB | CRM workflows |
| Uptime Kuma x3 | 384 MB | Monitoring |
| **Plausible** (NEW) | 600 MB | Web analytics per tenant |
| **Cal.com** (NEW) | 1 GB | Scheduling/booking per tenant |
| **Listmonk** (NEW) | 512 MB | Email marketing |
| **Chatwoot** (NEW, Phase 2) | 1.5 GB | Multi-channel messaging |
| **Subtotal** | ~6.6 GB | Leaves ~1.4 GB headroom |

**What gets REMOVED from VPS to free space:**
- n8n_jkboterolabs (test tenant, no longer needed)
- n8n_intcloudsysops (internal, move to worker or remove)
- Twenty CRM instances (too heavy, move to worker if needed)
- Uptime Kuma for removed tenants
- Context Builder (move to worker)
- Orchestrator workers (move to Machine B)

### Machine B: Worker Node (Mac 2011 or second VPS)

Content generation + AI + trading + heavy compute.

| Service | RAM | Purpose |
|---------|-----|---------|
| Orchestrator (worker-enabled) | 512 MB | BullMQ workers (47 registered) |
| LLM Gateway | 256 MB | AI routing (Anthropic/OpenAI/Ollama) |
| Ollama | 2-4 GB | Local LLM (llama3.2, nemotron) |
| **MoneyPrinterTurbo** (NEW) | 2 GB | Faceless video generation |
| **OpenReels** (NEW) | 512 MB | TypeScript Reels/Shorts pipeline |
| **Freqtrade** (NEW) | 512 MB | Crypto trading bot + signals |
| **Postiz** (NEW) | 512 MB | Social media scheduler hub |
| Context Builder | 256 MB | Session context |
| **Subtotal** | ~6.5 GB | Mac 2011 has 16 GB |

Communication between machines via Tailscale (existing):
- Machine B reads Redis from Machine A via `REDIS_URL=redis://:pass@100.120.151.91:6379`
- Machine B LLM Gateway accessible from Machine A via Tailscale IP

## Migration steps

### Step 1: Resize VPS (human, DigitalOcean dashboard)

```bash
# Power off droplet in DO dashboard
# Resize to: 8 GiB / 4 vCPU Regular ($48/mo)
# Power on
# Verify SSH: ssh vps-dragon@100.120.151.91
```

### Step 2: Remove unused tenants from VPS

```bash
ssh vps-dragon@100.120.151.91 << 'EOF'
cd /opt/opsly

# Stop and remove test tenants
docker compose --project-name tenant_jkboterolabs down
docker compose --project-name tenant_intcloudsysops down

# Remove Twenty CRM instances (heavy)
docker compose -f infra/docker-compose.twenty.yml down
docker compose -f infra/docker-compose.twenty-icso.yml down

# Prune unused images
docker image prune -af
docker builder prune -af

# Verify freed space
df -h / && free -h
EOF
```

### Step 3: Deploy new platform services on VPS

```bash
ssh vps-dragon@100.120.151.91 << 'EOF'
cd /opt/opsly

# Plausible (web analytics)
docker compose -f infra/docker-compose.plausible.yml up -d

# Cal.com (scheduling)
docker compose -f infra/docker-compose.calcom.yml up -d

# Listmonk (email marketing)
docker compose -f infra/docker-compose.listmonk.yml up -d

# Verify
curl -sf https://analytics.op-sly.com/api/health
curl -sf https://cal.op-sly.com/api/health
curl -sf https://mail.op-sly.com/api/health
EOF
```

### Step 4: Set up Mac 2011 worker for content + trading

```bash
ssh opsly-worker@100.80.41.29 << 'EOF'
cd ~/opsly && git pull --ff-only

# MoneyPrinterTurbo
docker compose -f infra/docker-compose.pc-gamer-moneyprinter.yml up -d

# Freqtrade
docker compose -f infra/docker-compose.freqtrade.yml up -d

# Orchestrator in worker mode
OPSLY_ORCHESTRATOR_MODE=worker-enabled \
REDIS_URL=redis://:${REDIS_PASSWORD}@100.120.151.91:6379 \
npm run dev --workspace=@intcloudsysops/orchestrator
EOF
```

## Docker Compose files to CREATE

### infra/docker-compose.plausible.yml

```yaml
services:
  plausible:
    image: ghcr.io/plausible/community-edition:v2.1
    restart: unless-stopped
    ports:
      - "127.0.0.1:8100:8000"
    environment:
      BASE_URL: https://analytics.${PLATFORM_DOMAIN}
      SECRET_KEY_BASE: ${PLAUSIBLE_SECRET_KEY}
      DATABASE_URL: postgres://plausible:${PLAUSIBLE_DB_PASS}@plausible-db:5432/plausible
      CLICKHOUSE_DATABASE_URL: http://plausible-clickhouse:8123/plausible
    depends_on:
      - plausible-db
      - plausible-clickhouse
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.plausible.rule=Host(`analytics.${PLATFORM_DOMAIN}`)"
      - "traefik.http.routers.plausible.entrypoints=websecure"
      - "traefik.http.routers.plausible.tls=true"
      - "traefik.http.routers.plausible.tls.certresolver=letsencrypt"
      - "traefik.http.services.plausible.loadbalancer.server.port=8000"
    networks:
      - traefik-public
      - plausible-internal

  plausible-db:
    image: postgres:16-alpine
    restart: unless-stopped
    volumes:
      - plausible-db-data:/var/lib/postgresql/data
    environment:
      POSTGRES_USER: plausible
      POSTGRES_PASSWORD: ${PLAUSIBLE_DB_PASS}
      POSTGRES_DB: plausible
    networks:
      - plausible-internal

  plausible-clickhouse:
    image: clickhouse/clickhouse-server:24-alpine
    restart: unless-stopped
    volumes:
      - plausible-clickhouse-data:/var/lib/clickhouse
    ulimits:
      nofile:
        soft: 262144
        hard: 262144
    networks:
      - plausible-internal

volumes:
  plausible-db-data:
  plausible-clickhouse-data:

networks:
  plausible-internal:
  traefik-public:
    external: true
```

### infra/docker-compose.calcom.yml

```yaml
services:
  calcom:
    image: calcom/cal.com:latest
    restart: unless-stopped
    ports:
      - "127.0.0.1:8101:3000"
    environment:
      DATABASE_URL: postgres://calcom:${CALCOM_DB_PASS}@calcom-db:5432/calcom
      NEXTAUTH_SECRET: ${CALCOM_AUTH_SECRET}
      CALENDSO_ENCRYPTION_KEY: ${CALCOM_ENCRYPTION_KEY}
      NEXT_PUBLIC_WEBAPP_URL: https://cal.${PLATFORM_DOMAIN}
    depends_on:
      - calcom-db
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.calcom.rule=Host(`cal.${PLATFORM_DOMAIN}`)"
      - "traefik.http.routers.calcom.entrypoints=websecure"
      - "traefik.http.routers.calcom.tls=true"
      - "traefik.http.routers.calcom.tls.certresolver=letsencrypt"
      - "traefik.http.services.calcom.loadbalancer.server.port=3000"
    networks:
      - traefik-public
      - calcom-internal

  calcom-db:
    image: postgres:16-alpine
    restart: unless-stopped
    volumes:
      - calcom-db-data:/var/lib/postgresql/data
    environment:
      POSTGRES_USER: calcom
      POSTGRES_PASSWORD: ${CALCOM_DB_PASS}
      POSTGRES_DB: calcom
    networks:
      - calcom-internal

volumes:
  calcom-db-data:

networks:
  calcom-internal:
  traefik-public:
    external: true
```

### infra/docker-compose.listmonk.yml

```yaml
services:
  listmonk:
    image: listmonk/listmonk:latest
    restart: unless-stopped
    ports:
      - "127.0.0.1:8102:9000"
    environment:
      - TZ=America/Bogota
    volumes:
      - ./listmonk/config.toml:/listmonk/config.toml
    depends_on:
      - listmonk-db
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.listmonk.rule=Host(`mail.${PLATFORM_DOMAIN}`)"
      - "traefik.http.routers.listmonk.entrypoints=websecure"
      - "traefik.http.routers.listmonk.tls=true"
      - "traefik.http.routers.listmonk.tls.certresolver=letsencrypt"
      - "traefik.http.services.listmonk.loadbalancer.server.port=9000"
    networks:
      - traefik-public
      - listmonk-internal

  listmonk-db:
    image: postgres:16-alpine
    restart: unless-stopped
    volumes:
      - listmonk-db-data:/var/lib/postgresql/data
    environment:
      POSTGRES_USER: listmonk
      POSTGRES_PASSWORD: ${LISTMONK_DB_PASS}
      POSTGRES_DB: listmonk
    networks:
      - listmonk-internal

volumes:
  listmonk-db-data:

networks:
  listmonk-internal:
  traefik-public:
    external: true
```

## Traefik DNS entries needed

Add to Cloudflare (all CNAME to `op-sly.com` or A to VPS IP):

| Subdomain | Service |
|-----------|---------|
| `analytics.op-sly.com` | Plausible |
| `cal.op-sly.com` | Cal.com |
| `mail.op-sly.com` | Listmonk |
| `chat.op-sly.com` | Chatwoot (Phase 2) |

## Doppler secrets to add (prd)

```
PLAUSIBLE_SECRET_KEY=<generate with openssl rand -base64 48>
PLAUSIBLE_DB_PASS=<generate>
CALCOM_DB_PASS=<generate>
CALCOM_AUTH_SECRET=<generate>
CALCOM_ENCRYPTION_KEY=<generate 32 chars>
LISTMONK_DB_PASS=<generate>
```

## Cost summary

| Item | Current | New | Delta |
|------|---------|-----|-------|
| VPS (DigitalOcean) | $12/mo (4 GiB) | $48/mo (8 GiB) | +$36/mo |
| Mac 2011 worker | $0 (owned) | $0 | $0 |
| SMTP (Amazon SES via Listmonk) | $0 | ~$1/mo | +$1/mo |
| **Total** | **$12/mo** | **$49/mo** | **+$37/mo** |

For $37/mo additional, the platform gets: web analytics, scheduling, email marketing,
and moves heavy compute to the Mac worker.

## Peskids marketing improvements (documented, defer implementation)

These tools improve Peskids marketing but require the new services first:

| Tool | How it helps Peskids |
|------|---------------------|
| Plausible | Track landing page conversions (leads from Instagram, referrals) |
| Cal.com | "Schedule a free class" widget on landing page |
| Listmonk | Monthly newsletter to parents (class schedules, events, tips) |
| Chatwoot | Unified WhatsApp + web chat inbox for Sierra's team |
| Content Studio + MoneyPrinterTurbo | Auto-generate Peskids promo Reels |
| Postiz | Schedule Peskids social media posts |

Implementation after infrastructure is ready:
1. Embed Plausible tracking on `www.peskids.com`
2. Embed Cal.com "reserve class" widget on landing page
3. Import parent emails into Listmonk for first newsletter
4. Create Peskids content templates in Content Studio
