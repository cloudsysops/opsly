---
status: draft
owner: operations
last_review: 2026-05-24
type: guide
tags:
  - opsly/development
---

# Local Runtime Guide

> Playbooks para configurar entorno local por OS.
> Fase: Planning | Owner: Claude | Last Updated: 2026-05-16

## 📋 Quick Start

```bash
# Run setup wizard (detecta tu OS automáticamente)
./scripts/runtime-setup-wizard.sh

# Verificar entorno
./scripts/runtime-health-check.sh

# Test local execution
npm run local-agent:test
```

---

## 🍎 macOS

### Requisitos
- macOS 12+ (Monterey o superior)
- Homebrew instalado
- 8GB RAM mínimo (16GB recomendado)

### Instalación

```bash
# 1. Instalar dependencias
brew install node python docker

# 2. Instalar agentes locales
# Cursor
open -a Cursor

# Claude (CLI)
npm install -g @anthropic/claude-cli

# Codex
npm install -g @openai/codex

# OpenCode
npm install -g @opencode/cli

# 3. Ollama (LLM local)
brew install ollama
ollama serve &
ollama pull llama3.2

# 4. Verificar
./scripts/runtime-health-check.sh
```

### Troubleshooting

| Issue | Solution |
|-------|----------|
| Cursor no disponible | `brew install --cask cursor` |
| Ollama lento | `ollama run llama3.2:8b` (modelo más pequeño) |
| Docker no corre | `docker login` y `docker system prune` |

---

## 🐧 Linux (Ubuntu/Debian)

### Requisitos
- Ubuntu 20.04+ o Debian 11+
- 4GB RAM mínimo

### Instalación

```bash
# 1. Actualizar e instalar deps
sudo apt update && sudo apt install -y curl wget git nodejs npm python3

# 2. Agents (si hay binarios disponibles)
# Claude CLI
curl -sL https://cli.anthropic.com/install.sh | sh

# 3. Ollama
curl -fsSL https://ollama.com/install.sh | sh
ollama serve &
ollama pull llama3.2

# 4. Docker (opcional)
sudo apt install docker.io
sudo usermod -aG docker $USER

# 5. Verificar
./scripts/runtime-health-check.sh
```

### Troubleshooting

| Issue | Solution |
|-------|----------|
| Permission denied | `sudo chmod +x scripts/*.sh` |
| Ollama no inicia | Ver logs: `journalctl -u ollama` |
| Node version old | `nvm install 20 && nvm use 20` |

---

## 🪟 Windows (WSL2)

### Requisitos
- Windows 10/11 con WSL2
- Ubuntu 20.04+ en WSL

### Instalación (en WSL)

```bash
# 1. Desde PowerShell, activar WSL
wsl --install -d Ubuntu

# 2. En Ubuntu (WSL)
sudo apt update
sudo apt install -y curl wget git nodejs npm python3

# 3. Ollama (requiere iniciar manualmente en WSL)
curl -fsSL https://ollama.com/install.sh | sh

# 4. Verificar desde PowerShell
wsl ./scripts/runtime-health-check.sh
```

### Notas
- Ejecutar desde WSL, no PowerShell directo
- Docker Desktop con WSL2 backend requerido
- VSCode con WSL extension recomendado

---

## 🔧 Configuración Avanzada

### Variables de Entorno

```bash
# .env.local
OPSLY_LOCAL_AGENTS_ENABLED=true
OPSLY_LOCAL_OLLAMA_URL=http://localhost:11434
OPSLY_LOCAL_OLLAMA_MODEL=llama3.2
OPSLY_LOCAL_PREFERRED_AGENT=cursor
OPSLY_LOCAL_MAX_RETRIES=3
OPSLY_LOCAL_TIMEOUT_MS=30000
```

### Recursos por Agente

| Agent | RAM | CPU | Best For |
|-------|-----|-----|----------|
| Cursor | 2GB | 2 cores | Code completion, refactor |
| Claude | 1GB | 1 core | Reasoning, analysis |
| Codex | 1GB | 1 core | Fast generation |
| OpenCode | 512MB | 0.5 core | Simple edits |

---

## 🧪 Testing

```bash
# Test completo
npm run test:local-runtime

# Test por OS
npm run test:local-runtime -- --os=macos
npm run test:local-runtime -- --os=linux

# Test específico de agente
npm run test:local-runtime -- --agent=cursor

# Benchmarks
npm run benchmark:local
```

---

## 📚 Referencias

- docs/LOCAL-FIRST-ARCHITECTURE.md
- ADR-024: Ollama Local Worker
- scripts/runtime-setup-wizard.sh
---

## Enlaces relacionados

- [[01-development/README|01-development]]
- [[brain/README|Brain Central]]
