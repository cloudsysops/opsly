services:
  n8n_{{SLUG}}:
    image: n8nio/n8n:latest
    ports:
      - "{{PORT_N8N}}:5678"
    environment:
      N8N_BASIC_AUTH_ACTIVE: "true"
      N8N_BASIC_AUTH_USER: admin
      N8N_BASIC_AUTH_PASSWORD: {{N8N_AUTH_PASSWORD}}
      N8N_ENCRYPTION_KEY: {{N8N_ENCRYPTION_KEY}}
      WEBHOOK_URL: https://n8n-{{SLUG}}.opsly.io
    volumes:
      - n8n_data_{{SLUG}}:/home/node/.n8n
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.n8n-{{SLUG}}.rule=Host(`n8n-{{SLUG}}.opsly.io`)"
      - "traefik.http.routers.n8n-{{SLUG}}.tls=true"
      - "traefik.http.services.n8n-{{SLUG}}.loadbalancer.server.port=5678"
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:5678/healthz"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped
    networks:
      - opsly

  uptime_{{SLUG}}:
    image: louislam/uptime-kuma:latest
    ports:
      - "{{PORT_UPTIME}}:3001"
    volumes:
      - uptime_data_{{SLUG}}:/app/data
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.uptime-{{SLUG}}.rule=Host(`uptime-{{SLUG}}.opsly.io`)"
      - "traefik.http.routers.uptime-{{SLUG}}.tls=true"
      - "traefik.http.services.uptime-{{SLUG}}.loadbalancer.server.port=3001"
    restart: unless-stopped
    networks:
      - opsly

volumes:
  n8n_data_{{SLUG}}:
  uptime_data_{{SLUG}}:

networks:
  opsly:
    external: true
