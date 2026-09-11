# Approval Queue & Render Status UI

Admin dashboard for managing workflow approvals, render jobs, and publish history in Mission Control.

## Features

### 1. Approval Queue Kanban Board

Interactive Kanban board for workflow approvals with status columns:

- **Pending** — Awaiting initial review
- **In Review** — Currently being reviewed
- **Approved** — Approved and ready to render
- **Rejected** — Rejected and requires revision

**Location:** `/mission-control/approvals` (or `/moon/approvals` for legacy)

**Components:**
- `ApprovalQueueKanban` — Main Kanban component
- `ApprovalCard` — Individual approval card with metadata

**Displays:**
- Workflow name and tenant slug
- Status badge with priority indicator
- Confidence score (0-100%)
- Requester and reviewer email
- Reasoning and recommendations (if any)
- Timestamp

**API Endpoint:** `GET /api/admin/approval-queue`

**Response Example:**
```json
{
  "items": [
    {
      "id": "uuid",
      "request_id": "req-xxx",
      "tenant_slug": "example-tenant",
      "workflow_id": "wf-123",
      "workflow_name": "Content Generation v1",
      "status": "in_review",
      "priority": "high",
      "confidence": 95,
      "reasoning": "Model output quality excellent, tests passing",
      "requester_email": "ops@example.com",
      "reviewer_email": "lead@example.com",
      "created_at": "2026-09-11T10:30:00Z",
      "updated_at": "2026-09-11T11:15:00Z",
      "resolved_at": null,
      "metadata": {}
    }
  ],
  "total": 42,
  "pending": 8,
  "in_review": 5,
  "approved": 20,
  "rejected": 9,
  "generated_at": "2026-09-11T11:20:00Z"
}
```

### 2. Render Status Monitor

Real-time monitoring of render jobs with progress tracking and status filtering.

**Location:** `/mission-control/approvals`

**Components:**
- `RenderStatusMonitor` — Main monitor component
- `ProgressBar` — Visual progress indicator
- `RenderJobRow` — Individual job row

**Displays:**
- Job status (queued, rendering, completed, failed, cancelled)
- Progress percentage with animated progress bar
- Duration and timestamps
- Error messages (if any)
- Output URL links

**Status Summary:**
- Total jobs
- Active jobs (rendering + queued)
- Completed today
- Failed today
- Average duration

**Filtering:** By status (All, Queued, Rendering, Completed, Failed, Cancelled)

**API Endpoint:** `GET /api/admin/render-monitor`

**Response Example:**
```json
{
  "jobs": [
    {
      "id": "uuid",
      "approval_id": "approval-uuid",
      "tenant_slug": "example-tenant",
      "workflow_id": "wf-123",
      "workflow_name": "Content Generation v1",
      "status": "rendering",
      "progress": 75,
      "started_at": "2026-09-11T11:10:00Z",
      "completed_at": null,
      "duration_seconds": null,
      "error_message": null,
      "output_url": "https://cdn.example.com/render/xyz",
      "created_at": "2026-09-11T11:00:00Z"
    }
  ],
  "total": 156,
  "active": 12,
  "completed_today": 48,
  "failed_today": 3,
  "avg_duration_seconds": 45,
  "generated_at": "2026-09-11T11:20:00Z"
}
```

### 3. Publish History

Detailed history of published versions with rollback tracking.

**Location:** `/mission-control/approvals`

**Components:**
- `PublishHistory` — Main history component
- `PublishRecordRow` — Individual publish record

**Displays:**
- Publish status (draft, scheduled, published, failed, rollback)
- Version number
- Published date and author
- Rollback information (date and reason)
- Related render and approval IDs
- Custom metadata

**Status Summary:**
- Total published versions
- Published today
- Failed today
- Rollback count

**Filtering:** By status (All, Draft, Scheduled, Published, Failed, Rollback)

**API Endpoint:** `GET /api/admin/publish-history`

**Response Example:**
```json
{
  "records": [
    {
      "id": "uuid",
      "render_id": "render-uuid",
      "approval_id": "approval-uuid",
      "tenant_slug": "example-tenant",
      "workflow_id": "wf-123",
      "workflow_name": "Content Generation v1",
      "status": "published",
      "version": "1.2.3",
      "published_at": "2026-09-11T10:30:00Z",
      "published_by": "ops@example.com",
      "rollback_at": null,
      "rollback_reason": null,
      "created_at": "2026-09-11T10:00:00Z",
      "metadata": {
        "changelog": "Fixed bug in rendering logic",
        "deployment_region": "us-east-1"
      }
    }
  ],
  "total": 243,
  "published_today": 12,
  "failed_today": 1,
  "generated_at": "2026-09-11T11:20:00Z"
}
```

