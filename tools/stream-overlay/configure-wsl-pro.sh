#!/usr/bin/env bash
# Configura WSL (Ubuntu) para trabajar "pro" con Claude Code + GitHub por SSH. Idempotente; copia de seguridad de todo lo que toca.
# Uso (desde Windows):  wsl -d Ubuntu -u opsly -- bash /mnt/c/.../configure-wsl-pro.sh
# No imprime ni copia claves privadas. No cambia .wslconfig ni nada de Windows.
set -u
TS=$(date +%Y%m%d-%H%M%S); H="$HOME"; ok(){ echo "  OK  $*"; }; info(){ echo "  ..  $*"; }
mkdir -p "$H/.ssh" "$H/.claude"; chmod 700 "$H/.ssh"
bak(){ [ -f "$1" ] && cp -p "$1" "$1.bak-$TS" && info "copia de seguridad: $(basename "$1").bak-$TS"; }

echo "== 1) Claude Code (CLI) en WSL"
export PATH="$H/.npm-global/bin:$PATH"
if command -v claude >/dev/null 2>&1; then ok "ya instalado: $(claude --version 2>&1 | head -1)"; else
  info "instalando @anthropic-ai/claude-code con npm (prefijo $(npm config get prefix))"; npm install -g @anthropic-ai/claude-code >/tmp/claude-install.log 2>&1 && ok "instalado: $(claude --version 2>&1 | head -1)" || { echo "  ERROR  instalacion fallo:"; tail -5 /tmp/claude-install.log; }
fi

echo "== 2) SSH: llave del VPS y valores por defecto"
if [ ! -f "$H/.ssh/id_ed25519_vps" ]; then ssh-keygen -t ed25519 -N "" -C "opsly-wsl-smdqcia-to-vps-dragon" -f "$H/.ssh/id_ed25519_vps" >/dev/null && ok "llave nueva id_ed25519_vps creada (sin passphrase, como las demas)"; else ok "id_ed25519_vps ya existe"; fi
chmod 600 "$H/.ssh/id_ed25519_vps" 2>/dev/null
CFG="$H/.ssh/config"; touch "$CFG"; chmod 600 "$CFG"
if grep -q '>>> opsly pro defaults' "$CFG"; then ok "bloque SSH ya presente"; else bak "$CFG"; cat >> "$CFG" <<'EOF'

# >>> opsly pro defaults (gestionado por Claude; para quitarlo borra hasta la linea <<<) >>>
Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519
  IdentitiesOnly yes
  AddKeysToAgent yes

# VPS por Tailscale. La llave id_ed25519_vps debe autorizarse en el VPS (ver docs/02-tools/CLAUDE-WSL-SSH-GITHUB.md)
Host vps vps-dragon
  HostName 100.120.151.91
  User vps-dragon
  IdentityFile ~/.ssh/id_ed25519_vps
  IdentitiesOnly yes

Host *
  ServerAliveInterval 30
  ServerAliveCountMax 4
  TCPKeepAlive yes
  AddKeysToAgent yes
  ControlMaster auto
  ControlPath ~/.ssh/cm-%C
  ControlPersist 10m
# <<< opsly pro defaults <<<
EOF
  ok "bloque SSH agregado a ~/.ssh/config"; fi

echo "== 3) Git y GitHub CLI"
bak "$H/.gitconfig"
g(){ git config --global "$1" "$2"; }
g push.autoSetupRemote true; g rebase.autoStash true; g core.autocrlf input; g merge.conflictstyle zdiff3; g rerere.enabled true
g diff.algorithm histogram; g branch.sort -committerdate; g tag.sort version:refname; g commit.verbose true; g help.autocorrect prompt
git config --global --replace-all url."git@github.com:".insteadOf "https://github.com/"
ok "git: autoSetupRemote, autoStash, rerere, zdiff3, histogram... y todo GitHub por SSH (insteadOf)"
gh config set git_protocol ssh >/dev/null 2>&1 && ok "gh: protocolo git = ssh"
gh config set prompt enabled >/dev/null 2>&1

