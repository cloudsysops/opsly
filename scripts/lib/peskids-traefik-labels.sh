#!/usr/bin/env bash
# Traefik Docker provider labels for the Peskids app container (name: peskids, port 3004).
# Used by peskids-deploy-vps.sh and peskids-rebuild-vps.sh — mirrors runtime/tenants/docker-compose.peskids.yml.
set -euo pipefail

PESKIDS_TRAEFIK_LABELS=(
  --label 'traefik.enable=true'
  --label 'traefik.docker.network=traefik-public'
  --label 'traefik.http.routers.peskids.rule=Host(`peskids.op-sly.com`)'
  --label 'traefik.http.routers.peskids.entrypoints=websecure'
  --label 'traefik.http.routers.peskids.tls=true'
  --label 'traefik.http.routers.peskids.tls.certresolver=letsencrypt'
  --label 'traefik.http.services.peskids.loadbalancer.server.port=3004'
)
