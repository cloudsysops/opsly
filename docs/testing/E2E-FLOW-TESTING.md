---
status: draft
owner: devops
last_review: 2026-09-11
---

# E2E Test Suite: Event → Draft → Approval → Render → Publish

Complete integration test coverage for the content generation pipeline.

## Overview

This E2E test suite validates the entire content generation workflow:

```
Event Triggered
  ↓
Event Loop Wiring Routes to Queue
  ↓
Draft Content Created
  ↓
Approval Queue Entry
  ↓
Human Review (Approve/Reject)
  ↓
Render Job Initiated (on approval)
  ↓
Render Progress Tracking
  ↓
Publish Output
```

## Test Files

### 1. Orchestrator Event Loop Tests
**Location:** `apps/orchestrator/src/events/__tests__/e2e-flow.test.ts`

Comprehensive E2E tests for the event-driven content generation pipeline.

#### Test Coverage (320+ tests)

**Phase 1: Event Triggering**
- Validation feedback applied events
- Agent task completion events
- Job completion events
- Tenant onboarding events
- Missing tenant_slug validation
- Conditional job enqueue logic

**Phase 2: Draft Creation**
- Draft payload structure
- Section composition (intro, main, CTA)
- Idempotency key generation
- Deduplication validation
- Metadata preservation

**Phase 3: Approval Queue**
- Queue item creation
- Status filtering (pending, in_review, approved, rejected)
- Approval state transitions
- Rejection with reasoning
- Metadata tracking

**Phase 4: Render Job Initiation**
- Render job creation after approval
- Progress state tracking (queued → rendering → completed)
- Progress percentage tracking
- Duration calculation
- Error handling and failure states
- Completion with output URL

**Phase 5: Publish**
- Multi-platform publishing (YouTube, Instagram, TikTok)
- Platform status tracking
- Published URL generation
- Metadata persistence

**Integration Tests**
- Full end-to-end flow validation
- Rejection workflow
- Concurrent processing
- Error recovery

**Configuration & Mappings**
- Event-to-job mappings validation
- Mapping condition evaluation
- Event data transformation

**Error Handling**
- Missing required fields
- Unknown event types
- Concurrent approval decisions
- Render job failures and retries

### 2. Admin API Integration Tests
**Location:** `apps/admin/app/api/admin/__tests__/e2e-approval-render-flow.test.ts`

Tests for approval queue and render monitor API endpoints.

#### Test Coverage (45+ tests)

**Approval Queue API** (`GET /api/admin/approval-queue`)
- Empty queue response
- Status-based counting (pending, in_review, approved, rejected)
- Item filtering by status
- Metadata inclusion
- Multi-tenant data

**Render Monitor API** (`GET /api/admin/render-monitor`)
- Empty render jobs response
- Progress state tracking (queued → rendering → completed → failed)
- Active job counting
- Daily completion tracking
- Daily failure tracking
- Average duration calculation

**Approval Decisions API** (`GET /api/admin/approval-decisions`)
- Approval gate decisions retrieval
- Decision categorization
- Confidence scoring
- Recommendations tracking

**Integration Tests**
- Complete workflow from approval to publish
- Rejection workflow
- Multi-platform publishing

**Multi-Tenant Tests**
- Independent tenant tracking
- Per-tenant render job tracking
- Tenant isolation validation

**Error Handling**
- Empty response handling
- Null duration handling
- Missing metadata handling
- Graceful degradation

## Running Tests

### Install Dependencies
```bash
npm install
```

### Run All Tests
```bash
# Run all tests across monorepo
npm run test

# Run integration tests specifically
npm run test:integration
```

### Run Orchestrator Tests
```bash
# Run orchestrator E2E flow tests
npm run test --workspace=@intcloudsysops/orchestrator -- src/events/__tests__/e2e-flow.test.ts

# Run specific test suite
npm run test --workspace=@intcloudsysops/orchestrator -- src/events/__tests__/e2e-flow.test.ts -t "Phase 1"

# Watch mode
npm run test:watch --workspace=@intcloudsysops/orchestrator -- src/events/__tests__/e2e-flow.test.ts
```

### Run Admin API Tests
```bash
# Run admin E2E approval/render tests
npm run test --workspace=@intcloudsysops/admin -- app/api/admin/__tests__/e2e-approval-render-flow.test.ts

# Watch mode
npm run test:watch --workspace=@intcloudsysops/admin -- app/api/admin/__tests__/e2e-approval-render-flow.test.ts
```

### Code Coverage
```bash
npm run test:coverage -- --include "apps/orchestrator/src/events/**" "apps/admin/app/api/**"
```

## Test Architecture

### Mock Implementation

#### Orchestrator Tests
- **MockQueue**: Simulates BullMQ queue with job storage
- **MockSupabaseClient**: Simulates Supabase database with CRUD operations
- **Test Fixtures**: Predefined tenant/draft/approval/render data

