---
status: proposed
owner: architecture
last_review: 2026-09-11
type: architecture
tags:
  - opsly/brain
  - opsly/knowledge
  - opsly/context
  - opsly/founder
---

# Opsly Brain — Canonical Knowledge Architecture

## Purpose

Turn Obsidian/Brain into the curated knowledge layer for Opsly without creating another source of operational truth.

## One system, four responsibilities

| Layer | Canonical role |
|---|---|
| GitHub | durable engineering evidence, code, ADRs, manifests, PRs |
| Obsidian / `docs/brain` | curated human knowledge, decisions, context, learning, narrative |
| Context Builder | selects and packages relevant knowledge for agents |
| Supabase / runtime memory | operational/tenant/session memory, permissions and mutable business state |

Rules:

- Brain explains.
- GitHub proves.
- Supabase operates.
- Context Builder selects.
- LLMs never become the source of truth.

## Brain domains

```text
docs/brain/
├── founder/
│   ├── identity
│   ├── biography
│   ├── career
│   ├── learning
│   └── goals
├── startup/
│   ├── strategy
│   ├── revenue
│   ├── roadmap
│   ├── decisions
│   └── operating-system
├── customers/
│   └── <tenant-safe-context>
├── architecture/
├── modules/
├── agents/
├── workflows/
├── content/
│   ├── universe
│   ├── game
│   └── studio
├── homelab/
│   ├── inventory
│   ├── topology
│   ├── procurement
│   └── capacity
├── research/
└── generated/
```

Existing folders may remain during migration. New knowledge should use these semantic domains.

## Knowledge lifecycle

```text
raw observation / chat / agent result
        |
        v
     inbox
        |
        v
review + classify + redact
        |
        +--> decision / evergreen note
        +--> customer context
        +--> research source
        +--> founder knowledge
        |
        v
      Brain
        |
        v
knowledge index / embeddings
        |
        v
Context Builder
        |
        v
minimal context pack
        |
        v
authorized agent
```

## Context safety

Every note intended for automated retrieval should declare:

```yaml
---
visibility: public | internal | restricted
scope: platform | founder | tenant:<slug>
agent_access: allow | deny | summarized_only
sensitivity: normal | confidential | personal | secret
source_of_truth: brain | github | supabase | external
---
```

Default for missing metadata: `internal`, `agent_access: deny` for founder/personal notes.

## Founder knowledge

The founder biography and career development belong in Brain, but the system must distinguish:

- public professional biography;
- private reflection;
- career evidence;
- personal goals;
- sensitive/private life.

Only explicitly approved professional context should be eligible for external/customer-facing agents.

## Customer knowledge

For customers such as Peskids:

- Brain may hold curated operating knowledge and approved context;
- live customer state belongs in application data stores;
- PII/secrets should not be copied into the vault;
- tenant context must be isolated;
- a future customer AI gets only scoped context packs.

## BYOAI relation

Brain is one input to the future Context Gateway.

```text
Brain + tenant state + identity + policy
                |
                v
          Context Gateway
                |
          minimal disclosure
                |
                v
        customer's chosen AI
```

The provider can change without losing organizational knowledge.

## Founder Operating System relation

`docs/strategy/FOUNDER-OPERATING-SYSTEM.md` is the strategic registry.

Brain stores the deeper knowledge behind it:
- why a decision exists;
- what was learned;
- architecture explanations;
- customer lessons;
- founder skill progression;
- homelab decisions;
- content/game canon.

The Founder Operating System points to Brain; Brain should not duplicate task status that belongs in GitHub.

## Agent usage

Before material work, agents should query Brain when:
- architectural context is required;
- tenant context is relevant;
- a prior decision may exist;
- naming/terminology is ambiguous;
- the task touches founder/startup strategy.

Agents must not:
- treat research notes as approved architecture;
- promote raw inbox content automatically to canon;
- retrieve restricted founder notes without policy;
- write secrets/credentials into Brain.

## Freshness

Generated indexes must expose:
- generated_at;
- source commit SHA where practical;
- stale threshold;
- indexed paths.

If the index is stale, agents should report degraded context rather than silently assuming freshness.

## Migration priorities

1. Add safety metadata schema.
2. Create Founder/Startup/Homelab MOCs.
3. Link Founder Operating System.
4. Refresh knowledge index automatically.
5. Make Context Builder respect visibility/scope/agent_access.
6. Add tenant-scoped retrieval tests.
7. Add provenance in context packs.
8. Keep raw inbox out of autonomous context by default.

## Non-goals

- no second vector database just for Obsidian;
- no second orchestrator;
- no automatic truth promotion from LLM output;
- no secrets vault inside Markdown;
- no customer PII archive in git.
