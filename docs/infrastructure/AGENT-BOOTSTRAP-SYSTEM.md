---
status: draft
owner: operations
last_review: 2026-05-24
type: doc
tags:
  - opsly/doc
---

# Agent Bootstrap System

**Purpose:** Automatically initialize new agents entering the Opsly repository with complete configuration, skills, MCP tools, and context.

**Activation:** Automatic on git clone/branch change via `.git/hooks/post-checkout` or manual via `bash scripts/agent-discover-and-bootstrap.sh`.

**Status:** ✅ Production-ready. All 8 phases tested with hermes agent (tool role).

---

## Architecture

```
Agent Enters Repository
         ↓
.git/hooks/post-checkout (automatic)
         ↓
agent-discover-and-bootstrap.sh (discovery)
         ↓
agent-bootstrap-master.sh (orchestration)
         ↓
┌────────────────────────────────────────┐
│ PHASE 1: Detection                     │
│ • Identify agent type by name pattern  │
│ • Map to role (planner/executor/tool)  │
│ • Set default budget & rate limits     │
└────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────┐
│ PHASE 2: Registry Sync                 │
│ • Register in config/agents-team.json  │
│ • Write agent entry with config        │
│ • Track total agents & budgets         │
└────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────┐
│ PHASE 3: Skills Mapping                │
│ • Load skill manifests (packages/)     │
│ • Map to agent type (CRITICAL→LOW)     │
│ • Generate injection order             │
└────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────┐
│ PHASE 4: Skills Preload                │
│ • Read SKILL.md files into cache       │
│ • Track sizes & dependencies           │
│ • Save manifest to state dir           │
└────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────┐
│ PHASE 5: MCP Tools                     │
│ • Check MCP server health              │
│ • Configure brain:research triggers    │
│ • List available tools & ports         │
└────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────┐
│ PHASE 6: Welcome Briefing              │
│ • Show VISION.md snippet               │
│ • Display current AGENTS.md status     │
│ • List skills, tools, constraints      │
│ • Show next steps                      │
└────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────┐
│ PHASE 7: Validation                    │
│ • 8-point checklist (optional)         │
│ • Registry, prompts, MCP, brain        │
│ • Report pass/fail with fixes          │
└────────────────────────────────────────┘
         ↓
✅ Agent Ready
```

---

## Scripts & Components

### 1. `scripts/agent-bootstrap-master.sh` (121 lines)
**Orchestrator** — chains all 7 phases in dependency order.

```bash
bash scripts/agent-bootstrap-master.sh --agent-name=hermes [--dry-run] [--skip-validation]
```

- `--dry-run`: Preview phases without modifications
- `--skip-validation`: Skip optional validation checklist (useful for bootstrap from hooks)
- Supports agents with spaces in display name (uses `id` field from config)

**Output:**
- Phases 1-7 executed sequentially
- Summary with status & next steps
- Exits 0 on success, 1 on validation failure (unless `--skip-validation`)

### 2. `scripts/agent-detect.js` (158 lines)
**Phase 1** — Detects agent type from name pattern.

```bash
node scripts/agent-detect.js --agent-name="hermes"
```

**Detection Rules:**
- `planner`, `architect`, `supervisor` → role=planner
- `executor`, `worker`, `backend`, `frontend` → role=executor
- `tool`, `infra`, `devops` → role=tool
- `specialist`, `qa`, `security` → role=specialist
- No match → defaults to executor (low confidence)

**Returns:** JSON with model, budget, rate limit, skills list.

### 3. `scripts/agent-registry-sync.js` (111 lines)
**Phase 2** — Registers agent in `config/agents-team.json`.

```bash
node scripts/agent-registry-sync.js --agent-name="hermes" [--dry-run]
```

**Creates:**
```json
{
  "id": "hermes",
  "name": "hermes",
  "role": "tool",
  "model": "llama3.2:latest",
  "fallback_model": "openrouter/claude-3.5-haiku",
  "daily_budget_usd": 0.5,
  "rate_limit": {
    "requests_per_minute": 3,
    "tokens_per_minute": 6000
  },
  "allowed_tools": ["bash", "docker_ps", "health_check", "logs_tail"],
  "allowed_paths": ["infra/", "scripts/", "docs/"]
}
```

### 4. `scripts/skills-mapper.js` (129 lines)
**Phase 3** — Maps skills by agent type with priority ordering.

```bash
node scripts/skills-mapper.js --agent-name="hermes"
```

**Loads:** Metadata from `packages/skills/user/*/manifest.json`

**Output:** Injection order by priority (CRITICAL → HIGH → MEDIUM → LOW)
- opsly-context (CRITICAL for all)
- Role-specific skills (opsly-infra for tool agents, opsly-api for executor, etc.)

