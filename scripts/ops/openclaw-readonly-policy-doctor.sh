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
deny_json="$(json_get tools.deny)"

fail=0

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
const required = ["exec", "process", "write", "edit", "apply_patch"];
const missing = required.filter((name) => !deny.includes(name) && !deny.includes("group:runtime") && !deny.includes("group:fs"));
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

echo "OPENCLAW_READONLY_POLICY_READY"
