# Syra × OpenClaw/LLM Gateway Integration

## 🎯 Overview

**OpenClaw** (nuestro internal LLM Gateway) es el **corazón inteligente de Syra**. Mientras que Syra maneja la **publicación en múltiples plataformas**, OpenClaw maneja la **generación de contenido inteligente y contextual**.

**Relación:**
- **OpenClaw** = Cerebro (Content Generation + LLM Routing)
- **Syra** = Voz (Multi-Platform Publishing)

## 🏗️ Architecture

### Data Flow: From Event to Published Post

```
Event (Brissa ships feature)
    ↓
POST /api/social/trigger (Syra endpoint)
    ↓
Extract event metadata
    ↓
Call OpenClaw Content Generator
    ├─ Request: event_type, platforms, context
    ├─ OpenClaw routes to best model (Claude, GPT-4, Mixtral)
    ├─ Cache hit? Return cached version (saves $)
    └─ Cache miss? Generate + store
    ↓
Generate platform-specific content
    ├─ Twitter threads (280 char chunks)
    ├─ LinkedIn articles (professional tone)
    ├─ Discord embeds (emoji + color)
    └─ Slack blocks (structured format)
    ↓
Determine approval requirement
    ├─ Routine (feature, test) → Auto-post
    └─ Major (phase, security) → Lousa approval
    ↓
Publish via Syra adapters (Twitter, LinkedIn, Discord, Slack)
    ↓
Store results + metrics in Supabase
```

## 📦 OpenClaw Components Used by Syra

### 1. **LLM Router** (`apps/llm-gateway/src/gateway.ts`)

Syra uses OpenClaw's routing logic to pick the best model for content generation:

```typescript
// In content-generator.ts (Syra)
import { gateway } from '@intcloudsysops/llm-gateway';

async generateContent(prompt: string, platforms: string[]): Promise<string> {
  // OpenClaw picks the best model based on:
  // - Cost (GPT-4 expensive, Mixtral cheap)
  // - Speed (Claude 3.5 fastest for long-form)
  // - Quality (Claude for nuance, GPT-4 for accuracy)
  // - Availability (fallback chains if primary down)
  
  const response = await gateway.complete({
    prompt,
    max_tokens: 500,
    // OpenClaw automatically routes based on:
    // - Tenant budget remaining
    // - Model performance history
    // - Latency requirements
    // - Fallback availability
  });
  
  return response.content;
}
```

### 2. **Budget Tracking** (`apps/llm-gateway/src/budget.ts`)

OpenClaw tracks cost per tenant → Syra respects budget limits:

```typescript
// OpenClaw prevents overspend
const canGenerate = await gateway.checkBudget({
  tenant_id: 'opsly',
  cost_estimate: 0.02, // $0.02 per post
});

if (!canGenerate.allowed) {
  console.warn('Budget exceeded, using template fallback');
  return contentTemplates[event_type]; // Fallback
}
```

### 3. **Caching Layer** (`apps/llm-gateway/src/cache.ts`)

OpenClaw caches similar prompts → Syra reuses cached content:

```typescript
// First post (cache miss)
// POST /api/social/trigger
// → OpenClaw generates "✨ Brissa shipped LLM Router 🚀" 
// → Cost: $0.02
// → Cached with key: hash("brissa:feature_shipped:llm_router")

// Second similar post (cache hit)
// POST /api/social/trigger (different agent, same event type)
// → OpenClaw returns cached version
// → Cost: $0.0001 (embedding lookup)
// → Savings: 99.5%
```

### 4. **Embeddings for Content Clustering** (`apps/llm-gateway/src/embeddings.ts`)

OpenClaw groups similar content automatically:

```typescript
// OpenClaw embeddings identify:
// - "Feature shipped" → Use excited tone
// - "Security issue" → Use professional tone
// - "Milestone reached" → Use ambitious tone
// - "Bug fixed" → Use confident tone

const embedding = await gateway.embed(event_context);
const tone = await determineTone(embedding); // Via semantic similarity
```

### 5. **Fallback Chain** (`apps/llm-gateway/src/fallback-chain.ts`)

If OpenClaw is down → Syra has graceful fallbacks:

```typescript
// Fallback hierarchy:
// 1. Try OpenClaw (primary)
// 2. If unavailable → Use hardcoded templates
// 3. If templates fail → Return empty (don't block deployment)

async generateContent(event) {
  try {
    // Primary: OpenClaw LLM Gateway
    return await gateway.generateContent(event);
  } catch (error) {
    console.warn('OpenClaw unavailable, using templates');
    
    // Secondary: Hardcoded templates (works offline)
    return contentTemplates[event.type];
  }
}
```

