#!/bin/bash
set -euo pipefail

detect_agent() {
  local cmd="$1"
  if path=$(which "$cmd" 2>/dev/null) && [ -n "$path" ]; then
    echo "$path"
  else
    echo "null"
  fi
}

get_health() {
  local cmd="$1"
  if which "$cmd" >/dev/null 2>&1; then
    echo "ready"
  else
    echo "not_installed"
  fi
}

echo "{"
echo "  \"detected_at\": \"$(date -Iseconds)\","
echo "  \"hostname\": \"$(hostname)\","
echo "  \"platform\": \"$(uname -s)\","
echo "  \"agents\": ["

# Agent definitions: tool_type,name,command,capabilities
echo '    {"tool_type": "cursor", "name": "Cursor", "installed": false, "path": null, "version": null, "capabilities": ["code","edit","chat"], "health": "not_installed", "last_check": "'"$(date -Iseconds)"'"},'
echo '    {"tool_type": "claude", "name": "Claude Code", "installed": '"$(if which claude >/dev/null 2>&1; then echo 'true'; else echo 'false'; fi)"', "path": '$(detect_agent claude)', "version": null, "capabilities": ["code","edit","chat","research"], "health": "'$(get_health claude)'", "last_check": "'"$(date -Iseconds)"'"},'
echo '    {"tool_type": "codex", "name": "Codex CLI", "installed": '"$(if which codex >/dev/null 2>&1; then echo 'true'; else echo 'false'; fi)"', "path": '$(detect_agent codex)', "version": null, "capabilities": ["code","edit","terminal"], "health": "'$(get_health codex)'", "last_check": "'"$(date -Iseconds)"'"},'
echo '    {"tool_type": "copilot", "name": "GitHub Copilot", "installed": '"$(if which copilot >/dev/null 2>&1; then echo 'true'; else echo 'false'; fi)"', "path": '$(detect_agent copilot)', "version": null, "capabilities": ["code","edit","chat"], "health": "'$(get_health copilot)'", "last_check": "'"$(date -Iseconds)"'"},'
echo '    {"tool_type": "opencode", "name": "OpenCode", "installed": '"$(if which opencode >/dev/null 2>&1; then echo 'true'; else echo 'false'; fi)"', "path": '$(detect_agent opencode)', "version": null, "capabilities": ["code","edit","chat"], "health": "'$(get_health opencode)'", "last_check": "'"$(date -Iseconds)"'"},'
echo '    {"tool_type": "vscode", "name": "VSCode", "installed": false, "path": null, "version": null, "capabilities": ["code","edit","debug"], "health": "not_installed", "last_check": "'"$(date -Iseconds)"'"},'
echo '    {"tool_type": "aider", "name": "Aider", "installed": '"$(if which aider >/dev/null 2>&1; then echo 'true'; else echo 'false'; fi)"', "path": '$(detect_agent aider)', "version": null, "capabilities": ["code","git","edit"], "health": "'$(get_health aider)'", "last_check": "'"$(date -Iseconds)"'"},'
echo '    {"tool_type": "goose", "name": "Goose", "installed": '"$(if which goose >/dev/null 2>&1; then echo 'true'; else echo 'false'; fi)"', "path": '$(detect_agent goose)', "version": null, "capabilities": ["agent","general"], "health": "'$(get_health goose)'", "last_check": "'"$(date -Iseconds)"'"},'
echo '    {"tool_type": "tmux", "name": "Tmux", "installed": '"$(if which tmux >/dev/null 2>&1; then echo 'true'; else echo 'false'; fi)"', "path": '$(detect_agent tmux)', "version": null, "capabilities": ["session","multiplexer"], "health": "'$(get_health tmux)'", "last_check": "'"$(date -Iseconds)"'"},'
echo '    {"tool_type": "docker", "name": "Docker", "installed": '"$(if which docker >/dev/null 2>&1; then echo 'true'; else echo 'false'; fi)"', "path": '$(detect_agent docker)', "version": null, "capabilities": ["container","runtime"], "health": "'$(get_health docker)'", "last_check": "'"$(date -Iseconds)"'"},'
echo '    {"tool_type": "git", "name": "Git", "installed": '"$(if which git >/dev/null 2>&1; then echo 'true'; else echo 'false'; fi)"', "path": '$(detect_agent git)', "version": null, "capabilities": ["vcs","branch","workflow"], "health": "'$(get_health git)'", "last_check": "'"$(date -Iseconds)"'"}'

echo "  ],"
echo "  \"summary\": {"
echo "    \"total\": 11,"
echo "    \"installed\": $(which git docker tmux 2>/dev/null | wc -l),"  
echo "    \"available\": [],"
echo "    \"unavailable\": []"
echo "  }"
echo "}"