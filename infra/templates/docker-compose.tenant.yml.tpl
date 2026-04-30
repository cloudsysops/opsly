# Rendered by orchestrator: replace {{PLACEHOLDERS}} then write docker-compose.yml per tenant.
# Do not run this file directly.

services:
  n8n_{{SLUG}}:
    image: n8nio/n8n:latest
    container_name: n8n_{{SLUG}}
    ports:
      - "{{PORT_N8N}}:5678"
    environment:
      N8N_BASIC_AUTH_ACTIVE: "true"
      N8N_BASIC_AUTH_USER: {{N8N_BASIC_AUTH_USER}}
      N8N_BASIC_AUTH_PASSWORD: {{N8N_BASIC_AUTH_PASSWORD}}
      N8N_ENCRYPTION_KEY: {{N8N_ENCRYPTION_KEY}}
      N8N_HOST: n8n-{{SLUG}}.{{DOMAIN}}
      N8N_PROTOCOL: https
      WEBHOOK_URL: https://n8n-{{SLUG}}.{{DOMAIN}}/
      TENANT_SLUG: {{SLUG}}
      OPSLY_CRM_NOTIFY_WEBHOOK_URL: ""
      DB_TYPE: sqlite
    volumes:
      - n8n_data_{{SLUG}}:/home/node/.n8n
    networks:
      - {{TRAEFIK_NETWORK}}
    labels:
      traefik.enable: "true"
      traefik.docker.network: "{{TRAEFIK_NETWORK}}"
      traefik.http.routers.n8n-{{SLUG}}.rule: Host(`n8n-{{SLUG}}.{{DOMAIN}}`)
      traefik.http.routers.n8n-{{SLUG}}.entrypoints: websecure
      traefik.http.routers.n8n-{{SLUG}}.tls: "true"
      traefik.http.routers.n8n-{{SLUG}}.tls.certresolver: letsencrypt
      traefik.http.services.n8n-{{SLUG}}.loadbalancer.server.port: "5678"
      traefik.http.routers.n8n-{{SLUG}}.middlewares: secure-headers@file,rate-limit@file
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://localhost:5678/healthz || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  uptime-kuma_{{SLUG}}:
    image: louislam/uptime-kuma:1
    container_name: uptime_{{SLUG}}
    ports:
      - "{{PORT_UPTIME}}:3001"
    volumes:
      - uptime_data_{{SLUG}}:/app/data
    networks:
      - {{TRAEFIK_NETWORK}}
    labels:
      traefik.enable: "true"
      traefik.docker.network: "{{TRAEFIK_NETWORK}}"
      traefik.http.routers.uptime-{{SLUG}}.rule: Host(`uptime-{{SLUG}}.{{DOMAIN}}`)
      traefik.http.routers.uptime-{{SLUG}}.entrypoints: websecure
      traefik.http.routers.uptime-{{SLUG}}.tls: "true"
      traefik.http.routers.uptime-{{SLUG}}.tls.certresolver: letsencrypt
      traefik.http.services.uptime-{{SLUG}}.loadbalancer.server.port: "3001"
      traefik.http.routers.uptime-{{SLUG}}.middlewares: secure-headers@file,rate-limit@file
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:3001 || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s

  context-builder_{{SLUG}}:
    image: ghcr.io/cloudsysops/intcloudsysops-context-builder:latest
    container_name: ctx_{{SLUG}}
    ports:
      - "{{PORT_CONTEXT_BUILDER}}:3012"
    environment:
      CONTEXT_BUILDER_REDIS_NAMESPACE: tenant:{{SLUG}}:ctx
      OPS_REPO_ROOT: /data
      NODE_ENV: production
      LOG_LEVEL: info
    volumes:
      - /opt/opsly:/data:ro
    networks:
      - {{TRAEFIK_NETWORK}}
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:3012/health || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s

  mcp_{{SLUG}}:
    image: ghcr.io/cloudsysops/intcloudsysops-mcp:latest
    container_name: mcp_{{SLUG}}
    ports:
      - "{{PORT_MCP}}:3003"
    environment:
      MCP_TENANT_SLUG: {{SLUG}}
      MCP_JWT_SECRET: {{MCP_JWT_SECRET}}
      MCP_CONTEXT_BUILDER_URL: http://context-builder_{{SLUG}}:3012
      NODE_ENV: production
      LOG_LEVEL: info
    networks:
      - {{TRAEFIK_NETWORK}}
    depends_on:
      context-builder_{{SLUG}}:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:3003/health || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s

volumes:
  n8n_data_{{SLUG}}:
  uptime_data_{{SLUG}}:

networks:
  {{TRAEFIK_NETWORK}}:
    external: true
