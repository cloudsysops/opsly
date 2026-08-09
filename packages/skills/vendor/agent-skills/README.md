# agent-skills — Engineering Workflow Skills

**Source:** [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills)  
**Installed:** 2026-08-05
**Version:** main  
**Skills:** 24

---

## What is this?

Production-grade engineering workflow skills for AI coding agents. Each skill encodes a specific process that senior engineers follow — from vague idea through deployed feature. These complement Opsly's domain-specific skills (`skills/user/opsly-*`) with universal software engineering discipline.

## Skill Discovery

```bash
# Auto-discovery (recommended)
node scripts/skill-finder.js "your task" --autonomous

# Direct read
cat skills/vendor/agent-skills/<skill-name>/SKILL.md
```

Or use the `/skill` command: `.claude/3-slash-commands/skill.md`

## Skill Map

```
Task arrives
    │
    ├── Don't know what you want? ─────→ interview-me
    ├── Rough idea, need variants? ─────→ idea-refine
    ├── New feature/change? ────────────→ spec-driven-development
    ├── Have spec, need tasks? ─────────→ planning-and-task-breakdown
    ├── Implementing? ──────────────────→ incremental-implementation
    │   ├── UI work? ───────────────────→ frontend-ui-engineering
    │   ├── API work? ──────────────────→ api-and-interface-design
    │   ├── Need better context? ───────→ context-engineering
    │   ├── Verifying external docs? ───→ source-driven-development
    │   └── High-stakes/unfamiliar? ────→ doubt-driven-development
    ├── Writing tests? ─────────────────→ test-driven-development
    │   └── Browser-based? ─────────────→ browser-testing-with-devtools
    ├── Something broke? ───────────────→ debugging-and-error-recovery
    ├── Reviewing code? ────────────────→ code-review-and-quality
    │   ├── Security concerns? ─────────→ security-and-hardening
    │   └── Performance concerns? ──────→ performance-optimization
    ├── Code too complex? ──────────────→ code-simplification
    ├── Deprecating/migrating? ─────────→ deprecation-and-migration
    ├── Committing/branching? ──────────→ git-workflow-and-versioning
    ├── CI/CD pipeline? ────────────────→ ci-cd-and-automation
    ├── Writing docs/ADRs? ─────────────→ documentation-and-adrs
    └── Deploying/launching? ───────────→ shipping-and-launch
```

## Complete Lifecycle (feature end-to-end)

```
1.  interview-me                → What does the user actually want?
2.  idea-refine                 → Refine vague ideas
3.  spec-driven-development     → Define what we're building
4.  planning-and-task-breakdown → Break into verifiable chunks
5.  context-engineering         → Load the right context
6.  source-driven-development   → Verify against official docs
7.  incremental-implementation  → Build slice by slice
8.  doubt-driven-development    → Cross-examine non-trivial decisions
9.  test-driven-development     → Prove each slice works
10. code-review-and-quality     → Review before merge
11. git-workflow-and-versioning → Clean commit history
12. documentation-and-adrs      → Document decisions
13. shipping-and-launch         → Deploy safely
```

## Agent Assignments

| Agent | Primary Skills |
|-------|----------------|
| `coder` | `incremental-implementation`, `spec-driven-development`, `api-and-interface-design`, `frontend-ui-engineering` |
| `planner` | `interview-me`, `idea-refine`, `spec-driven-development`, `planning-and-task-breakdown` |
| `reviewer` | `code-review-and-quality`, `security-and-hardening`, `performance-optimization` |
| `tester` | `test-driven-development`, `browser-testing-with-devtools` |
| `researcher` | `source-driven-development`, `context-engineering`, `documentation-and-adrs` |
| `opsly-orchestrator` | `planning-and-task-breakdown`, `incremental-implementation`, `debugging-and-error-recovery` |

## Directory Structure

```
skills/vendor/agent-skills/
├── README.md                    ← this file
├── api-and-interface-design/
│   ├── SKILL.md
│   └── manifest.json
├── browser-testing-with-devtools/
│   ├── SKILL.md
│   └── manifest.json
├── ci-cd-and-automation/
├── code-review-and-quality/
├── code-simplification/
├── context-engineering/
├── debugging-and-error-recovery/
├── deprecation-and-migration/
├── documentation-and-adrs/
├── doubt-driven-development/
├── frontend-ui-engineering/
├── git-workflow-and-versioning/
├── idea-refine/
├── incremental-implementation/
├── interview-me/
├── performance-optimization/
├── planning-and-task-breakdown/
├── security-and-hardening/
├── shipping-and-launch/
├── source-driven-development/
├── spec-driven-development/
├── test-driven-development/
└── using-agent-skills/
```

## Registration

All 24 skills are registered in `skills/index.json` with:
- Full description and usage
- Trigger keywords for `skill-finder.js` fuzzy matching
- `source: "addyosmani/agent-skills"` for provenance tracking
- `path: "skills/vendor/agent-skills/<name>/"` for direct loading

## Updating

To update to latest from the source repo:
```bash
VENDOR_DIR="skills/vendor/agent-skills"
BASE_URL="https://raw.githubusercontent.com/addyosmani/agent-skills/main/skills"
for skill in $(ls "$VENDOR_DIR"); do
  [ -d "$VENDOR_DIR/$skill" ] && curl -s -o "$VENDOR_DIR/$skill/SKILL.md" "$BASE_URL/$skill/SKILL.md"
done
```

---

*Source: [github.com/addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) · MIT License*
