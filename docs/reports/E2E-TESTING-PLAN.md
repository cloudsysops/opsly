---
status: active
owner: qa-engineering
created: 2026-06-11
purpose: "Complete E2E test suite for Reliability Sprint + GHL integration validation"
---

# E2E Testing Plan — Reliability Sprint & GHL Integration

**Scope:** Validate entire lead flow (intake → persistence → automation → metrics) with alerting + recovery  
**Timeline:** 3 days (manual) + 2 weeks (automated CI)  
**Success Criteria:** All critical paths green, zero silent failures, full observability

---

## 1. ALERTING SYSTEM E2E TESTS

### 1.1 Slack Alert Firing (TIER 1 - Instant)

**Scenario:** Supabase connection fails during lead persistence

**Setup:**
```bash
# Start with API running normally
npm run dev --workspace=@intcloudsysops/api

# In another terminal, simulate Supabase failure
npm run test -- --workspace=@intcloudsysops/api --grep "supabase.*failure"
```

**Test Steps:**
1. Submit Peskids lead via webhook
2. API receives lead
3. Intentionally fail Supabase persist (mock error)
4. Verify Slack alert fires to `#ops-critical` within 1 second
5. Alert includes: timestamp, error message, lead_id, recovery action

**Expected Output:**
```
[ICSO] Supabase Error: Connection failed while persisting lead
Component: webhook-receiver
Lead ID: ghl_lead_123
Action: Check Supabase dashboard
Severity: CRITICAL
Time: 2026-06-11 14:32:15 UTC
```

**Validation:**
- [ ] Alert appears in Slack within 1 second
- [ ] Alert includes error context (component, operation, lead_id)
- [ ] No duplicate alerts (debounce working)
- [ ] Alert footer shows timestamp

---

### 1.2 Slack Alert Batching (TIER 2 - 5-min Batch)

**Scenario:** GHL rate limiting causes cascading contact creation failures

**Setup:**
```bash
# Simulate 10 rapid lead submissions
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/public/tenants/peskids/webhooks/gohighlevel/leads \
    -H "Content-Type: application/json" \
    -d '{"lead_id":"lead_'$i'","parent_name":"Test '$i'","email":"test'$i'@example.com"}'
done
```

**Test Steps:**
1. Submit 10 leads rapidly (simulating traffic spike)
2. GHL returns 429 (rate limit) for 70% of requests
3. API batches GHL errors in 5-minute window
4. At 5-min mark, Slack alert fires with aggregate summary

**Expected Output:**
```
[GHL] Rate Limit Alert
Errors in last 5 minutes: 7
Operation: createContact
Status Code: 429
Retry window: Next attempt at 14:37 UTC
Affected leads: lead_1, lead_3, lead_5, lead_7, lead_8, lead_9, lead_10
```

**Validation:**
- [ ] Batch alert fires after 5 minutes (not immediately)
- [ ] Alert includes count + list of affected leads
- [ ] Single batch alert (not 7 individual alerts)
- [ ] Batched errors cleared after alert sent

---

### 1.3 n8n Dispatch Failure Alert

**Scenario:** n8n webhook becomes unavailable

**Setup:**
```bash
# Stop n8n locally or change N8N_WEBHOOK_BASE_URL to invalid endpoint
export N8N_WEBHOOK_BASE_URL="http://localhost:9999"  # invalid port
npm run dev --workspace=@intcloudsysops/api
```

**Test Steps:**
1. Submit valid Peskids lead
2. Lead persists successfully to Supabase
3. API attempts n8n dispatch
4. Connection times out (10-second timeout)
5. Slack alert fires immediately

**Expected Output:**
```
[n8n] Dispatch Failure
Operation: dispatchPeskidsLeadAutomation
Lead ID: ghl_lead_123
Error: Connection refused (timeout after 10s)
Action: Check n8n service health
Retry: Queued to DLQ (max 10 retries)
```

