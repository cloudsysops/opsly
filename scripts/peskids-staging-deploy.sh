#!/usr/bin/env bash
# Deploy an immutable Peskids candidate to the private staging container.
# Runtime secrets come from Doppler stg_peskids — never Smile `stg` or `prd`.
set -euo pipefail
: "${PESKIDS_IMAGE:?PESKIDS_IMAGE is required}"
: "${PESKIDS_IMAGE_DIGEST:?PESKIDS_IMAGE_DIGEST is required}"
: "${RELEASE_SHA:?RELEASE_SHA is required}"
: "${DOPPLER_TOKEN_STG:?DOPPLER_TOKEN_STG is required}"
[[ "$PESKIDS_IMAGE" == ghcr.io/cloudsysops/peskids:sha-* ]] || exit 1
[[ "$RELEASE_SHA" =~ ^[0-9a-f]{40}$ ]] || exit 1

PROD_REF="${PESKIDS_PRODUCTION_SUPABASE_PROJECT_REF:-jkwykpldnitavhmtuzmo}"
QA_REF="${PESKIDS_STAGING_SUPABASE_PROJECT_REF:-hljetbbgiphpjbldebpo}"
DOPPLER_PESKIDS_STAGING_CONFIG="${DOPPLER_PESKIDS_STAGING_CONFIG:-stg_peskids}"

container=peskids-staging
port=3304
env_file="$(mktemp)"
trap 'rm -f "$env_file"' EXIT
DOPPLER_TOKEN="$DOPPLER_TOKEN_STG" doppler secrets download \
  --project ops-intcloudsysops \
  --config "$DOPPLER_PESKIDS_STAGING_CONFIG" \
  --no-file --format docker > "$env_file"

staging_url="$(python3 -c '
import pathlib, re, sys
text = pathlib.Path(sys.argv[1]).read_text()
match = re.search(r"^NEXT_PUBLIC_SUPABASE_URL=(.+)$", text, re.M)
print(match.group(1).strip() if match else "")
' "$env_file")"
staging_ref="$(python3 -c '
import re, sys
match = re.search(r"https://([a-z0-9]+)\.supabase\.(?:co|in)", sys.argv[1], re.I)
print(match.group(1).lower() if match else "")
' "$staging_url")"
echo "PESKIDS_STAGING_ISOLATION: doppler_config=${DOPPLER_PESKIDS_STAGING_CONFIG}"
echo "PESKIDS_STAGING_ISOLATION: staging_ref=${staging_ref}"
echo "PESKIDS_STAGING_ISOLATION: production_ref=${PROD_REF}"
if [[ -z "$staging_ref" || "$staging_ref" == "$PROD_REF" ]]; then
  echo "PESKIDS_STAGING_ISOLATION: refuse deploy — staging points at production or an unparseable URL" >&2
  exit 1
fi
if [[ "$staging_ref" != "$QA_REF" ]]; then
  echo "PESKIDS_STAGING_ISOLATION: refuse deploy — staging_ref is not opsly-QA" >&2
  exit 1
fi

# Drop leftover non-Supabase DB_URL values (private IPs, Smile, etc.).
python3 -c '
from pathlib import Path
import re
path = Path("'"$env_file"'")
qa = "'"$QA_REF"'"
lines = []
for line in path.read_text().splitlines():
    if line.startswith("DB_URL=") and qa not in line:
        continue
    lines.append(line)
if not any(line.startswith("PESKIDS_ENVIRONMENT=") for line in lines):
    lines.append("PESKIDS_ENVIRONMENT=staging")
if not any(line.startswith("DOPPLER_CONFIG=") for line in lines):
    lines.append("DOPPLER_CONFIG='"$DOPPLER_PESKIDS_STAGING_CONFIG"'")
path.write_text("\n".join(lines) + "\n")
'

# shellcheck disable=SC1091
source scripts/lib/peskids-docker-env-filter.sh
filter_peskids_docker_env "$env_file"
printf 'PESKIDS_GIT_SHA=%s\nPESKIDS_IMAGE_TAG=%s\n' "$RELEASE_SHA" "$PESKIDS_IMAGE" >> "$env_file"
docker pull "$PESKIDS_IMAGE"
repo_digest="$(docker image inspect --format '{{index .RepoDigests 0}}' "$PESKIDS_IMAGE")"
actual_digest="${repo_digest##*@}"
[ "$actual_digest" = "$PESKIDS_IMAGE_DIGEST" ] || { echo "Staging image digest mismatch" >&2; exit 1; }
docker rm -f "$container" 2>/dev/null || true
docker run -d --name "$container" --restart unless-stopped --network traefik-public \
  -p "127.0.0.1:${port}:3004" --env-file "$env_file" \
  --label traefik.enable=true \
  --label traefik.docker.network=traefik-public \
  --label 'traefik.http.routers.peskids-staging.rule=Host(`peskids-staging.op-sly.com`)' \
  --label traefik.http.routers.peskids-staging.entrypoints=websecure \
  --label traefik.http.routers.peskids-staging.tls=true \
  --label traefik.http.routers.peskids-staging.tls.certresolver=letsencrypt \
  --label traefik.http.services.peskids-staging.loadbalancer.server.port=3004 \
  "$PESKIDS_IMAGE" >/dev/null

for attempt in {1..30}; do
  if body="$(curl -fsSL --max-time 5 "http://127.0.0.1:${port}/api/health" 2>/dev/null)" \
    && echo "$body" | jq -e --arg sha "$RELEASE_SHA" '.status == "ok" and .git_sha == $sha' >/dev/null; then
    curl -fsSL --max-time 10 "http://127.0.0.1:${port}/" >/dev/null
    curl -fsSL --max-time 10 "http://127.0.0.1:${port}/admin/login" >/dev/null
    exit 0
  fi
  echo "Waiting for staging health (attempt ${attempt}/30)..."
  sleep 3
done
docker logs "$container" --tail 80 >&2 || true
exit 1
