---
status: active
owner: operations
title: Test Validation + Iterative Refinement System
last_update: 2026-05-03
---

# Test Validation & Iterative Refinement System

## Overview

**Goal:** Cursor executes prompts, tests code automatically, iterates if tests fail, commits only when everything passes.

```
Cursor executes prompt
    ↓
Code generated → .cursor/responses/
    ↓
TestValidator runs:
  - npm run type-check
  - npm run test
  - npm run build
    ↓
If ALL PASS → Auto-commit ✅
If ANY FAIL → IterationManager analyzes
    ↓
IterationManager:
  - Analyzes error messages
  - Suggests refactoring
  - Creates new prompt for Cursor
    ↓
Cursor refactors (retry 1/3)
    ↓
TestValidator revalidates
    ↓
Loop until:
  a) All tests pass → Commit
  b) Max retries (3) → Escalate to human
```

## Components to Build

### 1. TestValidator Worker
**Location:** `apps/orchestrator/src/workers/TestValidatorWorker.ts`

**Responsibilities:**
- Triggered when response file appears in `.cursor/responses/`
- Extracts code from response
- Runs validation commands in order:
  1. `npm run type-check --workspace=<affected>`
  2. `npm run test --workspace=<affected>`
  3. `npm run build --workspace=<affected>`
- Captures stdout/stderr
- Returns: `{ success: true/false, errors: [], warnings: [] }`

**Queue:** `validation-jobs` (separate from local-agents)

**Payload:**
```typescript
interface ValidationJob {
  response_file: string;
  job_id: string;
  agent_role: string;
  created_files?: string[];
  workspaces_affected?: string[];
  attempt: number; // 1, 2, or 3
}
```

**Output:** Writes to `.cursor/responses/response-{id}.validation.json`
```json
{
  "job_id": "test-1",
  "attempt": 1,
  "timestamp": "2026-05-03T...",
  "validations": [
    {
      "type": "type-check",
      "status": "passed",
      "duration_ms": 1234
    },
    {
      "type": "test",
      "status": "failed",
      "error": "ENOENT: no such file...",
      "stdout": "...",
      "stderr": "..."
    }
  ],
  "overall_status": "failed",
  "can_retry": true,
  "next_action": "iterate"
}
```

### 2. IterationManager Service
**Location:** `apps/orchestrator/src/lib/iteration-manager.ts`

**Responsibilities:**
- Read validation results
- Analyze error messages
- Generate next prompt for Cursor (with refactoring suggestions)
- Track attempt count
- Decide: retry vs escalate to human

**Logic:**

```typescript
class IterationManager {
  async analyzeAndRefactor(
    jobId: string,
    attempt: number,
    errors: ValidationError[],
    originalPrompt: string,
    responseContent: string
  ): Promise<{
    shouldRetry: boolean;
    nextPrompt?: string;
    escalationReason?: string;
  }> {
    if (attempt >= 3) {
      return {
        shouldRetry: false,
        escalationReason: `Max retries (3) exceeded. Last error: ${errors[0]?.message}`
      };
    }

    // Analyze error types
    const errorPatterns = errors.map(e => ({
      type: e.type, // 'type-check', 'test', 'build'
      message: e.message,
      suggestion: this.suggestFix(e)
    }));

    // Generate refactoring prompt
    const nextPrompt = `
The previous code had validation errors. Please fix:

${errorPatterns.map(p => `- [${p.type}] ${p.message}\n  Suggestion: ${p.suggestion}`).join('\n')}

Original request: ${originalPrompt}

