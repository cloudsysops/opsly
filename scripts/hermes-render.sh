#!/usr/bin/env bash

# Hermes Rendering Engine CLI
# Request music, image, and video generation from agents

set -euo pipefail

RENDERING_API="${RENDERING_ENGINE_URL:-${OPSLY_RENDERING_ENGINE_URL:-}}"
MCP_SERVER_URL="${MCP_RENDERING_SERVER_URL:-${OPSLY_MCP_RENDERING_SERVER_URL:-}}"
DRY_RUN=0

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

log_error() {
  echo -e "${RED}❌ $1${NC}"
}

require_runtime_config() {
  if [ -z "${RENDERING_API}" ]; then
    log_error "Missing RENDERING_ENGINE_URL (or OPSLY_RENDERING_ENGINE_URL)"
    exit 1
  fi
}

# Generate music
render_music() {
  local prompt="$1"
  local duration=${2:-60}
  local style=${3:-background}
  local bpm=${4:-128}
  local format=${5:-mp3}

  local task_id="music_${RANDOM}_$(date +%s)"

  log_info "🎵 Rendering music: \"$prompt\""
  log_info "  Duration: ${duration}s, Style: $style, BPM: $bpm"

  local payload
  payload="$(cat <<EOF
{
  "task_id": "$task_id",
  "prompt": "$prompt",
  "duration": $duration,
  "style": "$style",
  "bpm": $bpm,
  "format": "$format"
}
EOF
)"

  if [ "$DRY_RUN" -eq 1 ]; then
    log_info "[dry-run] POST $RENDERING_API/render/music"
    echo "$payload" | jq '.'
    return 0
  fi

  local response
  response=$(curl -s -X POST "$RENDERING_API/render/music" \
    -H "Content-Type: application/json" \
    -d "$payload")

  if echo "$response" | jq -e '.status == "success"' > /dev/null 2>&1; then
    log_success "Music rendered successfully"
    echo "$response" | jq '.'
    
    local output_path=$(echo "$response" | jq -r '.output_path')
    log_success "Output: $output_path"
  else
    log_error "Music rendering failed"
    echo "$response" | jq '.'
  fi
}

# Generate image
render_image() {
  local prompt="$1"
  local style=${2:-realistic}
  local resolution=${3:-1024x1024}
  local format=${4:-png}

  local task_id="image_${RANDOM}_$(date +%s)"

  log_info "🖼️  Rendering image: \"$prompt\""
  log_info "  Style: $style, Resolution: $resolution"

  local payload
  payload="$(cat <<EOF
{
  "task_id": "$task_id",
  "prompt": "$prompt",
  "style": "$style",
  "resolution": "$resolution",
  "format": "$format"
}
EOF
)"

  if [ "$DRY_RUN" -eq 1 ]; then
    log_info "[dry-run] POST $RENDERING_API/render/image"
    echo "$payload" | jq '.'
    return 0
  fi

  local response
  response=$(curl -s -X POST "$RENDERING_API/render/image" \
    -H "Content-Type: application/json" \
    -d "$payload")

  if echo "$response" | jq -e '.status == "success"' > /dev/null 2>&1; then
    log_success "Image rendered successfully"
    echo "$response" | jq '.'
    
    local output_path=$(echo "$response" | jq -r '.output_path')
    log_success "Output: $output_path"
  else
    log_error "Image rendering failed"
    echo "$response" | jq '.'
  fi
}

