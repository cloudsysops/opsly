---
status: draft
owner: architecture
last_review: 2026-07-01
tenant_slug: intcloudsysops
---

# Intcloudsysops — Extraction Plan (Future)

## Objective

Transition Intcloudsysops CloudOps CRM from **tenant incubated in Opsly** to **standalone product platform** (`cloudsysops/intcloudsysops-platform` repo, future), while maintaining:

- Continuity of service for paying customers
- Optional integration with Opsly via API/webhooks (usage tracking, billing signals)
- Zero forced dependency on Opsly orchestrator/BullMQ/auth

**This phase is E0 (documentation). No extraction work in Phase 1–2.**

## Extraction Phases

| Phase | Enterable | Opsly Dependency | Status | Owner |
|-------|-----------|------------------|--------|-------|
| **E0** | Docs + schema design (this doc) | Docs only | Active | Product lead |
| **E1** | New Supabase project + minimal API | Webhooks opt-in | Phase 2–Q3 2026 | Backend |
| **E2** | Next.js dashboard (Vercel/self-hosted) | Portal optional | Phase 3–Q4 2026 | Frontend |
| **E3** | Data migration tooling (export/import) | Via API | Phase 4–Q1 2027 | DevOps |
| **E4** | n8n: keep on VPS OR migrate | Shared or independent | Post-E3 | Ops |
| **E5** | Custom domain + independent ops | Independent | Post-E4 | Ops |

## What Migrates

### Code & Assets

| Asset | Destination | Notes |
|-------|-------------|-------|
| `docs/tenants/intcloudsysops/*` | `intcloudsysops-platform/docs/` | Architecture, guides, runbooks |
| `apps/intcloudsysops/` (partial) | `intcloudsysops-platform/apps/app/` | UI + API routes; Opsly lib imports removed |
| `.n8n/1-workflows/intcloudsysops/` | `intcloudsysops-platform/.n8n/workflows/` | n8n workflows (if staying on VPS) |
| `config/tenants/intcloudsysops.json` | `intcloudsysops-platform/config/tenant.json` | Metadata (adapted for standalone) |

### Database

| Asset | Destination | Notes |
|-------|-------------|-------|
| `intcloudsysops_*` schema | New Supabase project | Clone tables + RLS policies (Phase 2) |
| `intcloudsysops_*` data | Export/import via tooling | See E3 data migration plan |
| Migrations | `intcloudsysops-platform/migrations/` | SQL files, version controlled |

### Branding & Copy

| Asset | Destination | Notes |
|-------|-------------|-------|
| Design system tokens | `intcloudsysops-platform/design-tokens.json` | Tailwind, colors, typography |
| Marketing copy | `intcloudsysops-platform/docs/MARKETING.md` | Landing page, pitch |
| Logos, images | `intcloudsysops-platform/public/` | Brand assets |

## What Stays in Opsly (Optional)

After extraction, Intcloudsysops **may** remain connected to Opsly for:

### Usage Tracking & Billing

```
Intcloudsysops sends → Opsly LLM Gateway:
  - Token usage (if using Claude/LLM for insights)
  - Monthly metering data
  - Revenue signal (for dashboard)
```

**Implementation:**
- Webhook: `POST https://api.op-sly.com/internal/tenants/intcloudsysops/usage`
- Payload: `{ tenant_slug, metric_type, count, timestamp }`
- Idempotency: Include `idempotency_key` for deduplication

### Unified Auth (Optional)

If Intcloudsysops shares owner/team with Opsly:
- SSO via Opsly identity provider (future: shared OAuth realm)
- JWT validation via Opsly public keys
- Otherwise: standalone Auth0 / Supabase Auth

### Unified Observability

- Logs forwarded to shared observability stack (if available)
- Metrics sent to Datadog/NewRelic (not required; Intcloudsysops can use own APM)

## Criteria for Extraction

### Go/No-Go Checklist

**All MUST be true before starting E1:**

- [ ] **MVP revenue**: 10+ paying customers OR $2K MRR
- [ ] **Product stability**: Zero critical bugs in 30 days
- [ ] **Team readiness**: Dedicated eng + ops team identified
- [ ] **Owner approval**: team@intcloudsysops.com signs off
- [ ] **No Opsly deathloop**: Core flows work without Opsly (testing via feature flags)
- [ ] **Zero "Peskids" references** in code/docs (search for Peskids.* in codebase; must be 0)
- [ ] **Schema stable**: No breaking migrations needed in next 2 quarters

### Success Metrics (Post-Extraction)

