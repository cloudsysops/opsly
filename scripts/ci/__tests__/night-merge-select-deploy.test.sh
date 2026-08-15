#!/usr/bin/env bash
# Guard: wait_for_deploy must not pick a stale completed Deploy.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FILTER="${ROOT}/night-merge-select-deploy.jq"

fixture='[
  {
    "databaseId": 31440368597,
    "status": "completed",
    "conclusion": "failure",
    "headSha": "249a523c07d2c775357a8e1c346fa794e497dd9f",
    "createdAt": "2026-08-10T22:56:34Z"
  },
  {
    "databaseId": 31869299488,
    "status": "in_progress",
    "conclusion": "",
    "headSha": "04e1c3e23406070d6ec8b8a38b4ccb728296f5fe",
    "createdAt": "2026-08-15T06:23:10Z"
  }
]'

selected="$(
  jq --arg after "04e1c3e23406070d6ec8b8a38b4ccb728296f5fe" \
    --arg since "2026-08-15T06:22:00Z" \
    -f "${FILTER}" <<<"${fixture}"
)"
id="$(jq -r '.databaseId' <<<"${selected}")"
if [[ "${id}" != "31869299488" ]]; then
  echo "expected new in-progress run, got ${id:-empty}" >&2
  exit 1
fi

stale="$(
  jq --arg after "04e1c3e23406070d6ec8b8a38b4ccb728296f5fe" \
    --arg since "2026-08-15T06:22:00Z" \
    -f "${FILTER}" <<<"${fixture}" \
    | jq -r 'select(.databaseId==31440368597) | .databaseId'
)"
if [[ -n "${stale}" ]]; then
  echo "stale Deploy run was selected" >&2
  exit 1
fi

empty="$(
  jq --arg after "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" \
    --arg since "2026-08-15T06:22:00Z" \
    -f "${FILTER}" <<<"${fixture}"
)"
if [[ -n "${empty}" && "${empty}" != "null" ]]; then
  echo "expected empty when SHA does not match, got ${empty}" >&2
  exit 1
fi

echo "night-merge-select-deploy: ok"
