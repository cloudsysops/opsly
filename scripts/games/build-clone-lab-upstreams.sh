#!/usr/bin/env bash
set -euo pipefail

: "${GODOT_BIN:?Set GODOT_BIN to the Godot executable}"
: "${OUT_DIR:?Set OUT_DIR to the output directory}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CONFIG="$ROOT/config/games/clone-lab-upstream-builds.json"
WORK_ROOT="${RUNNER_TEMP:-/tmp}/opsly-clone-lab-upstream"
REPO_DIR="$WORK_ROOT/godot-demo-projects"

repository="$(node -e "const c=require(process.argv[1]);process.stdout.write(c.repository)" "$CONFIG")"
commit="$(node -e "const c=require(process.argv[1]);process.stdout.write(c.commit)" "$CONFIG")"

rm -rf "$WORK_ROOT"
mkdir -p "$WORK_ROOT" "$OUT_DIR"

git init -q "$REPO_DIR"
git -C "$REPO_DIR" remote add origin "https://github.com/${repository}.git"
git -C "$REPO_DIR" sparse-checkout init --cone

mapfile -t paths < <(node -e "const c=require(process.argv[1]); for (const g of c.games) console.log(g.path)" "$CONFIG")
git -C "$REPO_DIR" sparse-checkout set "${paths[@]}"
git -C "$REPO_DIR" fetch -q --depth 1 origin "$commit"
git -C "$REPO_DIR" checkout -q --detach FETCH_HEAD

write_export_preset() {
  local project_dir="$1"
  cat > "$project_dir/export_presets.cfg" <<'EOF'
[preset.0]

name="Web"
platform="Web"
runnable=true
dedicated_server=false
custom_features=""
export_filter="all_resources"
include_filter=""
exclude_filter=""
export_path=""
script_export_mode=2

[preset.0.options]

custom_template/debug=""
custom_template/release=""
variant/extensions_support=false
variant/thread_support=false
vram_texture_compression/for_desktop=true
vram_texture_compression/for_mobile=false
html/export_icon=true
html/custom_html_shell=""
html/head_include=""
html/canvas_resize_policy=2
html/focus_canvas_on_start=true
html/experimental_virtual_keyboard=false
progressive_web_app/enabled=false
EOF
}

while IFS=$'\t' read -r id project_path title; do
  project_dir="$REPO_DIR/$project_path"
  output_dir="$OUT_DIR/$id"
  mkdir -p "$output_dir"
  write_export_preset "$project_dir"

  "$GODOT_BIN" --headless --editor --path "$project_dir" --quit
  "$GODOT_BIN" --headless --path "$project_dir" --export-release "Web" "$output_dir/index.html"

  test -s "$output_dir/index.html"
  find "$output_dir" -maxdepth 1 -type f -name '*.wasm' -size +0c | grep -q .
  find "$output_dir" -maxdepth 1 -type f -name '*.pck' -size +0c | grep -q .

  cp "$REPO_DIR/LICENSE.md" "$output_dir/UPSTREAM-LICENSE-MIT.txt"
  if [ -f "$project_dir/README.md" ]; then
    cp "$project_dir/README.md" "$output_dir/UPSTREAM-README.md"
  fi
  node -e "
    const fs=require('fs');
    fs.writeFileSync(process.argv[1], JSON.stringify({
      repository: process.argv[2],
      commit: process.argv[3],
      path: process.argv[4],
      title: process.argv[5]
    }, null, 2)+'\\n');
  " "$output_dir/source.json" "$repository" "$commit" "$project_path" "$title"

  echo "UPSTREAM_GAME_BUILD=PASS id=$id path=$project_path"
done < <(node -e "const c=require(process.argv[1]); for (const g of c.games) console.log([g.id,g.path,g.title].join('\\t'))" "$CONFIG")
