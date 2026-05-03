---
agent_role: executor
max_steps: 6
goal: Add observability and metrics to autonomous system
priority: 47000
---

# Task 4: Executor (OpenCode) - Observability & Metrics

Add comprehensive observability to the autonomous execution system.

**Create:** `apps/orchestrator/src/lib/execution-metrics.ts`

**Requirements:**

1. **MetricsCollector class:**
   - `recordValidation(jobId, status, durationMs)`
   - `recordIteration(jobId, attempt, success)`
   - `recordCommit(jobId, filesChanged)`
   - `getStats()` → returns aggregated metrics

2. **Metrics tracked:**
   - Total jobs executed
   - Success rate (%) 
   - Avg validation time
   - Avg iterations to success
   - Files changed per job
   - Errors by type (type-check, test, build)

3. **Export to logs:**
   - Console output every 100 jobs
   - JSON export capability
   - Per-agent role breakdown

4. **Integration points:**
   - Hook into TestValidatorWorker
   - Hook into IterationManager
   - Hook into LocalGitAutoCommit

**Success:** 
- All metrics properly recorded
- No performance regression
- Types are strict (no `any`)
- Integration compiles without errors

**Bonus:** Add to AUTONOMOUS-EXECUTION-GUIDE.md: "Metrics & Monitoring" section
