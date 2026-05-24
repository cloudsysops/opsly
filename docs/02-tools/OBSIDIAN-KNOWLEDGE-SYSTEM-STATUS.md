---
status: draft
owner: operations
last_review: 2026-05-24
type: tool-doc
tags:
  - opsly/tools
---

# Obsidian Knowledge System for Opsly Agents

## 🎯 Status: PARTIALLY IMPLEMENTED

The knowledge system exists but is **fragmented and partially broken**. Here's what's working and what needs fixing.

## ✅ What Exists

### 1. **Knowledge Index System** (`apps/context-builder`)

**Purpose:** Central knowledge registry that agents query to understand repo structure.

**Current State:** 
- ✅ `knowledge-index.json` generated and cached
- ✅ `buildContextFromQuery()` loads relevant docs based on keyword search
- ✅ Redis caching for context (via `getCachedContext`)
- ✅ XML bundling format for LLM consumption
- ⚠️ **Index outdated** (last generated Apr 24, 2026)

**How it works:**
```typescript
// Agent asks: "What's the status of Syra?"
const context = await buildContextFromQuery("syra social media");

// Returns:
{
  context: "<context_bundle>
    <context_file source='docs/03-agents/SOCIAL-MEDIA-AGENT-SYRA.md'>
      ...26.6 KB of Syra docs...
    </context_file>
    <context_file source='docs/03-agents/SYRA-IMPLEMENTATION-GUIDE.md'>
      ...10.6 KB of implementation...
    </context_file>
  </context_bundle>",
  cache_hit: false,
  sources: ['docs/03-agents/SOCIAL-MEDIA-AGENT-SYRA.md', 'docs/03-agents/SYRA-IMPLEMENTATION-GUIDE.md'],
  digest: 'sha256(query)'
}
```

### 2. **Obsidian Vault Structure** (`docs/.obsidian`)

**Purpose:** Human-readable knowledge base for documentation.

**Current State:**
- ✅ Vault initialized (`.obsidian` config exists)
- ✅ Inbox directory for capture (`docs/obsidian/inbox/`)
- ✅ Sources directory for archive (`docs/obsidian/sources/`)
- ⚠️ **Mostly empty** (only 911 bytes of content)

### 3. **Scripts to Keep Knowledge Fresh**

**Available but NOT running:**

- `scripts/generate-knowledge-index.mjs` — Regenerate index from `.md` files
- `scripts/knowledge-collector.py` — Collect from agents into vault
- `scripts/index-knowledge.sh` — Main entry point
- `scripts/knowledge-nightly-loop.sh` — Scheduled sync (cron)
- `scripts/archive-to-obsidian.mjs` — Push docs to Obsidian

**Status:** Scripts exist but not wired into CI/CD or cron jobs.

## ❌ What's Broken / Missing

### 1. **Stale Knowledge Index** 🚨

```bash
$ cat config/knowledge-index.json | grep generated_at
"generated_at": "2026-04-24T21:26:25.543Z"
# ← 14 days old! Missing:
# - Syra docs (added May 8)
# - OpenClaw integration (added May 8)
# - All Phase 5.5+ documentation
```

**Impact:** Agents have outdated context. When they search "syra", they get old docs (if any).

### 2. **Knowledge Index NOT Updated on Commit**

**Expected:**
```
git push → GitHub Actions → npm run update-knowledge-index → new index
```

**Actual:**
```
git push → GitHub Actions → (no knowledge update step)
```

**Fix needed:** Add to `.github/workflows/` a job that runs `scripts/index-knowledge.sh` after merges.

### 3. **Obsidian Vault NOT Connected to Agents**

**Expected:**
```
Agent generates insight
    ↓
POST /api/knowledge/capture
    ↓
Write to Obsidian inbox
    ↓
Human reviews + organizes
    ↓
Publish to knowledge base
    ↓
Next query includes this knowledge
```

**Actual:**
```
Agent generates insight
    ↓
Lost (nowhere to store)
```

**Fix needed:** API endpoint to capture agent insights → Obsidian inbox.

### 4. **No Cron Job for Nightly Sync**

**Expected:**
```
Every night at 2 AM:
    1. Collect agent outputs from past 24h
    2. Archive to Obsidian sources/
    3. Regenerate knowledge index
    4. Commit to GitHub
```

**Actual:**
```
(Nothing happens)
```

**Fix needed:** Systemd timer or cron job to run `knowledge-nightly-loop.sh`.

## 🔧 How to Fix This (Priority Order)

### **CRITICAL (Do Today)**

**1. Regenerate Knowledge Index**

```bash
cd /Users/dragon/cboteros/proyectos/intcloudsysops

# Generate fresh index from all current .md files
npm run update-state

# Or manually:
node scripts/generate-knowledge-index.mjs --root . --output config/knowledge-index.json

# Verify
cat config/knowledge-index.json | jq '.generated_at'
# Should show today's date
```

**2. Add GitHub Actions Step**

In `.github/workflows/deploy.yml` (or create `obsidian-sync.yml`):

```yaml
name: Update Knowledge Index

on:
  push:
    branches: [main]
    paths:
      - 'docs/**'
      - 'apps/**'

jobs:
  update-index:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
      
      - name: Install dependencies
        run: npm ci
      
      - name: Regenerate knowledge index
        run: npm run update-state
      
      - name: Commit and push if changed
        run: |
          git config user.name "Opsly Bot"
          git config user.email "bot@opsly.io"
          
          if git diff --quiet config/knowledge-index.json; then
            echo "No changes to knowledge index"
          else
            git add config/knowledge-index.json
            git commit -m "chore(knowledge): update index from latest docs"
            git push origin main
          fi
```