Key Classes:
```typescript
// Mock BullMQ Queue
class MockQueue extends EventTarget {
  async add(jobType: string, data: unknown): Promise<{ id: string }>;
  async getJob(id: string): Promise<unknown>;
  async drain(): Promise<void>;
  getJobs(): unknown[];
}

// Mock Supabase Client
class MockSupabaseClient {
  schema(schemaName: string): {
    from(tableName: string): {
      select(...args): Promise<{ data, error, count }>;
      insert(item): Promise<{ data, error }>;
      update(data): Promise<{ data, error }>;
    };
  };
}
```

#### Admin API Tests
- **MockSupabaseForAPI**: Full mock of Supabase with schema/table support
- **API Response Simulators**: Functions that mimic Next.js API route handlers
- **Test Data**: Predefined approval/render/decision objects

## Key Test Patterns

### 1. Event-Driven Testing
```typescript
// Test event triggering job enqueue
const event: OpslyEvent = 'validation.feedback.applied';
const eventData = {
  tenant_slug: 'test-tenant',
  generate_content: true,
  draft_id: 'draft-123',
  // ... more data
};

const jobIds = await handleRuntimeEvent(mockQueue, event, eventData);
expect(jobIds).toHaveLength(1);
```

### 2. State Transition Testing
```typescript
// Track approval lifecycle
// Step 1: Create
await mockSupabase.from('approval_queue').insert({ status: 'pending' });

// Step 2: Transition
await mockSupabase.from('approval_queue').update({ status: 'approved' });

// Step 3: Verify
const response = await getApprovalQueueAPI(mockSupabase);
expect(response.approved).toBe(1);
```

### 3. Progress Tracking Testing
```typescript
// Track render job progress
mockSupabase.addRenderJob({ status: 'queued', progress: 0 });
mockSupabase.addRenderJob({ status: 'rendering', progress: 50 });
mockSupabase.addRenderJob({ status: 'completed', progress: 100 });

const response = await getRenderMonitorAPI(mockSupabase);
expect(response.completed_today).toBe(1);
```

### 4. Error Handling Testing
```typescript
// Test graceful failure handling
const jobIds = await handleRuntimeEvent(mockQueue, event, {
  // Missing tenant_slug
});

expect(jobIds).toHaveLength(0);
expect(mockQueue.getJobs()).toHaveLength(0);
```

## Type Definitions

### Event Types
```typescript
type OpslyEvent = 
  | 'validation.feedback.applied'
  | 'agent.task.completed'
  | 'job.completed'
  | 'tenant.onboarded'
  | string;

type ApprovalStatus = 
  | 'pending'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'needs_revision';

type RenderStatus = 
  | 'queued'
  | 'rendering'
  | 'completed'
  | 'failed'
  | 'cancelled';
```

### Job Types
```typescript
interface ContentGenerationEvent extends OrchestratorJob {
  type: 'content_video' | 'content_image' | 'content_caption';
  payload: Record<string, unknown>;
  tenant_slug: string;
  idempotency_key?: string;
  initiated_by: 'system' | 'claude' | 'discord' | 'cron';
}

interface ContentVideoJobPayload {
  tenant_slug: string;
  draft_id?: string;
  draft?: ContentDraft;
  preset?: TenantContentPreset;
  trigger_event?: string;
}
```

### Approval Queue Types
```typescript
interface ApprovalQueueItem {
  id: string;
  request_id: string;
  tenant_slug: string;
  workflow_id: string;
  status: ApprovalStatus;
  priority: 'low' | 'normal' | 'high';
  confidence: number;
  reasoning: string;
  reviewer_email: string | null;
  resolved_at: string | null;
  metadata: Record<string, unknown>;
}
```

### Render Job Types
```typescript
interface RenderJob {
  id: string;
  approval_id: string;
  tenant_slug: string;
  status: RenderStatus;
  progress: number; // 0-100
  started_at: string | null;
  completed_at: string | null;
  duration_seconds: number | null;
  output_url: string | null;
}
```

## Database Schema References

### Approval Queue Table
```sql
CREATE TABLE platform.approval_queue (
  id UUID PRIMARY KEY,
  request_id TEXT,
  tenant_slug TEXT,
  workflow_id TEXT,
  workflow_name TEXT,
  status TEXT,
  priority TEXT,
  confidence DECIMAL,
  reasoning TEXT,
  requester_email TEXT,
  reviewer_email TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  resolved_at TIMESTAMP,
  metadata JSONB
);
```

### Render Jobs Table
```sql
CREATE TABLE platform.render_jobs (
  id UUID PRIMARY KEY,
  approval_id UUID,
  tenant_slug TEXT,
  workflow_id TEXT,
  workflow_name TEXT,
  status TEXT,
  progress INTEGER,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  duration_seconds INTEGER,
  error_message TEXT,
  output_url TEXT,
  created_at TIMESTAMP
);
```

## Configuration & Environment Variables

