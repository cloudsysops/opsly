# Supabase Schema — Approval Queue & Render Status

This document describes the tables required for Approval Queue, Render Monitor, and Publish History functionality.

## Tables

### approval_queue

Stores workflow approval requests.

```sql
CREATE TABLE platform.approval_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id TEXT NOT NULL UNIQUE,
  tenant_slug TEXT NOT NULL REFERENCES platform.tenants(slug),
  workflow_id TEXT NOT NULL,
  workflow_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'in_review', 'approved', 'rejected', 'needs_revision')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  confidence NUMERIC NOT NULL DEFAULT 0,
  reasoning TEXT,
  requester_email TEXT,
  reviewer_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  metadata JSONB,
  INDEX idx_tenant_slug (tenant_slug),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at DESC)
);
```

### render_jobs

Stores rendering job information and progress.

```sql
CREATE TABLE platform.render_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_id UUID REFERENCES platform.approval_queue(id),
  tenant_slug TEXT NOT NULL REFERENCES platform.tenants(slug),
  workflow_id TEXT NOT NULL,
  workflow_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued', 'rendering', 'completed', 'failed', 'cancelled')),
  progress SMALLINT NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_seconds BIGINT,
  error_message TEXT,
  output_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  INDEX idx_tenant_slug (tenant_slug),
  INDEX idx_status (status),
  INDEX idx_approval_id (approval_id),
  INDEX idx_created_at (created_at DESC)
);
```

### publish_records

Stores published version history and rollbacks.

```sql
CREATE TABLE platform.publish_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  render_id UUID NOT NULL REFERENCES platform.render_jobs(id),
  approval_id UUID REFERENCES platform.approval_queue(id),
  tenant_slug TEXT NOT NULL REFERENCES platform.tenants(slug),
  workflow_id TEXT NOT NULL,
  workflow_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'scheduled', 'published', 'failed', 'rollback')),
  version TEXT NOT NULL,
  published_at TIMESTAMPTZ,
  published_by TEXT,
  rollback_at TIMESTAMPTZ,
  rollback_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB,
  INDEX idx_tenant_slug (tenant_slug),
  INDEX idx_status (status),
  INDEX idx_render_id (render_id),
  INDEX idx_approval_id (approval_id),
  INDEX idx_created_at (created_at DESC)
);
```

## Row Level Security (RLS)

### approval_queue

```sql
ALTER TABLE platform.approval_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view approvals for their tenant"
  ON platform.approval_queue
  FOR SELECT
  USING (tenant_slug IN (SELECT slug FROM platform.tenants WHERE owner_id = auth.uid()));

CREATE POLICY "Service role can manage all approvals"
  ON platform.approval_queue
  AS PERMISSIVE
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');
```

### render_jobs

```sql
ALTER TABLE platform.render_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view renders for their tenant"
  ON platform.render_jobs
  FOR SELECT
  USING (tenant_slug IN (SELECT slug FROM platform.tenants WHERE owner_id = auth.uid()));

CREATE POLICY "Service role can manage all renders"
  ON platform.render_jobs
  AS PERMISSIVE
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');
```

### publish_records

```sql
ALTER TABLE platform.publish_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view publishes for their tenant"
  ON platform.publish_records
  FOR SELECT
  USING (tenant_slug IN (SELECT slug FROM platform.tenants WHERE owner_id = auth.uid()));

CREATE POLICY "Service role can manage all publishes"
  ON platform.publish_records
  AS PERMISSIVE
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');
```

## Indexes

These provide efficient queries for the admin dashboard:

- `approval_queue(tenant_slug, created_at DESC)` — Filter by tenant
- `render_jobs(status, created_at DESC)` — Filter by render status
- `publish_records(tenant_slug, created_at DESC)` — Filter published versions