**Validation:**
- [ ] Alert fires within 10 seconds
- [ ] Includes fallback/recovery action (DLQ reference)
- [ ] Lead doesn't get lost (persisted + DLQ entry)

---

## 2. METRICS COLLECTION E2E TESTS

### 2.1 Metrics Recorded Across Full Lead Flow

**Scenario:** Single lead flows through entire pipeline

**Setup:**
```bash
npm run dev --workspace=@intcloudsysops/api
# Ensure Supabase local with migrations applied
npm run db:migrate
```

**Test Steps:**
1. Submit Peskids lead via webhook
2. Verify metric recorded: `leads.received` (counter +1)
3. Lead persists to Supabase
4. Verify metric recorded: `leads.persisted` + `lead.persist.latency_ms` (histogram)
5. GHL contact created
6. Verify metric recorded: `ghl.contact.created` (counter +1)
7. n8n dispatch sent
8. Verify metric recorded: `n8n.dispatch.latency_ms` (histogram)

**Validation Query:**
```sql
SELECT 
  metric_name, 
  metric_type, 
  metric_value, 
  component, 
  timestamp 
FROM platform.metrics_log 
WHERE tenant_slug = 'peskids' 
  AND timestamp > NOW() - interval '5 minutes'
ORDER BY timestamp DESC;
```

**Expected Result:**
```
leads.received               | counter | 1 | webhook-receiver | 14:30:15
leads.persisted              | counter | 1 | supabase         | 14:30:16
lead.persist.latency_ms      | histogram | 125 | supabase | 14:30:16
ghl.contact.created          | counter | 1 | gohighlevel      | 14:30:17
ghl.contact.latency_ms       | histogram | 245 | gohighlevel  | 14:30:17
n8n.dispatch.latency_ms      | histogram | 342 | n8n | 14:30:18
```

**Validation:**
- [ ] All 6 metrics recorded
- [ ] Timestamps in correct order
- [ ] Latency values in expected range (<500ms each)
- [ ] Metrics appear in database within 30 seconds of lead submission

---

### 2.2 Metrics Dashboard Query Validation

**Scenario:** Ops team queries dashboard for lead volume trends

**Setup:**
```bash
# Run metrics collector for 1 hour, submit 50 leads
for i in {1..50}; do
  submit_lead "test_$i" &
  sleep 1.2  # stagger submissions by 1.2s
done
```

**Test Steps:**
1. Query metrics for last 1 hour
2. Validate lead volume trend (should show steady increase)
3. Validate error rate (should be 0% if all succeed)
4. Validate latency percentiles (p50, p95, p99)

**Validation Query:**
```sql
-- Lead volume by 10-minute bucket
SELECT 
  DATE_TRUNC('10 minutes', timestamp) AS bucket,
  COUNT(*) FILTER (WHERE metric_name = 'leads.received') AS leads_received,
  COUNT(*) FILTER (WHERE metric_name = 'leads.persisted') AS leads_persisted,
  AVG(metric_value) FILTER (WHERE metric_name = 'ghl.contact.latency_ms') AS avg_ghl_latency,
  MAX(metric_value) FILTER (WHERE metric_name = 'ghl.contact.latency_ms') AS max_ghl_latency
FROM platform.metrics_log
WHERE tenant_slug = 'peskids' 
  AND timestamp > NOW() - interval '1 hour'
GROUP BY 1
ORDER BY 1 DESC;
```

**Validation:**
- [ ] Lead volume steadily increases (1 per submission)
- [ ] Persistence rate = 100% (received = persisted)
- [ ] Latency p50 < 200ms
- [ ] Latency p95 < 400ms
- [ ] No gaps in data (30-second flush is reliable)

---

## 3. GHL INTEGRATION E2E TESTS

### 3.1 ICSO Website → GHL Complete Flow

**Scenario:** User submits ICSO contact form, receives calendar link

**Setup:**
```bash
# Start ICSO app
npm run dev --workspace=@intcloudsysops/icso

# Terminal 2: Start API
npm run dev --workspace=@intcloudsysops/api

# Terminal 3: Watch GHL API for activity
watch -n 1 'curl -s https://services.leadconnectorhq.com/v1/contacts?locationId=qD7Z9jt3owk0LMtKElow | jq ".data | length"'
```

