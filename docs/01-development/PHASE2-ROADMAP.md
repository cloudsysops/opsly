# Phase 2 Roadmap - Iteration Manager + Agent Trainer

**Status:** Ready to implement after Phase 1 test passes  
**Timeline:** 3-5 days  
**Goal:** Enable multi-turn conversations with intelligence and self-improvement

---

## 🎯 Overview

Phase 2 transforms the system from single-turn execution to **intelligent iteration**:

```
Phase 1 (Current):
Prompt → Orchestrator → Cursor → Commit
           (linear)

Phase 2 (Next):
Prompt → Orchestrator → Cursor ↘
          ↑                    Response
          └──── Analyzer ←─────↙
                   ↓
          Next Prompt Generated
          (loop N times)
          
          + Trainer learns patterns
          + Multi-agent parallel
          + Quality refinement
```

---

## 📋 Components to Build

### 1. **IterationManager** (`apps/orchestrator/src/lib/iteration-manager.ts`)

Analyzes execution results and suggests next steps.

**Input:**
```typescript
{
  lastPrompt: string;
  lastResult: string;
  goalStatement: string;
  completionStatus: 'success' | 'incomplete' | 'blocked' | 'error';
  taskIteration: number;
}
```

**Logic:**
1. Parse result for quality/completeness
2. Check if goal achieved
3. If incomplete → suggest refinement
4. If blocked → escalate to help-request
5. If success → suggest next step
6. Return: `{ nextPrompt, reasoning, confidence }`

**Example:**
```
Input: "Task: Build API. Result: Created basic GET route"
Analysis: "Missing POST, error handling, validation"
Output: "Next: Add POST route with error handling using Zod"
```

**Files to use:**
- `applyOpenClawControlLayer()` - route to right agent for refinement vs new-step
- `HelpRequestSystem` - escalate if blocked
- `recordOpenClawEvent()` - track iteration metadata

---

### 2. **AgentTrainer** (`scripts/agent-trainer.ts`)

Learns from execution patterns to improve future suggestions.

**What it tracks:**
```json
{
  "executor": {
    "api_route_creation": {
      "success_rate": 0.92,
      "avg_steps": 2.3,
      "common_errors": ["missing_validation", "no_error_handling"],
      "typical_sequence": [
        "create_basic_route",
        "add_validation", 
        "add_error_handling",
        "add_types"
      ]
    }
  }
}
```

**Data source:** `.cursor/prompts/.metadata.json` (all completed jobs)

**Output:** `skills/training/agent-patterns.json`

**Integration:**
- IterationManager queries patterns for similar tasks
- Confidence score based on match quality
- Weights suggestions based on success rate

---

### 3. **ParallelAgentExecutor** (enhance existing orchestrator)

Execute multiple agents in parallel for complex prompts.

**Logic:**
1. Analyze prompt complexity
2. If simple: single agent (current behavior)
3. If complex: decompose into 2-3 sub-tasks
4. Route to parallel agents: Cursor, Claude, OpenCode
5. Collect all responses

**Example:**
```
Prompt: "Build user registration API"
Decomposed:
  - Task 1 (Cursor): Implement route handler
  - Task 2 (Claude): Design data validation schema
  - Task 3 (OpenCode): Add unit tests

Execute all 3 → Responses: [response1, response2, response3]
```

---

### 4. **RefinementPipeline** (new worker)

Advanced model consolidates multiple agent responses.

**Input:** `[response_cursor, response_claude, response_opencode]`

**Logic:**
1. Claude Opus analyzes all 3 responses
2. Picks best approach from each
3. Merges insights
4. Optimizes for: speed, accuracy, cost, simplicity
5. Returns: `refined_response`

**Scoring:**
- Code quality (types, error handling, patterns)
- Completeness (features, edge cases)
- Clarity (comments, structure)
- Performance (efficiency, best practices)

---

### 5. **TestRunner** (new worker)

Auto-validates generated code.

**Validates:**
- TypeScript compilation
- Linting (ESLint)
- Unit tests (Vitest)
- Type coverage
- Style conformance

**If tests fail:**
- Create help-request with error details
- Suggest fixes via IterationManager
- Auto-retry with refined prompt

---

## 🔄 New Execution Flow

```
1. User submits: .cursor/prompts/build-registration.md
   (max_iterations=5, goal="Full registration system")

2. Iteration 1:
   - Prompt → Cursor creates basic schema
   - Result: "Created User model"
   - Analysis: "Incomplete - missing routes"
   - Generated next: "Add registration route handler"
   
3. Iteration 2:
   - Prompt → Claude + Cursor in parallel
   - Responses collected
   - Refinement: Best of both merged
   - Tests: Validate
   - Result: "Added route with validation"
   - Analysis: "Incomplete - missing error handling"
   - Generated next: "Add comprehensive error handling"

4. Iteration 3:
   - Prompt → Full parallel + refinement
   - Result: "Error handling added"
   - Analysis: "Complete! 3/3 features done"
   - Action: Success - mark as complete

5. Training:
   - Record: iterations 1-3
   - Learn: "registration_api" pattern
   - Store: Success rate, typical sequence, errors
   - Use: Future similar tasks

Output: Git history shows clean progression
```

