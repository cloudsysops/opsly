#!/bin/bash

# Test Parallel Agent Execution
# Starts mock services and monitors job execution

set -e

echo "🚀 Starting Parallel Execution Test"
echo "=================================="

# Configuration
ORCHESTRATOR_URL="http://localhost:3011"
MOCK_DELAY="${MOCK_DELAY:-2000}"
LOG_DIR="/tmp/opsly-parallel-test"
mkdir -p "$LOG_DIR"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Job IDs from the previous run
JOB_IDS=(
  "fa3df11b-44e7-449d-85bb-34ac24803be0"  # Reviewer (Security Audit)
  "8d3dea86-7f54-481d-8215-b9c3400c4ded"  # Executor (Test Utilities)
  "0979fd70-875f-4a8f-a3b9-28fa650eebba"  # Architect (Validation Pipeline)
  "da41a241-ba99-49c9-9a3e-3d678459e224"  # Executor (Observability Metrics)
)

TASK_NAMES=(
  "Reviewer: Security Audit"
  "Executor: Test Utilities"
  "Architect: Validation Pipeline"
  "Executor: Observability Metrics"
)

# Check if orchestrator is running
echo -e "${BLUE}[1/5]${NC} Checking orchestrator..."
if ! curl -s "$ORCHESTRATOR_URL/health" > /dev/null 2>&1; then
  echo -e "${RED}❌ Orchestrator not running at $ORCHESTRATOR_URL${NC}"
  echo "Start it with: npm run dev --workspace=@intcloudsysops/orchestrator"
  exit 1
fi
echo -e "${GREEN}✅ Orchestrator is running${NC}"

# Start mock services
echo -e "${BLUE}[2/5]${NC} Starting mock services..."
echo -e "${YELLOW}   Starting Mock Cursor Agent (port 5001)...${NC}"
npx tsx scripts/mock-cursor-agent.ts --port 5001 > "$LOG_DIR/cursor-agent.log" 2>&1 &
CURSOR_PID=$!
echo -e "${GREEN}   ✅ Mock Cursor started (PID: $CURSOR_PID)${NC}"

echo -e "${YELLOW}   Starting Mock Claude Agent (port 5002)...${NC}"
MOCK_DELAY=$MOCK_DELAY npx tsx scripts/mock-claude-agent.ts --port 5002 > "$LOG_DIR/claude-agent.log" 2>&1 &
CLAUDE_PID=$!
echo -e "${GREEN}   ✅ Mock Claude started (PID: $CLAUDE_PID)${NC}"

# Wait for services to start
sleep 2

# Verify services are responding
echo -e "${BLUE}[3/5]${NC} Verifying mock services..."
if curl -s http://localhost:5001/health > /dev/null 2>&1; then
  echo -e "${GREEN}   ✅ Mock Cursor Agent is responding${NC}"
else
  echo -e "${RED}   ❌ Mock Cursor Agent not responding${NC}"
  kill $CURSOR_PID $CLAUDE_PID 2>/dev/null || true
  exit 1
fi

if curl -s http://localhost:5002/health > /dev/null 2>&1; then
  echo -e "${GREEN}   ✅ Mock Claude Agent is responding${NC}"
else
  echo -e "${RED}   ❌ Mock Claude Agent not responding${NC}"
  kill $CURSOR_PID $CLAUDE_PID 2>/dev/null || true
  exit 1
fi

# Set environment to use mock services
export AGENT_ENVIRONMENT=mock

echo -e "${BLUE}[4/5]${NC} Monitoring job execution..."
echo "   Job IDs:"
for i in "${!JOB_IDS[@]}"; do
  echo "   ${i}: ${JOB_IDS[$i]} - ${TASK_NAMES[$i]}"
done

# Wait for responses to be generated
echo ""
echo -e "${YELLOW}⏳ Waiting for agent responses (this may take a few minutes)...${NC}"
echo ""

RESPONSES_DIR=".cursor/prompts/responses"
mkdir -p "$RESPONSES_DIR"

# Monitor for responses with timeout (5 minutes)
START_TIME=$(date +%s)
TIMEOUT=300  # 5 minutes

COMPLETED=0
while [ $COMPLETED -lt ${#JOB_IDS[@]} ]; do
  CURRENT_TIME=$(date +%s)
  ELAPSED=$((CURRENT_TIME - START_TIME))

  if [ $ELAPSED -gt $TIMEOUT ]; then
    echo -e "${YELLOW}⏱️  Timeout reached. Checking responses generated so far...${NC}"
    break
  fi

  COMPLETED=0
  for JOB_ID in "${JOB_IDS[@]}"; do
    if [ -f "$RESPONSES_DIR/response-$JOB_ID.md" ]; then
      COMPLETED=$((COMPLETED + 1))
    fi
  done

  if [ $COMPLETED -lt ${#JOB_IDS[@]} ]; then
    echo -ne "\r   Progress: $COMPLETED/${#JOB_IDS[@]} responses generated... (${ELAPSED}s elapsed)   "
    sleep 1
  fi
done

echo ""
echo -e "${BLUE}[5/5]${NC} Results:"
echo "=================================="

for i in "${!JOB_IDS[@]}"; do
  JOB_ID="${JOB_IDS[$i]}"
  TASK_NAME="${TASK_NAMES[$i]}"

  if [ -f "$RESPONSES_DIR/response-$JOB_ID.md" ]; then
    FILE_SIZE=$(stat -c%s "$RESPONSES_DIR/response-$JOB_ID.md" 2>/dev/null || echo "0")
    echo -e "${GREEN}✅${NC} $TASK_NAME"
    echo "   Response: $RESPONSES_DIR/response-$JOB_ID.md ($FILE_SIZE bytes)"
  else
    echo -e "${RED}❌${NC} $TASK_NAME"
    echo "   Response not generated (check logs)"
  fi
done

echo ""
echo "=================================="
echo -e "${YELLOW}📊 Test Summary:${NC}"
echo "   Cursor Mock Service Log: $LOG_DIR/cursor-agent.log"
echo "   Claude Mock Service Log: $LOG_DIR/claude-agent.log"
echo "   Responses Directory: $RESPONSES_DIR"
echo ""
echo -e "${YELLOW}View responses:${NC}"
echo "   cat $RESPONSES_DIR/response-*.md"
echo ""
echo -e "${YELLOW}View git commits:${NC}"
echo "   git log --oneline | head -10"
echo ""

# Cleanup
echo ""
echo -e "${BLUE}Cleaning up mock services...${NC}"
kill $CURSOR_PID $CLAUDE_PID 2>/dev/null || true
echo -e "${GREEN}✅ Test completed${NC}"

# Summary
RESPONSE_COUNT=$(ls -1 "$RESPONSES_DIR"/response-*.md 2>/dev/null | wc -l)
echo ""
echo "=================================="
if [ $RESPONSE_COUNT -eq ${#JOB_IDS[@]} ]; then
  echo -e "${GREEN}✅ All responses generated successfully!${NC}"
  echo "   $RESPONSE_COUNT/${#JOB_IDS[@]} tasks completed"
else
  echo -e "${YELLOW}⚠️  Partial completion${NC}"
  echo "   $RESPONSE_COUNT/${#JOB_IDS[@]} tasks completed"
fi
echo "=================================="