**Test Steps:**
1. Open http://localhost:3015/contact (ICSO contact form)
2. Fill form: 
   - Name: "Jane Doe"
   - Email: "jane@acme.com"
   - Message: "We need lead automation"
3. Click "Submit"
4. Verify success toast appears
5. Check GHL: Contact "Jane Doe" created with source "ICSO Website"
6. Verify response includes calendar booking URL
7. Click calendar URL, verify it opens GHL calendar with discovery slots available

**Expected Output:**
```json
{
  "success": true,
  "contactId": "ghl_contact_abc123",
  "message": "Lead submitted successfully",
  "calendarBookingUrl": "https://app.gohighlevel.com/calendar/qD7Z9jt3owk0LMtKElow/cal_xyz789"
}
```

**Validation:**
- [ ] Form submits without error
- [ ] Contact created in GHL within 2 seconds
- [ ] Contact has correct source tag "ICSO Website"
- [ ] Calendar URL is valid (no 404 when visited)
- [ ] User can book discovery call in returned calendar
- [ ] Lead appears in Opsly Admin dashboard under "Recent Leads"

---

### 3.2 Peskids GHL Webhook → API → n8n Flow

**Scenario:** Lead submitted in GHL Peskids location, flows through entire system

**Setup:**
```bash
# Start API + n8n
npm run dev --workspace=@intcloudsysops/api
npm run dev --workspace=@intcloudsysops/orchestrator  # includes n8n mock

# Watch Supabase for lead insertion
psql postgres://user:pass@localhost:54321/postgres -c \
  "WATCH 'SELECT * FROM platform.peskids_leads ORDER BY created_at DESC LIMIT 1'"
```

**Test Steps:**
1. In GHL Peskids location, create new contact:
   - Name: "Maria Rodriguez"
   - Email: "maria@example.com"
   - Phone: "+573001112233"
   - Custom field "child_name": "Mateo"
   - Custom field "age": "8"
2. Trigger webhook to Opsly:
   ```bash
   curl -X POST http://localhost:3000/api/public/tenants/peskids/webhooks/gohighlevel/leads \
     -H "Content-Type: application/json" \
     -H "X-GHL-Signature: $(generate_webhook_signature)" \
     -d '{
       "event_id": "evt_123",
       "event_type": "lead.created",
       "tenant_slug": "peskids",
       "lead_id": "ghl_contact_maria",
       "lead": {
         "parent_name": "Maria Rodriguez",
         "email": "maria@example.com",
         "phone": "+573001112233",
         "child_name": "Mateo",
         "age": 8,
         "interest": "Trial class"
       }
     }'
   ```
3. Verify lead persisted to `platform.peskids_leads`
4. Verify n8n webhook called with correct payload
5. Check Supabase: lead appears with correct metadata
6. Check metrics: `leads.received` + `leads.persisted` + `n8n.dispatch.latency_ms` recorded

**Expected Output:**
```sql
-- In platform.peskids_leads
id           | lead_id              | parent_name      | child_name | age | status     | created_at
uuid_12345   | ghl_contact_maria    | Maria Rodriguez  | Mateo      | 8   | received   | 2026-06-11T14:32:15Z
```

**Validation:**
- [ ] Webhook received and validated (correct signature)
- [ ] Lead persisted within 500ms
- [ ] n8n dispatch called within 1 second
- [ ] Metrics recorded (all 6 points)
- [ ] No duplicate leads (idempotency on lead_id)
- [ ] Lead appears in Peskids dashboard within 30 seconds

---

### 3.3 GHL Account Validation (Scopes + Resources)

**Scenario:** Verify both GHL accounts have required resources + scopes

**Setup:**
```bash
./scripts/validate-ghl-config.sh --tenant intcloudsysops
./scripts/validate-ghl-config.sh --tenant peskids
```

