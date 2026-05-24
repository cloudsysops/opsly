---
status: draft
owner: operations
last_review: 2026-05-24
type: architecture
tags:
  - opsly/architecture
---

# ADR-043: Architecture Diagram (ASCII)

## System Architecture: Syra ↔ OpenClaw Integration

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          OPSLY 2.0 MULTI-AGENT PLATFORM                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  AGENTS (Brissa, Michelle, Lousa, Kairo, Aria, Nyx, etc)            │   │
│  │  Trigger Events: feature_shipped, milestone_reached, etc.           │   │
│  └────────┬─────────────────────────────────────────────────────────────┘   │
│           │                                                                  │
│           ↓                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    SYRA AGENT (Session 8)                            │   │
│  │                   Community & Social Layer                           │   │
│  ├──────────────────────────────────────────────────────────────────────┤   │
│  │                                                                       │   │
│  │  POST /api/social/trigger                                           │   │
│  │  ├─ Extract event_type, source_data, platforms                      │   │
│  │  │                                                                   │   │
│  │  └─→ SyraContentGeneratorV2                                         │   │
│  │      │                                                               │   │
│  │      ├─ buildSmartPrompt(event)                                     │   │
│  │      │  ├─ event_type → tone inference                             │   │
│  │      │  ├─ source_data → context injection                         │   │
│  │      │  └─ platforms → format requirements                         │   │
│  │      │                                                               │   │
│  │      └─ llmCallWithFallback(LLMRequest) ────────┐                   │   │
│  │                                                  │                   │   │
│  │  [Approval Logic]                               │                   │   │
│  │  ├─ Routine (feature) → Auto-publish            │                   │   │
│  │  └─ Major (phase, security) → Lousa review      │                   │   │
│  │                                                  │                   │   │
│  │  [Platform-Specific Formatting]                 │                   │   │
│  │  ├─ Twitter: 280 chars + hashtags               │                   │   │
│  │  ├─ LinkedIn: Professional + tags               │                   │   │
│  │  ├─ Discord: Embeds + color                     │                   │   │
│  │  └─ Slack: Blocks + formatting                  │                   │   │
│  │                                                  │                   │   │
│  └──────────────────────────────────────────────────┼───────────────────┘   │
│                                                     │                       │
│                                                     ↓                       │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                  OPENCLAW LLM GATEWAY (ADR-010)                      │   │
│  │              Intelligent Content Generation Layer                    │   │
│  ├──────────────────────────────────────────────────────────────────────┤   │
│  │                                                                       │   │
│  │  ┌─ llmCallWithFallback(req) ─────────────────────────────────────┐  │   │
│  │  │                                                                  │  │   │
│  │  │  1. Intent Detection                                           │  │   │
│  │  │     intent_detector.ts → "achievement" | "feature" | etc       │  │   │
│  │  │                                                                  │  │   │
│  │  │  2. Semantic Cache Lookup                                      │  │   │
│  │  │     ├─ Exact match (99.9% sim) → HIT (0ms, $0.0001)           │  │   │
│  │  │     ├─ Similar match (>85% sim) → PARTIAL (refresh)            │  │   │
│  │  │     └─ No match → Generate new                                 │  │   │
│  │  │     Cache hit rate: 83.9% ✅                                   │  │   │
│  │  │                                                                  │  │   │
│  │  │  3. Complexity Analysis                                        │  │   │
│  │  │     ├─ Simple: tokens < 500                                    │  │   │
│  │  │     ├─ Medium: tokens 500-2000                                 │  │   │
│  │  │     └─ High: tokens > 2000 → Decompose                         │  │   │
│  │  │                                                                  │  │   │
│  │  │  4. Budget Enforcement                                         │  │   │
│  │  │     budget.ts → checkBudget(tenant_slug)                       │  │   │
│  │  │     ├─ $10+ remaining → Normal routing                          │  │   │
│  │  │     ├─ $1-10 remaining → Prefer cheaper models                 │  │   │
│  │  │     ├─ <$1 remaining → Templates only                           │  │   │
│  │  │     └─ $0 remaining → Block, wait for budget increase           │  │   │
│  │  │                                                                  │  │   │
│  │  │  5. Smart Routing Decision                                     │  │   │
│  │  │     ├─ Sonnet (Quality) → $0.02/call                           │  │   │
│  │  │     ├─ Haiku (Balanced) → $0.001/call                          │  │   │
│  │  │     ├─ Mixtral (Cheap) → $0.0005/call                          │  │   │
│  │  │     └─ Template (Free) → $0/call                               │  │   │
│  │  │                                                                  │  │   │
│  │  │  6. Provider Health Check                                      │  │   │
│  │  │     fallback-chain.ts → Circuit breaker pattern                │  │   │
│  │  │     ├─ Circuit CLOSED (healthy) → Use primary                  │  │   │
│  │  │     ├─ Circuit OPEN (failures >= 3 in 60s) → Skip              │  │   │
│  │  │     └─ Circuit HALF-OPEN (testing recovery) → Try              │  │   │
│  │  │                                                                  │  │   │
│  │  │  7. Execution with Fallback Chain                              │  │   │
│  │  │     ┌─ Attempt Primary (Sonnet)                                │  │   │
│  │  │     │  ├─ Success (< 3sec) → Return response ✅               │  │   │
│  │  │     │  ├─ Timeout (> 3sec) → Fallback ⏱️                       │  │   │
│  │  │     │  └─ Error → Fallback + log failure                       │  │   │
│  │  │     ├─ Attempt Secondary (Haiku)                               │  │   │
│  │  │     │  ├─ Success → Return response ✅                         │  │   │
│  │  │     │  └─ Timeout/Error → Fallback                             │  │   │
│  │  │     ├─ Attempt Tertiary (Mixtral)                              │  │   │
│  │  │     │  ├─ Success → Return response ✅                         │  │   │
│  │  │     │  └─ Timeout/Error → Fallback                             │  │   │
│  │  │     └─ Final Fallback (Template)                               │  │   │
│  │  │        └─ Return hardcoded template ✅                         │  │   │
│  │  │                                                                  │  │   │
│  │  │  8. Response Formatting                                        │  │   │
│  │  │     response-formatter.ts → output_channel-specific            │  │   │
│  │  │                                                                  │  │   │
│  │  └─ Return LLMResponse ──────────────────────────────────────────┘  │   │
│  │    {                                                                 │   │
│  │      content: "✨ Feature shipped... 🚀",                           │   │
│  │      model_used: "claude-3.5-sonnet",                              │   │
│  │      cost_usd: 0.02,                                               │   │
│  │      cache_hit: false,                                             │   │
│  │      latency_ms: 1250,                                             │   │
│  │      quality_score: 0.92,                                          │   │
│  │      savings_usd: 0.03                                             │   │
│  │    }                                                                │   │
│  │                                                                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│           ↑                                                                  │
│           │ Import: @intcloudsysops/llm-gateway                            │
│           │ { llmCall, llmCallWithFallback, checkBudget, ... }            │
│           │                                                                │
│  ┌────────┴──────────────────────────────────────────────────────────────┐ │
│  │                    EXTERNAL LLM PROVIDERS                              │ │
│  ├────────────────────────────────────────────────────────────────────────┤ │
│  │                                                                        │ │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────────────┐ │ │
│  │  │ Anthropic Claude │  │   OpenAI GPT-4   │  │  Mistral Mixtral    │ │ │
│  │  │                  │  │                  │  │  (or similar cheap)  │ │ │
│  │  │ - Sonnet (primary)
│  │  │ - Haiku (fallback)
│  │  │ - Quality: 5/5 ⭐ │  │ - Quality: 5/5 ⭐ │  │ - Quality: 3.5/5 ⭐ │ │ │
│  │  │ - Cost: $0.02    │  │ - Cost: $0.05    │  │ - Cost: $0.0003     │ │ │
│  │  │ - Speed: 1.2s avg│  │ - Speed: 2s avg  │  │ - Speed: 0.8s avg   │ │ │
│  │  └──────────────────┘  └──────────────────┘  └─────────────────────┘ │ │
│  │                                                                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│           ↑                                                                  │
│           │                                                                  │
│  ┌────────┴──────────────────────────────────────────────────────────────┐ │
│  │                    INFRASTRUCTURE LAYER                               │ │
│  ├────────────────────────────────────────────────────────────────────────┤ │
│  │                                                                        │ │
│  │  Redis Cache               Supabase Storage        Observability      │ │
│  │  ┌──────────────────┐     ┌──────────────────┐    ┌──────────────┐   │ │
│  │  │ Semantic Cache   │────→│ generated_content│────→│ Structured   │   │ │
│  │  │ (83.9% hit rate) │     │ (cost tracking)  │    │ Logs         │   │ │
│  │  │ TTL: 1 hour      │     │                  │    │ (monitoring) │   │ │
│  │  │ Key: hash(prompt)│     │ Columns:         │    └──────────────┘   │ │
│  │  │                  │     │ - model_used     │                       │ │
│  │  │ Circuit breaker  │     │ - cost_usd       │    Metrics/Billing    │ │
│  │  │ (provider health)│     │ - cache_hit      │    ┌──────────────┐   │ │
│  │  └──────────────────┘     │ - quality_score  │    │ Cost per     │   │ │
│  │                           │ - latency_ms     │    │ tenant       │   │ │
│  │                           │ - created_at     │    │ (billing)    │   │ │
│  │                           └──────────────────┘    └──────────────┘   │ │
│  │                                                                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                    PUBLISHING LAYER                                    │ │
│  ├────────────────────────────────────────────────────────────────────────┤ │
│  │                                                                        │ │
│  │  parseAndFormatContent(response)                                     │ │
│  │    ↓                                                                  │ │
│  │  POST /api/social/publish                                            │ │
│  │    ↓                                                                  │ │
│  │  multiPlatformPublisher.publishToAll()                              │ │
│  │    ├─→ Twitter API (threads)                                         │ │
│  │    ├─→ LinkedIn API (articles)                                       │ │
│  │    ├─→ Discord API (embeds)                                          │ │
│  │    └─→ Slack API (blocks)                                            │ │
│  │    ↓                                                                  │ │
│  │  Update scheduled_posts { status: 'published' }                      │ │
│  │    ↓                                                                  │ │
│  │  capturePublishEvent(knowledge vault)                               │ │
│  │                                                                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Cost Optimization Flow

