---
status: draft
owner: operations
last_review: 2026-05-24
type: skill
tags:
  - opsly/agent-skill
---

# Multi-Agent Sync Implementation Checklist

## ✅ DONE (Crear hoy)

- [x] **`.agents/config.json`** — Master canonical config (6 agents)
- [x] **`.hermes/settings.json`** — Hermes mirror + metering config
- [x] **`.codex/settings.json`** — Codex mirror + code-gen config
- [x] **`.cursor/settings.json`** — Extended with Cursor agent config
- [x] **`.vscode/settings.json`** — Extended with Copilot agent config
- [x] **`.agents/UNIFIED-AGENT-ARCHITECTURE.md`** — Full architecture + setup guide
- [x] **`.claude/settings.json`** — Claude Code config + agent registry
- [x] **`.claude/SYNC-GUIDE.md`** — Local/VPS sync protocol
- [x] **`.claude/AGENTS-ENHANCEMENTS.md`** — 10 planned improvements

---

## ⏳ TODO THIS WEEK

### Phase 1: Git Commit + Sync (30 min)

```bash
# 1. Review changes
git status

# 2. Stage all agent configs
git add .agents/ .claude/settings.json .hermes/settings.json .codex/settings.json .cursor/settings.json .vscode/settings.json

# 3. Commit
git commit -m "chore(.agents): unified multi-agent architecture with sync configs

- Add master .agents/config.json (canonical for 6 agents)
- Add settings.json mirrors for Hermes, Codex, Cursor
- Extend .vscode/settings.json and .claude/settings.json
- Add UNIFIED-AGENT-ARCHITECTURE.md with setup instructions
- Add AGENTS-ENHANCEMENTS.md with 10 planned improvements

All agents now sync via single master config.
Local + VPS can use identical setup."

# 4. Push
git push origin feat/skills-catalog-sync-main
```

### Phase 2: VPS Deployment (1 hour)

```bash
# On VPS:
cd /opt/opsly
git pull origin main

# Create machine-specific config
cat > .hermes/settings.local.json << 'EOF'
{
  "machine": {
    "name": "vps-100.120.151.91",
    "environment": "production",
    "agents": ["hermes", "codex"]
  }
}
EOF

# Verify all agents loaded
node .agents/verify-agents.js

# Check Hermes status
systemctl status hermes
curl http://localhost:11434/api/health  # ollama
curl https://llm-gateway.op-sly.com/health
```

### Phase 3: Local Setup (30 min)

```bash
# On local Mac:
git pull origin main

# Create machine-specific config
cat > .claude/settings.local.json << 'EOF'
{
  "machine": {
    "name": "cristian-mac-2024",
    "environment": "local",
    "agents": ["claude", "cursor", "copilot"]
  }
}
EOF

# Activate git hooks
git config core.hooksPath .claude/4-hooks
chmod +x .claude/4-hooks/*.sh

# Verify loaded
cat .agents/config.json | jq '.agents[] | select(.enabled == true) | .name'
```

---

## 📋 Phase 2+: Planned Enhancements

### Week 2: Shared State + Health Checks

- [ ] **Redis backend** for agent state sharing
  - `redis://100.120.151.91:6379/0`
  - Key prefix: `opsly:agent:`
  - TTL: 3600s

- [ ] **Health Check Loop**
  - Interval: 30s
  - Services to monitor:
    - MCP Server (3003)
    - LLM Gateway (3010)
    - Orchestrator (3011)
    - API (3000)
  - Discord alerts on failure

- [ ] **Metrics Collection**
  - Supabase table: `agent_metrics`
  - Track: tokens, cost, duration, agent_name, machine_name
  - Batch size: 50, flush interval: 30s

### Week 3: Model Routing + Fallback

- [ ] **Intelligent Model Selection**
  - Complexity-aware routing
  - Cost-aware fallback (Opus → Sonnet → Haiku)
  - Local inference first (Hermes → ollama)

- [ ] **Cost Dashboard**
  - Daily/weekly/monthly tracking
  - Alerts at $100/day, $500/week thresholds
  - Per-agent breakdown

### Week 4: Distributed Cache + n8n Integration

- [ ] **Redis Cache Layer**
  - Cache file reads, git queries, web fetches
  - TTL per query type (1h for files, 30m for git, etc.)
  - Key compression enabled

- [ ] **n8n Workflow Exposure**
  - Auto-discover workflows tagged `opsly`
  - MCP tool for agent access
  - Execution timeout: 30s, retry policy: exponential

### Week 5: Session Tracking + Prompt Registry

- [ ] **Session State Persistence**
  - Supabase table: `claude_sessions`
  - Auto-restore on crash
  - Max 10 sessions per machine

- [ ] **Prompt Versioning**
  - Registry in Supabase: `prompt_templates`
  - Semantic versioning (v1.0, v1.1, etc.)
  - Template discovery from `lib/prompts/` + `skills/templates/`

---

## 🔐 Guardrails (All Agents, Every Session)