# Generate video
render_video() {
  local prompt="$1"
  local duration=${2:-30}
  local style=${3:-cinematic}
  local format=${4:-mp4}

  local task_id="video_${RANDOM}_$(date +%s)"

  log_info "🎬 Rendering video: \"$prompt\""
  log_info "  Duration: ${duration}s, Style: $style"

  local payload
  payload="$(cat <<EOF
{
  "task_id": "$task_id",
  "prompt": "$prompt",
  "duration": $duration,
  "style": "$style",
  "format": "$format"
}
EOF
)"

  if [ "$DRY_RUN" -eq 1 ]; then
    log_info "[dry-run] POST $RENDERING_API/render/video"
    echo "$payload" | jq '.'
    return 0
  fi

  local response
  response=$(curl -s -X POST "$RENDERING_API/render/video" \
    -H "Content-Type: application/json" \
    -d "$payload")

  if echo "$response" | jq -e '.status == "success"' > /dev/null 2>&1; then
    log_success "Video rendered successfully"
    echo "$response" | jq '.'
    
    local output_path=$(echo "$response" | jq -r '.output_path')
    log_success "Output: $output_path"
  else
    log_error "Video rendering failed"
    echo "$response" | jq '.'
  fi
}

# List all renders
list_renders() {
  log_info "Fetching render history..."
  
  curl -s "$RENDERING_API/renders" | jq '.'
}

# Get render status
get_render() {
  local task_id=$1
  
  log_info "Getting render: $task_id"
  
  curl -s "$RENDERING_API/render/$task_id" | jq '.'
}

# Print usage
usage() {
  cat << 'EOF'

╔═════════════════════════════════════════════════════════════════╗
║            HERMES RENDERING ENGINE CLI                         ║
╚═════════════════════════════════════════════════════════════════╝

Usage: hermes-render [command] [options]
       hermes-render --dry-run <command> [options]

Commands:

  music <prompt> [duration] [style] [bpm] [format]
    Generate music from text prompt
    Defaults: duration=60s, style=background, bpm=128, format=mp3
    Styles: background, cinematic, energetic, ambient, custom
    
  image <prompt> [style] [resolution] [format]
    Generate image from text prompt
    Defaults: style=realistic, resolution=1024x1024, format=png
    Styles: realistic, artistic, sketch, 3d, abstract
    Resolutions: 512x512, 768x768, 1024x1024, 1536x1536, 2048x2048
    
  video <prompt> [duration] [style] [format]
    Generate video from text prompt
    Defaults: duration=30s, style=cinematic, format=mp4
    Styles: cinematic, tutorial, demo, abstract, animated
    
  list
    List all renders
    
  status <task_id>
    Get status of specific render
    
  help
    Show this help message

Environment Variables:

  RENDERING_ENGINE_URL           URL of rendering engine
  OPSLY_RENDERING_ENGINE_URL     Fallback URL for rendering engine
  MCP_RENDERING_SERVER_URL       URL of MCP server (optional)
  OPSLY_MCP_RENDERING_SERVER_URL Fallback URL for MCP server (optional)

Examples:

  # Generate background music
  hermes-render music "upbeat electronic background, 128 BPM" 60 background 128

  # Generate image
  hermes-render image "professional dashboard UI mockup, blue theme" realistic 1024x1024

  # Generate video
  hermes-render video "authentication flow demo" 30 cinematic

  # List all renders
  hermes-render list

  # Check render status
  hermes-render status music_12345_1234567890

EOF
}

# Main
main() {
  local args=()
  while [ "$#" -gt 0 ]; do
    case "$1" in
      --dry-run)
        DRY_RUN=1
        shift
        ;;
      *)
        args+=("$1")
        shift
        ;;
    esac
  done
  if [ "${#args[@]}" -gt 0 ]; then
    set -- "${args[@]}"
  else
    set --
  fi

  if [ $# -eq 0 ]; then
    usage
    exit 0
  fi
  
  local command=$1
  shift

  if [ "$command" != "help" ]; then
    require_runtime_config
  fi
  
  case "$command" in
    music)
      render_music "$@"
      ;;
    image)
      render_image "$@"
      ;;
    video)
      render_video "$@"
      ;;
    list)
      list_renders
      ;;
    status)
      get_render "$@"
      ;;
    help)
      usage
      ;;
    *)
      log_error "Unknown command: $command"
      usage
      exit 1
      ;;
  esac
}

main "$@"
