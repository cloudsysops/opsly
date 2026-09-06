#!/usr/bin/env bash
# OAuth YouTube Data API → guarda tokens en Doppler (ops-intcloudsysops/prd).
# No imprime secretos. Idempotente: puede rotar refresh token.
#
# Prerequisitos (humano, ~10 min):
#   1) Google Cloud Console (proyecto Opsly / GOOGLE_CLOUD_PROJECT_ID)
#   2) APIs → enable "YouTube Data API v3"
#   3) Credentials → OAuth client ID tipo "Desktop" o "Web"
#      Redirect URI: http://127.0.0.1:8768/oauth2callback
#   4) Descargar JSON del cliente OAuth
#
# Uso:
#   ./scripts/youtube-oauth-doppler-setup.sh --dry-run
#   ./scripts/youtube-oauth-doppler-setup.sh --client-json ~/Downloads/youtube-oauth-client.json
#   ./scripts/youtube-oauth-doppler-setup.sh --from-env   # usa YOUTUBE_CLIENT_ID/SECRET ya en shell/Doppler
#
# Tras éxito:
#   doppler run --project ops-intcloudsysops --config prd -- \
#     npm run content:bitsitos:publish -- --upload
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DRY_RUN=0
CLIENT_JSON=""
FROM_ENV=0
PORT="${YOUTUBE_OAUTH_PORT:-8768}"
REDIRECT_URI="${YOUTUBE_REDIRECT_URI:-http://127.0.0.1:${PORT}/oauth2callback}"
DOPPLER_PROJECT="${DOPPLER_PROJECT:-ops-intcloudsysops}"
DOPPLER_CONFIG="${DOPPLER_CONFIG:-prd}"
SCOPES="https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/youtube.force-ssl"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=1; shift ;;
    --client-json)
      CLIENT_JSON="${2:-}"
      shift 2
      ;;
    --from-env) FROM_ENV=1; shift ;;
    --port)
      PORT="${2:-8768}"
      REDIRECT_URI="http://127.0.0.1:${PORT}/oauth2callback"
      shift 2
      ;;
    -h|--help)
      sed -n '2,28p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown arg: $1" >&2
      exit 1
      ;;
  esac
done

echo "[youtube-oauth] project=${DOPPLER_PROJECT} config=${DOPPLER_CONFIG}"
echo "[youtube-oauth] redirect=${REDIRECT_URI}"
echo "[youtube-oauth] scopes=${SCOPES}"

if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "[dry-run] Would:"
  echo "  1) Parse OAuth client JSON or env"
  echo "  2) Open browser consent (YouTube upload)"
  echo "  3) Exchange code → refresh_token"
  echo "  4) doppler secrets set YOUTUBE_CLIENT_ID YOUTUBE_CLIENT_SECRET YOUTUBE_REFRESH_TOKEN YOUTUBE_REDIRECT_URI"
  echo "  5) Sync channel metadata from config/content-studio/youtube-channels.json"
  if command -v doppler >/dev/null 2>&1; then
    echo "[dry-run] Existing YOUTUBE_* names in Doppler:"
    doppler secrets --only-names --project "$DOPPLER_PROJECT" --config "$DOPPLER_CONFIG" 2>/dev/null \
      | grep -i YOUTUBE || echo "  (none)"
  fi
  exit 0
fi

if ! command -v doppler >/dev/null 2>&1; then
  echo "doppler CLI required" >&2
  exit 1
fi
if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 required" >&2
  exit 1
fi

export YOUTUBE_OAUTH_PORT="$PORT"
export YOUTUBE_REDIRECT_URI="$REDIRECT_URI"
export YOUTUBE_OAUTH_SCOPES="$SCOPES"
export YOUTUBE_CLIENT_JSON="$CLIENT_JSON"
export YOUTUBE_FROM_ENV="$FROM_ENV"
export DOPPLER_PROJECT DOPPLER_CONFIG