---

## 📁 Files to Create/Modify

```
NEW:
  apps/orchestrator/src/lib/iteration-manager.ts       (200-300 lines)
    - analyzeResult(result, goal) → nextPrompt
    - getAgentPattern(agentRole, taskType) → pattern
    - scoreConfidence(analysis, patterns) → number
  
  scripts/agent-trainer.ts                             (250-350 lines)
    - watchMetadata() - monitor completed jobs
    - extractPattern(prompt, result, duration) - learn
    - savePatterns() → skills/training/agent-patterns.json
  
  apps/orchestrator/src/workers/RefinementWorker.ts   (200-250 lines)
    - Consolidate multiple responses
    - Score and rank solutions
    - Return best merged version
  
  apps/orchestrator/src/workers/TestRunnerWorker.ts   (150-200 lines)
    - Run TypeScript compilation
    - Run linters and tests
    - Report results or failures
  
  .cursor/prompts/templates/
    - refinement-template.md           - When iteration needed
    - next-step-template.md            - When task incomplete
    - help-request-template.md         - When blocked
    - success-analysis-template.md     - When complete (ask insights)

MODIFY:
  apps/orchestrator/src/health-server.ts
    - Add endpoint to get/list patterns
    - Add endpoint to query trainer
  
  apps/orchestrator/src/openclaw/registry.ts
    - Register refinement and test workers
  
  .cursor/prompts/.gitignore
    - Add skills/training/ if needed
```

---

## 🧪 Phase 2 Test Scenarios

Once implemented:

**Scenario A: Simple Iteration (2 turns)**
```
Prompt: "Create hello-world.ts"
Turn 1: ✓ Creates file
Turn 2: ✓ Adds comments + types
Result: Complete in 2 steps
```

**Scenario B: Complex with Refinement (4 turns)**
```
Prompt: "Build user API" (max_iterations=5)
Turn 1: Cursor creates basic route
Turn 2: Claude + OpenCode in parallel → refined
Turn 3: Tests added
Turn 4: Error handling completed
Result: Complete in 4 steps, all tests pass
```

**Scenario C: Blocked → Help Request**
```
Prompt: "Integrate with AWS Lambda"
Turn 1: Cursor tries → hits AWS permissions error
Turn 2: Creates help-request (needs AWS setup)
Result: Human reviews, provides guidance
```

**Scenario D: Trainer Learns**
```
After 10 "API creation" jobs:
- Pattern recorded: typical 3-step sequence
- Success rate: 88%
- Common error: missing validation
Future similar task:
- Trainer suggests starting with validation
- Confidence: 92%
```

---

## ⚙️ Integration Points

**Reuse existing:**
- `applyOpenClawControlLayer()` - Route to agents
- `enqueueJob()` - Enqueue worker tasks
- `recordOpenClawEvent()` - Telemetry
- `HelpRequestSystem` - Escalation
- `CursorCopilotBridge` - File I/O

**Connect to:**
- `LocalPromptWatcher` - Trigger next prompt generation
- Metadata store - Track all iterations
- Git auto-commit - Each iteration commits cleanly

---

## 📊 Success Metrics

**Phase 2 Complete When:**
- [ ] IterationManager suggests 3/3 good next-prompts in tests
- [ ] Trainer records 20+ jobs successfully
- [ ] Parallel executor runs 2+ agents concurrently
- [ ] RefinementPipeline produces valid merged code
- [ ] TestRunner validates generated code with >95% accuracy
- [ ] Manual test: 3-turn iteration completes in <2 minutes
- [ ] Agent learns pattern: success rate improves 10%+ iteration 1→3
- [ ] Git history shows clean progression (1 commit per step)

---

## 🚀 Implementation Order

1. **IterationManager** (2 days)
   - Core analysis logic
   - Template generation
   - Pattern queries

2. **AgentTrainer** (1.5 days)
   - Metadata watcher
   - Pattern extraction
   - Persistence

3. **ParallelAgentExecutor** (1 day)
   - Task decomposition
   - Parallel routing
   - Response collection

4. **RefinementPipeline** (1 day)
   - Response analysis
   - Consolidation
   - Scoring

5. **TestRunner** (0.5 days)
   - Validators
   - Error handling
   - Integration

6. **Testing & Polish** (1 day)
   - E2E tests
   - Docs
   - Examples

**Total: 3-5 days**

---

## 📞 Kick Off Phase 2

Once you confirm Phase 1 test passes, I'll:

1. Create detailed implementation plan
2. Build IterationManager first (highest priority)
3. Connect to existing system
4. Test with multi-turn prompts
5. Add Trainer and parallel execution
6. Full integration test

---

**Let me know when Phase 1 is done! 🚀**
