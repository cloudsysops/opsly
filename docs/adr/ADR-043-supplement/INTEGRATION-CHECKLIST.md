# ADR-043: Integration Checklist for Syra ↔ OpenClaw

**Decision Document:** ADR-033 - Intelligent Content Generation via LLM Gateway  
**Implementation Timeline:** 2 weeks (May 8-22, 2026)  
**Owner:** Hermes Agent (Architect)  
**Reviewers:** Platform Leads (Brissa, Michelle, Lousa)

---

## 🚀 Phase 1: Implementation (Days 1-3)

### A. Code Development

#### Task 1.A.1: Create content-generator-v2.ts
- [ ] **File:** `apps/api/lib/social/content-generator-v2.ts`
- [ ] **Acceptance Criteria:**
  - [ ] Implements `SyraContentGeneratorV2` class
  - [ ] Method: `generateContent(job: ContentJob)`
  - [ ] Calls `llmCallWithFallback()` from `@intcloudsysops/llm-gateway`
  - [ ] Returns response with metadata (model_used, cost_usd, cache_hit)
  - [ ] Error handling: catches timeout, falls back gracefully
  - [ ] Logging: structured logs for every call
- [ ] **Tests Required:**
  - [ ] Unit test: buildSmartPrompt() for each event_type
  - [ ] Unit test: inferTone() returns correct tone
  - [ ] Unit test: parseAndFormatContent() handles JSON response
  - [ ] Integration test: llmCallWithFallback() mock
  - [ ] Integration test: fallback chain triggered on timeout

#### Task 1.A.2: Update types & interfaces
- [ ] **Files:**
  - [ ] `apps/api/lib/social/types.ts` - Add SocialContentRequest
  - [ ] `apps/api/lib/social/types.ts` - Add GeneratedContent interface
- [ ] **Acceptance Criteria:**
  - [ ] All types imported from gateway (LLMRequest, LLMResponse)
  - [ ] Platform-specific content types (TwitterContent, etc.)
  - [ ] Metadata fields (model_used, cost_usd, cache_hit, latency_ms)
  - [ ] JSDoc comments for all interfaces

#### Task 1.A.3: Database migration
- [ ] **File:** `supabase/migrations/20260508_add_llm_metrics.sql`
- [ ] **Acceptance Criteria:**
  - [ ] ALTER generated_content table
    - [ ] ADD model_used TEXT
    - [ ] ADD cost_usd DECIMAL(10,4)
    - [ ] ADD cache_hit BOOLEAN
    - [ ] ADD quality_score DECIMAL(3,2)
    - [ ] ADD latency_ms INT
  - [ ] CREATE INDEX idx_generated_content_cost_date
  - [ ] CREATE INDEX idx_generated_content_cache_hit
  - [ ] Test on staging database
  - [ ] Rollback script prepared

#### Task 1.A.4: Update publish endpoint
- [ ] **File:** `apps/api/app/api/social/publish/route.ts`
- [ ] **Acceptance Criteria:**
  - [ ] Accept cost_usd, model_used, cache_hit in request body
  - [ ] Store metrics in database
  - [ ] Return metrics in response
  - [ ] Backward compatible with v1 generator

---

### B. Gateway Integration

#### Task 1.B.1: Verify gateway exports
- [ ] **File:** `apps/llm-gateway/src/index.ts`
- [ ] **Acceptance Criteria:**
  - [ ] Export `llmCallWithFallback` ✅
  - [ ] Export `llmCall` ✅
  - [ ] Export `checkBudget` ✅
  - [ ] Export `analyzeComplexity` ✅
  - [ ] Export types: `LLMRequest`, `LLMResponse` ✅
  - [ ] Versions match (semantic versioning)

#### Task 1.B.2: Add Syra to gateway configuration
- [ ] **File:** `apps/llm-gateway/src/config/features.ts` (or create if not exists)
- [ ] **Acceptance Criteria:**
  - [ ] Add feature: `social_content_generation`
  - [ ] Default route: 'balanced'
  - [ ] Default budget: $0.40/month per tenant
  - [ ] Default cache: true
  - [ ] Fallback strategy: 'templates'