### **HIGH (Do This Week)**

**3. Create Agent Insight Capture API**

```typescript
// apps/api/app/api/knowledge/capture/route.ts

export async function POST(req: Request) {
  const { agent, insight, context } = await req.json();
  
  // Write to Obsidian inbox
  const timestamp = new Date().toISOString();
  const filename = `docs/obsidian/inbox/${timestamp.split('T')[0]}.md`;
  
  const content = `---
agent: ${agent}
timestamp: ${timestamp}
tags: [agent-generated, ${agent.toLowerCase()}]
---

## ${context}

${insight}

---
`;
  
  await writeFile(filename, content, { flag: 'a' });
  
  return Response.json({ success: true, file: filename });
}
```

**4. Update Agent Prompts**

Add to each agent's system prompt:

```
When you complete a significant task:
  POST to http://localhost:3000/api/knowledge/capture
  Body: {
    agent: "brissa",
    context: "Feature shipped: LLM Router",
    insight: "Successfully implemented Phase 5.1. Cost optimization achieved 84% savings..."
  }

This captures your work for future reference.
```

### **MEDIUM (Do Next Sprint)**

**5. Setup Nightly Cron Job**

```bash
# On VPS, add to crontab:
0 2 * * * cd /opt/opsly && npm run knowledge-nightly || true

# Or systemd timer:
# /etc/systemd/system/opsly-knowledge-sync.timer
# [Unit]
# Description=Opsly Knowledge Base Nightly Sync
# 
# [Timer]
# OnCalendar=*-*-* 02:00:00
# Unit=opsly-knowledge-sync.service
# 
# [Install]
# WantedBy=timers.target
```

**6. Implement Knowledge Publishing Workflow**

```
Inbox (raw captures)
    ↓ (human review)
Sources (organized knowledge)
    ↓ (monthly)
Knowledge Base (published)
    ↓
Indexed for agent queries
    ↓
Agents use in context
```

## 📊 Current Knowledge Index Content

```bash
$ cat config/knowledge-index.json | jq '.files | length'
87  # ← 87 documents indexed

$ cat config/knowledge-index.json | jq '.files[] | select(.title | contains("Syra"))'
# (empty) ← Syra docs NOT in index (stale!)
```

## 🔗 Integration with Agents

### **How Brissa Uses Knowledge**

```typescript
// When implementing a feature:
const context = await contextBuilder.buildContextFromQuery("phase 5.1 llm router");

// Returns docs about Phase 5.1 + LLM Router architecture
// Brissa reads these before coding
```

### **How Lili Uses Knowledge**

```typescript
// When testing:
const context = await contextBuilder.buildContextFromQuery("test coverage targets syra");

// Returns docs about test requirements for Syra
// Lili knows exactly what to test
```

### **How Nyx Uses Knowledge**

```typescript
// When researching:
const context = await contextBuilder.buildContextFromQuery("openclaw budget optimization");

// Returns docs about OpenClaw's budget system
// Nyx has full context for research
```

## ✅ What Needs to Happen

| Task | Status | Impact |
|------|--------|--------|
| Regenerate stale index | 🔴 NOT DONE | Agents have outdated context |
| Add GitHub Actions step | 🔴 NOT DONE | Index not auto-updated |
| Create capture API | 🔴 NOT DONE | Agent insights lost |
| Populate Obsidian vault | 🔴 NOT DONE | No human-readable knowledge base |
| Setup cron job | 🔴 NOT DONE | No nightly sync |
| Update agent prompts | 🔴 NOT DONE | Agents don't know how to feed knowledge |

## 🚀 Quick Start: Make It Work Today

```bash
cd /Users/dragon/cboteros/proyectos/intcloudsysops

# 1. Regenerate index (5 min)
npm run update-state

# 2. Verify
cat config/knowledge-index.json | jq '.generated_at'

# 3. Commit
git add config/knowledge-index.json
git commit -m "chore(knowledge): regenerate index with latest docs"
git push

# 4. Test
curl http://localhost:3010/api/context \
  -H "Content-Type: application/json" \
  -d '{"query": "syra social media"}' | jq '.sources'

# Should return docs from Session 7 (Syra implementation)
```

## 📚 Files to Know

- `config/knowledge-index.json` — The index (regenerate when docs change)
- `config/knowledge-sources.example.yaml` — Example config
- `apps/context-builder/src/knowledge-*.ts` — Core logic
- `docs/.obsidian/` — Vault config
- `docs/obsidian/inbox/` — Raw agent captures
- `docs/obsidian/sources/` — Organized knowledge
- `scripts/generate-knowledge-index.mjs` — Regenerate
- `scripts/knowledge-nightly-loop.sh` — Auto-sync

## 🎯 Vision (What This Should Be)

```
Agents Execute
    ↓
Capture insights/decisions/code/metrics
    ↓
Post to /api/knowledge/capture
    ↓
Stored in Obsidian inbox
    ↓
Human organizes + links
    ↓
Published to Obsidian vault
    ↓
Nightly: Archive + index
    ↓
Future agents query + learn
    ↓
Continuous improvement loop
```

**Status:** Infrastructure exists, but flow is broken. Needs reconnection.

---

**TL;DR:** 
- Knowledge index exists but is 14 days old (missing Syra, OpenClaw docs)
- Obsidian vault is empty (no agent captures)
- Scripts exist but not wired into automation
- **FIX:** Regenerate index today, add GitHub Actions job, implement capture API

**Next session:** Priority is to rebuild the knowledge feedback loop so agents feed the system and future agents learn from past work.

---

## Enlaces relacionados

- [[02-tools/README|02-tools]]
- [[brain/README|Brain Central]]
