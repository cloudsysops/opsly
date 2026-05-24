---
title: "Phase 5 Implementation Guide — Architectural Blueprint"
status: ready-for-implementation
date: 2026-05-08
---

# Phase 5: Multi-Model LLM, Rendering, Testing, and Marketplace

## Overview

This document provides the **architectural blueprint** and **API specifications** for Phase 5. The implementation can be completed incrementally over 2-3 weeks.

**Status:** Design Complete, Ready for Development  
**Estimated Duration:** 15-20 hours (distributed implementation)  
**Dependencies:** Existing Phase 1-4 services + new SDKs (Fastify, OpenAI, etc.)

---

## Phase 5.1: Multi-Model LLM Router

### Architecture

```typescript
// Abstract base
class LLMProvider {
  abstract name: string
  abstract metrics: { cost_per_1k, latency_p95, success_rate }
  abstract complete(messages, options): Promise<Response>
  abstract stream(messages, onChunk): Promise<Response>
  abstract health(): Promise<boolean>
}

// Implementations
class AnthropicProvider extends LLMProvider { /* Claude 3 */ }
class OpenAIProvider extends LLMProvider { /* GPT-4 */ }
class LocalLlamaProvider extends LLMProvider { /* Ollama Llama 2 */ }
class LocalMixtralProvider extends LLMProvider { /* Ollama Mixtral */ }

// Router
class ModelRouter {
  async complete(messages, strategy) {
    provider = selectProvider(strategy) // cost|speed|quality|balanced|custom
    return provider.complete(messages)
  }
}
```

### API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/v1/completions` | Multi-model completion with routing |
| POST | `/api/v1/completions/stream` | Streaming completion (SSE/WebSocket) |
| GET | `/api/v1/models` | List all providers + metrics |
| GET | `/api/v1/health` | Provider health status |
| POST | `/api/v1/model-comparison` | Compare strategies for prompt |

### Implementation Steps

1. Create `LLMProvider` abstract class (base interface + metrics)
2. Implement `AnthropicProvider` (Claude API integration)
3. Implement `OpenAIProvider` (GPT-4 API integration)
4. Implement `LocalLlamaProvider` (Ollama HTTP client for Llama 2)
5. Implement `LocalMixtralProvider` (Ollama HTTP client for Mixtral)
6. Create `ModelRouter` with strategy selection
7. Build Fastify gateway API
8. Add environment variables + configuration

### Configuration

```env
# .env.mcp
LLM_GATEWAY_PORT=3011
LLM_GATEWAY_HOST=0.0.0.0

# API Keys
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# Local Ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODELS=llama2-7b,mixtral-8x7b

# Default strategy
LLM_DEFAULT_STRATEGY=balanced  # cost|speed|quality|balanced
```

### Routing Strategies

**cost:** Prefer Llama 2 (free) → Mixtral → Claude ($0.003/1K) → GPT-4 ($0.01/1K)  
**speed:** Prefer Mixtral (4s) → GPT-4 (800ms) → Claude (500ms) → Llama (3s)  
**quality:** Prefer GPT-4 (98%) → Claude (95%) → Mixtral (90%) → Llama (85%)  
**balanced:** 40% quality + 35% speed + 25% cost (weighted scoring)  
**custom:** Task-specific (coding→Claude, analysis→GPT-4, bulk→Llama)

---

## Phase 5.2: Advanced Rendering

### Architecture

```typescript
// Renderers
class StableDiffusionRenderer {
  async generate(prompt, params): Promise<{ images: base64[] }>
  async imageToImage(image, prompt, strength): Promise<{ image: base64 }>
  async upscale(image, scale): Promise<{ image: base64 }>
}

class ElevenLabsRenderer {
  async synthesize(text, voice_id, stability): Promise<{ audio: base64 }>
  async getVoices(): Promise<{ voices: Voice[] }>
}

// Batch processor
class BatchRenderer {
  async processBatch(batch): Promise<BatchResult>
  async getQueueStats(): Promise<{ pending, active, completed }>
}
```

### API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/render` | Submit rendering job (SD/TTS/video) |
| GET | `/api/render/{job_id}` | Check job status |
| POST | `/api/batch/submit` | Submit batch job |
| GET | `/api/batch/{batch_id}/progress` | Check batch progress |
| GET | `/api/batch/stats` | Queue statistics |