#### Task 1.B.3: Test gateway integration locally
- [ ] **Acceptance Criteria:**
  - [ ] Gateway starts on port 3010
  - [ ] Health check: GET /health returns 200
  - [ ] Can call llmCallWithFallback() from Node.js
  - [ ] Fallback chain works (mock provider timeout)
  - [ ] Budget enforcement active
  - [ ] Cache hits recorded

---

### C. Environment & Dependencies

#### Task 1.C.1: Update package.json
- [ ] **File:** `apps/api/package.json`
- [ ] **Acceptance Criteria:**
  - [ ] Dependency: `@intcloudsysops/llm-gateway` added
  - [ ] Version: same as workspace version
  - [ ] Run `npm install` without errors

#### Task 1.C.2: Configure environment variables
- [ ] **File:** `.env.local` (or `.env.development`)
- [ ] **Variables Required:**
  - [ ] `LLM_GATEWAY_URL=http://localhost:3010` (dev)
  - [ ] `LLM_GATEWAY_TIMEOUT_MS=3000`
  - [ ] `SYRA_USE_GATEWAY=true` (feature flag)
  - [ ] `SUPABASE_URL=http://localhost:54321`
  - [ ] `SUPABASE_ANON_KEY=...`
- [ ] **Acceptance Criteria:**
  - [ ] All vars documented in README
  - [ ] Production values in Doppler secrets
  - [ ] No hardcoded values in code

---

### D. Documentation

#### Task 1.D.1: Code comments & JSDoc
- [ ] **Files:**
  - [ ] `content-generator-v2.ts` - Full JSDoc for all methods
  - [ ] `types.ts` - Full JSDoc for all interfaces
- [ ] **Acceptance Criteria:**
  - [ ] Every public method documented
  - [ ] Every parameter documented
  - [ ] Return types documented
  - [ ] Examples in @example blocks

#### Task 1.D.2: Update README
- [ ] **File:** `apps/api/README.md`
- [ ] **Content:**
  - [ ] Section: "Syra Social Content Generation"
  - [ ] How to enable (SYRA_USE_GATEWAY=true)
  - [ ] Cost estimates (monthly)
  - [ ] Fallback behavior
  - [ ] Troubleshooting

---

## ✅ Phase 2: Testing (Days 4-5)

### A. Unit Tests

#### Task 2.A.1: Test smart prompt builders
- [ ] **File:** `apps/api/__tests__/lib/social/content-generator-v2.test.ts`
- [ ] **Test Cases:**
  - [ ] buildSmartPrompt(deployment) → "Deployment tone"
  - [ ] buildSmartPrompt(milestone) → "Ambitious tone"
  - [ ] buildSmartPrompt(achievement) → "Confident tone"
  - [ ] buildSmartPrompt(security_approved) → "Professional tone"
  - [ ] Includes event title, description, agents
  - [ ] Includes platform constraints
- [ ] **Coverage:** > 90%

#### Task 2.A.2: Test content formatting
- [ ] **Test Cases:**
  - [ ] parseAndFormatContent(twitter) → threads array
  - [ ] parseAndFormatContent(linkedin) → title + body
  - [ ] parseAndFormatContent(discord) → embeds array
  - [ ] parseAndFormatContent(slack) → blocks array
  - [ ] Handles JSON parse errors gracefully
  - [ ] Filters platforms correctly
- [ ] **Coverage:** > 85%

#### Task 2.A.3: Test tone inference
- [ ] **Test Cases:**
  - [ ] inferTone('deployment') = 'excited, celebratory'
  - [ ] inferTone('milestone') = 'ambitious, proud'
  - [ ] inferTone('security_approved') = 'professional, trustworthy'
  - [ ] Unknown event type → default tone