Previous attempt output:
\`\`\`
${responseContent}
\`\`\`

Please provide corrected code that passes all validations.
    `;

    return {
      shouldRetry: true,
      nextPrompt
    };
  }

  private suggestFix(error: ValidationError): string {
    // Pattern matching for common errors
    if (error.message.includes('Cannot find module')) {
      return 'Import all required dependencies at top of file';
    }
    if (error.message.includes('Type')) {
      return 'Check TypeScript type annotations and ensure all params are typed';
    }
    if (error.message.includes('test')) {
      return 'Review test assertions - ensure they match the actual behavior';
    }
    return 'Review error message and fix root cause';
  }
}
```

### 3. Enhanced Local-Git-Auto-Commit

**Modification to:** `scripts/local-git-auto-commit.ts`

**New behavior:**

```typescript
// Before auto-committing, check if validation passed
async function commitWithValidation(filePath: string): Promise<void> {
  const validationFile = filePath.replace('.md', '.validation.json');
  
  // Wait for validation to complete (with timeout)
  const validation = await waitForValidation(validationFile, 60000);
  
  if (validation.overall_status === 'failed') {
    // Check if retry was requested
    if (validation.next_action === 'iterate') {
      console.log(`[GitAutoCommit] Validation failed, waiting for retry...`);
      // Don't commit yet, IterationManager will trigger new prompt
      return;
    } else {
      console.log(`[GitAutoCommit] Validation failed, escalating to human...`);
      // Create help request
      await createHelpRequest(filePath, validation);
      return;
    }
  }
  
  // All validations passed, safe to commit
  await commitFile(filePath, 'All validations passed');
}
```

### 4. Enhanced LocalPromptWatcher

**Modification to:** `scripts/local-prompt-watcher.ts`

**New flow when response comes back:**

```typescript
async function onResponseDetected(responsePath: string): Promise<void> {
  const jobId = extractJobId(responsePath);
  
  // 1. Read validation result
  const validation = await readValidation(responsePath);
  
  if (validation.overall_status === 'passed') {
    console.log(`✅ Job ${jobId} validation passed`);
    // Git will commit automatically
    return;
  }
  
  if (validation.overall_status === 'failed') {
    const attempt = validation.attempt || 1;
    
    if (attempt >= 3) {
      console.log(`⚠️ Job ${jobId} failed after 3 attempts, escalating...`);
      await createHelpRequest(jobId, validation);
      return;
    }
    
    console.log(`🔄 Job ${jobId} validation failed (attempt ${attempt}/3), iterating...`);
    
    // Use IterationManager to generate refactoring prompt
    const iteration = await iterationManager.analyzeAndRefactor(
      jobId,
      attempt,
      validation.errors,
      getOriginalPrompt(jobId),
      readResponseContent(responsePath)
    );
    
    if (iteration.shouldRetry && iteration.nextPrompt) {
      // Create new prompt for retry
      const retryPromptPath = `.cursor/prompts/retry-${jobId}-attempt-${attempt+1}.md`;
      await writeFile(retryPromptPath, iteration.nextPrompt);
      
      // This triggers LocalPromptWatcher again → submit → execute → validate
      // (Loop continues until pass or max attempts)
    }
  }
}
```

## Data Flow: Complete Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│ 1. USER CREATES PROMPT                                      │
│    .cursor/prompts/task.md                                  │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. LOCALPROMPT WATCHER                                      │
│    Detects → POST /api/local/prompt-submit                  │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. ORCHESTRATOR ENQUEUES                                    │
│    local-agents queue → Unified Worker                      │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. CURSOR EXECUTES                                          │
│    Response → .cursor/responses/response-{id}.md            │
│    (File appears → TestValidator triggered)                 │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. TEST VALIDATOR RUNS                                      │
│    - npm run type-check                                     │
│    - npm run test                                           │
│    - npm run build                                          │
│    Result → response-{id}.validation.json                   │
└────────────┬──────────────────────────────┬─────────────────┘
             │                              │
    ✅ ALL PASSED                   ❌ SOME FAILED
             │                              │
             ↓                              ↓
    ┌─────────────────┐        ┌──────────────────────────┐
    │ Git Auto-Commit │        │ IterationManager Analyzes│
    │ Commit + Push   │        │ Generate Refactor Prompt │
    └─────────────────┘        └──────────┬───────────────┘
             │                            │
             ↓                    ┌───────┴─────────┐
        ✅ DONE                   │                 │
                          Attempt < 3      Attempt >= 3
                                 │                 │
                                 ↓                 ↓
                        ┌──────────────┐  ┌─────────────────┐
                        │ Retry Prompt │  │ Help Request    │
                        │ Loop (step 2)│  │ Escalate Human  │
                        └──────────────┘  └─────────────────┘
```

## Metrics & Tracking

**Metadata file:** `.cursor/prompts/.execution-history.json`

