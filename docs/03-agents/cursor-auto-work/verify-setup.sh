#!/bin/bash

# Script de verificación: VERIFY-CURSOR-SETUP.sh
# Verifica que todo el sistema de auto-work está correctamente configurado

set +e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "🔍 CURSOR AUTO-WORK SYSTEM VERIFICATION"
echo "════════════════════════════════════════════════════════════════"
echo ""

PASS=0
FAIL=0

# Test 1: Verify .cursor-auto-work.json exists
echo -n "1️⃣  .cursor-auto-work.json exists... "
if [ -f ".cursor-auto-work.json" ]; then
  echo -e "${GREEN}✓ PASS${NC}"
  ((PASS++))
else
  echo -e "${RED}✗ FAIL${NC}"
  ((FAIL++))
fi

# Test 2: Verify JSON is valid
echo -n "2️⃣  JSON is valid... "
if command -v jq &> /dev/null; then
  if jq empty .cursor-auto-work.json 2>/dev/null; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((PASS++))
  else
    echo -e "${RED}✗ FAIL (invalid JSON)${NC}"
    ((FAIL++))
  fi
else
  echo -e "${YELLOW}⚠ WARN (jq not installed)${NC}"
fi

# Test 3: Verify .cursor-auto-work.sh exists and is executable
echo -n "3️⃣  .cursor-auto-work.sh exists and executable... "
if [ -x ".cursor-auto-work.sh" ]; then
  echo -e "${GREEN}✓ PASS${NC}"
  ((PASS++))
else
  if [ -f ".cursor-auto-work.sh" ]; then
    echo -e "${YELLOW}⚠ WARN (exists but not executable)${NC}"
    echo "   Fix with: chmod +x .cursor-auto-work.sh"
    ((FAIL++))
  else
    echo -e "${RED}✗ FAIL (not found)${NC}"
    ((FAIL++))
  fi
fi

# Test 4: Verify git hook exists and is executable
echo -n "4️⃣  .git/hooks/post-checkout exists and executable... "
if [ -x ".git/hooks/post-checkout" ]; then
  echo -e "${GREEN}✓ PASS${NC}"
  ((PASS++))
else
  if [ -f ".git/hooks/post-checkout" ]; then
    echo -e "${YELLOW}⚠ WARN (exists but not executable)${NC}"
    echo "   Fix with: chmod +x .git/hooks/post-checkout"
    ((FAIL++))
  else
    echo -e "${RED}✗ FAIL (not found)${NC}"
    ((FAIL++))
  fi
fi

# Test 5: Verify .cursor/instructions.md exists
echo -n "5️⃣  .cursor/instructions.md exists... "
if [ -f ".cursor/instructions.md" ]; then
  echo -e "${GREEN}✓ PASS${NC}"
  ((PASS++))
else
  echo -e "${RED}✗ FAIL${NC}"
  ((FAIL++))
fi

# Test 6: Verify on correct branch
echo -n "6️⃣  On correct branch (claude/peskids-...)... "
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ $BRANCH == *"peskids"* ]]; then
  echo -e "${GREEN}✓ PASS (Branch: $BRANCH)${NC}"
  ((PASS++))
else
  echo -e "${YELLOW}⚠ WARN (Branch: $BRANCH)${NC}"
fi

# Test 7: Check if .cursor-work directory exists
echo -n "7️⃣  .cursor-work directory... "
if [ -d ".cursor-work" ]; then
  echo -e "${GREEN}✓ EXISTS${NC}"
  if [ -f ".cursor-work/CURRENT-TASK.md" ]; then
    echo "   └─ CURRENT-TASK.md found"
  fi
  ((PASS++))
else
  echo -e "${YELLOW}⚠ NOT CREATED YET${NC}"
  echo "   (Will be created when script runs)"
fi

# Test 8: Check if jq is installed
echo -n "8️⃣  jq installed (required for JSON parsing)... "
if command -v jq &> /dev/null; then
  JQ_VERSION=$(jq --version)
  echo -e "${GREEN}✓ PASS (${JQ_VERSION})${NC}"
  ((PASS++))
else
  echo -e "${RED}✗ FAIL (NOT INSTALLED)${NC}"
  echo "   Install with:"
  echo "   - macOS: brew install jq"
  echo "   - Ubuntu: apt-get install jq"
  echo "   - Others: https://stedolan.github.io/jq/download/"
  ((FAIL++))
fi

# Test 9: Verify .gitignore doesn't block our files (for .cursor)
echo -n "9️⃣  .cursor/ in git (can be added with -f)... "
if git ls-files ".cursor" 2>/dev/null | grep -q ".cursor"; then
  echo -e "${GREEN}✓ ADDED${NC}"
  ((PASS++))
else
  echo -e "${YELLOW}⚠ NOT IN GIT${NC}"
  echo "   (Added with git add -f, should be fine)"
fi

# Test 10: Verify basic npm structure
echo -n "🔟 npm package.json exists... "
if [ -f "package.json" ]; then
  echo -e "${GREEN}✓ PASS${NC}"
  ((PASS++))
else
  echo -e "${RED}✗ FAIL${NC}"
  ((FAIL++))
fi

# Summary
echo ""
echo "════════════════════════════════════════════════════════════════"
echo "📊 RESULTS"
echo "════════════════════════════════════════════════════════════════"
echo -e "✅ Passed: ${GREEN}$PASS${NC}"
echo -e "❌ Failed: ${RED}$FAIL${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
  echo -e "${GREEN}✨ SYSTEM IS READY!${NC}"
  echo ""
  echo "📋 Next steps:"
  echo "   1. git pull origin claude/peskids-cursor-avance-1ortri"
  echo "   2. cat .cursor-work/CURRENT-TASK.md"
  echo "   3. code ."
  echo "   4. Start editing!"
  echo ""
  exit 0
else
  echo -e "${RED}⚠️  Some issues detected. Please fix above.${NC}"
  echo ""
  echo "🔧 Quick fixes:"
  if [ ! -x ".cursor-auto-work.sh" ]; then
    echo "   chmod +x .cursor-auto-work.sh"
  fi
  if [ ! -x ".git/hooks/post-checkout" ]; then
    echo "   chmod +x .git/hooks/post-checkout"
  fi
  echo ""
  exit 1
fi