- [ ] **Coverage:** 100%

---

### B. Integration Tests

#### Task 2.B.1: Test with gateway mock
- [ ] **File:** `apps/api/__tests__/lib/social/content-generator-v2-integration.test.ts`
- [ ] **Test Cases:**
  - [ ] generateContent(deployment) → LLMResponse mock
  - [ ] Response includes model_used, cost_usd, cache_hit
  - [ ] Response stored in database
  - [ ] Metadata persisted correctly
- [ ] **Setup:**
  - [ ] Mock llmCallWithFallback()
  - [ ] Mock Supabase insert
  - [ ] Verify metrics logging

#### Task 2.B.2: Test fallback behavior
- [ ] **Test Cases:**
  - [ ] llmCallWithFallback timeout → fallback triggered
  - [ ] All providers fail → template fallback
  - [ ] Budget exhausted → templates only
  - [ ] Error logged with full context
- [ ] **Setup:**
  - [ ] Mock timeout at 3000ms
  - [ ] Mock provider failures
  - [ ] Verify fallback chain executed

#### Task 2.B.3: Test database persistence
- [ ] **Setup:**
  - [ ] Use Supabase test database
  - [ ] Create generated_content row
  - [ ] Verify all columns populated
- [ ] **Test Cases:**
  - [ ] model_used stored correctly
  - [ ] cost_usd calculated correctly
  - [ ] cache_hit boolean stored
  - [ ] quality_score persisted
  - [ ] latency_ms recorded
  - [ ] Indexes work (query by cost, cache_hit)

---

### C. Load & Performance Tests

#### Task 2.C.1: Throughput test
- [ ] **Scenario:** 50 posts/month (average)
- [ ] **Acceptance Criteria:**
  - [ ] 1 post/hour sustained
  - [ ] p50 latency < 1000ms
  - [ ] p95 latency < 2000ms
  - [ ] p99 latency < 3000ms
  - [ ] No timeout failures

#### Task 2.C.2: Cache efficiency test
- [ ] **Scenario:** 10 similar events (high cache overlap)
- [ ] **Acceptance Criteria:**
  - [ ] Cache hit rate > 60%
  - [ ] Cached responses < 100ms
  - [ ] Cost savings > 50%

#### Task 2.C.3: Fallback performance
- [ ] **Scenario:** Provider unavailable (timeout)
- [ ] **Acceptance Criteria:**
  - [ ] Fallback triggers within 3s
  - [ ] Total latency < 6s
  - [ ] Template fallback < 10ms

---

### D. Quality Assurance

#### Task 2.D.1: Code review
- [ ] **Reviewers:**
  - [ ] Platform architect (Brissa or designee)
  - [ ] Backend lead
  - [ ] Gateway maintainer
- [ ] **Checklist:**
  - [ ] Code style consistent
  - [ ] No hardcoded values
  - [ ] Error handling comprehensive
  - [ ] Logging adequate
  - [ ] Type safety enforced (strict TypeScript)
  - [ ] Security: no credential leaks

#### Task 2.D.2: Security audit
- [ ] **Checklist:**
  - [ ] No API keys logged
  - [ ] Request sanitization tested
  - [ ] Budget enforcement verified
  - [ ] Rate limiting respected
  - [ ] Audit trail complete

#### Task 2.D.3: Documentation review
- [ ] **Checklist:**
  - [ ] README accurate
  - [ ] JSDoc complete
  - [ ] Examples runnable
  - [ ] Troubleshooting comprehensive

---

## 🎯 Phase 3: Staging Deployment (Days 6-8)

### A. Staging Environment Setup

#### Task 3.A.1: Deploy to staging
- [ ] **Steps:**
  1. [ ] Merge code to staging branch
  2. [ ] Run CI/CD pipeline
  3. [ ] Deploy to staging cluster
  4. [ ] Verify gateway connectivity
  5. [ ] Verify database schema
  6. [ ] Health check: GET /health
