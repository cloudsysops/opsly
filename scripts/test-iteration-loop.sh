#!/bin/bash

# Test script for iteration loop: validation → retry → pass → commit
# Usage: ./scripts/test-iteration-loop.sh

set -e

echo "🚀 Testing Iteration Loop (Validation → Retry → Commit)"
echo ""

CURSOR_DIR="${CURSOR_DIR:-.cursor}"
ORCHESTRATOR_URL="${ORCHESTRATOR_URL:-http://localhost:3011}"
PLATFORM_ADMIN_TOKEN="${PLATFORM_ADMIN_TOKEN:-local-dev}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Create test directories
mkdir -p "${CURSOR_DIR}/prompts"
mkdir -p "${CURSOR_DIR}/responses"
mkdir -p "src"

echo -e "${YELLOW}📋 Test Scenario: Code validation → failure → auto-retry → success${NC}"
echo ""

# Create initial prompt with intentional error
TEST_PROMPT="${CURSOR_DIR}/prompts/iteration-test-$(date +%s).md"

cat > "${TEST_PROMPT}" << 'EOF'
---
agent_role: executor
max_steps: 5
goal: Create a function that will intentionally fail validation
---

Create a simple function that adds two numbers.

File: src/add.ts

Export a default function that takes two parameters (a and b) and returns their sum.
EOF

echo -e "${GREEN}✅ Created test prompt: $(basename ${TEST_PROMPT})${NC}"
echo "   File: ${TEST_PROMPT}"
echo ""

# Extract request ID
FILENAME=$(basename "${TEST_PROMPT}")
REQUEST_ID="${FILENAME%.md}"

echo -e "${YELLOW}🔄 Simulating execution pipeline...${NC}"
echo ""

# Step 1: Show what would happen
echo -e "${YELLOW}Step 1: LocalPromptWatcher detects prompt${NC}"
echo "   → Would POST to /api/local/prompt-submit"
echo ""

# Step 2: Create fake response with intentional error
echo -e "${YELLOW}Step 2: Agent executes (simulated)${NC}"
RESPONSE_FILE="${CURSOR_DIR}/responses/response-${REQUEST_ID}.md"

cat > "${RESPONSE_FILE}" << 'EOF'
# Response

```typescript
export default function add(a, b) {  // Error: missing type annotations
  return a + b
}
```
EOF

echo "   ✅ Response written: response-${REQUEST_ID}.md"
echo ""

# Step 3: Simulate TestValidator running
echo -e "${YELLOW}Step 3: TestValidator runs validations${NC}"
VALIDATION_FILE="${CURSOR_DIR}/responses/response-${REQUEST_ID}.validation.json"

# Create validation report showing type-check failure
cat > "${VALIDATION_FILE}" << EOF
{
  "job_id": "${REQUEST_ID}",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "attempt": 1,
  "validations": [
    {
      "type": "type-check",
      "status": "failed",
      "error": "Parameter 'a' implicitly has an 'any' type. Parameter 'b' implicitly has an 'any' type."
    }
  ],
  "overall_status": "failed",
  "can_retry": true,
  "next_action": "iterate",
  "total_duration_ms": 2500,
  "errors": [
    {
      "type": "type-check",
      "message": "Parameter 'a' implicitly has an 'any' type. Parameter 'b' implicitly has an 'any' type."
    }
  ]
}
EOF

echo "   ❌ Type-check FAILED: Missing type annotations"
echo "   ✅ Validation report created"
echo ""

# Step 4: Show IterationManager processing
echo -e "${YELLOW}Step 4: IterationManager analyzes errors${NC}"
echo "   Reading: response-${REQUEST_ID}.validation.json"
echo "   Analyzing: Parameter type errors"
echo "   Suggestion: Add TypeScript type annotations (string, number, etc.)"
echo ""

# Step 5: Simulate retry prompt generation
echo -e "${YELLOW}Step 5: IterationManager generates retry prompt${NC}"
RETRY_PROMPT="${CURSOR_DIR}/prompts/retry-${REQUEST_ID}-attempt-2.md"

cat > "${RETRY_PROMPT}" << EOF
# Code Refinement Required (Attempt 2/3)

Your previous implementation has validation errors. Please fix them and provide corrected code.

## Errors to Fix:

\`\`\`
[type-check] Parameter 'a' implicitly has an 'any' type. Parameter 'b' implicitly has an 'any' type.
\`\`\`

## Suggested Fixes:

- **type-check**: Add TypeScript type annotations - ensure all parameters and returns are properly typed

## Original Task:

Create a simple function that adds two numbers.

File: src/add.ts

Export a default function that takes two parameters (a and b) and returns their sum.

## Instructions:

1. Review each error carefully
2. Fix the root causes
3. Ensure your code passes:
   - Type checking
   - Tests
   - Build

Provide the corrected implementation.
EOF

echo "   ✅ Created retry prompt: retry-${REQUEST_ID}-attempt-2.md"
echo ""

# Step 6: Simulate successful retry
echo -e "${YELLOW}Step 6: Agent executes retry (simulated)${NC}"

cat > "${RESPONSE_FILE}" << 'EOF'
# Response

```typescript
export default function add(a: number, b: number): number {  // Fixed: added types
  return a + b;
}
```
EOF

echo "   ✅ Response updated with type annotations"
echo ""

# Step 7: Validate retry
echo -e "${YELLOW}Step 7: TestValidator revalidates${NC}"

cat > "${VALIDATION_FILE}" << EOF
{
  "job_id": "${REQUEST_ID}",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "attempt": 2,
  "validations": [
    {
      "type": "type-check",
      "status": "passed",
      "duration_ms": 1200
    },
    {
      "type": "test",
      "status": "passed",
      "duration_ms": 3500
    },
    {
      "type": "build",
      "status": "passed",
      "duration_ms": 2100
    }
  ],
  "overall_status": "passed",
  "can_retry": true,
  "next_action": "commit",
  "total_duration_ms": 6800,
  "errors": []
}
EOF

echo "   ✅ Type-check PASSED"
echo "   ✅ Tests PASSED"
echo "   ✅ Build PASSED"
echo ""

# Step 8: Git auto-commit
echo -e "${YELLOW}Step 8: LocalGitAutoCommit detects success${NC}"
echo "   → Would execute:"
echo "   → git add src/add.ts"
echo "   → git commit -m 'feat(job-${REQUEST_ID}): [executor] completed after 2 attempts'"
echo "   → git push origin <branch>"
echo ""

# Display summary
echo -e "${GREEN}🎉 Iteration Loop Test Complete!${NC}"
echo ""
echo "Summary of what happened:"
echo "  1️⃣  LocalPromptWatcher detected prompt"
echo "  2️⃣  Agent executed code (with intentional error)"
echo "  3️⃣  TestValidator found type-check error"
echo "  4️⃣  IterationManager analyzed error"
echo "  5️⃣  Retry prompt auto-generated"
echo "  6️⃣  Agent retried with fixed code"
echo "  7️⃣  TestValidator confirmed all validations pass"
echo "  8️⃣  LocalGitAutoCommit would auto-commit"
echo ""

echo -e "${YELLOW}📊 Metrics:${NC}"
echo "  • Attempts: 2/3"
echo "  • Total duration: ~9.3s"
echo "  • Outcome: SUCCESS (committed)"
echo ""

echo -e "${YELLOW}📁 Files created in this test:${NC}"
echo "  ✅ ${TEST_PROMPT}"
echo "  ✅ ${RESPONSE_FILE}"
echo "  ✅ ${VALIDATION_FILE}"
echo "  ✅ ${RETRY_PROMPT}"
echo ""

echo -e "${YELLOW}🚀 To see this in action end-to-end:${NC}"
echo ""
echo "Terminal 1: Start orchestrator"
echo "  \$ npm run dev --workspace=@intcloudsysops/orchestrator"
echo ""
echo "Terminal 2: Start Cursor Agent Service (requires Cursor IDE)"
echo "  \$ npx tsx scripts/cursor-agent-service.ts"
echo ""
echo "Terminal 3: Start LocalPromptWatcher"
echo "  \$ npx tsx scripts/local-prompt-watcher.ts"
echo ""
echo "Terminal 4: Start IterationWatcher"
echo "  \$ npx tsx scripts/iteration-watch-responses.ts"
echo ""
echo "Terminal 5: Start Git Auto-Commit"
echo "  \$ npx tsx scripts/local-git-auto-commit.ts"
echo ""
echo "Then monitor results:"
echo "  \$ watch -n 1 'cat .cursor/prompts/.metadata.json | jq .'"
echo "  \$ git log --oneline | head -5"
echo ""