```
                     ┌─────────────────────────┐
                     │ Content Generation      │
                     │ Request arrives         │
                     └────────────┬────────────┘
                                  │
                                  ↓
                     ┌─────────────────────────┐
                     │ Check Budget            │
                     │ remaining = ?           │
                     └────────────┬────────────┘
                                  │
                  ┌───────────────┼───────────────┐
                  │               │               │
                  ↓               ↓               ↓
         ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
         │ $10+         │ │ $1-10        │ │ <$1          │
         │ Normal       │ │ Constrained  │ │ Critical     │
         │ Routing      │ │ Routing      │ │ Fallback     │
         └──────┬───────┘ └──────┬───────┘ └──────┬───────┘
                │                │                │
                ↓                ↓                ↓
        ┌─────────────────┐ ┌──────────────┐ ┌──────────────┐
        │ Complexity      │ │ Prefer:      │ │ Templates    │
        │ Analysis        │ │ Haiku/Cheap  │ │ Only         │
        │                 │ │ or Template  │ │              │
        └────────┬────────┘ └──────┬───────┘ └──────┬───────┘
                 │                │                │
        ┌────────┴─────┐          │                │
        │              │          │                │
    ┌───┴───┐  ┌──────┴──┐       │                │
    │       │  │         │       │                │
    ↓       ↓  ↓         ↓       ↓                ↓
   Low    Med High    Cache  Haiku/Cheap    Template
   Simple Simple Complex  Hit
    │      │      │       │      │                │
    │      │      │       │      │                │
    ↓      ↓      ↓       ↓      ↓                ↓
 ┌────┐┌────┐┌────┐┌────┐┌───┐┌────────────┐
 │FREE││Hkk ││Son ││FREE││Hkk││  $0        │
 │ $0 ││$001││$020││$000││$01││            │
 └────┘└────┘└────┘└────┘└───┘└────────────┘
  T1    T2    T3    T4    T5      T6

Legend:
T1 = Template (routine)       Cost: $0.00
T2 = Haiku (simple)           Cost: $0.001
T3 = Sonnet (quality)         Cost: $0.02
T4 = Cache hit                Cost: $0.0001
T5 = Haiku (budget-limited)   Cost: $0.001
T6 = Template (critical)      Cost: $0.00

MONTHLY COST FOR 50 POSTS:
10 T1 × $0.00    = $0.00
15 T2 × $0.001   = $0.015
15 T3 × $0.02    = $0.30
8  T4 × $0.0001  = $0.0008
2  T5 × $0.001   = $0.002
─────────────────────────
TOTAL: $0.3178/month (84% savings vs direct Claude)
```