- [ ] **Success Criteria:**
  - [ ] No errors in logs
  - [ ] Gateway responds to requests
  - [ ] Database queries work

#### Task 3.A.2: Feature flag configuration
- [ ] **File:** Feature flag system (Doppler / config)
- [ ] **Settings:**
  - [ ] `SYRA_USE_GATEWAY=false` (v1 still default)
  - [ ] `SYRA_GATEWAY_CANARY_PCT=0` (no traffic yet)
- [ ] **Acceptance Criteria:**
  - [ ] Flag can be toggled without restart
  - [ ] Both v1 and v2 generators available

---

### B. Staging Testing

#### Task 3.B.1: End-to-end test
- [ ] **Scenario:** Trigger event → publish → verify
- [ ] **Steps:**
  1. [ ] POST /api/social/trigger
  2. [ ] Check generated_content table
  3. [ ] Verify metrics stored
  4. [ ] Check publish status
- [ ] **Success Criteria:**
  - [ ] Content generated via gateway
  - [ ] Metrics persisted
  - [ ] No errors in logs

#### Task 3.B.2: Canary test (10% traffic)
- [ ] **Duration:** 24 hours
- [ ] **Setup:**
  - [ ] Set `SYRA_GATEWAY_CANARY_PCT=10`
  - [ ] 10% of requests go to v2, 90% to v1
- [ ] **Monitoring:**
  - [ ] Error rate (target: same as v1)
  - [ ] Latency (target: < 2s p95)
  - [ ] Cost (target: < $0.02 per post)
  - [ ] Cache hit rate (target: > 50%)
- [ ] **Pass Criteria:**
  - [ ] No increase in error rate
  - [ ] Latency acceptable
  - [ ] Cost savings visible
  - [ ] No quality regression

#### Task 3.B.3: Monitoring setup
- [ ] **Dashboards:** Create in Grafana
  - [ ] Cost per month (v1 vs v2)
  - [ ] Latency distribution (p50, p95, p99)
  - [ ] Cache hit rate trend
  - [ ] Model usage breakdown
  - [ ] Error rate by fallback type
- [ ] **Alerts:** Configure in PagerDuty
  - [ ] Alert: Error rate > 5%
  - [ ] Alert: Budget exceeded
  - [ ] Alert: Latency > 3s p99
  - [ ] Alert: Cache hit rate < 40%

---

### C. Staging Validation

#### Task 3.C.1: Cost audit
- [ ] **Check:**
  - [ ] Total cost for staging posts: < $1 for 50 posts
  - [ ] No unexpected charges
  - [ ] Billing matches calculated cost
- [ ] **Approval:** Finance sign-off

#### Task 3.C.2: Quality audit
- [ ] **Sample:** 5 published posts
- [ ] **Check:**
  - [ ] Content is coherent
  - [ ] Tone is appropriate
  - [ ] No hallucinations
  - [ ] Format correct (per platform)
- [ ] **Approval:** Lousa (quality agent) sign-off

#### Task 3.C.3: Operational readiness
- [ ] **Check:**
  - [ ] Runbooks created
  - [ ] On-call guide updated
  - [ ] Incident response plan ready
  - [ ] Rollback procedure tested
- [ ] **Approval:** Platform lead sign-off

---

## 🚀 Phase 4: Production Rollout (Days 9-14)

### A. Gradual Rollout

#### Task 4.A.1: Day 1 - 10% traffic
- [ ] **Setup:** Set `SYRA_GATEWAY_CANARY_PCT=10`
- [ ] **Monitoring:**
  - [ ] Check logs every 2 hours
  - [ ] Monitor dashboard in real-time
  - [ ] On-call engineer standing by
- [ ] **Rollback Criteria:**
  - [ ] Error rate > 10%
  - [ ] Latency p99 > 5s
  - [ ] Cost > $0.05 per post
  - [ ] Quality score < 0.7
- [ ] **Approval to proceed:** Platform lead

