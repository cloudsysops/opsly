---
status: draft
owner: operations
last_review: 2026-05-24
type: skill
tags:
  - opsly/agent-skill
---

# Unified Multi-Agent Architecture — All Agents, One Config

**Status:** Active on Local + VPS  
**Last Updated:** 2026-05-12  
**Canonical Source:** `.agents/config.json`

---

## 🎯 The 6 Agents

| Agent | Tool | Role | Model | Priority | Config |
|-------|------|------|-------|----------|--------|
| **Claude** | Claude Code | Architecture, debugging, autonomy | claude-opus-4-7 | PRIMARY | `.claude/settings.json` |
| **Cursor** | Cursor IDE | Real-time coding, commits | claude-opus-4-7 | HIGH | `.cursor/settings.json` |
| **Copilot** | GitHub Copilot / VS Code | Code suggestions, chat | gpt-4-turbo | HIGH | `.vscode/settings.json` |
| **Codex** | Code Generator | Batch code gen, refactoring | claude-sonnet-4-6 | MEDIUM | `.codex/settings.json` |
| **Hermes** | Metering Engine | Routing, billing, local inference | ollama-local | CRITICAL | `.hermes/settings.json` |
| **OpenCode** | Browser IDE (optional) | Remote development | claude-opus-4-7 | LOW | `.opencode/settings.json` |

---

## 🏗️ Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│          .agents/config.json (MASTER)                   │
│         Single source of truth for all agents            │
└─────┬───────────┬────────────┬────────────┬─────────────┘
      │           │            │            │
      ▼           ▼            ▼            ▼
   Claude      Cursor      Copilot      Hermes
  (.claude/)  (.cursor/)  (.vscode/)  (.hermes/)
      │           │            │            │
      └───────────┼────────────┼────────────┘
                  │            │
           ┌──────▼────────────▼──────┐
           │  OpenClaw Orchestrator   │
           │  (BullMQ + LLM Gateway)  │
           └──────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
    Supabase       Redis          n8n
   (metering)    (state)      (workflows)
```

---

## 📋 Configuration Hierarchy

```
.agents/config.json
├── Global behaviors (all agents)
├── Model routing rules
├── Guardrails (universal)
└── Per-agent config

↓ (each agent inherits + overrides)

.claude/settings.json
.hermes/settings.json
.codex/settings.json
.cursor/settings.json
.vscode/settings.json
.opencode/settings.json

↓ (machine-specific)

.claude/settings.local.json
.hermes/settings.local.json
(gitignored, machine-specific)
```

---

## 🔄 Synchronization Strategy

### What Goes to Git

```
✅ .agents/config.json          (canonical)
✅ .claude/settings.json        (agent config)
✅ .hermes/settings.json
✅ .codex/settings.json
✅ .cursor/settings.json
✅ .vscode/settings.json
✅ .github/copilot-instructions.md
✅ .claude/SYNC-GUIDE.md
✅ .agents/UNIFIED-AGENT-ARCHITECTURE.md (this file)
```

### What Does NOT Go to Git

```
❌ .claude/settings.local.json  (machine-specific)
❌ .hermes/settings.local.json
❌ .cursor/settings.local.json
❌ .vscode/keybindings.json     (personal)
```

### Sync Flow

**Option 1: Automatic (via hooks)**
```bash
# Post-merge hook validates and syncs
git merge origin/main
# → Hook: validate .agents/config.json
# → Hook: merge .agents/config.json into local mirrors
# → Hook: restart all agents
```

**Option 2: Manual (on-demand)**
```bash
# Sync all agents from master
bash .agents/sync-all.sh