**Test Steps:**
1. Run validation script for Agency account
   - Verify API key is valid (no 401)
   - Verify scopes: contacts.write, calendars.write, opportunities.readonly
   - Verify Discovery Call calendar exists
   - Verify location_id matches Doppler config

2. Run validation script for Peskids account
   - Verify API key is valid (no 401)
   - Verify scopes: contacts.write, calendars.write
   - Verify Trial Class calendar exists
   - Verify Assessment calendar exists
   - Verify location_id matches Doppler config

**Expected Output:**
```
✓ Agency (qD7Z9jt3owk0LMtKElow)
  ✓ API key valid (201 response)
  ✓ Scope contacts.write: OK
  ✓ Scope calendars.write: OK
  ✓ Scope opportunities.readonly: OK
  ✓ Calendar "Discovery Call": exists (cal_abc123)
  ✓ Location ID matches Doppler: qD7Z9jt3owk0LMtKElow

✓ Peskids (KJ5LawrOOe3hIerqtMRu)
  ✓ API key valid (201 response)
  ✓ Scope contacts.write: OK
  ✓ Scope calendars.write: OK
  ✓ Calendar "Trial Class": exists (cal_xyz789)
  ✓ Calendar "Assessment": exists (cal_def456)
  ✓ Location ID matches Doppler: KJ5LawrOOe3hIerqtMRu
```

**Validation:**
- [ ] Both accounts pass all checks
- [ ] No 401 errors (token valid)
- [ ] All required scopes present
- [ ] All calendars exist and are accessible

---

## 4. DEAD LETTER QUEUE (DLQ) E2E TESTS

### 4.1 Automatic DLQ Entry on Failure

**Scenario:** n8n dispatch fails, lead goes to DLQ

**Setup:**
```bash
# Stop n8n
npm run dev --workspace=@intcloudsysops/api  # N8N_WEBHOOK_BASE_URL = invalid
```

**Test Steps:**
1. Submit Peskids lead via webhook
2. Lead persists to `platform.peskids_leads`
3. n8n dispatch fails (timeout)
4. Verify lead NOT sent to n8n
5. Verify entry created in `platform.dead_letter_queue`:
   - `operation`: "n8n_dispatch"
   - `lead_id`: "ghl_contact_xyz"
   - `status`: "pending"
   - `retry_count`: 0
   - `next_retry_at`: NOW() + 2 seconds

**Validation Query:**
```sql
SELECT 
  id, 
  operation, 
  lead_id, 
  status, 
  retry_count, 
  next_retry_at, 
  created_at 
FROM platform.dead_letter_queue 
WHERE lead_id = 'ghl_contact_xyz';
```

**Validation:**
- [ ] DLQ entry created immediately
- [ ] Retry count = 0
- [ ] Next retry scheduled in 2 seconds
- [ ] Error reason captured

---

### 4.2 Exponential Backoff Retry Logic

**Scenario:** Lead stays in DLQ, retries with exponential backoff

**Setup:**
```bash
# Keep n8n unavailable for 30 minutes
# Batch retry job runs every 5 minutes
```

**Test Steps:**
1. Lead in DLQ with retry_count = 0
2. Wait 5 minutes for batch job to run
3. Verify batch job attempts retry
4. n8n still unavailable, retry fails
5. Verify DLQ updated:
   - `retry_count`: 1
   - `next_retry_at`: NOW() + 4 seconds (exponential: 2^2)

6. Wait for next batch (5 min cycle)
7. Retry attempt #2 fails
8. Verify DLQ updated:
   - `retry_count`: 2
   - `next_retry_at`: NOW() + 8 seconds (exponential: 2^3)

9. Continue until max_retries (10) reached
10. Mark lead as `dead` (no more retries)

