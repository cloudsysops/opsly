#!/usr/bin/env bash
set -euo pipefail

if ! command -v openclaw >/dev/null 2>&1; then
  echo "BLOCKED: openclaw binary not found" >&2
  exit 3
fi

json_get() {
  local path="$1"
  openclaw config get "$path" --json 2>/dev/null || true
}

normalize_string() {
  node -e '
    let raw="";
    process.stdin.on("data",(c)=>raw+=c);
    process.stdin.on("end",()=>{
      raw=raw.trim();
      try {
        const v=JSON.parse(raw);
        process.stdout.write(typeof v==="string" ? v : "");
      } catch {
        process.stdout.write("");
      }
    });
  '
}

workspace_access="$(json_get agents.defaults.sandbox.workspaceAccess | normalize_string)"
exec_mode="$(json_get tools.exec.mode | normalize_string)"
elevated_enabled="$(json_get tools.elevated.enabled | node -e '
  let raw="";
  process.stdin.on("data",(c)=>raw+=c);
  process.stdin.on("end",()=>{
    raw=raw.trim();
    try {
      const v=JSON.parse(raw);
      process.stdout.write(v === false ? "false" : v === true ? "true" : "");
    } catch {
      process.stdout.write("");
    }
  });
')"
allow_json="$(json_get tools.allow)"
deny_json="$(json_get tools.deny)"
model_json="$(json_get agents.defaults.model)"

fail=0

allow_check="$(ALLOW_JSON="$allow_json" node - <<'NODE'
const raw = process.env.ALLOW_JSON || "";
let allow = [];
try {
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) allow = parsed.map(String);
} catch {}
process.stdout.write(allow.length === 1 && allow[0] === "read" ? "ok" : allow.join(","));
NODE
)"
if [[ "$allow_check" == "ok" ]]; then
  echo "tools_allow=read"
else
  echo "BLOCKED: tools.allow must be exactly [read] for acceptance (actual=${allow_check:-unset})" >&2
  fail=1
fi

model_check="$(MODEL_JSON="$model_json" node - <<'NODE'
const raw = process.env.MODEL_JSON || "";
let primary = "";
let fallbacks = [];
try {
  const parsed = JSON.parse(raw);
  if (typeof parsed === "string") primary = parsed;
  else if (parsed && typeof parsed === "object") {
    primary = typeof parsed.primary === "string" ? parsed.primary : "";
    fallbacks = Array.isArray(parsed.fallbacks) ? parsed.fallbacks.map(String) : [];
  }
} catch {}
const local = primary.startsWith("ollama/") && !primary.includes(":cloud");
if (!local) {
  process.stdout.write("bad-primary:" + primary);
} else if (fallbacks.length > 0) {
  process.stdout.write("fallbacks:" + fallbacks.join(","));
} else {
  process.stdout.write("ok:" + primary);
}
NODE
)"
if [[ "$model_check" == ok:* ]]; then
  echo "model_primary=${model_check#ok:}"
else
  echo "BLOCKED: OpenClaw acceptance requires a local ollama/<model> primary with no fallbacks (actual=$model_check)" >&2
  fail=1
fi

if [[ "$workspace_access" == "ro" || "$workspace_access" == "none" ]]; then
  echo "workspace_access=$workspace_access"
else
  echo "BLOCKED: agents.defaults.sandbox.workspaceAccess must be ro or none (actual=${workspace_access:-unset})" >&2
  fail=1
fi

if [[ "$exec_mode" == "deny" ]]; then
  echo "exec_mode=deny"
else
  echo "BLOCKED: tools.exec.mode must be deny (actual=${exec_mode:-unset})" >&2
  fail=1
fi

if [[ "$elevated_enabled" == "false" || -z "$elevated_enabled" ]]; then
  echo "elevated_enabled=${elevated_enabled:-unset}"
else
  echo "BLOCKED: tools.elevated.enabled must not be true" >&2
  fail=1
fi

missing_tools="$(DENY_JSON="$deny_json" node - <<'NODE'
const raw = process.env.DENY_JSON || "";
let deny = [];
try {
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) deny = parsed.map(String);
} catch {}
const required = ["exec", "process", "write", "edit", "apply_patch", "browser", "gateway", "sessions_spawn"];
const missing = required.filter((name) => !deny.includes(name));
process.stdout.write(missing.join(","));
NODE
)"

if [[ -n "$missing_tools" ]]; then
  echo "BLOCKED: tools.deny missing required mutation tools: $missing_tools" >&2
  fail=1
else
  echo "mutation_tools=denied"
fi

if (( fail != 0 )); then
  exit 3
fi

if [[ "${OPENCLAW_CONFIG_READONLY:-}" != "1" ]]; then
  echo "BLOCKED: OPENCLAW_CONFIG_READONLY=1 is required in the bridge environment" >&2
  exit 3
fi

echo "config_readonly=1"
echo "OPENCLAW_READONLY_POLICY_READY"