### Services Architecture

```
Rendering Engine (Port 3005-3006)
├── Service 1: Image Generation
│   └── Stable Diffusion API (http://localhost:7860)
├── Service 2: Audio Synthesis
│   └── Elevenlabs API (https://api.elevenlabs.io)
└── Service 3: Batch Processor
    └── Redis Queue (Bull)
```

### Implementation Steps

1. Create `StableDiffusionRenderer` (HTTP client to local SD API)
2. Create `ElevenLabsRenderer` (HTTP client to Elevenlabs API)
3. Create `BatchRenderer` (Bull queue + Redis)
4. Build Fastify rendering API
5. Add job tracking + cost logging
6. Integrate with billing service

### Configuration

```env
# Stable Diffusion (local)
SD_API_URL=http://localhost:7860

# Elevenlabs
ELEVENLABS_API_KEY=sk_...
ELEVENLABS_API_URL=https://api.elevenlabs.io/v1

# Redis (batch queue)
REDIS_URL=redis://localhost:6379

# Batch settings
BATCH_MAX_CONCURRENT=3
BATCH_RETRY_MAX=3
```

---

## Phase 5.3: E2E Testing

### Test Suite Structure

```
e2e/
├── setup.ts (fixtures + helpers)
├── tests/
│   ├── 01-tenant-onboarding.spec.ts
│   ├── 02-agent-execution.spec.ts
│   ├── 03-rendering.spec.ts
│   ├── 04-cost-tracking.spec.ts
│   ├── 05-multi-model-routing.spec.ts
│   ├── 06-slack-integration.spec.ts
│   ├── 07-error-resilience.spec.ts
│   ├── 08-concurrent-agents.spec.ts
│   └── load-test.spec.ts
└── fixtures/ (test data)
```

### Test Framework

```bash
npm install -D @playwright/test
npx playwright install

# Run tests
npx playwright test

# Run specific test
npx playwright test 01-tenant-onboarding

# Debug mode
npx playwright test --debug

# HTML report
npx playwright test --reporter=html
```

### Implementation Steps

1. Setup Playwright + fixtures
2. Create test data factory
3. Write 8 workflow tests (covering critical paths)
4. Create load test (10 concurrent agents)
5. Setup GitHub Actions CI/CD
6. Generate coverage reports
7. Integrate with Grafana dashboards

### CI/CD Pipeline (GitHub Actions)

```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  e2e:
    runs-on: ubuntu-latest
    services:
      postgres: { image: postgres:15 }
      redis: { image: redis:7 }
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci && npm run build
      - run: docker-compose up -d
      - run: npx playwright test
      - uses: actions/upload-artifact@v3
        with: { name: playwright-report }
```

---

## Phase 5.4: Agent Marketplace

### UI Components

```typescript
// 4-step wizard
<AgentMarketplace>
  ├── Step 1: BrowseTemplates (grid of 6 templates)
  ├── Step 2: ConfigureAgent (form: name, instructions, tools, model)
  ├── Step 3: PreviewAgent (summary + validation checklist)
  └── Step 4: DeployAgent (spinner → success/error)
```

### Templates (6 Pre-built)

| Template | Category | Tools | Setup Time |
|----------|----------|-------|-----------|
| Code Reviewer | Dev | GitHub, Jira, Slack | 5 min |
| API Builder | Dev | Git, Tests, Docs | 15 min |
| QA Tester | Testing | Pytest, Jest, Selenium | 20 min |
| Data Analyst | Analytics | SQL, Pandas, Matplotlib | 30 min |
| Content Creator | Content | Markdown, Figma, Grammarly | 10 min |
| Customer Support | Support | Zendesk, Slack, Email | 25 min |

### API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/agents/create` | Create custom agent |
| GET | `/api/agents/{agent_id}` | Get agent details |
| POST | `/api/agents/{agent_id}/execute` | Run agent task |
| GET | `/api/agents/{agent_id}/executions` | List executions |
| DELETE | `/api/agents/{agent_id}` | Delete agent |
| GET | `/api/agents/templates` | List templates |