#### Task 4.A.2: Day 2 - 50% traffic
- [ ] **Setup:** Set `SYRA_GATEWAY_CANARY_PCT=50`
- [ ] **Monitoring:** Same as Day 1
- [ ] **Duration:** 24 hours
- [ ] **Approval to proceed:** Platform lead + Finance

#### Task 4.A.3: Day 3 - 100% traffic
- [ ] **Setup:** Set `SYRA_GATEWAY_CANARY_PCT=100`
- [ ] **Finality:** v1 generator archived
- [ ] **Monitoring:** Continue for 7 days post-rollout
- [ ] **Celebration:** 🎉 (only if no issues)

---

### B. Production Monitoring

#### Task 4.B.1: Real-time monitoring
- [ ] **Duration:** Days 1-7 post-rollout
- [ ] **On-Call:** 24/7 engineer coverage
- [ ] **Dashboard:** Displayed in war room
- [ ] **Metrics:**
  - [ ] Cost per post (target: $0.001-0.02)
  - [ ] Cache hit rate (target: > 70%)
  - [ ] Quality score (target: > 0.8)
  - [ ] Error rate (target: < 1%)
  - [ ] Latency p95 (target: < 2s)

#### Task 4.B.2: Daily reports
- [ ] **Report:** Send to stakeholders
  - [ ] Total posts generated
  - [ ] Total cost ($)
  - [ ] Avg quality score
  - [ ] Cache hit rate
  - [ ] Incidents (if any)
- [ ] **Schedule:** Daily at 9 AM

#### Task 4.B.3: Weekly retrospective
- [ ] **Duration:** Week 1 post-rollout
- [ ] **Attendees:** Platform lead, Brissa, Michelle, Lousa
- [ ] **Topics:**
  - [ ] How did v2 perform vs v1?
  - [ ] Were cost savings achieved?
  - [ ] Were there any incidents?
  - [ ] Quality feedback?
  - [ ] What to improve?

---

### C. Production Hardening

#### Task 4.C.1: Archive v1 generator
- [ ] **File:** `apps/api/lib/social/content-generator.ts`
- [ ] **Action:**
  - [ ] Move to `_archive/` directory
  - [ ] Add deprecation notice
  - [ ] Update imports to v2
  - [ ] Remove from exports
- [ ] **Timing:** After 7 days of stable v2

#### Task 4.C.2: Update documentation
- [ ] **Files to update:**
  - [ ] `docs/03-agents/SYRA-IMPLEMENTATION-GUIDE.md`
  - [ ] `apps/api/README.md`
  - [ ] Runbooks in `docs/runbooks/`
- [ ] **Changes:**
  - [ ] Reference ADR-033
  - [ ] Update architecture diagrams
  - [ ] Update cost estimates
  - [ ] Update troubleshooting

#### Task 4.C.3: Cleanup
- [ ] **Remove:**
  - [ ] Feature flag `SYRA_USE_GATEWAY` (v2 is default)
  - [ ] Feature flag `SYRA_GATEWAY_CANARY_PCT` (no longer needed)
  - [ ] v1 generator tests
- [ ] **Timing:** After 30 days stable v2

---

## 📊 Phase 5: Monitoring & Optimization (Ongoing)

### A. Long-term Monitoring

#### Task 5.A.1: Monthly cost audit
- [ ] **Frequency:** 1st of every month
- [ ] **Check:**
  - [ ] Total cost (target: < $0.50/month)
  - [ ] Cost per tenant
  - [ ] Cost by model (Sonnet vs Haiku vs Cache)
  - [ ] Savings vs baseline (target: 84%)
- [ ] **Report:** Send to Finance & Platform lead

#### Task 5.A.2: Quality tracking
- [ ] **Frequency:** Weekly
- [ ] **Metrics:**
  - [ ] Avg quality score (target: > 0.85)
  - [ ] Quality by model (should match: Sonnet > Haiku)
  - [ ] Quality by event type
  - [ ] User feedback (thumbs up/down on posts)