## Types

All types are defined in `lib/render-status-types.ts` and exported from `lib/index.ts`.

**Core Types:**

```typescript
// Approval Queue
type ApprovalStatus = 'pending' | 'in_review' | 'approved' | 'rejected' | 'needs_revision';
type ApprovalQueueItem = { ... };
type ApprovalQueueResponse = { items, total, pending, in_review, approved, rejected, ... };

// Render Jobs
type RenderStatus = 'queued' | 'rendering' | 'completed' | 'failed' | 'cancelled';
type RenderJob = { ... };
type RenderMonitorResponse = { jobs, total, active, completed_today, failed_today, ... };

// Publish Records
type PublishStatus = 'draft' | 'scheduled' | 'published' | 'failed' | 'rollback';
type PublishRecord = { ... };
type PublishHistoryResponse = { records, total, published_today, failed_today, ... };
```

## Database Schema

Three new tables are required in the `platform` schema:

1. **approval_queue** — Approval requests with status and metadata
2. **render_jobs** — Rendering job progress and results
3. **publish_records** — Publish history and rollbacks

See `lib/supabase-schema.md` for full SQL schema definitions with RLS policies.

## API Routes

All routes are read-only and respect RLS via Supabase.

- `GET /api/admin/approval-queue` — List approval queue items
- `GET /api/admin/render-monitor` — List render jobs
- `GET /api/admin/publish-history` — List publish records

Routes handle:
- Authentication (unless public demo enabled)
- Service role access
- Query optimization with indexes
- Error handling and logging

## Usage

### Import Components

```typescript
import {
  ApprovalQueueKanban,
  RenderStatusMonitor,
  PublishHistory,
} from '@/components/mission-control';
```

### Import Types

```typescript
import type {
  ApprovalStatus,
  RenderStatus,
  PublishStatus,
  ApprovalQueueItem,
  RenderJob,
  PublishRecord,
} from '@/lib/render-status-types';
```

### Full Page Example

```typescript
'use client';

import { ApprovalQueueKanban, RenderStatusMonitor, PublishHistory } from '@/components/mission-control';

export default function ApprovalsPage() {
  return (
    <div className="space-y-12">
      <ApprovalQueueKanban />
      <RenderStatusMonitor />
      <PublishHistory />
    </div>
  );
}
```

## Styling

All components use:
- Tailwind CSS for styling
- Dark theme (bg-gray-900, text-gray-100)
- Consistent color palette:
  - Blue: pending/queued
  - Emerald: approved/completed
  - Red: rejected/failed
  - Amber/Orange: warnings/rollbacks
  - Slate: other states

## Live Updates

Components use `fetch()` with client-side state management.

**Refresh Intervals (configurable):**
- Approval Queue: Manually (on-demand)
- Render Monitor: Automatic (can add SWR polling)
- Publish History: Manual (on-demand)

To add auto-refresh, wrap with SWR:

```typescript
import useSWR from 'swr';

const { data } = useSWR('approval-queue', () => fetch('/api/admin/approval-queue').then(r => r.json()), {
  refreshInterval: 5000, // 5 seconds
});
```

## Integration with Mission Control

The main dashboard at `/mission-control` now includes a link to `/mission-control/approvals`:

```
Mission Control → [Approvals & Renders] → Approval Queue + Render Monitor + Publish History
```

## Performance

- Queries limited to 50 items per request
- Indexes on `tenant_slug`, `status`, `created_at`
- Client-side filtering and sorting
- Pagination ready (cursor-based)

## Future Enhancements

- [ ] Drag-and-drop Kanban board
- [ ] Bulk approval actions
- [ ] Webhook notifications
- [ ] Export to CSV/PDF
- [ ] Search and advanced filtering
- [ ] Approval history audit log
- [ ] Retry failed renders
- [ ] Manual rollback UI

## Troubleshooting

### "Unauthorized" Error

Ensure:
1. User is authenticated
2. Public demo is enabled OR user has valid session
3. Supabase service role key is set

### No Data Showing

Check:
1. Tables exist in Supabase `platform` schema
2. RLS policies are correctly configured
3. Data has been inserted into tables
4. Tenant filtering is working (RLS)

### API 500 Error

Check:
1. `NEXT_PUBLIC_SUPABASE_URL` is set
2. `SUPABASE_SERVICE_ROLE_KEY` is set
3. Tables and indexes exist
4. RLS policies are not blocking service role

## Related

- `components/mission-control/` — Component source
- `lib/render-status-types.ts` — Type definitions
- `lib/supabase-schema.md` — Database schema
- `app/api/admin/` — API routes
- `app/mission-control/approvals/page.tsx` — Main page