### Database Schema

```sql
CREATE TABLE agents (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  name VARCHAR NOT NULL,
  description TEXT,
  template_id VARCHAR,
  instructions TEXT NOT NULL,
  model VARCHAR,
  tools JSONB,
  config JSONB,
  status VARCHAR DEFAULT 'deployed',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE agent_executions (
  id UUID PRIMARY KEY,
  agent_id UUID REFERENCES agents(id),
  task_description TEXT,
  inputs JSONB,
  result JSONB,
  status VARCHAR,
  duration_ms INT,
  cost_usd DECIMAL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Implementation Steps

1. Create React wizard component (4 steps)
2. Build template definitions
3. Create Fastify API endpoints
4. Implement agent creation + deployment
5. Add execution tracking + logging
6. Integrate with billing service
7. Add marketplace UI to portal

### Configuration

```env
# Agent defaults
AGENT_MAX_CONCURRENT=10
AGENT_TIMEOUT_MS=300000  # 5 minutes
AGENT_RETRY_MAX=3

# Marketplace
MARKETPLACE_ENABLED=true
MARKETPLACE_TEMPLATE_PATH=./data/templates.json
```

---

## Integration Points

### Phase 5.1 ↔ Phase 1-4

- **LLM Gateway** integrates with Agent Manager (replace direct API calls)
- **Cost tracking** feeds into Billing service
- **Health metrics** exposed to Prometheus

### Phase 5.2 ↔ Phase 1-4

- **Rendering Engine** integrates with existing render endpoints
- **Batch processing** uses shared Redis (no new infra needed)
- **Cost tracking** feeds into Billing service

### Phase 5.3 ↔ Phase 1-4

- **E2E tests** validate all workflows end-to-end
- **CI/CD pipeline** on GitHub Actions
- **Coverage reports** exported to Grafana

### Phase 5.4 ↔ Phase 1-4

- **Agent creation** via Marketplace API
- **Execution tracking** in orchestrator
- **Billing** per-agent cost tracking

---

## Deployment Architecture

### Docker Services (Phase 5)

```yaml
services:
  llm-gateway:
    image: opsly/llm-gateway:latest
    ports: ["3011:3011"]
    env_file: .env.mcp
    depends_on: [redis]

  rendering-engine:
    image: opsly/rendering-engine:latest
    ports: ["3005:3005", "3006:3006"]
    env_file: .env.mcp
    depends_on: [redis]

  ollama:  # New: local LLM inference
    image: ollama/ollama:latest
    ports: ["11434:11434"]
    volumes: ["ollama-data:/root/.ollama"]

  stable-diffusion:  # New: local image generation
    image: automatic1111/stable-diffusion-webui
    ports: ["7860:7860"]
    volumes: ["sd-models:/app/models"]
```

### Add to docker-compose.yml

```bash
# Append Phase 5 services to existing compose
cat infra/docker-compose.phase5.yml >> infra/docker-compose.yml
docker-compose up -d llm-gateway rendering-engine
```

---

## Development Timeline

### Week 1 (5.1 + 5.2)
- **5.1:** LLM providers + router + gateway API (8 hours)
- **5.2:** Rendering engines + batch processor (7 hours)
- Total: 15 hours

### Week 2 (5.3 + 5.4)
- **5.3:** E2E test suite + CI/CD (6 hours)
- **5.4:** Agent Marketplace UI + API (6 hours)
- Total: 12 hours

### Week 3 (Integration + Polish)
- Docker setup + deployment config (3 hours)
- Documentation + README updates (2 hours)
- Final testing + bug fixes (3 hours)
- Total: 8 hours

**Grand Total:** 35 hours (realistic, distributed)

---

## Dependencies & Prerequisites

### Required Packages

```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.57.0",
    "@playwright/test": "^1.40.0",
    "fastify": "^4.25.0",
    "openai": "^4.50.0",
    "bull": "^4.11.0",
    "recharts": "^2.10.0"
  },
  "devDependencies": {
    "@types/fastify": "^3.10.0",
    "tsx": "^4.20.0",
    "typescript": "^5.9.0"
  }
}
```

### External Services

- **Anthropic API:** `sk-ant-...` (Claude 3)
- **OpenAI API:** `sk-...` (GPT-4)
- **Elevenlabs API:** `sk_...` (TTS)
- **Ollama (local):** `http://localhost:11434` (Llama 2 + Mixtral)
- **Stable Diffusion (local):** `http://localhost:7860` (Image gen)

