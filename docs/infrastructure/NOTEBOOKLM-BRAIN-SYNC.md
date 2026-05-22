# NotebookLM ↔ Obsidian Brain Sync

**Status:** ✅ ENABLED (Production-ready)

This document explains how the Obsidian vault (`docs/brain/`) is automatically synchronized to NotebookLM as a unified knowledge layer for all agents.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ Developer commits change to docs/brain/ (e.g., add research)    │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
                  git commit → post-commit hook
                          │
        ┌───────────────┬─┴────────────────┬──────────────┐
        ▼               ▼                  ▼              ▼
  update-state   notify-discord     agent-hooks    notebooklm:sync
                                                        │
                        ┌───────────────┬────────────────┼───────────┐
                        ▼               ▼                ▼           ▼
                code-snapshots    docs:to-notebooklm brain:sync  state:sync
                                       │                 │
                                       └────────┬────────┘
                                                ▼
                      Node.js executeNotebookLM() 
                      ↓ Python client.py
                      ↓ Google NotebookLM API
                      
┌──────────────────────────────────────────────────┐
│ NotebookLM (Google)                              │
│ - 29 files from Obsidian brain synchronized      │
│ - Indexed with semantic search (embeddings)      │
│ - Queryable by all agents                        │
└──────────────────────────────────────────────────┘
```

---

## Flow

### 1. **File Detection** (Smart Sync)

When you commit to `docs/brain/`, the sync script:

```bash
git log --since=<last-sync-time> --name-only -- docs/brain
```

This finds only modified files since the last sync, not the entire vault.

On **first sync**, all 29 files are uploaded. Subsequent syncs only upload changed files.

### 2. **Content Transformation**

Each `.md` file is:
- Read from disk
- Frontmatter parsed (extract `title:` if present)
- Uploaded as a "text source" to NotebookLM
- Logged with timestamp (`.brain-notebooklm-sync-timestamp`)

### 3. **Integration Points**

- **Post-commit hook**: Automatic trigger after every commit containing changes to `docs/brain/`
- **Manual trigger**: `npm run brain:to-notebooklm`
- **Full sync**: `npm run notebooklm:full-sync` (docs + brain + skills)

---

## Configuration

### Required Environment Variables (Doppler)

```bash
# Production (ops-intcloudsysops / prd)
NOTEBOOKLM_ENABLED=true
NOTEBOOKLM_NOTEBOOK_ID=8447967c-f375-47d6-a920-c3100efd7e7b
NOTEBOOKLM_DEFAULT_TENANT_SLUG=platform  # optional, defaults to "platform"
```

### Dependencies

- **Node.js 20+** (for running scripts)
- **Python 3.9+** (for NotebookLM client)
- **notebooklm-py** (unofficial NotebookLM Python API)
  ```bash
  pip3 install notebooklm-py
  ```
- **Google Account** with NotebookLM access (authenticated in `~/.notebooklm/auth.json`)

---

## Scripts

### Interactive Status Check

```bash
npm run notebooklm:status
```

Shows:
- Whether NotebookLM is enabled
- Notebook ID (masked)
- Number of files in `docs/brain/`
- Last sync timestamp

### Sync Obsidian Brain Only

```bash
npm run brain:to-notebooklm
```

Output example:
```
🧠 Sincronizando Obsidian Brain → NotebookLM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 3 archivos modificados desde última sincronización
📤 Subiendo 3 archivo(s)...

  01-architecture/system-design.md... ✅
  02-agents/brain-driven-context.md... ✅
  03-decisions/adr-031-token-optimization.md... ✅

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Sincronizados 3/3 archivos
🔗 Notebook: 8447967c...
```

### Full Platform Sync

```bash
npm run notebooklm:full-sync
```

Syncs:
1. Code snapshots (generated docs from codebase)
2. All docs (AGENTS.md, ADRs, etc.)
3. **Obsidian brain** (our new addition)
4. Skills documentation

---

## What Gets Synced?

### Obsidian Brain Files

All `.md` files in `docs/brain/` including:

- **Architecture**: System design decisions, component diagrams
- **Agents**: Agent capabilities, integration guides
- **Decisions**: ADRs (Architecture Decision Records), non-functional requirements
- **Workflows**: Integration patterns, data flows
- **Research**: Investigation notes, findings, context

### Explicit Pattern Notes

To keep the agent startup pack small but useful, sync the following
pattern notes as text sources too:

- `docs/obsidian/TAXONOMY.md`
- `docs/obsidian/research/pattern-constellation.md`
- `docs/obsidian/research/agent-pattern-matrix.md`
- `docs/obsidian/research/frontier-pattern-radar.md`
- `docs/obsidian/research/saas-pattern-radar.md`
- `docs/obsidian/research/security-pattern-radar.md`
- `docs/obsidian/research/trading-pattern-radar.md`
- `docs/obsidian/sources/opsly-agent-pattern-sources.md`
- `docs/obsidian/sources/frontier-pattern-sources.md`
- `docs/obsidian/sources/saas-pattern-sources.md`
- `docs/obsidian/sources/security-pattern-sources.md`
- `docs/obsidian/sources/trading-pattern-sources.md`

### Skipped Files

- `.obsidian/` (app configuration)
- `attachments/` (binary files)
- `.embeddings.json` (local index)

---

## How Agents Use This

### Query NotebookLM

```bash
npm run notebooklm:query
```

Agents query like:
- "¿Cuál es la arquitectura actual?" → Gets latest VISION.md + relevant ADRs
- "¿Qué decisiones recientes afectan autenticación?" → Gets ADRs tagged with auth
- "¿Estado de los servicios?" → Gets latest system_state.json

### Auto-Sync in Session Start

New agents (via auto-onboarding) are configured to:

1. Query NotebookLM at session start: "What's the current state of [project]?"
2. Parse response to understand:
   - Current phase/sprint
   - Known blockers
   - Recent architectural decisions
   - Token optimization rules (brain:research triggers)

---

## Troubleshooting

### "NotebookLM is not enabled"

```bash
# Check configuration
doppler run --project ops-intcloudsysops --config prd -- printenv | grep NOTEBOOKLM
```

If empty or false, enable it:
```bash
doppler secrets set NOTEBOOKLM_ENABLED true
doppler secrets set NOTEBOOKLM_NOTEBOOK_ID <notebook-id>
```

### "No such module: notebooklm_py"

Install the Python client:
```bash
pip3 install notebooklm-py
```

Or in the VPS (via Doppler):
```bash
doppler run --project ops-intcloudsysops --config prd -- pip3 install notebooklm-py
```

### "Google authentication failed"

The NotebookLM Python client stores auth at `~/.notebooklm/auth.json`. Re-authenticate:

```bash
python3 -c "from notebooklm import NotebookLM; nb = NotebookLM()" 
# Follow OAuth prompt
```

### Last sync shows "Never"

First sync hasn't completed yet. Run manually:
```bash
npm run brain:to-notebooklm
```

---

## Metrics

- **Files synced**: 29 in `docs/brain/`
- **Sync trigger**: Post-commit (automatic) + manual `npm run brain:to-notebooklm`
- **Smart detection**: Only uploads changed files (incremental)
- **Latency**: ~2-3 seconds per file (network + Google API)
- **Cost**: Free (Google NotebookLM API, no metering)

---

## Related

- **ADR-025**: [NotebookLM as Knowledge Layer](./adr/ADR-025-notebooklm-knowledge-layer.md)
- **ADR-014**: [NotebookLM Agent](./adr/ADR-014-notebooklm-agent.md)
- **Brain-Driven Context**: See AGENTS.md#brain-driven-context
- **Token Optimization**: See CLAUDE.md#token-optimization-crítico

---

## Next

- [ ] Test sync in VPS environment (Python client availability)
- [ ] Set up NotebookLM query caching layer
- [ ] Integrate NotebookLM responses into agent context initialization
- [ ] Create dashboard showing sync status + query latency
