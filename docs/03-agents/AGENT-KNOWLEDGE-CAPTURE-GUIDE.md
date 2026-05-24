---
status: draft
owner: operations
last_review: 2026-05-24
type: agent-doc
tags:
  - opsly/agents
---

# Agent Knowledge Capture Integration Guide

## 🧠 Overview

All Opsly agents can capture their work, insights, and metrics to the **Obsidian Knowledge Vault**. This creates a self-improving system where agents learn from past work.

## 🚀 Quick Start (For Any Agent)

### 1. **Import the Knowledge Service**

```typescript
import { knowledgeService } from '@/lib/knowledge/capture-service';
```

### 2. **Capture Your Work**

```typescript
// After completing a task
await knowledgeService.capture({
  agent: 'brissa',  // Your agent name
  context: 'Shipped LLM Router Phase 5.1',
  insight: 'Successfully routed requests across 3 LLM models. Reduced latency 20%, cost 15%.',
  tags: ['phase-5', 'routing', 'optimization']
});
```

### 3. **Done!**

Your insight is now in the knowledge vault. Future agents (including you) will have access to this knowledge.

## 📊 Use Cases by Agent

### **Brissa (Developer)**

Capture after shipping code:

```typescript
await knowledgeService.captureCompletion(
  'brissa',
  'Implemented LLM Router',
  `
  ## What was built
  - Multi-model routing: Claude, GPT-4, Mixtral
  - Cost optimization: 15% savings
  - Latency improvement: 20% faster
  
  ## Key decisions
  - Used weighted round-robin for load balancing
  - Cached embeddings in Redis (83.9% hit rate)
  - Fallback to Mixtral when Claude unavailable
  
  ## Lessons learned
  - Model quality varies by task type
  - Prompt caching is critical for cost
  - Monitoring latency per model is essential
  `,
  {
    models_tested: 3,
    cost_reduction: '15%',
    latency_improvement: '20%',
    test_coverage: '98%'
  }
);
```

### **Lili (QA)**

Capture after test runs:

```typescript
await knowledgeService.captureMetrics(
  'lili',
  'Test suite completion',
  {
    total_tests: 500,
    passed: 500,
    coverage: '98%',
    duration_seconds: 45,
    critical_issues_found: 0
  }
);
```

### **Nyx (Researcher)**

Capture research findings:

```typescript
await knowledgeService.capture({
  agent: 'nyx',
  context: 'Market analysis: LLM routing solutions',
  insight: `
  ## Competitors analyzed
  - OpenAI Routing Layer: Closed-source, costs 50% more
  - Azure Cognitive Services: Limited model selection
  - Custom in-house: Most flexible, requires expertise
  
  ## Recommendation
  Our approach (custom routing + caching) is competitive:
  - 30% cheaper than OpenAI
  - More flexible model selection
  - Better caching strategy
  
  ## Next research priorities
  1. Fine-tune task classification for model selection
  2. Explore open-weight models (Mixtral, Llama)
  3. Investigate cross-region failover
  `,
  tags: ['research', 'llm-routing', 'market-analysis']
});
```

### **Syra (Social Media)**

Automatically captured after publishing:

```typescript
// After publishing to platforms
await capturePublishEvent(
  'social_media_published',
  ['twitter', 'linkedin', 'discord', 'slack'],
  {
    platforms_published: ['twitter', 'linkedin', 'discord'],
    total_posts: 4,
    success_rate: 0.75,
    estimated_reach: 2450,
    cost_usd: 0.02
  }
);
```

### **Michelle (Performance)**

Capture optimization results:

```typescript
await knowledgeService.capture({
  agent: 'michelle',
  context: 'Cache optimization: Knowledge index',
  insight: `
  ## Optimization applied
  - Redis cache for context queries
  - TTL: 24 hours
  - Key: sha256(query)
  
  ## Results
  - Hit rate: 83.9% (was 12%)
  - Query latency: 100ms → 5ms
  - Cost savings: 99.5%
  
  ## Implementation
  - Cache layer in context-builder
  - Automatic invalidation on index update
  - Graceful fallback if Redis down
  `,
  tags: ['performance', 'caching', 'optimization']
});
```

### **Kairo (Security)**

Capture security findings:

```typescript
await knowledgeService.captureIssue(
  'kairo',
  'Credentials exposure vulnerability',
  `
  ## Vulnerability
  API keys were logged to stdout in debug mode
  
  ## Impact
  Severity: HIGH - Credentials exposed in logs
  
  ## Fix applied
  - Environment variables now sanitized before logging
  - Added secret detection to CI/CD
  - Rotated exposed credentials
  
  ## Prevention
  - Pre-commit hook to detect secrets
  - Automated scanning in CI/CD
  - Regular audit of logs for PII
  `,
);
```

## 🔄 Knowledge Flow

```
Agent Completes Task
    ↓
Calls knowledgeService.capture()
    ↓
POST /api/knowledge/capture
    ↓
Write to docs/obsidian/inbox/YYYY-MM-DD.md
    ↓
Every night at 2 AM (systemd timer):
    - Archive inbox to sources/
    - Regenerate knowledge index
    - Commit to GitHub
    ↓
Next query uses updated knowledge:
    - context-builder.buildContextFromQuery("llm routing")
    - Returns docs + captured insights
    ↓
Future agents learn from your work
```

## 📋 API Reference

### **knowledgeService.capture(payload)**

Basic capture with full control.

```typescript
interface CapturePayload {
  agent: string;           // Your agent name
  context: string;         // What are you capturing?
  insight: string;         // The actual content
  tags?: string[];         // Optional tags for filtering
}

await knowledgeService.capture({
  agent: 'brissa',
  context: 'Feature: LLM Router',
  insight: 'Implementation details...',
  tags: ['router', 'phase-5']
});
```