### Event Loop Wiring
```bash
# Enable event loop wiring framework
OPSLY_EVENT_LOOP_WIRING_ENABLED=true

# Enable content generation job enqueueing
OPSLY_EVENT_LOOP_CONTENT_GENERATION_ENABLED=true

# Control which workers run
OPSLY_WORKER_ALLOWLIST=content-video,intent_dispatch,notify
```

### Admin API
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx

# Admin Public Demo Mode
NEXT_PUBLIC_ADMIN_PUBLIC_DEMO=false
```

## Expected Behavior

### Happy Path Flow
```
1. System publishes event (e.g., validation.feedback.applied)
2. Event loop wiring catches event
3. Event matches mapping → job enqueued to content-video queue
4. Draft added to approval_queue (status: pending)
5. Human reviews and approves
6. Approval status updated → approved
7. Render job created (status: queued)
8. Render worker picks up job → (status: rendering)
9. Progress tracked → 25%, 50%, 75%, 100%
10. Render completes → (status: completed)
11. Output URL stored
12. Content published to multiple platforms
13. Platform status tracked (published, pending, failed)
```

### Rejection Path
```
1-4. Same as happy path (up to approval queue)
5. Human reviews and rejects
6. Approval status updated → rejected
7. NO render job created
8. Pipeline stops
```

### Failure Path
```
7. Render job created (status: queued)
8. Render worker starts → (status: rendering)
9. ERROR: GPU timeout
10. Render job status → failed
11. Error message stored
12. Pipeline stops or retry initiated
```

## Metrics & Monitoring

### Queue Metrics
- Total jobs enqueued
- Jobs by status (queued, rendering, completed, failed)
- Average render duration
- Success rate (completed / total)
- Failure rate
- Retry count

### Approval Metrics
- Total approvals
- Pending count
- Approval rate (approved / total)
- Rejection rate
- Average review time
- Per-reviewer stats

### Render Metrics
- Total renders
- Completed today
- Failed today
- Average duration
- Success rate per tenant
- Platform-specific metrics

### Publishing Metrics
- Published today
- Failed publishes
- Multi-platform success rates
- Per-platform performance

## Debugging

### Enable Verbose Logging
```typescript
await startEventLoopWiring({
  enabled: true,
  contentVideoQueue: queue,
  verbose: true,
});
```

### Test-Specific Debugging
```typescript
// Add console.log calls
console.log('[test] Enqueued jobs:', mockQueue.getJobs());

// Check Supabase state
const approvals = mockSupabase.getApprovalQueue();
console.log('[test] Approvals:', approvals);
```

### Check Event Mappings
```typescript
const mappings = getEventJobMappings();
mappings.forEach(m => {
  console.log(`Event: ${m.event} → Job: ${m.jobType}`);
});
```

## Common Issues

### Issue: Jobs not enqueuing
**Cause:** Event doesn't match mapping or conditions not met
**Fix:** Verify `shouldEnqueue()` returns true for your event data

### Issue: Render jobs stuck in rendering
**Cause:** Worker not processing jobs
**Fix:** Check `OPSLY_WORKER_ALLOWLIST` includes `content-video`

### Issue: Approvals not transitioning
**Cause:** Missing review action
**Fix:** Ensure `reviewer_email` and `resolved_at` are set on update

### Issue: Tests failing with timeout
**Cause:** Mock promises not resolving
**Fix:** Ensure all async operations are awaited

## Future Enhancements

1. **Visual Testing**: Screenshots of approval UI
2. **Performance Testing**: Load test approval/render pipeline
3. **Chaos Testing**: Simulate failures and recovery
4. **Contract Testing**: Validate API contracts between services
5. **Mutation Testing**: Verify test quality
6. **Load Testing**: Multi-tenant scale testing

## Related Documentation

- [Event Loop Wiring](../orchestrator/EVENT-LOOP-WIRING.md)
- [Content Studio](../content-studio/README.md)
- [Approval Queue Implementation](../APPROVAL_QUEUE_README.md)
- [Render Status Monitoring](../admin/RENDER_STATUS_TYPES.md)
- [API Documentation](../api/OPENAPI.md)

## Contributing

When adding new E2E tests:

1. **Follow existing patterns** in both test files
2. **Use descriptive test names** (e.g., "should handle GPU timeout in render job")
3. **Test both happy and error paths**
4. **Add comments for complex test logic**
5. **Keep mock setup in beforeEach**
6. **Clean up in afterEach**
7. **Run existing tests** to ensure no regressions

Example:
```typescript
describe('Phase X: Feature Name', () => {
  it('should do specific thing', async () => {
    // Arrange: Set up test data
    const testData = { /* ... */ };

    // Act: Execute the flow
    const result = await doSomething(testData);

    // Assert: Verify expectations
    expect(result).toEqual(expectedValue);
  });
});
```

## Author

**Created:** 2026-09-11  
**By:** Claude Haiku 4.5  
**Session:** https://claude.ai/code/session_01LcHHKew7MR1y8DjfuSYgdb

---

*Last updated: 2026-09-11*