## 🔌 Integration Points

### A. Content Generation Endpoint

**Before:** (Session 6)
```typescript
// Syra generates with templates only
const content = contentTemplates[event_type];
```

**After:** (Session 7 + OpenClaw)
```typescript
// Syra calls OpenClaw for smart generation
const response = await fetch('http://localhost:3010/generate', {
  method: 'POST',
  body: JSON.stringify({
    event_type: 'feature_shipped',
    event_data: {
      title: 'LLM Router',
      description: 'Multi-model routing with cost optimization',
      impact: 'Reduced latency 20%, cost 15%',
    },
    platforms: ['twitter', 'linkedin', 'discord', 'slack'],
    tone: 'excited', // OpenClaw determines automatically
    max_length: 280, // Platform-specific
  }),
});

// Response: 
// {
//   "twitter": "✨ Brissa shipped Phase 5.1 LLM Router! 🚀\n\n1/ Intelligently selects Claude, GPT-4, Mixtral...",
//   "linkedin": "This week our team shipped...",
//   "discord": {"content": "🎉 Achievement unlocked!", "embeds": [...]},
//   "slack": {"text": "...", "blocks": [...]}
// }
```

### B. Token Budget Integration

**Syra respects OpenClaw's budget constraints:**

```typescript
// In scheduler.ts
async schedulePost(job: ScheduleJob): Promise<string> {
  const budget = await gateway.checkBudget('opsly');
  
  if (budget.remaining < 5) {
    // Low budget → use cheaper model (Mixtral instead of Claude)
    job.preferredModel = 'mixtral';
  }
  
  if (budget.remaining < 0.5) {
    // Critical budget → use templates only
    job.useTemplatesOnly = true;
  }
  
  return this.scheduleInDatabase(job);
}
```

### C. Metrics Collection

**Syra feeds engagement back to OpenClaw:**

```typescript
// After publishing to Twitter
const metrics = await twitter.getMetrics(post_id);

// Report back to OpenClaw for model quality tracking
await gateway.recordMetrics({
  post_id,
  model_used: 'claude-3.5-sonnet',
  engagement: metrics.likes + metrics.retweets,
  sentiment: 'positive',
  cost: 0.02,
  roi: 15.2, // ROI = engagement value / cost
});

// OpenClaw uses this to optimize routing:
// "Claude 3.5 Sonnet has 15.2x ROI for 'achievement' events"
// → Future posts of this type will prefer Claude
```

## 💰 Cost Optimization via OpenClaw

### Before (Without Smart Routing)

```
50 posts/month × $0.05/post (always Claude) = $2.50/month
```

### After (With OpenClaw Smart Routing)

```
50 posts/month:
  ├─ 15 high-quality posts (Claude 3.5) × $0.02 = $0.30
  ├─ 20 routine posts (Mixtral) × $0.005 = $0.10
  ├─ 10 cached posts × $0.0001 = $0.001
  └─ 5 template-only posts × $0 = $0

Total: ~$0.40/month (84% savings)
```

## 🔐 Security & Privacy

### OpenClaw Protections Used by Syra

1. **No credentials exposed** — API keys stored in OpenClaw only
2. **Request sanitization** — Removes sensitive data before routing to models
3. **Rate limiting** — Per-tenant limits enforced by OpenClaw
4. **Audit logging** — All LLM calls logged with request_id for tracing
5. **Token counting** — Prevents token bomb attacks via OpenClaw's budget system

## 📊 Monitoring

### OpenClaw Health Checks (Critical for Syra)

```bash
# Health status
curl http://localhost:3010/health

# Response:
{
  "status": "ok",
  "models": {
    "claude-3.5-sonnet": "operational",
    "gpt-4": "operational",
    "mixtral-8x7b": "operational"
  },
  "cache": {
    "hits": 234,
    "misses": 45,
    "hit_rate": 0.839
  },
  "budget": {
    "remaining": 847.50,
    "used_today": 152.50
  }
}
```

### Syra Depends On

- OpenClaw availability (critical)
- LLM model availability (at least one of 3 models)
- Cache layer for cost optimization
- Budget tracking for spending control

## 🚨 Failure Modes & Recovery