# Sync non-secret channel metadata first
node --input-type=module <<'EOF'
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const cfg = JSON.parse(readFileSync('config/content-studio/youtube-channels.json', 'utf8'));
const project = process.env.DOPPLER_PROJECT;
const config = process.env.DOPPLER_CONFIG;
const pairs = {
  YOUTUBE_PRIVACY: cfg.defaults.privacy,
  YOUTUBE_MADE_FOR_KIDS: String(cfg.defaults.made_for_kids),
  YOUTUBE_DEFAULT_CATEGORY_ID: cfg.defaults.category_id,
  YOUTUBE_UPLOAD_DEFAULT_CHANNEL: 'bitsitos',
  YOUTUBE_BITSITOS_CHANNEL_ID: cfg.channels.bitsitos.youtube_channel_id || '',
  YOUTUBE_SPLASHITOS_CHANNEL_ID: cfg.channels.splashitos.youtube_channel_id || '',
  YOUTUBE_REDIRECT_URI: process.env.YOUTUBE_REDIRECT_URI || '',
};
for (const [k, v] of Object.entries(pairs)) {
  if (!v) {
    console.log(`[skip empty] ${k}`);
    continue;
  }
  const r = spawnSync(
    'doppler',
    ['secrets', 'set', `${k}=${v}`, '--project', project, '--config', config],
    { encoding: 'utf8' }
  );
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout);
    process.exit(r.status || 1);
  }
  console.log(`[doppler] set ${k}`);
}
EOF

python3 - <<'PY'
import json, os, sys, urllib.parse, urllib.request, http.server, threading, webbrowser, subprocess, secrets

port = int(os.environ["YOUTUBE_OAUTH_PORT"])
redirect = os.environ["YOUTUBE_REDIRECT_URI"]
scopes = os.environ["YOUTUBE_OAUTH_SCOPES"]
client_json_path = os.environ.get("YOUTUBE_CLIENT_JSON") or ""
from_env = os.environ.get("YOUTUBE_FROM_ENV") == "1"
project = os.environ["DOPPLER_PROJECT"]
config = os.environ["DOPPLER_CONFIG"]

client_id = ""
client_secret = ""

if client_json_path:
    with open(client_json_path, "r", encoding="utf-8") as f:
        raw = json.load(f)
    block = raw.get("installed") or raw.get("web")
    if not block:
        print("JSON must contain installed or web OAuth client", file=sys.stderr)
        sys.exit(1)
    client_id = block["client_id"]
    client_secret = block["client_secret"]
elif from_env:
    # Prefer already-exported env (e.g. doppler run)
    client_id = os.environ.get("YOUTUBE_CLIENT_ID", "").strip()
    client_secret = os.environ.get("YOUTUBE_CLIENT_SECRET", "").strip()
    if not client_id or not client_secret:
        # Pull from Doppler without printing
        def get_plain(name: str) -> str:
            r = subprocess.run(
                ["doppler", "secrets", "get", name, "--plain", "--project", project, "--config", config],
                capture_output=True,
                text=True,
            )
            return (r.stdout or "").strip() if r.returncode == 0 else ""
        client_id = get_plain("YOUTUBE_CLIENT_ID")
        client_secret = get_plain("YOUTUBE_CLIENT_SECRET")
else:
    print("Provide --client-json PATH or --from-env with YOUTUBE_CLIENT_ID/SECRET", file=sys.stderr)
    sys.exit(1)

if not client_id or not client_secret:
    print("Missing client_id/client_secret", file=sys.stderr)
    sys.exit(1)

state = secrets.token_urlsafe(24)
auth_code = {"value": None, "error": None}

