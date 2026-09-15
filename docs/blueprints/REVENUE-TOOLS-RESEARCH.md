# Opsly Revenue Tools -- Open Source Integration Research

Date: 2026-09-07
Status: RESEARCH COMPLETE
Agents: 5 parallel researchers

## Summary

40+ open source projects evaluated across 6 categories. This document consolidates
findings from all research agents into an actionable integration plan.

## The Pipeline (how it all connects)

```
[Content Sources]        [Processing]           [Distribution]
                                                  
MoneyPrinterTurbo --+                            +-- YouTube
OpenReels ----------+    +----------------+      |
OpenShorts ---------+--> | Content Studio |--> Queue --> Postiz --> TikTok
Freqtrade signals --+    | + LLM Gateway  |   (BullMQ)  |         Instagram
OctoBot trades -----+    | + Captions     |             |         X/Twitter
CloddsBot predictions-+  +----------------+             |         Telegram
                                                        +-- Discord
```

## Priority 1: Deploy THIS WEEK (fits current VPS)

| Project | Stars | RAM | What it does | Revenue |
|---------|-------|-----|-------------|---------|
| **Plausible** | 28.7K | 600 MB | Web analytics per tenant | Sell as feature to tenants |
| **Cal.com** | 48.2K | 1 GB | Scheduling/booking per tenant | Sell as feature (classes, appointments) |
| **Listmonk** | 22.6K | 512 MB | Email newsletters | Marketing campaigns for tenants |

Total new RAM: ~2.1 GB. Fits on current 4 GB VPS with existing services.

## Priority 2: Content Revenue (needs dedicated worker node)

| Project | Stars | Language | What it does | Revenue/mo estimate |
|---------|-------|----------|-------------|---------------------|
| **MoneyPrinterTurbo** | 116K | Python | Faceless video generator | $500-5K/channel |
| **OpenReels** | 143 | TypeScript | AI Reels/Shorts pipeline | $300-2K/channel |
| **OpenShorts** | 50 | Python | MCP-native clip generator | $200-1.5K/channel |
| **Postiz** | 14K | TypeScript | Social media scheduler + analytics | Hub for all publishing |

Deploy on Mac 2011 worker or GPU cloud instance (not production VPS).

## Priority 3: Trading Content + Revenue

| Project | Stars | What it does | Revenue/mo estimate |
|---------|-------|-------------|---------------------|
| **Freqtrade** | 53.4K | Crypto trading bot + signals | $500-20K (capital dependent) |
| **OctoBot** | 6.4K | Visual trading bot + Telegram | $300-10K |
| **CloddsBot** | 15 | Prediction market AI (TypeScript) | $200-3K |
| **Ghostfolio** | 9.2K | Portfolio tracker dashboard | $200-2K (SaaS) |

Trading bots generate two revenue streams: (1) actual trading profits, (2) content
from signals/trades published as Reels/posts.

## Priority 4: Affiliate + E-Commerce

| Project | Stars | What it does | Revenue/mo estimate |
|---------|-------|-------------|---------------------|
| **Flip-God** | 200 | AI e-commerce arbitrage bot | $1K-10K |
| **OpenPartner** | 300 | Affiliate management platform | $1K-10K |
| **NorthCinder** | 50 | MCP shopping agent | $200-2K |

## Priority 5: Platform Services (after VPS upgrade to 8 GB)

| Project | Stars | RAM | What it does |
|---------|-------|-----|-------------|
| **Chatwoot** | 36.5K | 1.5 GB | Multi-channel messaging (WhatsApp, web, email) |
| **Twenty CRM** | 56.3K | 2+ GB | Full CRM per tenant (Business+ only) |
| **Dify** or **Flowise** | 60K+ | 1-2 GB | Visual AI workflow builder for tenants |

## Priority 6: Defer