```
✅ SIEMPRE:
  ✓ Leer AGENTS.md + VISION.md al iniciar
  ✓ Usar OpenClaw como framework
  ✓ Incluir tenant_slug + request_id en operaciones
  ✓ Validar config antes de push
  ✓ Usar conventional commits
  ✓ Trackear tokens en agent_metrics

❌ NUNCA:
  ✗ Commit directo a main (salvo documentación aprobada)
  ✗ Secretos en código
  ✗ TypeScript any types
  ✗ K8s/Swarm/nginx (sin ADR)
  ✗ Saltarse validate-config.sh
  ✗ Mezclar datos de tenants
```

---

## 📊 Verification Commands

### Verify All Agents Loaded

```bash
# Should output: 6
cat .agents/config.json | jq '.agents | length'

# List all enabled agents
cat .agents/config.json | jq '.agents[] | select(.enabled == true) | "\(.id): \(.name)"'
```

### Verify Sync Between Machines

**Local:**
```bash
git log --oneline .agents/config.json | head -1
# Example: a1b2c3d chore(.agents): unified multi-agent architecture
```

**VPS:**
```bash
ssh vps-dragon@100.120.151.91 "cd /opt/opsly && git log --oneline .agents/config.json | head -1"
# Should show same commit hash
```

### Verify Permissions Per Agent

```bash
# Claude
cat .claude/settings.json | jq '.permissions.allow | length'

# Hermes
cat .hermes/settings.json | jq '.permissions.allow | length'

# Cursor
cat .cursor/settings.json | jq '.guards'

# Copilot
cat .vscode/settings.json | jq '.copilotAgent'
```

---

## 🚨 Troubleshooting

### Issue: Agents don't load after git pull

**Solution:**
```bash
# Verify config syntax
cat .agents/config.json | jq empty
# If error, config is invalid

# Rebuild local settings
rm .claude/settings.local.json
cat > .claude/settings.local.json << 'EOF'
{
  "machine": {
    "name": "cristian-mac-2024",
    "environment": "local"
  }
}
EOF
```

### Issue: Hermes can't reach ollama

**Solution:**
```bash
# Check ollama running
curl http://localhost:11434/api/health
# Should return: {"status":"Alive"}

# If not running:
ollama serve
# In another terminal:
ollama pull llama2:7b
```

### Issue: Agent metrics not appearing in Supabase

**Solution:**
```bash
# Check Hermes metering enabled
cat .hermes/settings.json | jq '.metering'

# Check Supabase connection
curl https://jkwykpldnitavhmtuzmo.supabase.co/rest/v1/agent_metrics?limit=1 \
  -H "Authorization: Bearer $SUPABASE_KEY"
```

---

## 📞 Communication

### Update AGENTS.md (Every Session End)

When you complete work, update AGENTS.md:

```markdown
## Multi-Agent Status (2026-05-XX)

- ✅ Claude: Available, reading AGENTS.md
- ✅ Cursor: Commits validated via .cursor/settings.json
- ✅ Copilot: Chat enabled (Spanish), ESLint auto-fix
- ✅ Codex: Batch ops via Claude Sonnet (cost-optimized)
- ✅ Hermes: Routing via ollama (fallback: Opus)
- ⏳ OpenCode: Optional, disabled

**This Session:**
- Implemented: .agents/config.json master config
- Status: All 6 agents configured + synced
- Next: Deploy to VPS, activate health checks
```

---

## 🎯 Success Criteria

- [ ] `.agents/config.json` committed and synced to main
- [ ] All agent mirrors created (Hermes, Codex, Cursor, Copilot)
- [ ] VPS pulls latest and agents load automatically
- [ ] Local machine has machine-specific `.settings.local.json`
- [ ] Metrics flowing to Supabase `agent_metrics` table
- [ ] AGENTS.md reflects unified agent architecture
- [ ] Git hooks validate agent configs before commit
- [ ] Team can spin up new machine with: `git clone && git config core.hooksPath .claude/4-hooks && bash .agents/verify-agents.js`

---

## 🔗 Key Files

| File | Purpose |
|------|---------|
| `.agents/config.json` | **MASTER** — all agent configs |
| `.agents/UNIFIED-AGENT-ARCHITECTURE.md` | Setup + usage guide |
| `.agents/IMPLEMENTATION-CHECKLIST.md` | **THIS FILE** — track progress |
| `.claude/SYNC-GUIDE.md` | Local ↔ VPS synchronization |
| `.claude/AGENTS-ENHANCEMENTS.md` | 10 planned improvements (roadmap) |
| `AGENTS.md` | Operational status (update per session) |

---

**Estimated Time to Completion:**
- Phase 1 (Git): 30 min
- Phase 2 (VPS): 1 hour
- Phase 3 (Local): 30 min
- **Total: ~2 hours**

**Start Date:** 2026-05-12  
**Target Completion:** 2026-05-12 (same day)

---

## Enlaces relacionados

- [[.agents/README|.agents]]
- [[README|Inicio]]
