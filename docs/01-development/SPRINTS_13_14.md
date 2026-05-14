# Sprints 13-14 Implementation: ML Feedback Loop + Portal & Notion Integration

## Overview

This document outlines the implementation of Sprints 13-14, which introduce an ML feedback loop for autonomous improvement and a self-service tenant portal with Notion integration.

## Sprint 13: ML Feedback Loop Integration

### Components Implemented

#### 1. ML Scoring Module (`apps/orchestrator/src/lib/ml-scoring.ts`)

Calculates feedback scores for job completions with:
- **Status-based scoring** (success=85, partial=50, failed=0)
- **Performance adjustments**:
  - Fast execution (< 1s): +5 bonus
  - Slow execution (> 30s): -10 penalty
- **Cost efficiency tracking**:
  - Cheap (< 5 cents): +5 bonus
  - Expensive (> 50 cents): -10 penalty
- **Quality metrics** from output quality score
- **Error penalties** (-15 points for failures)
- **Confidence scoring** (0.5-0.95 range)
- **Per-tenant isolation** via Redis keys: `tenant:{slug}:ml:feedback:{job_id}`

**Key Functions:**
- `scoreFeedback(event)` - Calculate score for a job completion
- `getRecentScores(tenantSlug, limit)` - Retrieve historical scores
- `getMetricsSummary(tenantSlug)` - Get aggregated metrics

#### 2. Enhanced Feedback Decision Engine (`apps/ml/src/feedback-decision-engine.ts`)

Updated with:
- Tenant-aware scoring storage
- Redis integration for fast access
- Supabase long-term storage in tenant-specific schemas
- New interfaces: `FeedbackScore`, `JobCompletionEvent`
- Score storage helper: `storeFeedbackScore()`

#### 3. Insights Engine (`apps/ml/src/insight-engine.ts`)

Already implemented, generates:
- Churn risk predictions
- Revenue forecasts
- Anomaly detection
- Per-tenant insights with confidence scoring

#### 4. Task Classification (`apps/ml/src/task-category-classifier.ts`)

Already implemented, classifies tasks with:
- Category detection (bug, feature, improvement, security, billing)
- Confidence scoring
- Per-tenant routing validation

### Database Migrations

#### Migration 0042: ML Feedback Scores (`supabase/migrations/0042_ml_feedback_scores.sql`)

Creates:
1. **feedback_scores** - Per-job feedback with category and confidence
2. **feedback_embeddings** - Vector embeddings for semantic search (1536-dim)
3. **tenant_ml_metrics** - Hourly aggregated metrics per tenant
4. **tenant_api_keys** - API keys for portal access with scopes

All tables have:
- Tenant ID foreign keys with CASCADE delete
- Proper indexing on (tenant_id, time) pairs
- RLS enabled (service_role only)
- JSON metadata columns

### API Endpoints

#### `/api/tenants/:slug/insights` (GET/POST)

**GET** - Retrieve insights for a tenant
```
Query params: period=daily|weekly|monthly, limit=10
Response: { insights: [], metrics: { avg_feedback_score, ... }, generated_at }
```

**POST** - Create new insight
```
Body: { insight_type, title, description, payload, confidence, impact_score }
Response: { id }
```

#### `/api/tenants/:slug/portal/metrics` (GET)

Real-time dashboard metrics:
```json
{
  "slug": "tenant-slug",
  "agent_status": "healthy|degraded|down",
  "health_summary": {
    "healthy_jobs": 45,
    "failed_jobs": 2,
    "success_rate": 96
  },
  "cost_tracking": {
    "this_hour": 5,
    "today": 145,
    "month": 2450,
    "plan_limit": 10000,
    "percent_used": 24
  },
  "recent_jobs": [...],
  "logs": [...],
  "insights": [...]
}
```

### Tests

Comprehensive test suite in `apps/ml/__tests__/ml-scoring.test.ts`:
- Score calculation for various scenarios
- Tenant isolation verification
- Metrics aggregation per tenant
- Success rate tracking
- Factor attribution

## Sprint 14: Portal & Notion Integration

### Components Implemented

#### 1. Tenant Portal Library (`apps/portal/lib/tenant-portal.ts`)

Self-service portal with:
- **Metrics retrieval**: Agent status, costs, recent jobs, logs, insights
- **API key management**: Create, list, revoke keys with scopes
- **Real-time cost tracking** from billing_usage table
- **Job history** with status and cost breakdowns
- **Log streaming** (last 50 entries)
- **Insights display** (active insights only)