**Expected Retry Schedule:**
```
Retry #1: 2s delay   (2^1)
Retry #2: 4s delay   (2^2)
Retry #3: 8s delay   (2^3)
Retry #4: 16s delay  (2^4)
Retry #5: 32s delay  (2^5)
Retry #6: 64s delay  (2^6)
Retry #7: 128s delay (2^7)
Retry #8: 256s delay (2^8)
Retry #9: 512s delay (2^9)
Retry #10: 1024s delay (2^10) = 17 minutes
Total window: ~35 minutes before marking dead
```

**Validation:**
- [ ] Backoff schedule follows formula: 2^n seconds
- [ ] Batch job respects next_retry_at (no early retries)
- [ ] After 10 retries, status = "dead"
- [ ] Slack alert sent when status changes to "dead"

---

### 4.3 Manual DLQ Recovery Endpoint

**Scenario:** Ops team manually recovers lead from DLQ

**Setup:**
```bash
# Lead in DLQ with status = "dead"
# n8n is now back online
```

**Test Steps:**
1. Ops calls recovery endpoint:
   ```bash
   curl -X POST http://localhost:3000/api/admin/dlq/retry \
     -H "Authorization: Bearer $ADMIN_TOKEN" \
     -d '{"lead_id":"ghl_contact_xyz","operation":"n8n_dispatch"}'
   ```
2. Verify DLQ entry updated:
   - `status`: "pending"
   - `retry_count`: 0
   - `next_retry_at`: NOW() (immediate)

3. Next batch job runs (within 5 min)
4. Retry succeeds (n8n now available)
5. Lead removed from DLQ
6. Slack notification: "Lead recovered: ghl_contact_xyz"

**Validation:**
- [ ] Recovery endpoint accepts valid lead_id
- [ ] DLQ entry reset to pending (retry_count = 0)
- [ ] Next retry runs immediately in batch job
- [ ] Lead successfully dispatched to n8n
- [ ] DLQ entry removed after successful retry
- [ ] Ops team notified of recovery

---

## 5. CIRCUIT BREAKER E2E TESTS

### 5.1 Circuit Opens After Threshold

**Scenario:** GHL service becomes unstable (rate limiting), circuit opens

**Setup:**
```bash
# Simulate GHL returning 429 for all requests
npm run test -- --grep "circuit.*breaker.*threshold"
```

**Test Steps:**
1. Submit 6 leads in rapid succession
2. GHL returns 429 for all 6 contacts
3. Circuit breaker tracks failures: 5 failures/minute threshold
4. After 5th failure, circuit state changes to OPEN
5. 6th lead attempt immediately fails (fail-fast)
6. Lead routed to DLQ instead of calling GHL
7. Verify circuit state in metrics:
   ```sql
   SELECT metric_value 
   FROM platform.metrics_log 
   WHERE metric_name = 'circuit.ghl.state'
   ORDER BY timestamp DESC LIMIT 1;
   -- Expected: "OPEN"
   ```

**Validation:**
- [ ] Circuit opens after 5 failures in 1 minute
- [ ] 6th request fails immediately (no GHL call)
- [ ] Circuit state recorded in metrics
- [ ] Slack alert: "GHL Circuit Breaker OPEN"
- [ ] All failed leads go to DLQ

---

### 5.2 Circuit Half-Open Recovery Test

**Scenario:** Circuit tries to recover after timeout period

**Setup:**
```bash
# GHL was down, now recovering
# Circuit has been OPEN for 30 seconds
```

**Test Steps:**
1. Circuit state: OPEN (from previous test)
2. Wait 30 seconds (half-open timeout)
3. Circuit transitions to HALF_OPEN
4. Submit 1 test lead to GHL
5. If GHL responds 200: circuit closes, succeeds
6. If GHL responds 429+: circuit re-opens, lead to DLQ

**Scenario A (Success):**
```
Circuit OPEN → wait 30s → HALF_OPEN → test request → GHL 200 OK
→ Circuit CLOSED → lead succeeds
```

**Scenario B (Failure):**
```
Circuit OPEN → wait 30s → HALF_OPEN → test request → GHL 429
→ Circuit OPEN (reset timeout) → lead to DLQ
```

