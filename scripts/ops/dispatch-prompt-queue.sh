#!/usr/bin/env bash
# Start local OpenCode bridge, open a Terminal TUI if none is running, then
# process the next pending .cursor/prompts/queue/*.md via the existing watcher.
# Does not execute Markdown as shell (not ACTIVE-PROMPT RCE).
# Usage: ./scripts/ops/dispatch-prompt-queue.sh [--dry-run] [--skip-terminal]
set -euo pipefail

DRY_RUN=0
SKIP_TERMINAL=0
for arg in "$@"; do
  case "${arg}" in
    --dry-run) DRY_RUN=1 ;;
    --skip-terminal) SKIP_TERMINAL=1 ;;
    -h|--help)
      sed -n '2,6p' "$0"
      exit 0
      ;;
  esac
done

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT}"

log() { printf '[queue] %s\n' "$*"; }
notify() { ./scripts/notify-discord.sh "$1" "$2" "${3:-info}" >/dev/null 2>&1 || true; }

# Trust gate: an automatic execution machine must not treat "whatever branch
# happens to be checked out" as the task source. Only the trusted branch
# (main by default) may drive automatic dispatch. DISPATCH_QUEUE_TEST_BRANCH
# is a test-only seam (never set in production) to make this gate testable
# without depending on the real checkout's branch.
TRUSTED_BRANCH="${NIGHT_QUEUE_TRUSTED_BRANCH:-main}"
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  log "not inside a git work tree — refusing automatic dispatch"
  exit 0
fi
current_branch="${DISPATCH_QUEUE_TEST_BRANCH:-$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")}"
if [[ -z "${current_branch}" || "${current_branch}" == "HEAD" ]]; then
  log "detached HEAD — not the trusted branch (${TRUSTED_BRANCH}), refusing automatic dispatch"
  exit 0
fi
if [[ "${current_branch}" != "${TRUSTED_BRANCH}" ]]; then
  log "checked out branch '${current_branch}' is not the trusted branch '${TRUSTED_BRANCH}' — refusing automatic dispatch"
  exit 0
fi

# Sync latest night-queue tasks from GitHub before seeding. Fast-forward only —
# never resets/discards local work, never forces a branch change. Best-effort:
# a stale/dirty tree or offline host just means "seed from whatever is on disk",
# not a hard failure (this bridge must not block on network flakiness).
if [[ "${DRY_RUN}" != "1" ]]; then
  if [[ -z "$(git status --porcelain 2>/dev/null)" ]]; then
    if git pull --ff-only origin "${TRUSTED_BRANCH}" >/dev/null 2>&1; then
      log "synced ${TRUSTED_BRANCH} from origin (ff-only)"
    else
      log "git pull --ff-only skipped/failed (offline or diverged) — seeding from local checkout"
    fi
  else
    log "working tree dirty — skipping git sync, seeding from local checkout"
  fi
else
  log "DRY_RUN — on trusted branch ${TRUSTED_BRANCH}, skipping git sync step"
fi

# Seed gitignored .cursor/prompts/queue/ from tracked docs/01-development/night-queue/
QUEUE_DIR="${ROOT}/.cursor/prompts/queue"
SEED_DIR="${ROOT}/docs/01-development/night-queue"
RUNTIME_DIR="${ROOT}/.cursor/runtime"
LOCK_DIR="${RUNTIME_DIR}/dispatch-prompt-queue.lock"
mkdir -p "${QUEUE_DIR}" "${RUNTIME_DIR}"

# Atomic single-dispatcher claim. Prevents overlapping LaunchAgent/manual runs
# from submitting the same pending prompt concurrently. The lock is local and
# ephemeral; BullMQ request_id/jobId dedupe remains the second line of defense.
if ! mkdir "${LOCK_DIR}" 2>/dev/null; then
  log "another dispatcher instance holds ${LOCK_DIR} — skipping this cycle"
  exit 0
fi
cleanup_dispatch_lock() { rmdir "${LOCK_DIR}" >/dev/null 2>&1 || true; }
trap cleanup_dispatch_lock EXIT
if [[ -d "${SEED_DIR}" ]]; then
  for src in "${SEED_DIR}"/*.md; do
    [[ -f "${src}" ]] || continue
    dest="${QUEUE_DIR}/$(basename "${src}")"
    if [[ ! -f "${dest}" ]]; then
      cp "${src}" "${dest}"
      log "seeded ${dest}"
    fi
  done
fi

next="$(bash scripts/next-prompt-in-queue.sh || true)"
if ! grep -q 'Siguiente pendiente:' <<<"${next}"; then
  log "no pending prompt in .cursor/prompts/queue/"
  exit 0
fi

# next-prompt prints: line "Siguiente pendiente:" then the path
prompt_file="$(awk '/^Siguiente pendiente:/{getline; print; exit}' <<<"${next}")"
log "pending: ${prompt_file}"

if [[ "$(basename "${prompt_file}")" == "010-night-merge-wave2-rebase.md" ]]; then
  if gh pr view 1154 --repo cloudsysops/opsly --json state --jq '.state' 2>/dev/null | grep -qx OPEN; then
    log "wave2 skipped — #1154 still OPEN"
    exit 0
  fi
fi

if [[ "${DRY_RUN}" == "1" ]]; then
  log "DRY_RUN would start OpenCode, open Terminal, run local-prompt-watcher:once"
  exit 0
fi

notify "🤖 Agent queue" "Starting OpenCode for ${prompt_file}" info

if ! pgrep -f 'cli-agent-service.ts' >/dev/null 2>&1; then
  log "starting local OpenCode service (port 5004)"
  npx tsx scripts/opsly-agent-cli.ts start opencode || true
fi

if [[ "${SKIP_TERMINAL}" != "1" ]] && command -v osascript >/dev/null 2>&1; then
  if ! pgrep -x opencode >/dev/null 2>&1; then
    log "opening Terminal with opencode"
    osascript -e "tell application \"Terminal\" to do script \"cd '${ROOT}' && exec opencode\"" >/dev/null 2>&1 || true
  else
    log "opencode already running — not opening another Terminal"
  fi
fi

if [[ -z "${PLATFORM_ADMIN_TOKEN:-}" ]]; then
  log "PLATFORM_ADMIN_TOKEN missing — run via doppler run; watcher skipped"
  notify "⚠️ Agent queue" "OpenCode opened but watcher skipped (no PLATFORM_ADMIN_TOKEN)" warning
  exit 0
fi

npm run opsly:local-prompt-watcher:once
notify "✅ Agent queue" "Watcher pass finished for ${prompt_file}" success
log "done"
