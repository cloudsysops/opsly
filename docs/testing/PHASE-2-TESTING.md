---
status: active
owner: operations
last_update: 2026-05-04
---

# Phase 2 Testing & Validation Guide

Complete end-to-end testing procedures with real examples you can run now.

## Prerequisites

```bash
# Verify environment
echo $REDIS_URL              # Should be redis://localhost:6379 or similar
echo $PLATFORM_ADMIN_TOKEN   # Should be set
node -v                      # Should be v20+
npm -v                       # Should be v10+

# Verify Redis running
redis-cli ping              # Should respond: PONG
```

## Test Suite 1: Single Execution (No Iteration)

**Goal:** Verify basic prompt execution works

### Setup

```bash
# Terminal 1: Build & start orchestrator
npm run build --workspace=@intcloudsysops/orchestrator
cd apps/orchestrator && node dist/index.js &
ORCH_PID=$!

# Terminal 2: Start LocalPromptWatcher
export CURSOR_DIR=.cursor
export ORCHESTRATOR_URL=http://localhost:3011
export PLATFORM_ADMIN_TOKEN=test-token-dev
npx tsx scripts/local-prompt-watcher.ts &
WATCHER_PID=$!

# Terminal 3: Start mock agent service (no real Cursor needed)
npx tsx scripts/mock-cursor-agent.ts &
AGENT_PID=$!
```

### Test Prompt 1A: Simple Task

```bash
cat > .cursor/prompts/test-001-simple.md << 'EOF'
---
agent: cursor
max_steps: 5
---

Create a simple TypeScript function called sayHello(name: string) that returns "Hello, {name}!".

Requirements:
- Use proper TypeScript typing
- Add JSDoc comments
- Export the function as default

Return the complete code.
EOF
```

### Expected Flow

```bash
# Watch responses folder
tail -f .cursor/responses/

# Expected within 5 seconds:
# response-test-001-simple-*.md created with TypeScript code
```

**Verify:**
```bash
cat .cursor/responses/response-*.md | head -20

# Should show:
# export default function sayHello(name: string): string {
#   /** Greet a person by name */
#   return `Hello, ${name}!`;
# }
```

---

## Test Suite 2: Autonomous Iteration (3 Turns)

**Goal:** Verify auto-iteration and PromptSuggester work correctly

### Test Prompt 2A: Build API with Iterations

```bash
cat > .cursor/prompts/test-002-api-iterations.md << 'EOF'
---
agent: cursor
max_steps: 10
max_iterations: 3
goal: Build a complete user registration API endpoint
---

Create a TypeScript Express endpoint for user registration.

Base requirements:
- POST /api/users endpoint
- Accept: email, password, name
- Return: user ID and created timestamp
- Handle errors gracefully

Each iteration will add:
1. Basic endpoint with validation
2. TypeScript types and error handling
3. JSDoc documentation and tests
EOF
```

### Expected Behavior

**Iteration 1:**
```
🚀 [Iteration 1/3] Initial execution
✅ Agent creates basic endpoint
❌ Result analysis: incomplete (missing types and error handling)
→ PromptSuggester generates: "Next step: Add TypeScript types and validation"
```

**Iteration 2:**
```
🚀 [Iteration 2/3] Auto-generated refinement
✅ Agent adds types
❌ Result analysis: incomplete (missing error handling)
→ PromptSuggester generates: "Next step: Add error handling"
```

**Iteration 3:**
```
🚀 [Iteration 3/3] Final refinement
✅ Agent adds complete error handling
✅ Result analysis: complete
→ Task marked complete
✅ Auto-commit: "feat(job-*): autonomous iteration 3 turns"
```

### Monitor Iteration Progress

```bash
# Terminal: Watch iteration state
watch -n 1 'cat .cursor/iteration-state/*.json | jq ".current_iteration"'

# Terminal: Watch responses folder growth
watch -n 1 'ls -l .cursor/responses/ | wc -l'

# Terminal: View final result
cat .cursor/responses/response-test-002-api-iterations-*.md | tail -50
```

### Verify Results

```bash
# Check iteration completed
npx tsx scripts/autonomous-iteration-cli.ts status test-002-api-iterations

# Expected output:
# 📋 Session: test-002-api-iterations
# Goal: Build a complete user registration API endpoint
# Agent: cursor
# Status: completed
# Iterations: 3/3

# View trainer learned patterns
npx tsx scripts/autonomous-iteration-cli.ts patterns api

# Expected output:
# 📈 Agent Patterns (api)
# Pattern: api.*registration.*endpoint
# Success Rate: 100.0%
# Avg Iterations: 3.0
```

---

## Test Suite 3: Error Recovery

**Goal:** Verify IterationOrchestrator handles errors and refines

### Test Prompt 3A: Intentional Error → Auto-Fix

