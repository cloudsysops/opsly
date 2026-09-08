# Opsly Module & Blueprint Status -- What Works, What to Evolve, What to Clone

Date: 2026-09-07
Status: ACTIVE (working document for AI decision table)

## Current system architecture

```
blueprints/<vertical>/blueprint.yaml    -- defines a vertical (academy, barber, etc.)
config/patterns/tenant/*.json           -- reusable stack patterns (CRM, WhatsApp, incubator)
config/tenants/<slug>.json              -- instantiated tenant from pattern + blueprint
config/modules.json                     -- 22 registered lib modules
lib/<module>/                           -- module code
apps/<tenant>/                          -- tenant app code (if incubator-app pattern)
```

## Module readiness matrix

### Core (ready, tested, production)

| Module | Tests | Used by | Status |
|--------|-------|---------|--------|
| errors | 10 | API, all services | Ready |
| security | 12 | API, portal auth | Ready |
| config | 7 | All apps | Ready |
| observability | 7 | All apps | Ready |
| services | 0 | API (repository pattern) | Needs tests |
| api-utils | 0 | API response format | Needs tests |
| components | 0 | Admin, portal, peskids | Needs tests |

### Functional (code exists, needs wiring)

| Module | Size | What it does | What blocks activation |
|--------|------|-------------|----------------------|
| content-studio | 2.5 MB, 44 files | Caption gen, compliance check, YouTube publish, campaigns | Needs LLM Gateway connection |
| conversational-runtime | 2.6 MB | Channel layer: InputMessage to AgentResponse | Only used by Panini Lab |
| whatsapp | 108 KB, 18 files | Multi-provider: Meta, WaCRM, signatures, validation | Needs API keys |
| voice-messaging | 228 KB | Voice message types and index | Needs provider integration |
| wompi-gateway | 52 KB | Colombia payment gateway | Needs Wompi API keys |
| runtime | 284 KB, 29 files | Environment detection, worker selection, tenant routing | Ready, has tests |
| pattern-catalog | 2.7 MB | Load/validate tenant and harness patterns | Ready |

### Experimental (built but not validated)

| Module | Size | What it does | Recommendation |
|--------|------|-------------|----------------|
| sigma-harness | 2.7 MB | Decision engine with consensus | Review for Hive integration |
| mission-control-kit | 2.7 MB | UI contracts for mission control | Review for admin dashboard |
| universe | 812 KB | Narrative IP (characters, worlds) | Defer (gaming vertical) |
| content-engine | 600 KB | Video pipeline (ffmpeg, clips) | Merge into content-studio |
| game-core | 320 KB | Game contracts | Defer |
| game-web | 196 KB | Game web client | Defer |
| agent-task-core | 144 KB | AgentTaskEnvelope helpers | Review for orchestrator |
| git-branch-orchestrator | 300 KB | Branch management for agents | Review for multi-agent |
| external-agent-registry | 156 KB | External agent registration | Review for agent farm |
| prompt-guard | 216 KB | Prompt injection detection | Merge into security module |

## Tenant patterns (5 ready)

| Pattern | What it includes | Used by |
|---------|-----------------|---------|
| `crm-starter-stack` | 4 n8n workflows (lead, alert, follow-up, digest) | All CRM tenants |
| `full-tenant-stack` | n8n + Uptime Kuma + Compose template | SmileTripCare, LocalRank |
| `incubator-app` | Next.js app + tenant schema | Peskids, Panini Lab |
| `whatsapp-crm-hybrid` | WhatsApp + CRM + n8n | Future tenants |
| `whatsapp-first-stack` | WaCRM + Twenty CRM | Future tenants |

## Blueprint system (1 vertical defined)

| Blueprint | Status | Pilot tenant |
|-----------|--------|-------------|
| `academy` | Draft (YAML + capabilities + roles + integrations) | Peskids |
| barber / restaurant / hotel / marketplace | Documented in VERTICAL-BLUEPRINTS.md but no YAML | None |

## Commercial packages (documented)

| Package | Target | Includes |
|---------|--------|----------|
| Basic Setup | Business starting digital | Landing + 1 workflow + guide |
| Hybrid Recommended | Pilot incubated in Opsly | CRM + WhatsApp + dashboard |
| Custom Platform | Niche with custom flows | Full stack + custom app |
| Managed Operations | Owner without tech time | Everything + operations |

---

## Open source projects to integrate

### Tier 1: High value, direct integration