### 5. `scripts/skills-preload.js` (97 lines)
**Phase 4** — Pre-loads skill content into memory.

```bash
node scripts/skills-preload.js --agent-name="hermes" [--save]
```

**Reads:** SKILL.md files from packages/skills/user/*/

**Saves to:** `.agent-bootstrap-state/.skills-{agent}.manifest.json` (with --save)

**Tracks:** loaded_skills count, failed_skills, file sizes, injection order.

### 6. `scripts/mcp-bootstrap.js` (107 lines)
**Phase 5** — Configures MCP tools and checks server health.

```bash
node scripts/mcp-bootstrap.js [--no-health-check]
```

**Checks:** Health endpoints on ports 3003, 3010, 3011, 3012

**Configures:** 
- brain:research MCP tool
- Triggers: "investigar X", "research X", "explain X"
- Full tool list: brain:search, semantic-search, research, graph, get

### 7. `scripts/agent-welcome-briefing.mjs` (164 lines)
**Phase 6** — Displays welcome context and next steps.

```bash
node scripts/agent-welcome-briefing.mjs --agent-name="hermes"
```

**Shows:**
- Agent name and role
- Git branch, last commit, commits ahead
- VISION.md snippet (product north star)
- AGENTS.md status snippet
- MCP tools available
- Skills injected
- Key constraints (no K8s, no secrets, no `any` in TS)
- Next steps (read AGENTS.md, use brain:research, create PR)

### 8. `scripts/agent-validation.sh` (105 lines)
**Phase 7** — 8-point validation checklist (optional).

```bash
bash scripts/agent-validation.sh --agent-name="hermes"
```

**Checks:**
1. ✓ Registered in agents-team.json
2. ✓ System prompt created
3. ✓ MCP tools accessible
4. ✓ brain:research configured
5. ✓ Skills mapped
6. ✓ AGENTS.md readable
7. ✓ Obsidian brain available
8. ⚠️ Doppler secrets (warning if not configured)

**Exit Code:** 0 if all pass, 1 if any fail (except Doppler warning).

---

## Discovery & Auto-Bootstrap

### Manual Discovery
```bash
# Discover all uninitialized agents and bootstrap them
bash scripts/agent-discover-and-bootstrap.sh

# With verbose output
bash scripts/agent-discover-and-bootstrap.sh --verbose

# Force re-bootstrap (even if already initialized)
bash scripts/agent-discover-and-bootstrap.sh --force
```

### Automatic (Git Hook)
File: `.git/hooks/post-checkout`

- Runs after `git clone` or branch checkout
- Detects uninitialized agents from agents-team.json
- Marks completed with state files in `.agent-bootstrap-state/`
- Runs with `--skip-validation` to avoid blocking checkout
- Non-blocking: prints status but doesn't fail checkout

**State Tracking:**
```
.agent-bootstrap-state/
├── .bootstrapped-hermes
├── .bootstrapped-backend-worker
└── .skills-hermes.manifest.json
```

---

## Configuration

### agents-team.json
```json
{
  "team": { "name": "Opsly Agent Team" },
  "shared_context": {
    "strategy": "brain-driven-optimization",
    "onboarding_required": true,
    "auto_config_new_agents": true,
    "skills_to_inject": ["opsly-context", "opsly-brain-researcher"],
    "mcp_tools": ["brain:search", "brain:semantic-search", "brain:research"]
  },
  "agents": [
    {
      "id": "hermes",
      "name": "hermes",
      "role": "tool",
      "model": "llama3.2:latest",
      "fallback_model": "openrouter/claude-3.5-haiku",
      "daily_budget_usd": 0.5,
      "rate_limit": {
        "requests_per_minute": 3,
        "tokens_per_minute": 6000
      },
      "allowed_tools": ["bash", "docker_ps", "health_check", "logs_tail"],
      "allowed_paths": ["infra/", "scripts/", "docs/"]
    }
  ]
}
```

### Skills Manifest (packages/skills/user/{skill}/manifest.json)
```json
{
  "name": "opsly-context",
  "priority": "CRITICAL",
  "description": "Current state and status",
  "triggers": ["context", "status", "state"],
  "compatible_with": ["planner", "executor", "tool", "specialist"]
}
```

---

## Usage Patterns

### New Agent Onboarding
```bash
# Agent enters repo (automatic via git hook)
git clone https://github.com/cloudsysops/opsly.git

# Or manually trigger discovery
bash scripts/agent-discover-and-bootstrap.sh

# Agent gets:
# ✓ Role detected (planner/executor/tool/specialist)
# ✓ Registered in agents-team.json with budget/rate limits
# ✓ Skills pre-loaded by priority
# ✓ MCP tools configured
# ✓ Welcome briefing with context
# ✓ Ready to work
```

### Debugging Bootstrap
```bash
# Dry-run preview (no changes)
bash scripts/agent-bootstrap-master.sh --agent-name=hermes --dry-run

# Skip validation (faster, for CI/CD)
bash scripts/agent-bootstrap-master.sh --agent-name=hermes --skip-validation

# Check individual phases
node scripts/agent-detect.js --agent-name=hermes
node scripts/skills-mapper.js --agent-name=hermes --output=json
bash scripts/agent-validation.sh --agent-name=hermes
```

### Manual Skill Injection
```bash
# Pre-load and cache skills to .agent-bootstrap-state
node scripts/skills-preload.js --agent-name=hermes --save

# View cached manifest
cat .agent-bootstrap-state/.skills-hermes.manifest.json
```

---

## Integration Points

### AGENTS.md
- Reference at session start for operational status
- Updated by CLI agents (Claude, Cursor, Copilot) with progress
- Shared context across all agent sessions

### VISION.md
- Product north star displayed in Phase 6 (Welcome Briefing)
- Immutable governance doc (only updated by product decisions)
- Shows agent the strategic alignment

### brain:research
- MCP tool activated in Phase 5 (MCP Bootstrap)
- Token-optimized contextual lookup (60-70% token savings)
- Primary method for agents to access knowledge base
- Triggered by keywords: "investigar", "research", "explain"

### Package Skills
- Loaded from `packages/skills/user/*/manifest.json`
- Priority-ordered: CRITICAL → HIGH → MEDIUM → LOW
- Pre-cached for fast agent initialization
- See `docs/01-development/SKILLS-SYSTEM.md` for skill authoring

---

## Performance & Optimization

### Token Savings
- **Full context dump:** ~5000 tokens
- **brain:research query:** ~300 tokens (60-70% savings)
- Skills pre-loading avoids repeated reads: ~200 tokens saved per agent

### Execution Time
- Phase 1 (Detect): ~200ms
- Phase 2 (Registry): ~300ms
- Phase 3 (Skills Map): ~150ms
- Phase 4 (Preload): ~400ms (varies by skill count)
- Phase 5 (MCP): ~500ms (health checks)
- Phase 6 (Briefing): ~300ms
- Phase 7 (Validation): ~800ms

**Total (no validation):** ~1.5 seconds
**Total (with validation):** ~2.3 seconds

### Cache Strategy
- `.agent-bootstrap-state/.bootstrapped-{id}` marks completion
- Prevents re-bootstrap on subsequent checkouts
- `--force` flag resets state for re-initialization

---

## Troubleshooting

### Agent Not Bootstrapping on Clone
**Cause:** Post-checkout hook not executed (older git, or hook not installed)

**Fix:**
```bash
chmod +x .git/hooks/post-checkout
bash scripts/agent-discover-and-bootstrap.sh
```

### "No agent name provided" Error
**Cause:** Agent ID or name not found in agents-team.json

**Fix:**
```bash
# Check agents in config
jq '.agents[] | {id, name}' config/agents-team.json

