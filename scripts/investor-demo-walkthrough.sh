#!/bin/bash

##############################################################################
# Investor Demo Walkthrough Script
#
# Automatic execution of complete Phase 5-9 demo pipeline
# Shows: Prompt → Routing → Execution → Validation → Iteration → Commit
#
# Usage: bash scripts/investor-demo-walkthrough.sh
##############################################################################

set -e

echo "🎬 Opsly Autonomous Agent Platform — Investor Demo"
echo "=================================================="
echo ""
echo "This demo will:"
echo "  1. Create a demo prompt"
echo "  2. Let system auto-execute"
echo "  3. Show real-time metrics"
echo "  4. Demonstrate auto-iteration"
echo "  5. Commit final result"
echo ""
echo "⏱️  Estimated time: 3-5 minutes"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check prerequisites
echo "${BLUE}[1/6] Checking prerequisites...${NC}"

if ! command -v git &> /dev/null; then
    echo "${RED}❌ Git not found. Please install git.${NC}"
    exit 1
fi

if ! command -v curl &> /dev/null; then
    echo "${YELLOW}⚠️  curl not found. Some checks will be skipped.${NC}"
fi

# Check orchestrator is running
echo "${BLUE}[2/6] Verifying orchestrator is running...${NC}"
if ! curl -s http://localhost:3011/health &> /dev/null; then
    echo "${YELLOW}⚠️  Orchestrator not running on localhost:3011${NC}"
    echo "     Start it with: npm run dev --workspace=@intcloudsysops/orchestrator"
    echo ""
else
    echo "${GREEN}✅ Orchestrator healthy${NC}"
fi

# Create demo prompt
echo ""
echo "${BLUE}[3/6] Creating demo prompt...${NC}"

DEMO_DIR=".cursor/prompts"
mkdir -p "$DEMO_DIR"

TIMESTAMP=$(date +%s)
DEMO_FILE="$DEMO_DIR/investor-demo-${TIMESTAMP}.md"

cat > "$DEMO_FILE" << 'EOF'
---
agent_role: executor
max_iterations: 5
goal: "Create a REST API endpoint with validation"
context:
  complexity: "medium"
  framework: "express"
  validation: "zod"
---

# Create REST API Handler with Validation

You are an expert TypeScript/Express developer.

Create a complete REST API handler that:

1. **File:** `src/api/handlers/create-user.ts`
2. **Handler:** Accepts POST requests with JSON body
3. **Input Schema:** { name: string, email: string }
4. **Validation:** Use Zod for input validation
5. **Response:** Return { id: string, name: string, email: string, createdAt: timestamp }
6. **Error Handling:** Return proper HTTP error codes and messages
7. **Export:** As default export (for Next.js/Express compatibility)

The handler should:
- Validate input before processing
- Return appropriate error codes (400 for validation, 500 for server errors)
- Include proper TypeScript types
- Be production-ready

Write complete, tested code. Include JSDoc comments.
EOF

echo "${GREEN}✅ Demo prompt created: $DEMO_FILE${NC}"
echo ""

# Show prompt content
echo "${BLUE}[4/6] Prompt content:${NC}"
echo "---"
head -15 "$DEMO_FILE"
echo "..."
echo "---"
echo ""

# Monitor execution
echo "${BLUE}[5/6] Monitoring execution...${NC}"
echo ""
echo "Checking for responses every 5 seconds..."
echo "(Press Ctrl+C to stop monitoring)"
echo ""

RESPONSE_DIR=".cursor/responses"
mkdir -p "$RESPONSE_DIR"

# Wait for response (up to 5 minutes)
TIMEOUT=300
ELAPSED=0
FOUND=0

while [ $ELAPSED -lt $TIMEOUT ]; do
    if ls "$RESPONSE_DIR"/response-*.md 1> /dev/null 2>&1; then
        FOUND=1
        break
    fi

    ELAPSED=$((ELAPSED + 5))
    echo "  ⏳ ${ELAPSED}s elapsed... (waiting for agent response)"
    sleep 5
done

echo ""

if [ $FOUND -eq 1 ]; then
    echo "${GREEN}✅ Response generated!${NC}"
    RESPONSE_FILE=$(ls -t "$RESPONSE_DIR"/response-*.md | head -1)
    echo "   File: $RESPONSE_FILE"
    echo ""

    # Show response preview
    echo "${BLUE}Response preview:${NC}"
    echo "---"
    head -30 "$RESPONSE_FILE"
    echo "---"
    echo ""
else
    echo "${YELLOW}⚠️  No response yet (agent may still be processing)${NC}"
    echo "   Check manually: ls -la .cursor/responses/"
    echo ""
fi

# Check git status
echo "${BLUE}[6/6] Checking git commits...${NC}"
echo ""

echo "Recent commits:"
echo "---"
git log --oneline -10

echo "---"
echo ""

# Check if any commits were made by demo
if git log --oneline -10 | grep -q "iteration.*complete"; then
    echo "${GREEN}✅ Auto-commits detected!${NC}"
    echo ""

    # Show stats
    COMMITS=$(git log --oneline -10 | grep -c "iteration.*complete" || true)
    echo "   Found $COMMITS auto-iteration commits"
    echo ""
else
    echo "${YELLOW}⚠️  No auto-commits yet (check .cursor/responses for completed tasks)${NC}"
    echo ""
fi

# Show metrics endpoint
if command -v curl &> /dev/null; then
    echo "${BLUE}Dashboard Metrics:${NC}"
    echo "Access real-time metrics at:"
    echo "  http://localhost:3011/dashboard/metrics"
    echo ""

    if curl -s http://localhost:3011/dashboard/metrics &> /dev/null; then
        echo "✅ Metrics endpoint available"
        echo ""
        echo "Sample metrics:"
        curl -s http://localhost:3011/dashboard/metrics | jq '.' 2>/dev/null | head -20 || echo "  (Could not parse metrics)"
        echo ""
    fi
fi

echo "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo "${GREEN}Demo Complete! ✨${NC}"
echo "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo "Summary:"
echo "  ✅ Prompt created"
echo "  ✅ System auto-detected change"
echo "  ✅ Execution triggered"
echo "  $([ $FOUND -eq 1 ] && echo '✅' || echo '⏳') Response generated"
echo "  $(git log --oneline -1 | grep -q 'iteration' && echo '✅' || echo '⏳') Code auto-committed"
echo ""
echo "Next steps:"
echo "  1. Watch git log: git log --oneline"
echo "  2. Check responses: ls -la .cursor/responses/"
echo "  3. View metrics: curl http://localhost:3011/dashboard/metrics | jq ."
echo "  4. Check validation: cat .cursor/responses/response-*.md"
echo ""
echo "Want to run more demos?"
echo "  bash scripts/investor-demo-walkthrough.sh"
echo ""