### Scenario 1: OpenClaw Down

```
OpenClaw unavailable (network issue, deployment)
  ↓
Syra detects timeout (3sec) on gateway call
  ↓
Fallback to hardcoded content templates
  ↓
Posts still published (with lower quality)
  ↓
No revenue impact (Syra still operational)
  ↓
Lousa notified via Slack (manual content review)
```

### Scenario 2: Budget Exhausted

```
OpenClaw reports: budget_remaining = $0
  ↓
Syra switches to template-only mode
  ↓
Continue publishing with hardcoded content
  ↓
Alert Finance team (budget alert via Discord)
  ↓
Resume LLM generation after budget increase
```

### Scenario 3: Model Degradation

```
OpenClaw detects Claude 3.5 is slow (latency > 5s)
  ↓
Routes to Mixtral (faster, cheaper)
  ↓
Syra posts generated with Mixtral quality
  ↓
Metrics show lower engagement
  ↓
OpenClaw auto-reverts when Claude recovers
```

## 🔄 Future Integrations

### Phase 5.2 (Next Week)

- **Voice Generation** → OpenClaw calls ElevenLabs for audio narration
- **Image Generation** → OpenClaw calls Stable Diffusion for post images
- **Sentiment Analysis** → OpenClaw analyzes post sentiment before publishing

### Phase 5.3 (Week 3)

- **A/B Testing** → OpenClaw generates multiple versions, Syra A/B tests them
- **Multi-Language** → OpenClaw auto-translates posts for 10+ languages
- **Real-time Optimization** → OpenClaw adjusts tone based on live engagement

## 📚 Key Files

**OpenClaw (Core):**
- `apps/llm-gateway/src/gateway.ts` — Main router (9.3 KB)
- `apps/llm-gateway/src/budget.ts` — Cost tracking (4.4 KB)
- `apps/llm-gateway/src/cache.ts` — Response caching (1.5 KB)
- `apps/llm-gateway/src/embeddings.ts` — Semantic search (7.6 KB)
- `apps/llm-gateway/src/fallback-chain.ts` — Failure handling (4.1 KB)

**Syra Integration:**
- `apps/api/lib/social/content-generator.ts` — Calls OpenClaw
- `apps/api/lib/social/scheduler.ts` — Respects OpenClaw budget

**Configuration:**
- `apps/llm-gateway/src/config/` — Provider keys, model settings
- `.env` variables for OpenClaw endpoint + auth

## ✅ Current Status

| Component | Status | Notes |
|-----------|--------|-------|
| OpenClaw Gateway | ✅ Running | Port 3010, all models healthy |
| Syra Content Gen | ✅ Integrated | Calls OpenClaw, has fallbacks |
| Budget Tracking | ✅ Active | $847.50 remaining |
| Cache Layer | ✅ Operational | 83.9% hit rate |
| Fallback Chain | ✅ Ready | Templates available if OpenClaw down |

## 🚀 How to Deploy Together

```bash
# 1. Start OpenClaw (must be first)
npm run dev --workspace=@intcloudsysops/llm-gateway
# Waits for port 3010 to be ready

# 2. Start Syra API (depends on OpenClaw)
npm run dev --workspace=@intcloudsysops/api
# Connects to OpenClaw at http://localhost:3010

# 3. Test integration
curl -X POST http://localhost:3000/api/social/generate \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "feature_shipped",
    "platforms": ["twitter"],
    "event_data": {
      "title": "Test Feature",
      "impact": "High"
    }
  }'

# Response: Generated Twitter thread (via OpenClaw)
```

## 📞 Troubleshooting

**Q: Syra posts are using templates, not OpenClaw generation**

A: Check OpenClaw health:
```bash
curl http://localhost:3010/health
# If status != "ok", restart OpenClaw
npm run dev --workspace=@intcloudsysops/llm-gateway
```

**Q: Budget exhausted, can't generate content**

A: Request budget increase:
```bash
curl -X POST http://localhost:3010/admin/budget/increase \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"tenant": "opsly", "amount": 500}'
```

**Q: Why is content quality degraded?**

A: Check OpenClaw metrics:
```bash
curl http://localhost:3010/metrics | jq '.models'
# May show Claude is slow, using cheaper model instead
```

---

**Summary:** OpenClaw is Syra's intelligence layer. Without it, Syra uses templates. With it, Syra generates contextual, multi-platform content autonomously.

**Both are production-ready. Deploy together for full functionality.**
