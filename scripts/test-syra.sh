#!/bin/bash

# Test Syra Social Media Agent

echo "🧪 Testing Syra Social Media Agent"
echo "=================================="
echo ""

API_URL="http://localhost:3000"

# Test 1: Generate content
echo "📱 Test 1: Generate content for feature"
curl -s -X POST "$API_URL/api/social/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "achievement",
    "source_data": {
      "title": "Brissa shipped Phase 5.1 LLM Router",
      "description": "Multi-model routing with cost optimization",
      "agents_involved": ["brissa"],
      "metrics": {"lines_of_code": 2400, "coverage": 98}
    },
    "platforms": ["twitter", "linkedin", "discord", "slack"]
  }' 2>/dev/null | jq '.status' || echo "API not ready"

echo "✅ Test 1 complete"
echo ""

# Test 2: Trigger from event
echo "📱 Test 2: Event-driven content generation"
curl -s -X POST "$API_URL/api/social/trigger" \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "achievement",
    "source_data": {
      "title": "Lili validated 500+ tests",
      "description": "Test coverage: 98%",
      "agents_involved": ["lili"]
    },
    "platforms": ["twitter", "discord"]
  }' 2>/dev/null | jq '.status' || echo "API not ready"

echo "✅ Test 2 complete"
echo ""

echo "✅ Syra tests complete"
