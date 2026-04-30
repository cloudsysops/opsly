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

volumes:
  n8n_data_{{SLUG}}:
  uptime_data_{{SLUG}}:

networks:
  {{TRAEFIK_NETWORK}}:
    external: true