```json
{
  "jobs": [
    {
      "job_id": "test-1",
      "status": "completed",
      "attempts": 2,
      "timeline": [
        {
          "timestamp": "2026-05-03T10:00:00Z",
          "event": "submitted",
          "agent_role": "executor"
        },
        {
          "timestamp": "2026-05-03T10:00:10Z",
          "event": "response_received"
        },
        {
          "timestamp": "2026-05-03T10:00:15Z",
          "event": "validation_started",
          "attempt": 1
        },
        {
          "timestamp": "2026-05-03T10:00:25Z",
          "event": "validation_failed",
          "error": "Type check failed: 2 errors"
        },
        {
          "timestamp": "2026-05-03T10:00:30Z",
          "event": "iteration_prompted",
          "attempt": 2
        },
        {
          "timestamp": "2026-05-03T10:00:45Z",
          "event": "validation_passed",
          "attempt": 2
        },
        {
          "timestamp": "2026-05-03T10:00:50Z",
          "event": "committed",
          "commit": "abc123"
        }
      ],
      "validation_results": {
        "attempt_1": { "status": "failed", "errors": [...] },
        "attempt_2": { "status": "passed", "duration_ms": 5000 }
      }
    }
  ]
}
```

## Implementation Priority

### Phase 1 (This session) - TestValidator
- [ ] Create TestValidatorWorker
- [ ] Register in orchestrator
- [ ] Write validation.json on completion
- [ ] Handle workspace detection

### Phase 2 - IterationManager
- [x] Implement error analysis
- [x] Generate refactoring prompts
- [x] Track attempt count
- [x] Escalation logic
- [x] Response watcher integration

### Phase 3 - Integration
- [ ] Modify local-git-auto-commit for validation checks
- [ ] Modify local-prompt-watcher for retry logic
- [ ] Create help request system
- [ ] Add metrics/tracking

### Phase 4 - UX & Dashboarding
- [ ] Execution history visualization
- [ ] Retry attempt logs
- [ ] Success rate metrics
- [ ] Auto-remediation suggestions

## Success Criteria

✅ **Phase 1 Complete When:**
- Type-check, test, build commands execute in TestValidator
- Validation results written to JSON
- Worker handles multiple attempts
- Integration test passes

✅ **Full System Complete When:**
- Prompt → Execute → Validate → Pass → Commit (happy path)
- Prompt → Execute → Validate → Fail → Iterate → Pass → Commit (retry path)
- Prompt → Execute → Validate → Fail 3x → Help Request (escalation)
- Metrics show success rates per agent role
- Execution history tracks all attempts

## Example Execution Log

```
2026-05-03 10:00:00 [Prompt] task.md submitted (executor)
2026-05-03 10:00:10 [Response] response-test-1.md generated
2026-05-03 10:00:15 [Validator] Starting validations (attempt 1/3)
2026-05-03 10:00:18 [Validator]   ✅ type-check PASSED (1.2s)
2026-05-03 10:00:22 [Validator]   ❌ npm test FAILED: "Cannot find module xyz"
2026-05-03 10:00:25 [Iteration] Analyzing error...
2026-05-03 10:00:30 [Iteration] Generated retry-test-1-attempt-2.md
2026-05-03 10:00:35 [Prompt] Retry prompt submitted
2026-05-03 10:00:45 [Response] response-test-1-r2.md generated
2026-05-03 10:00:50 [Validator] Starting validations (attempt 2/3)
2026-05-03 10:00:52 [Validator]   ✅ type-check PASSED (1.1s)
2026-05-03 10:00:56 [Validator]   ✅ npm test PASSED (3.2s)
2026-05-03 10:00:58 [Validator]   ✅ npm build PASSED (2.1s)
2026-05-03 10:01:00 [Git] All validations passed, committing...
2026-05-03 10:01:02 [Git] ✅ COMMIT SUCCESSFUL
2026-05-03 10:01:02 [Summary] Job complete in 62s, 2 attempts
```

## See Also

- **LOCAL-AGENT-EXECUTION.md** — Basic execution system
- **AGENTS.md** — Current session state
- **docs/adr/ADR-XXX** (future) — Decision record for validation strategy