### **knowledgeService.captureCompletion(agent, task, result, metrics)**

Convenience method for task completions.

```typescript
await knowledgeService.captureCompletion(
  'brissa',
  'Ship LLM Router',
  'Successfully implemented multi-model routing with cost optimization',
  { cost_reduction: '15%', latency_improvement: '20%' }
);
```

### **knowledgeService.captureIssue(agent, issue, details)**

Capture problems for future reference.

```typescript
await knowledgeService.captureIssue(
  'kairo',
  'Security vulnerability found',
  'Details of the issue and how it was fixed...'
);
```

### **knowledgeService.captureMetrics(agent, context, metrics)**

Capture structured metrics/data.

```typescript
await knowledgeService.captureMetrics(
  'michelle',
  'Cache performance',
  { hit_rate: 0.839, latency_ms: 5 }
);
```

### **knowledgeService.getTodayInsights()**

Get insights captured today.

```typescript
const todayInsights = await knowledgeService.getTodayInsights();
console.log(todayInsights);
```

## 🛠️ Integration Points

### **Syra (Auto-Integrated)**

Publishing events are automatically captured:

```typescript
// apps/api/app/api/social/publish/route.ts
capturePublishEvent('social_media_published', platforms, metrics);
```

### **Brissa (Add to Ship Endpoint)**

```typescript
// After shipping code
await knowledgeService.captureCompletion(
  'brissa',
  'Shipped feature: ' + featureName,
  description,
  { tests_passed: 500, coverage: 0.98 }
);
```

### **Lili (Add to Test Endpoint)**

```typescript
// After test completion
await knowledgeService.captureMetrics(
  'lili',
  'Test run completed',
  { total: 500, passed: 500, coverage: 0.98 }
);
```

### **Nyx (Add to Research Endpoint)**

```typescript
// After research completion
await knowledgeService.capture({
  agent: 'nyx',
  context: 'Research: ' + topic,
  insight: findings,
  tags: ['research']
});
```

## ⚙️ System Setup (For Admins)

### **Enable Systemd Timer** (VPS)

```bash
# Copy service files
sudo cp infra/systemd/opsly-knowledge-sync.* /etc/systemd/system/

# Enable and start timer
sudo systemctl daemon-reload
sudo systemctl enable opsly-knowledge-sync.timer
sudo systemctl start opsly-knowledge-sync.timer

# Check status
sudo systemctl status opsly-knowledge-sync.timer
```

### **Or Use Cron** (Local)

```bash
# Add to crontab
0 2 * * * cd /path/to/repo && REPO_ROOT=. bash scripts/knowledge-nightly-sync.sh
```

## 📈 Monitoring

### **Check Today's Captures**

```bash
# View inbox
cat docs/obsidian/inbox/2026-05-08.md

# Count captures
grep -c "^## " docs/obsidian/inbox/2026-05-08.md
```

### **Check Archive**

```bash
# View archived captures
find docs/obsidian/sources/archive -name "*.md" | wc -l

# See what's archived
find docs/obsidian/sources/archive -type f -name "*.md"
```

### **Check Index**

```bash
# How many documents in index
cat config/knowledge-index.json | jq '.files | length'

# When was it last updated
cat config/knowledge-index.json | jq '.generated_at'
```

## 🔍 Best Practices

### **1. Be Specific in Context**

❌ Bad:
```typescript
context: 'Work done'
```

✅ Good:
```typescript
context: 'Implemented LLM Router with multi-model support'
```

### **2. Include Metrics**

❌ Bad:
```typescript
insight: 'It works now'
```

✅ Good:
```typescript
insight: `
- Cost reduced 15%
- Latency improved 20%
- Test coverage 98%
`
```

### **3. Document Decisions**

```typescript
insight: `
## What we did
...

## Why we chose this approach
- More flexible than competitors
- Better cost profile
- Easier to maintain

## Trade-offs considered
- Would have been faster with closed-source solution
- Less control over model selection
```

### **4. Link to Code**

```typescript
insight: `
Implementation: https://github.com/cloudsysops/opsly/blob/main/apps/llm-gateway/src/gateway.ts
PR: #123
Tests: apps/llm-gateway/__tests__/gateway.test.ts
`
```

### **5. Tag for Discoverability**

```typescript
tags: ['phase-5', 'llm-routing', 'optimization', 'performance']
// Future agents can search for these
```

## 🐛 Troubleshooting

### **Capture failed / API returned error**

Check that endpoint is accessible:

```bash
curl -X POST http://localhost:3000/api/knowledge/capture \
  -H "Content-Type: application/json" \
  -d '{
    "agent": "test",
    "context": "Test capture",
    "insight": "Testing knowledge capture"
  }'
```

### **Knowledge index not updating**

Manually regenerate:

```bash
bash scripts/index-knowledge.sh
```

### **Nightly sync not running**

Check systemd timer:

```bash
sudo systemctl status opsly-knowledge-sync.timer
sudo journalctl -u opsly-knowledge-sync.service -n 50
```

## 📚 Examples

See `docs/obsidian/inbox/` for real examples from agents.

---

**Questions?** Check `docs/02-tools/OBSIDIAN-KNOWLEDGE-SYSTEM-STATUS.md` or raise an issue.

**Status:** 🟢 Knowledge capture system live and integrated with Syra. Ready for all agents to start feeding the system.

---

## Enlaces relacionados

- [[03-agents/README|03-agents]]
- [[brain/README|Brain Central]]