```bash
cat > .cursor/prompts/test-003-error-recovery.md << 'EOF'
---
agent: cursor
max_steps: 10
max_iterations: 3
goal: Create a function with proper error handling
---

Create a function that parses JSON safely.

Requirements:
- Accept any string input
- Return parsed object or error
- Handle all edge cases

This will intentionally cause an error on iteration 1, then auto-refine.
EOF
```

### Expected Behavior

```
Iteration 1: ❌ Missing try-catch, no error handling
  Error: "is not properly typed"
  → PromptSuggester: "Add error handling"

Iteration 2: ✅ Error handling added
  Success Rate: 100%
  → Auto-complete
```

### Verify Error Recovery

```bash
# View error patterns learned
npx tsx scripts/autonomous-iteration-cli.ts report | grep -A 5 "common_errors"

# Expected:
# Common Errors: missing_error_handling, incomplete_types
```

---

## Test Suite 4: Trainer Pattern Recognition

**Goal:** Verify AgentTrainer records and learns patterns

### Run Multiple Tests

```bash
# Create 5 similar API building prompts
for i in {1..5}; do
  cat > .cursor/prompts/test-trainer-$i.md << EOF
---
agent: cursor
max_iterations: 2
goal: Build API endpoint #$i
---
Create a REST endpoint for resource $i
EOF
done

# Monitor trainer records growth
watch -n 5 'ls -la .cursor/training/execution-records.json && du -h .cursor/training/execution-records.json'

# After 5 runs, generate patterns
npx tsx scripts/autonomous-iteration-cli.ts report

# Expected output:
# 📊 Trainer Report
# Total Executions: 5-10
# Patterns Found: 2-3
# Agent Improvements:
#   cursor
#     Success Rate: +20%
#     Speed: 1.8x
```

---

## Test Suite 5: Full Production Flow

**Goal:** End-to-end with all components

### Complete Setup

```bash
#!/bin/bash
set -e

export CURSOR_DIR=.cursor
export REDIS_URL=redis://localhost:6379
export OPSLY_ORCHESTRATOR_ROLE=worker
export LOCAL_AGENT_CONCURRENCY=2
export PLATFORM_ADMIN_TOKEN=test-token

echo "🚀 Starting orchestrator..."
npm run build --workspace=@intcloudsysops/orchestrator
cd apps/orchestrator && node dist/index.js > /tmp/orch.log 2>&1 &
ORCH_PID=$!
sleep 2

echo "🚀 Starting LocalPromptWatcher..."
cd - && npx tsx scripts/local-prompt-watcher.ts > /tmp/watcher.log 2>&1 &
WATCHER_PID=$!
sleep 1

echo "🚀 Starting mock agent..."
npx tsx scripts/mock-cursor-agent.ts > /tmp/agent.log 2>&1 &
AGENT_PID=$!
sleep 1

echo "✅ All services started"
echo "  Orchestrator: $ORCH_PID"
echo "  Watcher: $WATCHER_PID"
echo "  Agent: $AGENT_PID"
echo ""
echo "Logs:"
echo "  tail -f /tmp/orch.log"
echo "  tail -f /tmp/watcher.log"
echo "  tail -f /tmp/agent.log"

# Keep running
wait
```

### Run Full Test

```bash
# Save script
cat > /tmp/start-test.sh << 'EOF'
#!/bin/bash
# ... script above
EOF
chmod +x /tmp/start-test.sh

# Start services
/tmp/start-test.sh &
sleep 5

# Create prompt
cat > .cursor/prompts/test-production-flow.md << 'EOF'
---
agent: cursor
max_iterations: 3
goal: Full production test
---

Create a complete microservice with API, validation, and types.
EOF

# Monitor
echo "Monitoring execution..."
for i in {1..30}; do
  echo "[$(date +%H:%M:%S)] Iteration $(ls .cursor/responses/ | wc -l)/3"
  sleep 1
done

# Verify completion
npx tsx scripts/autonomous-iteration-cli.ts status
npx tsx scripts/autonomous-iteration-cli.ts report
```

---

## Test Suite 6: Stress Testing

**Goal:** Verify system handles multiple concurrent jobs

### Concurrent Jobs

```bash
# Create 5 prompts simultaneously
for i in {1..5}; do
  cat > .cursor/prompts/stress-$i.md << EOF
---
agent: cursor
max_iterations: 2
goal: Stress test job $i
---
Create resource handler #$i
EOF
done

# Monitor queue depth
watch -n 1 'redis-cli LLEN bull:local-agents:wait'

# Monitor completion
watch -n 2 'ls -l .cursor/responses/ | wc -l'

# Should handle all 5 jobs with concurrency=2
# Time: ~30-40 seconds
```

### Verify Performance

