# NotebookLM Integration Guide

## Overview

NotebookLM is integrated into Opsly as an **experimental knowledge layer** that augments AI decisions with contextualized information from Opsly's own documentation and operational state.

**Architecture Decision Record:** [`docs/adr/ADR-025-notebooklm-knowledge-layer.md`](./adr/ADR-025-notebooklm-knowledge-layer.md)

## Architecture

```
┌──────────────────────────────────┐
│ NotebookLM Service               │
│ (Google API, authenticated)      │
├──────────────────────────────────┤
│ Notebook ID: NOTEBOOKLM_NOTEBOOK_ID
│ API Key: NOTEBOOKLM_API_KEY      │
│                                  │
│ Sources:                         │
│ • ROADMAP.md (product timeline)  │
│ • AGENTS.md (operational state)  │
│ • VISION.md (product north star) │
│ • docs/adr/ (architecture)       │
└──────────────────────────────────┘
        │
        │ Query / Sync
        │
┌───────▼──────────────────────────┐
│ NotebookLMClient                 │
│ (apps/orchestrator/lib)          │
├──────────────────────────────────┤
│ • queryNotebook()                │
│ • uploadDocument()               │
│ • Cache with 30s timeout         │
│ • Retry on transient errors      │
└───────▼──────────────────────────┘
        │
        │ Integration points
        │
    ┌───┴─────────────────────┐
    │                         │
┌───▼────────────────────┐ ┌─▼──────────────────────┐
│ Hermes Mode Router     │ │ Admin Dashboard        │
│ (DecisionEngine)       │ │ (/admin/notebooklm)    │
│ Enriches decisions     │ │ Query testing UI       │
│ with KB context        │ │                        │
└────────────────────────┘ └────────────────────────┘
```

## Configuration

### Environment Variables (Doppler)

```bash
# Google Cloud NotebookLM API
NOTEBOOKLM_API_KEY=<your-api-key>
NOTEBOOKLM_NOTEBOOK_ID=<your-notebook-id>

# Enable/disable integration
NOTEBOOKLM_ENABLED=false  # true for Business+ plans only

# Query timeout and retry
NOTEBOOKLM_TIMEOUT_MS=30000       # 30s timeout
NOTEBOOKLM_MAX_RETRIES=2          # Retry 2 times on failure
NOTEBOOKLM_CACHE_TTL_SEC=300      # Cache for 5 minutes
```

## Testing & Validation

### Unit Tests

```bash
npm run test --workspace=@intcloudsysops/orchestrator \
  -- --grep "notebooklm|NotebookLM"
```

### E2E Test

```bash
# 1. Query the KB via admin
curl -X POST \
  -H "Authorization: Bearer \$PLATFORM_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What is Opsly?",
    "tenant_slug": "test-tenant"
  }' \
  http://localhost:3002/api/notebooklm/query
```

## References

- NotebookLM API: https://ai.google.dev/docs/notebooklm
- NotebookLMClient: `apps/orchestrator/src/lib/notebooklm-client.ts`
- Admin UI: `apps/admin/app/notebooklm/page.tsx`