**Key Classes:**
- `TenantPortal` - Main class managing all portal operations
- Methods: `getMetrics()`, `createAPIKey()`, `listAPIKeys()`, `revokeAPIKey()`

#### 2. API Endpoints

##### `/api/tenants/:slug/api-keys` (GET/POST)

**GET** - List all active API keys
```json
{
  "keys": [
    {
      "id": "key-123",
      "name": "Production API",
      "scopes": ["read:status", "read:logs"],
      "created_at": "2026-05-01T...",
      "last_used_at": "2026-05-01T..."
    }
  ]
}
```

**POST** - Create new API key
```json
Request:
{
  "name": "Integration Name",
  "scopes": ["read:status", "read:logs", "read:jobs"]
}

Response:
{
  "id": "key-456",
  "key": "sk_live_...",
  "name": "Integration Name",
  "scopes": [...],
  "created_at": "..."
}
```

##### `/api/tenants/:slug/api-keys/:key_id` (DELETE)

Revoke an API key (marks with revoked_at timestamp)

#### 3. Portal Pages

##### Dashboard (`apps/portal/app/tenants/[slug]/page.tsx`)

Self-service tenant dashboard with:
- **Status cards**: Agent health, monthly costs, API status
- **Success rate visualization** with progress bar
- **Cost tracking** with plan limit indicator
- **Recent jobs table** (last 10) with status and cost
- **Insights panel** showing active predictions
- **Auto-refresh** every 30 seconds
- **Real-time health summary**

##### API Keys Management (`apps/portal/app/tenants/[slug]/api-keys/page.tsx`)

- List active API keys with creation date and usage
- Create new keys with selected scopes
- Display new key once (with warning to save)
- Revoke keys with confirmation dialog
- Scope selection UI with predefined options

### Notion Integration

#### 1. Webhook Handler (`apps/api/app/api/webhooks/notion/route.ts`)

**POST /api/webhooks/notion**

Handles Notion events:
- Page created/updated
- Database created
- HMAC-SHA256 signature validation
- Tenant slug extraction from payload
- Queues sync to Obsidian vault
- Status tracking in sync_history table

#### 2. Notion Sync Service (`apps/notion-mcp/src/tenant-sync.ts`)

Bidirectional synchronization:
- **Notion → Obsidian**: Convert Notion pages to Markdown
- **Obsidian → Notion**: Convert Markdown to Notion blocks
- **Conflict resolution**: Latest timestamp wins
- **Metadata tracking**: Source IDs and sync direction
- **Per-tenant isolation**: Separate sync records per tenant

**Key Methods:**
- `syncNotion2Obsidian()` - Pull from Notion
- `syncObsidian2Notion()` - Push to Obsidian
- `bidirectionalSync()` - Full sync cycle
- `updateSyncMetadata()` - Track sync history

### Database Migrations

#### Migration 0043: Notion Sync Tables (`supabase/migrations/0043_notion_sync_tables.sql`)

Creates:
1. **notion_sync_history** - Per-sync event logs with status tracking
2. **notion_sync_metadata** - Relationship mapping between Notion and Obsidian
3. **portal_metrics_snapshots** - Time-series dashboard metrics
4. **agent_logs** - Tenant-scoped application logs

All with:
- Tenant isolation via tenant_id
- Proper indexes on (tenant_id, created_at)
- RLS enabled

## Architecture Decisions

### Tenant Isolation

1. **Redis Keys Pattern**: `tenant:{slug}:ml:feedback:{job_id}`
   - Prevents cross-tenant data leakage
   - Fast lookup by tenant scope
   - Automatic 7-day TTL

2. **Supabase Schemas**: Per-tenant ML tables
   - `tenant_{slug}_ml.feedback_scores`
   - `tenant_{slug}_ml.embeddings`
   - Provides long-term storage while Redis caches hot data

3. **API Key Scopes**: Granular permission model
   - `read:status` - Dashboard access
   - `read:logs` - Log streaming
   - `read:jobs` - Job history
   - `read:insights` - ML insights
   - `query:notebooklm` - Knowledge base access

### Feedback Score Calculation

Factors considered:
- **Status**: Most important (0-85 base points)
- **Performance**: Execution time (±5-10)
- **Cost**: Resource usage (±5-10)
- **Quality**: Output quality if provided (average with status)
- **Errors**: Explicit error messages (-15)

Final score: Clamped to 0-100 range with confidence 0.5-0.95

### Portal Refresh Strategy

