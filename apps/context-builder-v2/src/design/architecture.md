# Context Builder v2 (Super Agent) — Architecture

## Goal

`context-builder-v2` provides a **structured context pipeline** for a "Super Agent" mode, combining:

- Cursor-style repository awareness (recent edits, diffs, symbols)
- OpenClaude-style deep synthesis and larger packed context windows
- Hermes-style external research enrichment

It runs in **shadow mode** alongside current `context-builder` and can be swapped via rollout/rollback tooling.

---

## Non-goals

- Replacing `apps/context-builder` in-place during initial rollout
- Breaking existing API contracts used by `llm-gateway` and orchestrator
- Introducing public network exposure for v2 services

---

## Inputs

`context-builder-v2` accepts normalized context requests and gathers:

1. **Code context**
   - `git diff` summary (working tree or PR range)
   - touched files and symbol hints
   - optional snippets from repository paths
2. **Knowledge context**
   - ADRs (`docs/adr/*.md`)
   - docs selected by relevance (knowledge index metadata)
3. **Operational context**
   - tenant metadata, plan, budget envelope
   - recent task traces (`request_id`, `job_id`)
4. **Web context (optional enrichment)**
   - external search/synthesis payloads from Hermes-like provider
   - source URL + confidence + extraction timestamp

---

## Context Packing Algorithm

### 1) Normalize and score chunks

Each chunk gets:

- `type` (`code`, `adr`, `doc`, `web`, `ops`)
- `relevance_score` (task/intent match)
- `freshness_score` (recent edits first)
- `risk_score` (lower is safer for direct prompt injection)

### 2) Budget by token tiers

Given `max_context_tokens`, reserve budgets:

- **40%** recent code + diffs
- **25%** ADRs and architecture docs
- **20%** operational state/memory
- **15%** web enrichment (optional; can drop to zero)

### 3) Priority strategy

1. Must-have slices (tenant, objective, guardrails)
2. Highest scored code chunks from changed files
3. ADR/doc chunks directly related to touched components
4. Web evidence only if confidence threshold passes

### 4) Compression

- merge adjacent chunks from same file
- remove duplicate paragraphs/snippets
- summarize overflow chunks into short bullets
- preserve citation metadata (`source`, `path`, `url`, `line_range`)

---

## Output Contract (JSON-first)

`context-builder-v2` returns structured JSON, not plain free-form text:

```json
{
  "meta": {
    "request_id": "uuid",
    "tenant_slug": "string",
    "model_target": "string",
    "max_context_tokens": 32000,
    "packed_tokens_estimate": 28740
  },
  "objective": {
    "intent": "string",
    "task": "string",
    "constraints": ["..."]
  },
  "context": {
    "code": [{ "source": "git-diff", "path": "apps/api/...", "content": "...", "score": 0.91 }],
    "architecture": [{ "source": "adr", "path": "docs/adr/ADR-024-...", "content": "...", "score": 0.86 }],
    "operations": [{ "source": "redis-state", "content": "...", "score": 0.72 }],
    "web": [{ "source": "hermes-web", "url": "https://...", "content": "...", "confidence": 0.78 }]
  },
  "citations": [
    { "kind": "file", "ref": "docs/adr/ADR-024-..." },
    { "kind": "url", "ref": "https://..." }
  ],
  "warnings": [
    "web_enrichment_disabled",
    "token_budget_truncated"
  ]
}
```

---

## Web Ingestion (Hermes Placeholder)

v2 includes a provider abstraction:

- `WebEnrichmentProvider.fetch(query, constraints) -> WebEvidence[]`
- initial implementation can be stubbed/no-op
- Hermes integration can be plugged later without changing packer contract

Required metadata per evidence:

- `url`
- `title`
- `captured_at`
- `confidence` (0..1)
- `content_excerpt`

---

## Isolation / Shadow Deployment

To avoid collisions with current services:

- run v2 under different service names (`context-builder-v2`, `mcp-v2`, `llm-gateway-v2`, `orchestrator-v2`)
- use alternate ports (localhost-only bindings)
- keep Redis/Supabase shared unless explicitly testing isolated state
- no Traefik public routes for v2 by default

This enables side-by-side comparison and fast rollback.

---

## Migration Stages

1. **Shadow**: v2 up, traffic still on current stack
2. **Canary**: selected jobs/tenants routed to v2
3. **Swap**: stop current heavy services, promote v2
4. **Rollback-ready**: one-command restore to current mode

---

## Health Endpoints (expected)

- `context-builder-v2`: `GET /health`
- optional synthetic check: dry-run context pack with fixed fixture

---

## Security Requirements

- v2 services bound to loopback (`127.0.0.1`) unless explicitly needed
- no secrets in repository; env from Doppler/host `.env`
- keep admin-token checks in downstream APIs unchanged
- maintain full audit (`request_id`, `tenant_slug`) for all packed outputs