```bash
# Check executor times
cat .cursor/training/execution-records.json | jq '[.[] | .duration_ms] | {max, min, avg: (add/length)}'

# Expected:
# max: 8000-10000
# min: 2000-3000
# avg: 5000
```

---

## CLI Commands Reference

### View Status

```bash
# All sessions
npx tsx scripts/autonomous-iteration-cli.ts status

# Specific session
npx tsx scripts/autonomous-iteration-cli.ts status test-002-api-iterations
```

### View Patterns

```bash
# All patterns
npx tsx scripts/autonomous-iteration-cli.ts patterns

# Filtered by keyword
npx tsx scripts/autonomous-iteration-cli.ts patterns api
npx tsx scripts/autonomous-iteration-cli.ts patterns validation
```

### View Execution History

```bash
# Full history for session
npx tsx scripts/autonomous-iteration-cli.ts history test-002-api-iterations
```

### View Trainer Report

```bash
# Complete analysis
npx tsx scripts/autonomous-iteration-cli.ts report

# Expected format:
# 📊 Trainer Report
# Generated: 2026-05-04T...
# Total Executions: 15
# Patterns Found: 4
#
# Top Patterns:
#   cursor / api.*endpoint
#     Success: 90% | Speed: 3.2s
#   cursor / typescript.*types
#     Success: 95% | Speed: 2.1s
#
# Agent Improvements:
#   cursor
#     Success Rate: +25%
#     Speed: 2.3x
#     Quality: 0.82
```

### Reset Session

```bash
# Remove session state (for testing)
npx tsx scripts/autonomous-iteration-cli.ts reset test-002-api-iterations
```

---

## Debugging

### Check Orchestrator Logs

```bash
# Real-time logs
tail -f /tmp/orch.log | grep -E "Processing|iteration|trainer"

# View errors
grep ERROR /tmp/orch.log
```

### Check Queue Status

```bash
# Queue depth
redis-cli LLEN bull:local-agents:wait     # Jobs waiting
redis-cli LLEN bull:local-agents:active   # Currently executing
redis-cli LLEN bull:local-agents:completed # Completed

# Recent jobs
redis-cli LRANGE bull:local-agents:completed -5 -1
```

### Check Agent Service

```bash
# Health check
curl http://localhost:5001/health

# Expected:
# {"status":"ok","service":"cursor"}
```

### View Iteration State

```bash
# All sessions
ls -la .cursor/iteration-state/

# Specific session
cat .cursor/iteration-state/test-002-api-iterations.json | jq .
```

### View Training Records

```bash
# Recent executions
cat .cursor/training/execution-records.json | jq '.[-3:]'

# Count by agent
cat .cursor/training/execution-records.json | jq '[.[] | .agent_role] | group_by(.) | map({agent: .[0], count: length})'
```

---

## Success Criteria

### Test Suite 1 (Single Execution)
- ✅ Prompt detected by LocalPromptWatcher
- ✅ Job enqueued to local-agents
- ✅ Agent executes within 5 seconds
- ✅ Response written to .cursor/responses/
- ✅ AgentTrainer records execution
- ✅ Exit code 0

### Test Suite 2 (Autonomous Iteration)
- ✅ 3 iterations complete
- ✅ Each iteration uses PromptSuggester
- ✅ IterationOrchestrator tracks state
- ✅ Final result is complete & working
- ✅ Single git commit with job ID
- ✅ Trainer shows pattern learned

### Test Suite 3 (Error Recovery)
- ✅ Iteration 1: Error detected
- ✅ Iteration 2: Auto-refined
- ✅ Error pattern recorded in trainer
- ✅ Success rate tracked

### Test Suite 4 (Pattern Recognition)
- ✅ 5+ executions recorded
- ✅ Patterns extracted (success rate, errors)
- ✅ Improvements calculated
- ✅ Report generation works

### Test Suite 5 (Full Production)
- ✅ All components work together
- ✅ Queue processing stable
- ✅ Git commits clean
- ✅ Trainer reports accurate
- ✅ Performance metrics recorded

### Test Suite 6 (Stress Testing)
- ✅ 5 concurrent jobs
- ✅ Concurrency=2 respected
- ✅ All jobs complete successfully
- ✅ No queue overflow
- ✅ Trainer handles load

---

## Next: Production Deployment

Once all test suites pass:

1. Deploy to VPS (`docs/01-development/PHASE-2-DEPLOYMENT.md`)
2. Configure Tailscale for remote agents
3. Set up monitoring (Prometheus, Grafana)
4. Enable auto-scaling (concurrency > 4)
5. Deploy Phase 3 (multi-agent orchestration)

---

**Ready to test? Start with Test Suite 1 above!**

---

## Enlaces relacionados

- [[testing/README|testing]]
- [[brain/README|Brain Central]]