- Dashboard auto-refreshes every 30 seconds
- Manual refresh button for immediate update
- WebSocket integration ready for real-time updates (future)
- Metrics cached in portal_metrics_snapshots for history

## Integration Points

### With Orchestrator

Post-job completion:
1. Emit `JobCompletionEvent` with metrics
2. Score via `scoreFeedback()`
3. Store in Redis + Supabase
4. If score < 60: Flag for manual review (Obsidian note)
5. If score > 80: Learn pattern for similar jobs (embedding cache)

### With NotebookLM

- Insights auto-embedded as new sources
- Historical scores inform prompt context
- Anomaly detections trigger re-indexing

### With LLM Gateway

- Feedback scores influence model selection
- Low-score jobs rerouted to more capable models
- Cost-aware model routing based on metrics

## Performance Considerations

### Redis vs Supabase

| Data | Storage | Reason |
|------|---------|--------|
| Hot feedback scores (7 days) | Redis | Fast reads for portal |
| Historical scores (30+ days) | Supabase | Long-term analytics |
| Embeddings cache | Redis | Semantic search speed |
| API keys | Supabase | Persistent, revocable |
| Logs | Supabase | Audit trail |

### Index Strategy

```sql
-- Fast tenant-scoped queries
CREATE INDEX idx_feedback_scores_tenant_created 
  ON platform.feedback_scores (tenant_id, created_at DESC);

-- Category aggregation
CREATE INDEX idx_feedback_scores_category 
  ON platform.feedback_scores (tenant_id, category, score DESC);

-- Hash lookups for embeddings
CREATE INDEX idx_feedback_embeddings_hash 
  ON platform.feedback_embeddings (tenant_id, query_hash);
```

## Migration Path

1. **Deploy migrations 0042-0043** (DDL changes)
2. **Deploy ML modules** (feedback-decision-engine, ml-scoring)
3. **Deploy API routes** (insights, api-keys, portal, webhooks)
4. **Deploy portal pages** (dashboard, api-keys management)
5. **Enable feedback scoring** in orchestrator post-job hooks
6. **Configure Notion webhook** in Notion workspace
7. **Test end-to-end**: Job → Score → Insight → Portal display

## Testing

Run test suite:
```bash
npm run test apps/ml/__tests__/ml-scoring.test.ts
```

Test coverage:
- Score calculation for 5 job scenarios
- Tenant isolation (keys don't cross tenants)
- Metrics aggregation (avg, sum, counts)
- Classification accuracy
- Per-tenant metrics independence

## Future Enhancements

- **WebSocket dashboard** for real-time updates
- **Custom scoring weights** per tenant
- **Feedback loop improvements** using historical data
- **Automated model retraining** based on poor scores
- **Cost optimization recommendations** from insights
- **Slack/Discord notifications** for critical insights
- **Notion database sync** (read/write two-way)
- **API rate limiting** by key scope

## Files Modified/Created

### New Files
- `apps/orchestrator/src/lib/ml-scoring.ts`
- `apps/api/app/api/tenants/[slug]/insights/route.ts`
- `apps/api/app/api/tenants/[slug]/api-keys/route.ts`
- `apps/api/app/api/tenants/[slug]/api-keys/[key_id]/route.ts`
- `apps/api/app/api/tenants/[slug]/portal/route.ts`
- `apps/api/app/api/webhooks/notion/route.ts`
- `apps/portal/lib/tenant-portal.ts`
- `apps/portal/app/tenants/[slug]/page.tsx`
- `apps/portal/app/tenants/[slug]/api-keys/page.tsx`
- `apps/notion-mcp/src/tenant-sync.ts`
- `apps/ml/__tests__/ml-scoring.test.ts`
- `supabase/migrations/0042_ml_feedback_scores.sql`
- `supabase/migrations/0043_notion_sync_tables.sql`

### Modified Files
- `apps/ml/src/feedback-decision-engine.ts` (added tenant_id, job_id, storeFeedbackScore)

## Deployment Checklist

- [ ] Migrations applied to Supabase
- [ ] Environment variables set (REDIS_URL, NOTION_API_KEY)
- [ ] API endpoints tested with curl
- [ ] Portal dashboard loads with sample data
- [ ] API key creation/revocation working
- [ ] Notion webhook URL configured in Notion settings
- [ ] ML scoring invoked post-job in orchestrator
- [ ] Redis TTLs verified (7 days for scores, 30 days for metrics)
- [ ] Tenant isolation tests passing
- [ ] RLS policies verified in Supabase
