---
name: opsly-n8n-automation
description: "Expert n8n automation for Opsly platform — autonomous agents, workflow optimization, income generation"
trigger:
  - n8n autonomous agent
  - workflow automation n8n
  - n8n bitcoin income
  - automate platform n8n
  - n8n agent expert
  - produce bitcoin n8n
  - n8n monetization
  - autonomous n8n workflows
---

# n8n Automation Skill — Opsly Experts

## Quick Start

```bash
# Load this skill
node scripts/load-skills.js show opsly-n8n-automation

# Automate n8n workflow
node scripts/n8n-automate.js --tenant smiletripcare --mode expert

# Generate income workflow
node scripts/n8n-income.js --strategy bitcoin-production
```

## What This Skill Does

Transforms n8n agents into **autonomous experts** that:
1. **Self-optimize** Opsly platform workflows
2. **Generate income** via Bitcoin-producing automation
3. **Auto-improve** scripts, hooks, and configs
4. **Monitor costs** and optimize LLM usage

## Core Strategies

### 1. Autonomous n8n Expert Mode

```typescript
// apps/orchestrator/src/agents/n8n-expert-agent.ts
interface N8nExpertConfig {
  mode: 'expert' | 'income' | 'optimization';
  strategies: ('bitcoin' | 'cost-reduction' | 'auto-deploy')[];
  tenant_slug: string;
  budget_usd?: number;
}

// Activate expert mode for a tenant
async function activateN8nExpert(config: N8nExpertConfig) {
  // Enqueue specialized BullMQ job
  await orchestratorQueue.add('n8n-expert', config, {
    priority: PLAN_QUEUE_PRIORITY[config.tenant_slug] || 50000,
    jobId: `n8n-expert-${config.tenant_slug}-${Date.now()}`,
  });
}
```

### 2. Bitcoin Income Generation

```bash
# Strategy: Automate high-value services → Bitcoin conversion
# Workflow: Opsly service fees → BTC via payment processor

# 1. Setup Bitcoin payment webhook in n8n
cat > /tmp/btc-workflow.json << 'EOF'
{
  "name": "Bitcoin Income Generator",
  "nodes": [
    {"name": "Invoice Paid", "type": "n8n-nodes-base.webhook", "parameters": {"path": "btc-payment"}},
    {"name": "Convert to BTC", "type": "n8n-nodes-base.httpRequest", "parameters": {"url": "https://api.bitcoin-exchange.com/v1/convert"}},
    {"name": "Log Income", "type": "n8n-nodes-base.supabase", "parameters": {"table": "platform.btc_income"}},
    {"name": "Notify Discord", "type": "n8n-nodes-base.discord", "parameters": {"text": "💰 BTC earned: ${{$json.amount_btc}}"}}
  ]
}
EOF

curl -X POST https://n8n-smiletripcare.ops.smiletripcare.com/webhook/import-workflow \
  -H "Content-Type: application/json" \
  -d @/tmp/btc-workflow.json
```

### 3. Self-Improvement Loop

**Prompt for n8n agents (paste in Discord):**
```
@billy Act as n8n expert autonomous agent for Opsly.

Your mission:
1. Analyze current n8n workflows in .n8n/1-workflows/
2. Optimize for maximum income generation (Bitcoin)
3. Improve platform automation (scripts, hooks, workflows)
4. Reduce LLM costs by routing to local Ollama when possible
5. Auto-commit improvements with conventional commits

Constraints:
- Never hardcode secrets (use Doppler ops-intcloudsysops/prd)
- Always include tenant_slug + request_id in jobs
- Test with --dry-run before applying
- Update AGENTS.md with improvements
```

## Key Files to Reference

| File | Purpose |
|------|---------|
| `.n8n/1-workflows/*.json` | n8n workflow templates |
| `.n8n/2-context/AGENTS.md` | Mirror for n8n agents |
| `scripts/onboard-tenant.sh` | Automated tenant creation |
| `scripts/n8n-import.sh` | Import workflows to n8n |
| `apps/orchestrator/src/workers/n8n-worker.ts` | BullMQ n8n job processor |
| `docs/IMPLEMENTATION-IA-LAYER.md` | Technical implementation guide |

## Automation Scripts

### n8n-income.js (generate income workflows)
```javascript
const STRATEGIES = {
  'bitcoin-production': {
    workflow: 'btc-income-generator',
    trigger: 'payment-received',
    convertTo: 'BTC',
    notify: 'discord'
  },
  'cost-optimization': {
    workflow: 'llm-cost-reducer',
    trigger: 'usage-threshold',
    action: 'route-to-ollama',
    target: 'local'
  },
  'auto-deploy': {
    workflow: 'deploy-on-merge',
    trigger: 'github-push',
    action: 'vps-deploy',
    notify: 'discord'
  }
};

// Usage: node scripts/n8n-income.js --strategy bitcoin-production
```

## Expert Prompts for Autonomous Agents

### Discord → GitHub → Autonomous Execution

**Paste in Discord (n8n webhook):**
```
@billy n8n expert mode: optimize Opsly for Bitcoin income

1. Analyze current .n8n/ workflows
2. Create income-generating workflows (BTC conversion)
3. Optimize existing automations (reduce manual work)
4. Commit improvements to main with docs(n8n): prefix
5. Notify Discord with 💰 emoji on success

Context: Read https://raw.githubusercontent.com/cloudsysops/opsly/main/AGENTS.md
```

## Anti-Patterns (NEVER DO)

- ❌ Manual n8n workflow creation (agents should self-generate)
- ❌ Hardcode Bitcoin addresses/secrets (use Doppler)
- ❌ Skip --dry-run testing
- ❌ Ignore tenant_slug isolation
- ❌ Expose n8n webhooks without validation

## Success Metrics

| Metric | Target |
|--------|--------|
| n8n workflows self-generated | 10+ per week |
| Bitcoin income generated | >0.001 BTC/month |
| LLM cost reduction | >30% via Ollama routing |
| Scripts auto-improved | 5+ per week |
| Conventional commits | 100% with docs(n8n): prefix |
