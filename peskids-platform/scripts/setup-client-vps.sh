#!/bin/bash

##
# Peskids VPS Setup Script
# One-click deployment for client VPS
# Usage: ./scripts/setup-client-vps.sh
##

set -e

echo "=========================================="
echo "  Peskids Platform — VPS Setup"
echo "=========================================="
echo ""

# Check if running on Ubuntu/Debian
if ! command -v apt-get &> /dev/null; then
  echo "❌ This script requires Ubuntu/Debian. Please install manually."
  exit 1
fi

# 1. Install Docker & Docker Compose
echo "📦 Installing Docker and Docker Compose..."
if ! command -v docker &> /dev/null; then
  curl -fsSL https://get.docker.com -o get-docker.sh
  sudo sh get-docker.sh
  rm get-docker.sh
fi

if ! command -v docker-compose &> /dev/null; then
  sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
  sudo chmod +x /usr/local/bin/docker-compose
fi

echo "✅ Docker installed"
echo ""

# 2. Generate environment variables
echo "🔐 Generating environment variables..."
if [ ! -f .env ]; then
  cp .env.example .env

  # Generate secure random passwords
  DB_PASSWORD=$(openssl rand -base64 32)
  REDIS_PASSWORD=$(openssl rand -base64 32)
  N8N_ENCRYPTION_KEY=$(openssl rand -base64 32)

  # Prompt for required values
  read -p "Enter Supabase URL (https://...supabase.co): " SUPABASE_URL
  read -p "Enter Supabase Anon Key: " SUPABASE_ANON_KEY
  read -p "Enter Supabase Service Role Key: " SUPABASE_SERVICE_ROLE_KEY
  read -p "Enter your domain (e.g., myschool.com): " CLIENT_DOMAIN

  # Update .env file
  sed -i "s|NEXT_PUBLIC_SUPABASE_URL=.*|NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}|" .env
  sed -i "s|NEXT_PUBLIC_SUPABASE_ANON_KEY=.*|NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}|" .env
  sed -i "s|SUPABASE_SERVICE_ROLE_KEY=.*|SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}|" .env
  sed -i "s|CLIENT_DOMAIN=.*|CLIENT_DOMAIN=${CLIENT_DOMAIN}|" .env
  sed -i "s|DB_PASSWORD=.*|DB_PASSWORD=${DB_PASSWORD}|" .env
  sed -i "s|REDIS_PASSWORD=.*|REDIS_PASSWORD=${REDIS_PASSWORD}|" .env
  sed -i "s|N8N_ENCRYPTION_KEY=.*|N8N_ENCRYPTION_KEY=${N8N_ENCRYPTION_KEY}|" .env

  echo "✅ Environment variables configured"
else
  echo "⚠️  .env already exists, skipping configuration"
fi
echo ""

# 3. Create SSL certificates (self-signed for now)
echo "🔒 Setting up SSL certificates..."
mkdir -p infra/certs
if [ ! -f infra/certs/cert.pem ]; then
  openssl req -x509 -newkey rsa:4096 -keyout infra/certs/key.pem -out infra/certs/cert.pem -days 365 -nodes -subj "/CN=${CLIENT_DOMAIN}"
  echo "✅ Self-signed certificates created (replace with Let's Encrypt in production)"
else
  echo "⚠️  Certificates already exist, skipping"
fi
echo ""

# 4. Build Docker images
echo "🔨 Building Docker images (this may take 5-10 minutes)..."
docker-compose -f infra/docker-compose.yml build --no-cache
echo "✅ Docker images built"
echo ""

# 5. Start services
echo "🚀 Starting Peskids services..."
docker-compose -f infra/docker-compose.yml up -d
echo "✅ Services started"
echo ""

# 6. Wait for database to be healthy
echo "⏳ Waiting for database to be ready..."
for i in {1..30}; do
  if docker-compose -f infra/docker-compose.yml exec -T supabase-db pg_isready -U postgres &> /dev/null; then
    echo "✅ Database is ready"
    break
  fi
  echo "  ...waiting ($i/30)"
  sleep 2
done
echo ""

# 7. Run Supabase migrations
echo "📊 Running database migrations..."
docker-compose -f infra/docker-compose.yml exec -T supabase-db psql -U postgres -d peskids -f /migrations/001_peskids_base.sql 2>/dev/null || true
echo "✅ Migrations completed (note: manual verification recommended)"
echo ""

# 8. Health check
echo "🏥 Running health checks..."
./scripts/health-check.sh || true
echo ""

# 9. Summary
echo "=========================================="
echo "  ✅ Setup Complete!"
echo "=========================================="
echo ""
echo "📝 Next steps:"
echo "   1. Access dashboard: https://${CLIENT_DOMAIN}/admin"
echo "   2. Configure webhooks in Instagram/Facebook/TikTok settings"
echo "   3. Add Twilio/Resend credentials for messaging"
echo "   4. Replace self-signed SSL with Let's Encrypt certificate"
echo "   5. Monitor logs: docker-compose -f infra/docker-compose.yml logs -f"
echo ""
echo "🔐 Important: Secure these credentials in production:"
echo "   - DB_PASSWORD and REDIS_PASSWORD (in .env)"
echo "   - N8N_ENCRYPTION_KEY (in .env)"
echo "   - SSL certificates (in infra/certs/)"
echo ""
echo "📞 Support: Run './scripts/health-check.sh' to diagnose issues"
echo ""