echo "== 4) Claude Code: permisos y memoria de usuario"
S="$H/.claude/settings.json"; [ -f "$S" ] || echo '{}' > "$S"; bak "$S"
PERMS=$(cat <<'EOF'
{
 "allow": ["Bash(git status:*)","Bash(git diff:*)","Bash(git log:*)","Bash(git show:*)","Bash(git branch:*)","Bash(git fetch:*)","Bash(git pull:*)","Bash(git add:*)","Bash(git commit:*)","Bash(git checkout:*)","Bash(git switch:*)","Bash(git stash:*)","Bash(git worktree:*)","Bash(git push:*)","Bash(git remote:*)","Bash(git ls-remote:*)",
   "Bash(gh pr:*)","Bash(gh issue:*)","Bash(gh run:*)","Bash(gh repo view:*)","Bash(gh auth status:*)","Bash(gh release view:*)",
   "Bash(npm run:*)","Bash(npm test:*)","Bash(npm ci:*)","Bash(npm install:*)","Bash(npx:*)","Bash(node:*)","Bash(python3:*)",
   "Bash(ls:*)","Bash(cat:*)","Bash(head:*)","Bash(tail:*)","Bash(wc:*)","Bash(rg:*)","Bash(find:*)","Bash(jq:*)","Bash(pwd)","Bash(which:*)","Bash(env)","Bash(date:*)","Bash(mkdir:*)",
   "Bash(docker ps:*)","Bash(docker logs:*)","Bash(docker compose ps:*)","Bash(docker compose logs:*)","Bash(docker images:*)","Bash(tmux ls:*)","Bash(tailscale status:*)"],
 "ask": ["Bash(git push origin main:*)","Bash(git push origin master:*)","Bash(git rebase:*)","Bash(git reset --hard:*)","Bash(git clean:*)","Bash(gh api:*)","Bash(gh pr merge:*)","Bash(gh release create:*)",
   "Bash(docker stop:*)","Bash(docker rm:*)","Bash(docker restart:*)","Bash(docker kill:*)","Bash(docker compose down:*)","Bash(docker compose up:*)",
   "Bash(ssh:*)","Bash(scp:*)","Bash(rsync:*)","Bash(sudo:*)"],
 "deny": ["Bash(git push --force:*)","Bash(git push -f:*)","Bash(git push origin --force:*)","Bash(rm -rf /:*)","Bash(rm -rf ~:*)","Bash(sudo rm:*)","Bash(wsl.exe --shutdown:*)","Bash(wsl --shutdown:*)","Bash(docker system prune:*)","Bash(docker volume rm:*)",
   "Read(./.env)","Read(./.env.*)","Read(~/.ssh/id_*)","Read(~/.ssh/*_key)","Read(~/.claude/.credentials.json)","Read(~/.config/gh/hosts.yml)","Edit(~/.ssh/**)"]
}
EOF
)
jq --argjson p "$PERMS" '.permissions = ((.permissions // {}) as $o | $o + {defaultMode: ($o.defaultMode // "acceptEdits"), allow: ((($o.allow // []) + $p.allow) | unique), ask: ((($o.ask // []) + $p.ask) | unique), deny: ((($o.deny // []) + $p.deny) | unique)})' "$S" > "$S.new" && mv "$S.new" "$S" && ok "settings.json: permisos fusionados (se conservaron tus claves: tui, theme, autoMode...)"
M="$H/.claude/CLAUDE.md"
if [ -f "$M" ]; then ok "CLAUDE.md de usuario ya existe: no se toca"; else cat > "$M" <<'EOF'
# Instrucciones de usuario (Opsly / cboteros) — Claude Code en WSL

## Entorno
- Trabaja en WSL (Ubuntu). Repo principal: `~/opsly` (GitHub `cloudsysops/opsly`). Lee su `AGENTS.md` y `.claude/CLAUDE.md` antes de tocar nada.
- GitHub va por **SSH** (`git@github.com`, llave `~/.ssh/id_ed25519`); `gh` autenticado. El VPS es `ssh vps` (Tailscale) — requiere autorizar `~/.ssh/id_ed25519_vps`.
- Este PC (Windows `smdqcia-pc`) es el PC de stream y juego: **normalmente hay un directo en vivo**. No cierres ni reinicies juegos/OBS, y comprueba `GetStreamStatus` antes de tocar nada de OBS.
- **No ejecutes `wsl --shutdown`**: este WSL aloja el worker de Docker `opsly-pc-gamer-worker-openclaw`, Uptime Kuma, tmux `opsly-harness` y servicios Node.

## Forma de trabajar
- Una rama y un PR por cambio; commits convencionales (`feat|fix|docs|chore(scope): ...`). No uses `--no-verify` ni `--force` (hay hooks husky y commitlint).
- Nunca commitees secretos (`.env`, claves, tokens, `doppler.json`). Los secretos van por Doppler. No imprimas credenciales en la conversación.
- Antes de afirmar que algo funciona, verifícalo (tests, `git status`, salida real). Si algo no se pudo probar, dilo.
- Para cambios grandes usa un worktree: `git worktree add ../opsly-<tema> -b <rama> origin/main`.
- Responde en español, breve y directo.
EOF
  ok "~/.claude/CLAUDE.md creado"; fi

echo "== 5) Verificacion"
echo "-- claude:";  (claude --version 2>&1 | head -1 | sed 's/^/   /')
echo "-- SSH a GitHub con la config nueva:"; timeout 15 ssh -T git@github.com 2>&1 | head -1 | sed 's/^/   /'
echo "-- git en ~/opsly usando SSH (lectura):"; (cd "$H/opsly" && timeout 20 git ls-remote --heads origin 2>&1 | head -1 | cut -c1-90 | sed 's/^/   /'; git remote get-url --push origin | sed 's/^/   push -> /')
echo "-- gh:"; gh auth status 2>&1 | grep -E 'Logged in|protocol' | head -2 | sed 's/^/   /'
echo "-- config SSH valida:"; ssh -G vps 2>/dev/null | grep -E '^(hostname|user|identityfile|controlpersist) ' | sed 's/^/   /'
echo "-- clave publica del VPS (para autorizarla; NO es secreta):"; cat "$H/.ssh/id_ed25519_vps.pub" | sed 's/^/   /'
echo "-- permisos de Claude Code:"; jq -r '.permissions | "   modo=\(.defaultMode) allow=\(.allow|length) ask=\(.ask|length) deny=\(.deny|length)"' "$S"; jq -e . "$S" >/dev/null && echo "   settings.json: JSON valido"