| Project | GitHub | What it solves | How it fits Opsly |
|---------|--------|---------------|-------------------|
| **Twenty** | twentyhq/twenty | Open source CRM (Salesforce alternative) | Already in patterns (`whatsapp-first-stack`). Deploy per tenant via compose. Replace internal CRM views. |
| **Chatwoot** | chatwoot/chatwoot | Open source customer messaging | Multi-channel inbox (WhatsApp, email, web chat). Replaces custom messaging routes in Peskids. |
| **Cal.com** | calcom/cal.com | Open source scheduling | Booking/appointments for Peskids classes, barber shops, restaurants. Replaces custom agenda service. |
| **Dify** | langgenius/dify | LLM app development platform | Visual AI workflow builder. Enhances LLM Gateway with no-code AI flows for tenants. |

### Tier 2: Marketing automation (LocalRank focus)

| Project | GitHub | What it solves | How it fits |
|---------|--------|---------------|-------------|
| **Mautic** | mautic/mautic | Open source marketing automation | Email campaigns, lead scoring, landing pages. LocalRank offers this to clients. |
| **PostHog** | PostHog/posthog | Product analytics + feature flags | Replace custom analytics. Tenant-level feature flags. |
| **Plausible** | plausible/analytics | Privacy-friendly web analytics | Per-tenant website analytics without Google. |
| **Listmonk** | knadh/listmonk | Email newsletter manager | Cheaper than Resend for bulk. LocalRank email campaigns. |

### Tier 3: Content and AI

| Project | GitHub | What it solves | How it fits |
|---------|--------|---------------|-------------|
| **MoneyPrinterTurbo** | FujiwaraChoki/MoneyPrinterTurbo | AI video generation | Already referenced in compose (`pc-gamer-moneyprinter`). Wire to Content Studio. |
| **Open WebUI** | open-webui/open-webui | Chat UI for LLMs | Admin-facing chat for LLM Gateway. Agent conversation interface. |
| **Flowise** | FlowiseAI/Flowise | LLM workflow builder | Alternative to Dify. No-code AI for tenants. |
| **Briefer** | briefercloud/briefer | Notebooks + dashboards | Data analysis for tenants. Replace custom analytics. |

### Tier 4: Infrastructure

| Project | GitHub | What it solves | How it fits |
|---------|--------|---------------|-------------|
| **Windmill** | windmill-labs/windmill | Open source Airflow/Temporal alternative | Replace Airflow DAGs. Better UI, TypeScript native. |
| **Trigger.dev** | triggerdotdev/trigger.dev | Background jobs platform | Alternative to BullMQ for simpler tenant workflows. |
| **Upstash** | upstash/redis | Serverless Redis | Per-tenant Redis isolation without managing instances. |

---

## Recommended evolution path

### Phase 1: Activate what exists (0 new code)

1. Flip Peskids feature flags (5 safe ones)
2. Merge Sentinel security branches (5 PRs)
3. Merge Palette UX branches (3 PRs)
4. Merge Bolt performance branch (1 PR)
5. Clean 24+ stale branches

### Phase 2: Wire existing modules (minimal new code)

1. Connect Content Studio to LLM Gateway
2. Wire conversational-runtime into Peskids (family chatbot)
3. Activate WhatsApp provider (pick one: OpenWA or WaCRM)
4. Merge content-engine into content-studio (consolidate)
5. Merge prompt-guard into security module

### Phase 3: Clone and integrate open source (new infrastructure)

1. Deploy Twenty CRM per tenant (compose template exists)
2. Deploy Chatwoot for multi-channel messaging
3. Deploy Cal.com for scheduling (Peskids classes, barber appointments)
4. Wire Dify or Flowise for tenant AI workflows
5. Deploy Listmonk for email campaigns (LocalRank marketing)

### Phase 4: Blueprint automation

1. Complete academy blueprint (from draft YAML to working generator)
2. Create barber blueprint (from VERTICAL-BLUEPRINTS.md to YAML)
3. Create restaurant blueprint
4. Build `opsly create-tenant --blueprint academy --slug <name>` CLI
5. One-command tenant creation with pattern + blueprint + compose + migrate

---

## Decision needed

| Question | Options | Impact |
|----------|---------|--------|
| First open source to clone | Twenty / Chatwoot / Cal.com / Dify | Determines next integration work |
| Blueprint priority | Academy (finish) / Barber (new) / Marketing (LocalRank) | Determines vertical focus |
| Content Studio timeline | Activate now / After WhatsApp / After open source | Determines content capability |
| Airflow vs Windmill | Keep Airflow / Migrate to Windmill (TS native) | Determines DAG infrastructure |
