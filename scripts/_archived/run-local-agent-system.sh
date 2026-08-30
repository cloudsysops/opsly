#!/bin/bash

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Local Agent Execution System - Phase 1${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check prerequisites
echo -e "${YELLOW}1️⃣  Checking prerequisites...${NC}"
command -v node &> /dev/null || { echo "Node.js not found"; exit 1; }
command -v npm &> /dev/null || { echo "npm not found"; exit 1; }
echo -e "${GREEN}✅ Node.js and npm available${NC}"
echo ""

# Kill any existing processes
echo -e "${YELLOW}2️⃣  Cleaning up existing processes...${NC}"
pkill -f "npm run dev" || true
pkill -f "tsx.*local-" || true
sleep 2
echo -e "${GREEN}✅ Previous instances terminated${NC}"
echo ""

# Start orchestrator
echo -e "${YELLOW}3️⃣  Starting Orchestrator (port 3011)...${NC}"
cd /home/user/opsly
export PLATFORM_ADMIN_TOKEN="local-dev"
npm run dev --workspace=@intcloudsysops/orchestrator > /tmp/orchestrator-run.log 2>&1 &
ORCH_PID=$!
echo -e "${GREEN}✅ Orchestrator PID: $ORCH_PID${NC}"
echo ""

# Wait for orchestrator to be ready
echo -e "${YELLOW}4️⃣  Waiting for Orchestrator to be ready...${NC}"
for i in {1..30}; do
  if curl -s http://localhost:3011/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Orchestrator is ready!${NC}"
    break
  fi
  echo -n "."
  sleep 1
  if [ $i -eq 30 ]; then
    echo -e "${RED}❌ Orchestrator failed to start${NC}"
    tail -20 /tmp/orchestrator-run.log
    exit 1
  fi
done
echo ""

# Start LocalPromptWatcher
echo -e "${YELLOW}5️⃣  Starting LocalPromptWatcher...${NC}"
npx tsx scripts/local-agent-watcher.ts --cursor-dir .cursor --orchestrator-url http://localhost:3011 > /tmp/watcher.log 2>&1 &
WATCHER_PID=$!
echo -e "${GREEN}✅ Watcher PID: $WATCHER_PID${NC}"
sleep 2
echo ""

# Start CursorAgent Service (if not already running)
echo -e "${YELLOW}6️⃣  Starting CursorAgent Service (port 5001)...${NC}"
if ! curl -s http://localhost:5001/health > /dev/null 2>&1; then
  npx tsx scripts/cursor-agent-service.ts --port 5001 > /tmp/cursor-agent-service.log 2>&1 &
  CURSOR_AGENT_PID=$!
  echo -e "${GREEN}✅ CursorAgent Service PID: $CURSOR_AGENT_PID${NC}"
  sleep 2
else
  echo -e "${YELLOW}⚠️  CursorAgent Service already running on port 5001${NC}"
  CURSOR_AGENT_PID="existing"
fi
echo ""

# Start LocalGitAutoCommit
echo -e "${YELLOW}7️⃣  Starting LocalGitAutoCommit daemon...${NC}"
npx tsx scripts/local-git-auto-commit.ts --watch-dir .cursor/responses --working-dir /home/user/opsly > /tmp/autocommit.log 2>&1 &
COMMIT_PID=$!
echo -e "${GREEN}✅ AutoCommit PID: $COMMIT_PID${NC}"
sleep 2
echo ""

# Show status
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✨ Local Agent Execution System Running!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Service Status:"
echo -e "  ${GREEN}✓${NC} Orchestrator (PID: $ORCH_PID) → http://localhost:3011/health"
echo -e "  ${GREEN}✓${NC} CursorAgent Service (PID: $CURSOR_AGENT_PID) → http://localhost:5001/health"
echo -e "  ${GREEN}✓${NC} LocalWatcher (PID: $WATCHER_PID) → Watching .cursor/prompts/"
echo -e "  ${GREEN}✓${NC} AutoCommit (PID: $COMMIT_PID) → Watching .cursor/responses/"
echo ""
echo "Logs:"
echo "  Orchestrator:      tail -f /tmp/orchestrator-run.log"
echo "  CursorAgent:       tail -f /tmp/cursor-agent-service.log"
echo "  Watcher:           tail -f /tmp/watcher.log"
echo "  AutoCommit:        tail -f /tmp/autocommit.log"
echo ""
echo "Test Prompt:"
echo -e "  ${YELLOW}Available:${NC} .cursor/prompts/test-local-cursor-phase1.md"
echo -e "  ${YELLOW}Legacy:${NC} .cursor/prompts/test-cursor-execution.md"
echo ""
echo "Monitor Execution:"
echo -e "  ${YELLOW}Metadata:${NC} tail -f .cursor/prompts/.metadata.json"
echo -e "  ${YELLOW}Responses:${NC} ls -la .cursor/prompts/responses/"
echo ""
echo -e "${BLUE}Press CTRL+C to stop all services${NC}"
echo ""

# Keep script running
wait $ORCH_PID $WATCHER_PID $COMMIT_PID