class Handler(http.server.BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        return

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path != "/oauth2callback":
            self.send_response(404)
            self.end_headers()
            return
        qs = urllib.parse.parse_qs(parsed.query)
        if qs.get("state", [None])[0] != state:
            auth_code["error"] = "state_mismatch"
            self.send_response(400)
            self.end_headers()
            self.wfile.write(b"state mismatch")
            return
        if "error" in qs:
            auth_code["error"] = qs["error"][0]
            self.send_response(400)
            self.end_headers()
            self.wfile.write(b"oauth error")
            return
        auth_code["value"] = qs.get("code", [None])[0]
        self.send_response(200)
        self.send_header("content-type", "text/html; charset=utf-8")
        self.end_headers()
        self.wfile.write(
            b"<html><body><h1>OK</h1><p>YouTube OAuth recibido. Puedes cerrar esta pesta\xc3\xb1a y volver a la terminal.</p></body></html>"
        )

server = http.server.HTTPServer(("127.0.0.1", port), Handler)
thread = threading.Thread(target=server.serve_forever, daemon=True)
thread.start()

params = {
    "client_id": client_id,
    "redirect_uri": redirect,
    "response_type": "code",
    "scope": scopes,
    "access_type": "offline",
    "prompt": "consent",
    "include_granted_scopes": "true",
    "state": state,
}
url = "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode(params)
print("[youtube-oauth] Abre el navegador y autoriza el canal Bitsitos/ICSO…")
print(url)
webbrowser.open(url)

import time
for _ in range(300):
    if auth_code["value"] or auth_code["error"]:
        break
    time.sleep(1)
server.shutdown()

if auth_code["error"]:
    print(f"OAuth error: {auth_code['error']}", file=sys.stderr)
    sys.exit(1)
if not auth_code["value"]:
    print("Timeout esperando consentimiento OAuth", file=sys.stderr)
    sys.exit(1)

body = urllib.parse.urlencode(
    {
        "code": auth_code["value"],
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uri": redirect,
        "grant_type": "authorization_code",
    }
).encode()
req = urllib.request.Request(
    "https://oauth2.googleapis.com/token",
    data=body,
    headers={"content-type": "application/x-www-form-urlencoded"},
)
with urllib.request.urlopen(req, timeout=30) as resp:
    token = json.loads(resp.read().decode())

refresh = token.get("refresh_token")
if not refresh:
    print(
        "No refresh_token en respuesta. Revoca acceso de la app en Google Account → Security → Third-party y reintenta con prompt=consent.",
        file=sys.stderr,
    )
    sys.exit(1)

# Write to Doppler without echoing values
def set_secret(name: str, value: str) -> None:
    r = subprocess.run(
        ["doppler", "secrets", "set", f"{name}={value}", "--project", project, "--config", config],
        capture_output=True,
        text=True,
    )
    if r.returncode != 0:
        print(r.stderr or r.stdout, file=sys.stderr)
        sys.exit(r.returncode)
    print(f"[doppler] set {name}")

set_secret("YOUTUBE_CLIENT_ID", client_id)
set_secret("YOUTUBE_CLIENT_SECRET", client_secret)
set_secret("YOUTUBE_REFRESH_TOKEN", refresh)
set_secret("YOUTUBE_REDIRECT_URI", redirect)

# Verify channel access (no secret dump)
access = token.get("access_token")
req2 = urllib.request.Request(
    "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true",
    headers={"authorization": f"Bearer {access}"},
)
with urllib.request.urlopen(req2, timeout=30) as resp:
    data = json.loads(resp.read().decode())
items = data.get("items") or []
if not items:
    print("[warn] OAuth OK pero mine=true no devolvió canal. Revisa Brand Account.")
else:
    ch = items[0]
    print(f"[ok] canal={ch['snippet']['title']} id={ch['id']} subs={ch['statistics'].get('subscriberCount')}")
    subprocess.run(
        [
            "doppler",
            "secrets",
            "set",
            f"YOUTUBE_BITSITOS_CHANNEL_ID={ch['id']}",
            "--project",
            project,
            "--config",
            config,
        ],
        check=False,
    )
    print("[doppler] set YOUTUBE_BITSITOS_CHANNEL_ID from mine=true")

print("[done] Doppler listo. Prueba:")
print("  doppler run --project ops-intcloudsysops --config prd -- npm run content:bitsitos:publish -- --dry-run")
print("  doppler run --project ops-intcloudsysops --config prd -- npm run content:bitsitos:publish -- --upload")
PY