### System Requirements

- **Ollama:** 8GB VRAM (for Mixtral), 4GB (for Llama 2)
- **Stable Diffusion:** 6GB VRAM recommended
- **Redis:** Already running (Phase 1-4)
- **PostgreSQL:** Already running (Phase 1-4)

---

## Success Criteria

### Phase 5.1
- ✅ All 4 providers healthy + responding
- ✅ Routing strategies work correctly
- ✅ Fallback chain functional (primary → secondary → backup)
- ✅ Cost tracking accurate (±2%)
- ✅ Latency metrics exposed to Prometheus

### Phase 5.2
- ✅ Image generation working (SD API)
- ✅ Audio synthesis working (Elevenlabs)
- ✅ Batch queue processing (Bull + Redis)
- ✅ Cost tracking per render type
- ✅ Queue statistics exposed via API

### Phase 5.3
- ✅ All 8 E2E tests passing
- ✅ Load test (10 concurrent) passing
- ✅ CI/CD pipeline running on GitHub Actions
- ✅ Coverage reports generated (>80%)
- ✅ No data loss under concurrent load

### Phase 5.4
- ✅ Marketplace UI loads + renders 6 templates
- ✅ 4-step wizard functional (all paths)
- ✅ Agent creation working (backend + frontend)
- ✅ One-click deployment functional
- ✅ Costs tracking per agent

---

## Known Constraints & Workarounds

| Issue | Constraint | Workaround |
|-------|-----------|-----------|
| Ollama models | ~10GB disk for both | Use smaller models (Mistral 7B instead of Mixtral) |
| SD memory | Requires 6GB+ VRAM | Run on dedicated GPU or use pruned model |
| API costs | Claude/GPT-4 have per-token costs | Route to Llama for cost-critical tasks |
| Rate limits | Anthropic/OpenAI have rate limits | Implement queue + exponential backoff |
| Local latency | Ollama slower than APIs (3-4s) | Use for non-urgent, bulk tasks |

---

## Rollback & Fallback Strategy

### If Phase 5.1 fails
- Disable multi-model router
- Fall back to direct API calls (existing path)
- No data loss, just slower

### If Phase 5.2 fails
- Disable rendering engine
- Fall back to existing render endpoints
- Batch queue preserved

### If Phase 5.3 fails
- E2E tests are optional (no production impact)
- Manual testing sufficient for Phase 5 release

### If Phase 5.4 fails
- Marketplace UI optional
- Agents can still be created via API
- No impact on existing functionality

---

## Post-Phase-5 Roadmap

### Phase 6: Knowledge Base Agent
- Ingest documentation (docs/, code/)
- Implement RAG (Retrieval-Augmented Generation)
- Vector database (Weaviate or Pinecone)
- Auto-answer questions about codebase

### Phase 7: Advanced Automation
- Workflow templates
- Conditional logic (if-then-else)
- Approval gates + human-in-the-loop
- Multi-step orchestration

### Phase 8: Custom Model Training
- Fine-tune models per tenant
- RLHF feedback loop
- Cost optimization per customer

### Phase 9: Multi-Tenant Admin Dashboard
- Usage analytics by tenant
- Billing management (per-agent, per-service)
- Tenant onboarding UI
- Audit logs

---

## Notes for Implementation

1. **Start with Phase 5.1** — LLM router is the foundation for everything else
2. **Use stubs/mocks** for external APIs during development
3. **Test locally** with Ollama before deploying to VPS
4. **Monitor costs** — set up billing alerts before going live
5. **Document as you go** — update README + API docs incrementally
6. **Commit frequently** — small PRs are easier to review + revert

---

**Prepared by:** Hermes Autonomous Agent  
**Date:** May 8, 2026  
**Status:** Ready for Implementation  
**Next Review:** May 15, 2026 (post-Phase-5-implementation)

---

## Enlaces relacionados

- [[01-development/README|01-development]]
- [[brain/README|Brain Central]]