- [ ] **Report:** Share with Syra & Lousa

#### Task 5.A.3: Performance tracking
- [ ] **Frequency:** Weekly
- [ ] **Metrics:**
  - [ ] Latency p50, p95, p99
  - [ ] Cache hit rate
  - [ ] Fallback frequency
  - [ ] Error rate
- [ ] **Report:** Share with platform engineers

---

### B. Optimization Cycles

#### Task 5.B.1: Cache optimization (Week 2)
- [ ] **Goal:** Improve cache hit rate from 70% → 80%
- [ ] **Actions:**
  - [ ] Analyze cache misses
  - [ ] Adjust semantic similarity threshold?
  - [ ] Pre-warm cache with common events?
  - [ ] Improve prompt similarity?
- [ ] **Target:** Reduce cost by additional 5-10%

#### Task 5.B.2: Tone refinement (Week 3)
- [ ] **Goal:** Improve quality score from 0.85 → 0.90
- [ ] **Actions:**
  - [ ] Collect feedback on tone appropriateness
  - [ ] Refine system prompt
  - [ ] Add event-specific instructions
  - [ ] A/B test different prompts
- [ ] **Measurement:** Quality score from gateway

#### Task 5.B.3: Model routing tuning (Week 4)
- [ ] **Goal:** Optimize cost-quality tradeoff
- [ ] **Analysis:**
  - [ ] Which event types benefit from Sonnet?
  - [ ] Which can be Haiku or Cheap?
  - [ ] Can we decompose more complex posts?
  - [ ] Cache distribution by event type?
- [ ] **Action:** Adjust routing_bias based on data

---

## 📋 Acceptance Criteria (Overall)

### Must Have (MVP)

- [ ] ✅ Direct gateway integration works (v2 generator)
- [ ] ✅ Cost tracking persisted in database
- [ ] ✅ Fallback chain tested and working
- [ ] ✅ Budget enforcement active
- [ ] ✅ Cache hits recorded
- [ ] ✅ Error rate < 1% in production
- [ ] ✅ Latency p95 < 2 seconds
- [ ] ✅ Cost savings > 80% vs direct Claude
- [ ] ✅ Quality score > 0.80
- [ ] ✅ Documentation complete
- [ ] ✅ Runbooks ready

### Should Have (Nice to Have)

- [ ] Semantic cache hit rate > 75%
- [ ] Quality score > 0.90
- [ ] Cost savings > 85%
- [ ] A/B testing framework
- [ ] Multi-language support
- [ ] Real-time tone optimization

### Nice to Have (Future)

- [ ] Image generation via gateway
- [ ] Voice narration via ElevenLabs
- [ ] Sentiment analysis pre-publish
- [ ] Cross-platform optimization

---

## 🎯 Success Metrics

| Metric | Target | Baseline | Improvement |
|--------|--------|----------|-------------|
| Cost per post | $0.01 | $0.05 | 80% ↓ |
| Quality score | 0.85+ | 0.65 | 30% ↑ |
| Cache hit rate | 75% | N/A | New |
| Latency p95 | <2s | <3s | 33% ↓ |
| Error rate | <1% | <2% | 50% ↓ |
| Fallback rate | <5% | N/A | New |

---

## 📞 Support & Escalation

### Questions?
- **Slack:** #platform-architecture
- **Escalation:** @brissa (Platform Lead)

### Issues?
- **Critical:** Page on-call engineer
- **High:** File GitHub issue + Slack
- **Medium:** Slack + schedule meeting
- **Low:** Add to backlog

### Rollback Procedure
- **Decision:** Platform lead + On-call engineer
- **Execution:** 5 minutes (flip feature flag)
- **Verification:** Health checks pass
- **Communication:** Announce in #incidents

---

**Checklist Version:** 1.0  
**Last Updated:** 2026-05-08  
**Owner:** Hermes Agent (Architect)
