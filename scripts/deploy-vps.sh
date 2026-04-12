#!/bin/bash
# scripts/deploy-vps.sh - Deploy to VPS
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "Deploying to VPS..."

# SSH to VPS and pull + restart
ssh vps-dragon << 'ENDSSH'
  cd /opt/opsly
  git pull origin main
  
  # Pull latest images
  docker compose -f docker-compose.yml -f docker-compose.hermes.yml pull
  
  # Restart services
  docker compose -f docker-compose.yml -f docker-compose.hermes.yml up -d
  
  # Show status
  docker compose -f docker-compose.yml -f docker-compose.hermes.yml ps
  
  echo "Deployment complete"
ENDSSH

echo "VPS deployment done"