---

## Fallback Chain Execution Timeline

```
Request: generateContent(feature_shipped)
│
├─ Time: 0ms   ─→ Call Primary (Sonnet)
│              ─→ Timeout threshold: 3000ms
│
├─ Time: 500ms ─→ Sonnet processing...
│
├─ Time: 1500ms ─→ Still processing...
│
├─ Time: 2500ms ─→ Almost at timeout...
│
├─ Time: 3000ms ─→ Timeout! Circuit records failure
│               ─→ Failure count: 1 (< 3 threshold)
│               ─→ Proceed to Secondary (Haiku)
│
├─ Time: 3000ms ─→ Call Secondary (Haiku)
│              ─→ Timeout threshold: 3000ms
│
├─ Time: 3200ms ─→ Haiku processing...
│
├─ Time: 3800ms ─→ SUCCESS! ✅
│               ─→ Return response
│               ─→ Log event: { fallback_activated: true }
│
└─ Time: 3850ms ─→ Response to Syra (total latency: 3850ms)

OR (if ALL fail):

├─ Time: 3000ms ─→ Sonnet fails
├─ Time: 6000ms ─→ Haiku fails
├─ Time: 9000ms ─→ Mixtral fails
│
└─ Time: 9050ms ─→ Return Template Fallback ✅
               ─→ Alert: All providers exhausted
               ─→ Log: full_fallback_activated
```

