#!/bin/bash

# Test script for Local Agent Execution System end-to-end flow
# Usage: ./scripts/test-local-agent-e2e.sh

set -e

echo "🚀 Testing Local Agent Execution System E2E"
echo ""

CURSOR_DIR="${CURSOR_DIR:-.cursor}"
ORCHESTRATOR_URL="${ORCHESTRATOR_URL:-http://localhost:3011}"
PLATFORM_ADMIN_TOKEN="${PLATFORM_ADMIN_TOKEN:-local-dev}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check dependencies
echo -e "${YELLOW}📋 Checking dependencies...${NC}"

if ! command -v npx &> /dev/null; then
  echo -e "${RED}❌ npx not found${NC}"
  exit 1
fi

if ! command -v curl &> /dev/null; then
  echo -e "${RED}❌ curl not found${NC}"
  exit 1
fi

if ! command -v redis-cli &> /dev/null; then
  echo -e "${YELLOW}⚠️  redis-cli not found (optional)${NC}"
fi

echo -e "${GREEN}✅ Dependencies OK${NC}"
echo ""

# Check Redis
echo -e "${YELLOW}🔍 Checking Redis connection...${NC}"
if ! redis-cli ping &> /dev/null; then
  echo -e "${RED}❌ Redis not running. Start with: redis-server${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Redis OK${NC}"
echo ""

# Check Orchestrator
echo -e "${YELLOW}🔍 Checking Orchestrator health...${NC}"
if ! curl -s "${ORCHESTRATOR_URL}/health" | grep -q "ok"; then
  echo -e "${RED}❌ Orchestrator not responding at ${ORCHESTRATOR_URL}${NC}"
  echo "Start with: npm run dev --workspace=@intcloudsysops/orchestrator"
  exit 1
fi
echo -e "${GREEN}✅ Orchestrator OK${NC}"
echo ""

# Setup test directory
echo -e "${YELLOW}📁 Setting up test directory...${NC}"
mkdir -p "${CURSOR_DIR}/prompts"
mkdir -p "${CURSOR_DIR}/responses"
echo -e "${GREEN}✅ Directory structure ready${NC}"
echo ""

# Create test prompt
echo -e "${YELLOW}📝 Creating test prompt...${NC}"
TEST_PROMPT="${CURSOR_DIR}/prompts/test-e2e-$(date +%s).md"

cat > "${TEST_PROMPT}" << 'EOF'
---
agent_role: executor
max_steps: 5
goal: Test local agent execution
---

Create a simple test file to verify the system is working.

Please create a file named test-result.txt with the content "Local agent test successful!"
EOF

echo "Created: ${TEST_PROMPT}"
echo -e "${GREEN}✅ Test prompt ready${NC}"
echo ""

# Extract filename for tracking
FILENAME=$(basename "${TEST_PROMPT}")
REQUEST_ID="${FILENAME%.md}"

# Manual API call to submit
echo -e "${YELLOW}🔄 Submitting prompt to orchestrator...${NC}"

RESPONSE=$(curl -s -X POST \
  "${ORCHESTRATOR_URL}/api/local/prompt-submit" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${PLATFORM_ADMIN_TOKEN}" \
  -d @- << EOF
{
  "prompt_body": "Create a simple test file to verify the system is working.\n\nPlease create a file named test-result.txt with the content 'Local agent test successful!'",
  "agent_role": "executor",
  "max_steps": 5,
  "goal": "Test local agent execution",
  "context": {},
  "request_id": "${REQUEST_ID}"
}
EOF
)

JOB_ID=$(echo "${RESPONSE}" | grep -o '"job_id":"[^"]*"' | cut -d'"' -f4)

if [ -z "${JOB_ID}" ]; then
  echo -e "${RED}❌ Failed to submit prompt${NC}"
  echo "Response: ${RESPONSE}"
  exit 1
fi

echo -e "${GREEN}✅ Submitted as job: ${JOB_ID}${NC}"
echo ""

# Monitor for response
echo -e "${YELLOW}⏳ Waiting for response (timeout: 120s)...${NC}"

TIMEOUT=120
ELAPSED=0
FOUND=false

while [ $ELAPSED -lt $TIMEOUT ]; do
  if [ -f "${CURSOR_DIR}/responses/response-${REQUEST_ID}.md" ]; then
    FOUND=true
    break
  fi

  # Also check with job_id
  if [ -f "${CURSOR_DIR}/responses/response-${JOB_ID}.md" ]; then
    FOUND=true
    REQUEST_ID="${JOB_ID}"
    break
  fi

  sleep 2
  ELAPSED=$((ELAPSED + 2))
  echo -ne "  ${ELAPSED}s elapsed\r"
done

echo ""

if [ "$FOUND" = false ]; then
  echo -e "${RED}❌ No response received (timeout after ${TIMEOUT}s)${NC}"
  echo ""
  echo -e "${YELLOW}📁 Contents of .cursor/responses/:${NC}"
  ls -la "${CURSOR_DIR}/responses/" || echo "(directory not found)"
  echo ""
  echo -e "${YELLOW}💡 Make sure cursor-agent-service is running:${NC}"
  echo "   npx tsx scripts/cursor-agent-service.ts"
  exit 1
fi

echo -e "${GREEN}✅ Response received!${NC}"
RESPONSE_FILE="${CURSOR_DIR}/responses/response-${REQUEST_ID}.md"
echo "Response file: ${RESPONSE_FILE}"
echo ""

# Display response
echo -e "${YELLOW}📄 Response content:${NC}"
head -20 "${RESPONSE_FILE}"
echo ""

# Check git
echo -e "${YELLOW}🔍 Checking git status...${NC}"
if git rev-parse --git-dir > /dev/null 2>&1; then
  RECENT_COMMIT=$(git log -1 --oneline 2>/dev/null || echo "no commits")
  echo "Recent commit: ${RECENT_COMMIT}"

  if echo "${RECENT_COMMIT}" | grep -q "job-"; then
    echo -e "${GREEN}✅ Response was auto-committed${NC}"
  else
    echo -e "${YELLOW}⚠️  Response may not be committed yet (auto-commit daemon might be running separately)${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  Not in git repository${NC}"
fi

echo ""
echo -e "${GREEN}🎉 E2E Test Complete!${NC}"
echo ""
echo "Summary:"
echo "  ✅ Orchestrator responded"
echo "  ✅ Job submitted to local-agents queue"
echo "  ✅ Response received from agent service"
echo "  ✅ Response file written"
echo ""
echo "Next steps:"
echo "  1. Run local-git-auto-commit.ts to auto-commit responses"
echo "  2. Run local-prompt-watcher.ts to auto-submit new prompts"
echo "  3. Run both together for full automation"