# Or sync one agent
bash .agents/sync-agent.sh claude
```

---

## ⚡ Quick Setup (Both Machines)

### Step 1: Clone/Pull Latest

```bash
cd /opt/opsly  # or your local repo
git pull origin main
```

### Step 2: Verify Master Config

```bash
cat .agents/config.json | jq '.agents | length'
# Should output: 6 (Claude, Cursor, Copilot, Codex, Hermes, OpenCode)
```

### Step 3: Activate All Agents

```bash
# 1. Claude Code
git config core.hooksPath .claude/4-hooks
chmod +x .claude/4-hooks/*.sh

# 2. Cursor IDE (if on Mac/Linux)
#    → Auto-detects settings.json

# 3. VS Code / Copilot
#    → Auto-loads .vscode/settings.json

# 4. Hermes (if on VPS)
bash .hermes/start.sh

# 5. Verify all loaded
node .agents/verify-agents.js
```

### Step 4: Create Machine-Specific Config

**On Local:**
```bash
cat > .claude/settings.local.json << 'EOF'
{
  "machine": {
    "name": "cristian-mac-2024",
    "environment": "local"
  },
  "agents": ["claude", "cursor", "copilot"]
}
EOF
```

**On VPS:**
```bash
cat > .hermes/settings.local.json << 'EOF'
{
  "machine": {
    "name": "vps-100.120.151.91",
    "environment": "production"
  },
  "agents": ["hermes", "codex"]
}
EOF
```

---

## 🚀 Usage Per Agent

### Claude (Claude Code)

```bash
# Always reads .agents/config.json at session start
# Inherits permissions from .claude/settings.json
# Machine-specific overrides from .claude/settings.local.json

# To verify loaded agents:
cat .agents/config.json | jq '.agents[] | select(.enabled == true) | .name'
```

### Cursor

```bash
# Auto-loads .cursor/settings.json on startup
# Validates commits against .agents/config.json guardrails
# Terminal has access to all git/npm commands

# To force reload config:
CMD+SHIFT+P → "Cursor: Reload Window"
```

### Copilot (VS Code)

```bash
# Auto-loads .vscode/settings.json + .github/copilot-instructions.md
# Language: Spanish (github.copilot.chat.localeOverride: "es")
# Respects @cursor focus if active

# To test Copilot:
CMD+SHIFT+A (or Ctrl+Shift+A) → type query
```

### Codex

```bash
# Triggered by explicit requests (not always-on)
# Uses model: claude-sonnet-4-6 (cost-optimized)
# Validates output against library modules

# To invoke:
node scripts/codex.js --task "refactor lib/api-utils.ts"
```

### Hermes

```bash
# Runs on VPS continuously (queue-based)
# Monitors usage_events table in Supabase
# Routes decisions via LLM Gateway

# To check status:
ssh vps-dragon@100.120.151.91 "systemctl status hermes"

# To view metrics:
curl http://localhost:3010/metrics | jq '.usage_events'
```

### OpenCode

```bash
# Optional, for remote development
# Only enabled if explicitly started

# To start:
docker run -p 5004:5004 opencode/ide:latest
```

---

## 📊 Monitoring & Metrics

All agents report to **Supabase**:

```sql
SELECT 
  agent_name,
  COUNT(*) as tasks,
  SUM(tokens_used) as total_tokens,
  SUM(cost_usd) as total_cost,
  AVG(duration_ms) as avg_duration
FROM agent_metrics
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY agent_name
ORDER BY total_cost DESC;
```

---

## 🔒 Security & Isolation

### Per-Agent Permissions

```json
{
  "claude": [
    "Bash(rtk:*)",
    "Skill(*)",
    "mcp__memory__read_graph"
  ],
  "cursor": [
    "Terminal operations",
    "File watchers"
  ],
  "hermes": [
    "Bash(docker:*)",
    "Bash(ollama:*)",
    "Redis access"
  ]
}
```

### Multi-Tenant Isolation

```
✅ Every operation tagged with: tenant_slug + request_id
✅ Hermes routes via LLM Gateway (enforces isolation)
✅ Supabase RLS policies prevent cross-tenant leaks
✅ Redis keys prefixed with tenant_slug
```

---

## 🐛 Troubleshooting

**Agents not loading:**
```bash
# Verify config syntax
cat .agents/config.json | jq .

# Check machine config
cat .claude/settings.local.json | jq '.machine'

# Force reload (Claude)
# Session: Type /reload or restart Claude Code

# Force reload (Cursor)
CMD+SHIFT+P → "Cursor: Reload Window"

# Force reload (VS Code)
CMD+SHIFT+P → "Developer: Reload Window"
```

**Mismatch between machines:**
```bash
# Local
git diff .agents/config.json

# VPS
ssh vps-dragon@100.120.151.91 "cd /opt/opsly && git diff .agents/config.json"

# Should be identical (except machine-specific overrides)
```

**Hermes not routing correctly:**
```bash
# Check ollama health
curl http://localhost:11434/api/health

# Check LLM Gateway
curl https://llm-gateway.op-sly.com/health

# Check metering
curl http://localhost:3010/metrics | jq '.routing'
```

---

## 📝 Next Steps

- [ ] **Commit all configs** → `git add .agents/ .claude/settings.json .hermes/settings.json ...`
- [ ] **Push to main** → agents sync automatically across machines
- [ ] **Update AGENTS.md** → document "All agents sync via .agents/config.json"
- [ ] **Create dashboard** → visualize agent metrics + costs
- [ ] **Add alerting** → Discord notifications if agent unavailable

---

## 📚 Related Files

| File | Purpose |
|------|---------|
| `.agents/config.json` | Master config (this doc's authority) |
| `.claude/SYNC-GUIDE.md` | How to sync Claude between machines |
| `.claude/AGENTS-ENHANCEMENTS.md` | 10 planned improvements |
| `.hermes/HERMES.md` | Hermes metering documentation |
| `.github/copilot-instructions.md` | Copilot guardrails |
| `docs/03-agents/AGENT-GUARDRAILS.md` | Universal guardrails for all agents |
| `AGENTS.md` | Operational status (update every session) |

---

**Last verified:** 2026-05-12  
**Agents active:** 6/6  
**Sync status:** ✅ All in sync

---

## Enlaces relacionados

- [[.agents/README|.agents]]
- [[README|Inicio]]