**Validation:**
- [ ] Circuit transitions OPEN → HALF_OPEN after timeout
- [ ] Single test request sent in HALF_OPEN
- [ ] Circuit closes on success (normal operation resumes)
- [ ] Circuit reopens on failure (continue protecting)

---

### 5.3 Circuit Breaker Per-Service

**Scenario:** GHL circuit open, but Supabase and n8n still working

**Test Steps:**
1. Open GHL circuit (too many 429s)
2. Submit new lead
3. Verify Supabase persist succeeds (circuit OK)
4. GHL contact creation skipped (circuit OPEN)
5. Lead marked as "ghl_pending"
6. n8n dispatch still attempted (Supabase data available)
7. DLQ entry created for future GHL retry

**Validation:**
- [ ] Each service has independent circuit
- [ ] GHL circuit OPEN doesn't affect Supabase/n8n
- [ ] Lead still persisted and automated even with GHL down
- [ ] GHL operations queued for retry when circuit closes

---

## 6. RUNBOOK VALIDATION E2E TESTS

### 6.1 GHL Service Down Incident

**Scenario:** GHL service is completely down (HTTP 503)

**Manual Test:**
1. GHL is unreachable (or returns 503)
2. Submit Peskids lead via webhook
3. Observe:
   - [ ] Lead persists to Supabase (succeeds)
   - [ ] GHL contact creation fails
   - [ ] Circuit opens after 5 failures
   - [ ] Slack alert: "GHL Service Down"
   - [ ] Lead goes to DLQ with "ghl_contact_pending"
   - [ ] Ops follows runbook: GHL-SERVICE-DOWN.md

4. Runbook steps:
   - [ ] Check GHL status page
   - [ ] Verify DLQ queue depth (should see backlog)
   - [ ] Query metrics for error rate spike
   - [ ] Wait for GHL recovery
   - [ ] Manually trigger recovery endpoint (or wait for auto-retry)

---

### 6.2 n8n Queue Jams (Workflow Stuck)

**Scenario:** n8n is running but workflows are blocked

**Manual Test:**
1. n8n is available but workflow is paused/stuck
2. Submit 10 leads rapidly
3. Observe:
   - [ ] All 10 leads persisted to Supabase
   - [ ] 10 leads dispatched to n8n
   - [ ] n8n receives but doesn't process (workflow stuck)
   - [ ] Metrics show dispatch latency normal, but automation count = 0
   - [ ] After 5 minutes, batch alert: "n8n Queue Depth: 10 pending"

4. Ops follows runbook: N8N-QUEUE-JAMS.md
   - [ ] Check n8n dashboard for stuck workflow
   - [ ] Resume workflow manually in n8n UI
   - [ ] Metrics update as workflow processes
   - [ ] Dashboard shows "automation_count: 10" increase

---

### 6.3 Lead Loss Detection (Manual Dashboard Query)

**Scenario:** Ops team detects anomaly in lead flow

**Manual Test:**
1. Run query from runbook: LEAD-LOSS-DETECTION.md
   ```sql
   SELECT 
     COUNT(*) FILTER (WHERE metric_name = 'leads.received') as received,
     COUNT(*) FILTER (WHERE metric_name = 'leads.persisted') as persisted,
     COUNT(*) FILTER (WHERE metric_name = 'n8n.dispatch.latency_ms') as dispatched
   FROM platform.metrics_log
   WHERE timestamp > NOW() - interval '1 hour'
     AND tenant_slug = 'peskids';
   ```

2. Expected: All counts equal
3. If received > persisted: Supabase failure (check alert)
4. If persisted > dispatched: n8n dispatch failure (check circuit)
5. If dispatch success > workflow automation: n8n workflow stuck (check runbook)

---

## 7. SMOKE TEST CHECKLIST (Quick Validation)

Run this after each deployment to verify nothing broke:

```bash
#!/bin/bash
# smoke-test-reliability.sh

echo "🧪 Smoke Test: Reliability Sprint"

# 1. API health
curl -s http://localhost:3000/health | jq .status
[ $? -eq 0 ] && echo "✓ API healthy" || echo "✗ API down"

# 2. Slack notifier loads
curl -s http://localhost:3000/api/health/slack | jq .configured
[ $? -eq 0 ] && echo "✓ Slack notifier ready" || echo "✗ Slack notifier failed"

# 3. Metrics buffer initialized
curl -s http://localhost:3000/api/health/metrics | jq .buffer_size
[ $? -eq 0 ] && echo "✓ Metrics collector ready" || echo "✗ Metrics collector failed"

# 4. Database connection
psql $DATABASE_URL -c "SELECT count(*) FROM platform.metrics_log"
[ $? -eq 0 ] && echo "✓ Supabase connected" || echo "✗ Supabase failed"

# 5. GHL scopes validation
./scripts/validate-ghl-config.sh --tenant intcloudsysops
[ $? -eq 0 ] && echo "✓ Agency GHL valid" || echo "✗ Agency GHL failed"

./scripts/validate-ghl-config.sh --tenant peskids
[ $? -eq 0 ] && echo "✓ Peskids GHL valid" || echo "✗ Peskids GHL failed"

# 6. Test lead flow (ICSO form)
RESPONSE=$(curl -s -X POST http://localhost:3015/api/leads \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","message":"Test"}')

CONTACT_ID=$(echo $RESPONSE | jq -r '.contactId')
[ ! -z "$CONTACT_ID" ] && [ "$CONTACT_ID" != "null" ] \
  && echo "✓ ICSO lead flow working" \
  || echo "✗ ICSO lead flow failed"

# 7. Check circuit breaker state
CIRCUIT_STATE=$(curl -s http://localhost:3000/api/health/circuit \
  | jq -r '.ghl_state')
[ "$CIRCUIT_STATE" = "CLOSED" ] \
  && echo "✓ GHL circuit healthy" \
  || echo "⚠ GHL circuit: $CIRCUIT_STATE"

echo "✓ Smoke test complete"
```

---

## Testing Timeline

### Week 1: Manual Testing (3 days)
- [ ] Day 1: Alerting system (1.1, 1.2, 1.3)
- [ ] Day 2: Metrics collection (2.1, 2.2) + GHL integration (3.1, 3.2)
- [ ] Day 3: DLQ (4.1-4.3) + Circuit breaker (5.1-5.3)

### Week 2: Runbook Validation (2 days)
- [ ] Day 1: Incident simulations (6.1, 6.2, 6.3)
- [ ] Day 2: Ops team drill, document findings

### Week 2-3: Automated CI (continuous)
- [ ] Add unit tests for alerting service
- [ ] Add integration tests for metrics collection
- [ ] Add webhook signature validation tests
- [ ] Add DLQ batch job tests
- [ ] Add circuit breaker state machine tests

---

## Success Criteria

**All tests passing = READY FOR PRODUCTION**

| Category | Pass Criteria |
|----------|---------------|
| Alerting | All 3 alert types fire within SLA (1s, 5m, instant) |
| Metrics | 100% of leads have complete metric trail |
| GHL Integration | E2E form→contact→calendar with <2s latency |
| DLQ | Max 10 retries with exponential backoff, manual recovery works |
| Circuit Breaker | Opens at threshold, half-opens after timeout, closes on success |
| Runbooks | All 3 incident scenarios have documented recovery |
| Smoke Test | All 7 checks pass post-deployment |

---

## Failure Modes (What Not To Ship)

❌ **DO NOT SHIP IF:**
- Alerts don't fire (silent failures)
- Metrics gap > 5 seconds (visibility broken)
- Lead lost in any path (persistence missing)
- DLQ not capturing failures
- Circuit breaker not opening (cascade risk)
- Recovery takes > 15 minutes (unacceptable MTTR)
- Runbook steps don't work (undocumented)

---

**Document Version:** 1.0  
**Last Updated:** 2026-06-11  
**Maintainer:** QA Engineering  
**Review Cycle:** Post-sprint demo + before production release
