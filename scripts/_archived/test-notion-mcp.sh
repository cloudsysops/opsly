#!/usr/bin/env bash
# test-notion-mcp.sh — Health + /ready del servicio HTTP (requiere proceso en MCP_PORT)
set -euo pipefail

BASE_URL="${NOTION_MCP_URL:-http://127.0.0.1:3013}"

echo "[test-notion-mcp] GET $BASE_URL/health"
curl -sf "$BASE_URL/health" | python3 -m json.tool

echo ""
echo "[test-notion-mcp] GET $BASE_URL/ready (Notion API + IDs desde env del proceso)"
curl -sf "$BASE_URL/ready" | python3 -m json.tool

echo ""
echo "[test-notion-mcp] OK"