| Project | Reason |
|---------|--------|
| PostHog | 16 GB RAM requirement -- use Cloud free tier instead |
| Mautic | 1.4 GB per tenant -- overkill for LATAM SMBs |
| Windmill | n8n already fills this role |

## Integration with existing Opsly architecture

### LLM Gateway (apps/llm-gateway)
All content generation routes through the existing gateway:
- MoneyPrinterTurbo scripts
- OpenReels captions
- Trading signal explanations
- Affiliate product descriptions

### BullMQ Orchestrator (apps/orchestrator)
New worker types for each tool:
- `video_generation` -- MoneyPrinterTurbo API
- `reels_pipeline` -- OpenReels
- `clip_generator` -- OpenShorts MCP
- `trade_signal_content` -- Freqtrade/OctoBot signals to visual cards
- `social_publish` -- Postiz API

### MCP Server (apps/mcp)
Direct plug-in for MCP-native tools:
- OpenShorts (MCP server built-in)
- NorthCinder (MCP shopping agent)
- PendPost (MCP-native scheduler)

### Content Studio (lib/content-studio)
Existing modules map directly:
- `RuntimeToStoryMapper` -- ingests trading signals, clip events
- `CaptionGenerator` -- processes all video/post outputs
- `ComplianceChecker` -- validates before publishing
- `ContentApprovalQueue` -- human gate for automated content

### Docker Compose patterns
All services deploy behind Traefik v3 with per-tenant Host rules:
- `analytics.op-sly.com` (Plausible)
- `cal.op-sly.com` (Cal.com)
- `mail.op-sly.com` (Listmonk)
- `chat.op-sly.com` (Chatwoot, after upgrade)

## TypeScript-compatible projects (direct monorepo integration)

These projects share our stack and can be integrated as packages or workers:

| Project | Why it fits |
|---------|------------|
| OpenReels | TypeScript, generates Reels from text |
| CloddsBot | TypeScript, prediction market AI |
| Postiz | TypeScript (Next.js), social scheduler |
| Cal.com | TypeScript (Next.js), scheduling |
| Ghostfolio | TypeScript (NestJS + Angular), portfolio tracker |
| PendPost | TypeScript, MCP-native social scheduler |
| TryPost | TypeScript, MCP-native social scheduler |

## Cost analysis

### Current VPS (4 GB, ~$12/mo)
- Plausible + Cal.com + Listmonk = +2.1 GB = fits

### Upgraded VPS (8 GB, ~$24/mo)
- Add Chatwoot = +1.5 GB = fits
- Add Postiz = +512 MB = fits

### Dedicated worker (Mac 2011 or cloud GPU)
- MoneyPrinterTurbo, OpenReels, OpenShorts
- Freqtrade, OctoBot
- No additional monthly cost (Mac) or ~$20-50/mo (cloud GPU spot)

### Total infrastructure cost for full stack
- VPS 8 GB: ~$24/mo
- Optional GPU worker: ~$20-50/mo
- **Total: $24-74/mo for the entire revenue-generating stack**

## Revenue potential (conservative monthly estimate)

| Stream | Low | High |
|--------|-----|------|
| Faceless YouTube channels (2-3 channels) | $600 | $10,000 |
| Social media management (LocalRank clients) | $500 | $3,000 |
| Trading signals content | $200 | $5,000 |
| Tenant analytics/scheduling upsell | $200 | $1,000 |
| Email marketing (Listmonk campaigns) | $100 | $500 |
| **Total** | **$1,600** | **$19,500** |

## Next steps

1. Deploy Plausible + Cal.com + Listmonk on current VPS (Priority 1)
2. Set up MoneyPrinterTurbo on Mac 2011 worker (Priority 2)
3. Integrate OpenReels into Content Studio (TypeScript, easiest) (Priority 2)
4. Deploy Postiz as social scheduler hub (Priority 2)
5. Set up Freqtrade for trading signals to content pipeline (Priority 3)
6. Upgrade VPS to 8 GB and add Chatwoot (Priority 5)
