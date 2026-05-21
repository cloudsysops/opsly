#!/bin/bash

##
# Peskids Health Check
# Verifies all services are running and healthy
# Usage: ./scripts/health-check.sh
##

echo "=========================================="
echo "  Peskids Health Check"
echo "=========================================="
echo ""

HEALTHY=true

# Check Docker
echo "🐳 Docker..."
if command -v docker &> /dev/null; then
  echo "   ✅ Docker installed"
else
  echo "   ❌ Docker not found"
  HEALTHY=false
fi

# Check Docker Compose
echo "📦 Docker Compose..."
if docker-compose -f infra/docker-compose.yml ps &> /dev/null; then
  echo "   ✅ Docker Compose available"
else
  echo "   ❌ Docker Compose failed"
  HEALTHY=false
fi

echo ""
echo "📋 Service Status:"
echo ""

# Get container statuses
SERVICES=(
  "nginx"
  "supabase-db"
  "redis"
  "web"
  "orchestrator-agent"
  "social-media-agent"
  "docs-generator-agent"
  "api-integration-agent"
  "web-experience-agent"
  "messaging-agent"
  "security-agent"
  "n8n"
  "uptime-kuma"
)

for service in "${SERVICES[@]}"; do
  if docker-compose -f infra/docker-compose.yml ps "$service" 2>/dev/null | grep -q "Up"; then
    echo "   ✅ $service"
  else
    echo "   ❌ $service (not running)"
    HEALTHY=false
  fi
done

echo ""
echo "🔗 Connectivity Checks:"
echo ""

# Check Redis
echo "   Redis..."
if docker-compose -f infra/docker-compose.yml exec -T redis redis-cli ping 2>/dev/null | grep -q "PONG"; then
  echo "      ✅ Redis responding"
else
  echo "      ❌ Redis not responding"
  HEALTHY=false
fi

# Check PostgreSQL
echo "   PostgreSQL..."
if docker-compose -f infra/docker-compose.yml exec -T supabase-db pg_isready -U postgres 2>/dev/null | grep -q "accepting"; then
  echo "      ✅ PostgreSQL accepting connections"
else
  echo "      ❌ PostgreSQL not responding"
  HEALTHY=false
fi

# Check Web App
echo "   Web App..."
if curl -s http://localhost:3000 &> /dev/null; then
  echo "      ✅ Web app responding (http://localhost:3000)"
else
  echo "      ⚠️  Web app not responding (may be starting up)"
fi

# Check n8n
echo "   n8n..."
if curl -s http://localhost:5678 &> /dev/null; then
  echo "      ✅ n8n responding (http://localhost:5678)"
else
  echo "      ⚠️  n8n not responding (may be starting up)"
fi

# Check Uptime Kuma
echo "   Uptime Kuma..."
if curl -s http://localhost:3001 &> /dev/null; then
  echo "      ✅ Uptime Kuma responding (http://localhost:3001)"
else
  echo "      ⚠️  Uptime Kuma not responding (may be starting up)"
fi

echo ""
echo "📝 Environment Variables:"
echo ""

# Check required env vars
REQUIRED_VARS=(
  "NEXT_PUBLIC_SUPABASE_URL"
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  "SUPABASE_SERVICE_ROLE_KEY"
  "REDIS_PASSWORD"
  "DB_PASSWORD"
  "CLIENT_DOMAIN"
  "N8N_ENCRYPTION_KEY"
)

if [ -f .env ]; then
  for var in "${REQUIRED_VARS[@]}"; do
    if grep -q "^${var}=" .env; then
      echo "   ✅ $var set"
    else
      echo "   ❌ $var missing"
      HEALTHY=false
    fi
  done
else
  echo "   ❌ .env file not found"
  HEALTHY=false
fi

echo ""

# Summary
if [ "$HEALTHY" = true ]; then
  echo "=========================================="
  echo "  ✅ All systems healthy!"
  echo "=========================================="
  echo ""
  echo "Dashboard: http://localhost:3000/admin"
  echo "n8n workflows: http://localhost:5678"
  echo "Monitoring: http://localhost:3001"
  exit 0
else
  echo "=========================================="
  echo "  ⚠️  Some checks failed"
  echo "=========================================="
  echo ""
  echo "Debugging:"
  echo "  - View logs: docker-compose -f infra/docker-compose.yml logs -f"
  echo "  - Restart services: docker-compose -f infra/docker-compose.yml restart"
  echo "  - Check .env: cat .env | grep -v '^#' | grep ."
  exit 1
fi