- **Uptime**: 99.5% after extraction (measure separately from Opsly)
- **Perf**: API p95 latency < 200ms (independent measurement)
- **User satisfaction**: NPS 50+ from extracted customer base
- **Cost**: Standalone operating cost < Opsly pricing for that tenant tier

## Event Contract (Outbound Webhooks)

### Registration

Intcloudsysops registers webhooks with Opsly:

```bash
POST https://api.op-sly.com/internal/webhook-subscriptions
{
  "tenant_slug": "intcloudsysops",
  "events": ["account.created", "deal.won"],
  "callback_url": "https://intcloudsysops-platform.example.com/webhooks/opsly",
  "signature_secret": "{{ OPSLY_WEBHOOK_SECRET }}"
}
```

### Event Payload

Standard envelope:

```json
{
  "event": "deal.won",
  "tenant_slug": "intcloudsysops",
  "occurred_at": "2026-07-01T14:30:00Z",
  "idempotency_key": "evt_550e8400e29b41d4a716",
  "payload": {
    "deal_id": "550e8400-e29b-41d4-a716-446655440000",
    "account_id": "660e8400-e29b-41d4-a716-446655440001",
    "value": 50000,
    "won_at": "2026-07-01T14:30:00Z"
  }
}
```

### Events v1

| Event | Trigger | Payload |
|-------|---------|---------|
| `account.created` | New account added | `{ account_id, name, account_type }` |
| `account.updated` | Account status/value changed | `{ account_id, field, old_value, new_value }` |
| `contact.created` | New contact added | `{ contact_id, account_id, email, role }` |
| `deal.created` | New deal opened | `{ deal_id, account_id, name, value, stage }` |
| `deal.updated` | Deal moved in pipeline | `{ deal_id, stage, value }` |
| `deal.won` | Deal closed won | `{ deal_id, value, closed_at }` |
| `deal.lost` | Deal closed lost | `{ deal_id, reason }` |
| `feedback.created` | Feedback submitted | `{ feedback_id, account_id, rating, category }` |
| `followup.completed` | Followup marked done | `{ followup_id, completed_at }` |

### Security

- **Transport**: HTTPS only
- **Authentication**: Signature via `X-Intcloudsysops-Signature` header (HMAC-SHA256)
- **Validation**:
  ```typescript
  const signature = createHmac('sha256', WEBHOOK_SECRET)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  if (signature !== request.headers['x-intcloudsysops-signature']) {
    throw new UnauthorizedError('Invalid signature');
  }
  ```
- **Idempotency**: Consumer deduplicates by `idempotency_key` (store 24h)
- **Retry**: Exponential backoff (1s, 5s, 30s, 5m, 1h) for 24 hours

### Receiving Webhooks in Opsly

After extraction, if Opsly wants to track Intcloudsysops metrics:

```typescript
// apps/api/app/webhooks/intcloudsysops/route.ts
export async function POST(req: Request) {
  const signature = req.headers.get('x-intcloudsysops-signature');
  const body = await req.json();
  
  // Verify signature
  validateSignature(body, signature, process.env.INTCLOUDSYSOPS_WEBHOOK_SECRET);
  
  // Deduplicate
  const seen = await redis.get(`webhook:${body.idempotency_key}`);
  if (seen) return Response.json({ ok: true }); // Already processed
  
  // Process event
  await handleIntcloudsysopsEvent(body);
  
  // Mark as seen
  await redis.setex(`webhook:${body.idempotency_key}`, 86400, '1');
  
  return Response.json({ ok: true });
}
```

## Connection Opsly API (Inbound — Optional)

Intcloudsysops (after extraction) may call Opsly for:

### Health & Status

```bash
GET https://api.op-sly.com/health
Response: { status: 'ok', version: '2.1.0', timestamp: '2026-07-01T14:30:00Z' }
```

### Usage Submission

```bash
POST https://api.op-sly.com/internal/usage
Headers: { Authorization: 'Bearer {{ OPSLY_API_TOKEN }}' }
Body: {
  tenant_slug: 'intcloudsysops',
  period: '2026-07-01',
  metrics: {
    api_requests: 42100,
    webhook_deliveries: 523,
    n8n_executions: 210,
    storage_gb: 2.3,
    active_users: 8
  }
}
```

### Billing Integration (If Opsly Resells)

If Opsly acts as reseller/aggregator:

```bash
POST https://api.op-sly.com/internal/billing/report
Body: {
  tenant_slug: 'intcloudsysops',
  month: '2026-07',
  mau: 8,
  accs: 42,
  deals_value: 125000,
  estimated_revenue: 850  # USD
}
```