# Add new agent and re-bootstrap
bash scripts/agent-discover-and-bootstrap.sh
```

### Skills Not Loading
**Cause:** Skill SKILL.md file missing or malformed manifest

**Fix:**
```bash
# Check skill structure
ls packages/skills/user/opsly-context/SKILL.md
cat packages/skills/user/opsly-context/manifest.json

# Re-preload
node scripts/skills-preload.js --agent-name=hermes --save
```

### MCP Tools Unreachable
**Cause:** MCP servers not running (port 3003, 3010, 3011, 3012)

**Fix:**
```bash
# Start local stack
npm run dev

# Or skip health check
node scripts/mcp-bootstrap.js --no-health-check
```

---

## Governance & Updates

**File:** `docs/infrastructure/AGENT-BOOTSTRAP-SYSTEM.md`
**Owner:** Architecture team
**Last Updated:** 2026-05-12
**Status:** Production-ready

**Modification Policy:**
- Changes to Phase logic → must update this doc + commit
- Changes to script signatures → update README in each script
- New phases → increment .git/hooks/post-checkout version
- Breaking changes → create MIGRATION.md guide

**Related Docs:**
- `AGENTS.md` — Operational status (use at session start)
- `VISION.md` — Product north star (immutable)
- `docs/01-development/SKILLS-SYSTEM.md` — Skill authoring
- `docs/01-development/MCP-TOOLS.md` — MCP tool configuration

---

## Enlaces relacionados

- [[infrastructure/README|infrastructure]]
- [[brain/README|Brain Central]]