---

## Data Flow: Event Payload Through System

```
INCOMING EVENT (from Brissa agent)
├─ event_type: 'feature_shipped'
├─ title: 'LLM Router v2.1 Deployment'
├─ description: 'Multi-model routing with cost optimization'
├─ agents_involved: ['Brissa', 'OpenClaw', 'Kairo']
├─ metrics:
│  └─ latency_reduction: '20%'
│  └─ cost_reduction: '15%'
└─ platforms: ['twitter', 'linkedin', 'discord', 'slack']

                          ↓

SYRA CONTENT GENERATOR
├─ buildSmartPrompt(event)
├─ Inferred tone: 'excited, celebratory'
├─ Platform-specific constraints:
│  ├─ Twitter: 280 chars
│  ├─ LinkedIn: 500+ words
│  ├─ Discord: embed-friendly
│  └─ Slack: block-structured
└─ Call llmCallWithFallback()

                          ↓

OPENCLAW GATEWAY PROCESSING
├─ Intent: 'achievement'
├─ Complexity: 'medium'
├─ Semantic cache: miss
├─ Budget: OK ($847.50 remaining)
├─ Route decision: Haiku (balanced cost/quality)
└─ LLM: Haiku generates content in 800ms

                          ↓

LLM RESPONSE (structured JSON)
{
  "twitter": "✨ Brissa shipped Phase 5.1 LLM Router! 🚀\n\n1/...",
  "linkedin": "This week our team deployed...",
  "discord": {
    "content": "🎉 Achievement unlocked!",
    "embeds": [{ "title": "...", "color": 0x00ff00 }]
  },
  "slack": {
    "text": "*Phase 5.1 LLM Router*",
    "blocks": [...]
  }
}

                          ↓

PLATFORM FORMATTING
├─ Twitter: Split into threads (280 chars each)
├─ LinkedIn: Add tags, format article
├─ Discord: Finalize embed colors
└─ Slack: Finalize block structure

                          ↓

APPROVAL LOGIC
├─ Event type: 'feature_shipped' (routine)
├─ Decision: Auto-approve ✅
└─ Status: 'approved'

                          ↓

PUBLISH TO ALL PLATFORMS
├─ POST twitter.com/statuses: Success ✅ URL: https://x.com/opsly/status/...
├─ POST linkedin.com/posts: Success ✅ URL: https://linkedin.com/feed/update/...
├─ POST discord.com/channels: Success ✅ Message ID: 123456
└─ POST slack.com/messages: Success ✅ Timestamp: 1715200200.001200

                          ↓

STORE RESULTS
├─ Update generated_content table
│  └─ model_used: 'claude-3.5-haiku'
│  └─ cost_usd: 0.001
│  └─ cache_hit: false
│  └─ quality_score: 0.87
│  └─ latency_ms: 1250
│
├─ Update scheduled_posts table
│  └─ 4 rows marked 'published'
│
└─ Capture to knowledge vault
   └─ engagement_event { platforms: ['twitter'...] }

                          ↓

RESPONSE TO CALLER
{
  "status": "published",
  "content_id": "content_abc123",
  "metadata": {
    "model_used": "claude-3.5-haiku",
    "cost_usd": 0.001,
    "cache_hit": false,
    "quality_score": 0.87
  },
  "platforms_published": ["twitter", "linkedin", "discord", "slack"],
  "total_posts": 4,
  "success_rate": 1.0
}
```

---

**Diagram Version:** 1.0  
**Last Updated:** 2026-05-08  
**Architect:** Hermes Agent

---

## Enlaces relacionados

- [[00-architecture/README|00-architecture]]
- [[brain/README|Brain Central]]