## Code Cleanup Strategy

### Phase 1: Dependency Isolation (No extraction yet)

1. **Add feature flag**: `EXTRACT_MODE=false` (default)
2. **Identify Opsly imports**:
   ```bash
   grep -r "@intcloudsysops" apps/intcloudsysops --include="*.ts" --include="*.tsx"
   grep -r "from '@intcloudsysops" apps/intcloudsysops --include="*.ts" --include="*.tsx"
   ```
3. **Mark removable**: Comment `// EXTRACT: remove this import` for E1
4. **Mock Opsly APIs**: Create local stubs (`lib/opsly-mock.ts`) for dev/testing

### Phase 2: Extraction Refactor (E1–E3)

When starting E1:

1. **Create new repo**: `cloudsysops/intcloudsysops-platform`
2. **Copy source**:
   ```bash
   cp -r apps/intcloudsysops/* intcloudsysops-platform/apps/app/
   cp -r docs/tenants/intcloudsysops/* intcloudsysops-platform/docs/
   cp -r .n8n/1-workflows/intcloudsysops/* intcloudsysops-platform/.n8n/workflows/
   ```
3. **Remove Opsly dependencies**:
   - Delete `@intcloudsysops/*` imports (replace with local lib)
   - Remove Opsly auth middleware (implement Supabase Auth)
   - Remove Opsly LLM Gateway calls (or use Claude API directly)
   - Remove BullMQ references (use job queue library or n8n)
4. **Add extraction boilerplate**:
   - `.env.example` with new var names
   - `README.md` for standalone setup
   - `docker-compose.yml` for local dev
   - CI/CD for new repo

### Phase 3: Rollback Plan

If extraction fails post-launch:

1. **Keep tenant in Opsly** (don't delete)
2. **Reactivate workflows** on VPS
3. **Notify customer**: "Temporary rollback to Opsly platform; ETA for standalone 2 weeks"
4. **Investigate issue** (data sync? performance?)
5. **Retry E1** when root cause fixed

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Data loss during migration | Low | Critical | Test export/import 3x; parallel run 2 weeks |
| Customers can't log in post-extraction | Medium | Critical | SSO pilot with 2 customers; rollback plan ready |
| Performance degrades 50%+ | Low | High | Benchmark pre/post; optimize queries; cache aggressively |
| Cost exceeds projection | Medium | Medium | Use shared infra (VPS) during E1–E2; move to own infra only for E5 |
| Opsly APIs change / break compatibility | Low | Medium | Webhook contract versioned; implement adapter layer |

## Timeline (Tentative)

- **Q2 2026 (now)**: Phase 0–1 (MVP, schema, docs)
- **Q3 2026**: E1 proposal to team@intcloudsysops.com; start if approved
- **Q4 2026**: E2–E3 (standalone repo, data migration)
- **Q1 2027**: E4–E5 (final handoff, ops independent)

**Blocking criteria**: 10+ customers + $2K MRR before Q3 kickoff.

## Appendix: Standalone Repo Template

When creating `cloudsysops/intcloudsysops-platform`:

```
intcloudsysops-platform/
├── apps/
│   └── app/               # Next.js frontend + API routes
│       ├── pages/
│       ├── api/
│       ├── lib/
│       └── components/
├── migrations/             # SQL migrations (Supabase)
├── .n8n/
│   └── workflows/         # CRM automation workflows
├── docs/
│   ├── DEPLOYMENT.md      # Standalone deployment guide
│   ├── DATA-MODEL.md      # Tenant-agnostic schema
│   ├── API.md             # OpenAPI spec (if relevant)
│   └── EXTRACTION.md      # How we got here
├── scripts/
│   ├── setup-local.sh     # Local dev setup
│   ├── deploy-prod.sh     # Production deployment
│   └── migrate-data.sh    # Import from Opsly (one-time)
├── docker-compose.yml     # Local stack (Supabase, n8n, app)
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
├── .env.example
├── package.json
├── tsconfig.json
└── README.md              # Setup + architecture
```

## References

- **DATA-MODEL.md** — Table schemas (applicable post-extraction with tenant_slug parameterization)
- **DEPLOYMENT.md** — Dev/prod setup (will be adapted for standalone)
- **.n8n/1-workflows/intcloudsysops/README.md** — Workflow docs (portable to new repo)
- **VISION.md** (Opsly) — Broader platform strategy
- **AGENTS.md** (Opsly) — Team roles and responsibilities

