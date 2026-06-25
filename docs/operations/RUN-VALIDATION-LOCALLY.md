---
status: active
owner: operations
last_review: 2026-06-22
---

# ⚠️ IMPORTANTE: Validación Se Ejecuta en TU Máquina, No en Claude Code

> Este documento explica por qué y cómo ejecutar la validación VPS **localmente**

---

## 🔴 Por Qué NO Funciona en Claude Code Remote

Claude Code (este environment remoto) tiene restricciones:

| Componente | Local | Claude Remote | Resultado |
|-----------|-------|----------------|----------|
| **SSH** | ✅ Sí | ❌ No | No puedo conectar a VPS |
| **Tailscale** | ✅ Sí | ❌ No | No tengo VPN |
| **Network Egress** | ✅ Sin restricciones | ❌ Whitelist only | No puedo alcanzar api.op-sly.com |
| **Curl a URLs** | ✅ Sí | ⚠️ Solo IPs permitidas | Bloqueado |

**Conclusión:** La validación VPS **debe ejecutarse desde tu máquina local** donde tienes:
- ✅ SSH configurado
- ✅ Tailscale conectado
- ✅ Acceso a internet sin restricciones

---

## ✅ Cómo Ejecutar en TU Máquina

### Opción 1: Script Helper (Recomendado)

```bash
# 1. Clone/pull el repo en tu máquina
cd /path/to/opsly

# 2. Ejecuta el helper
bash scripts/validate-peskids-local.sh
```

**Qué hace:**
- ✅ Verifica SSH disponible
- ✅ Verifica curl disponible
- ✅ Verifica Tailscale activo
- ✅ Prueba conexión SSH a VPS
- ✅ Llama al orchestrator script
- ✅ Reporta resultado

### Opción 2: Directamente

```bash
cd /path/to/opsly

# Ejecuta orchestrator directamente
./scripts/peskids-orchestrator.sh --task validate-vps
```

---

## 📋 Pre-requisitos en TU Máquina

### 1. SSH Configurado

```bash
# Verify SSH key exists
ssh-keygen -l -f ~/.ssh/id_rsa

# Output should show: 4096 SHA256:... (RSA)
```

### 2. Tailscale Conectado

```bash
# Check status
tailscale status

# Output should show:
#   100.120.151.91    vps-dragon           linux
#   ...
```

Si no ves `100.120.151.91`, conecta VPN:
- **macOS:** System Settings → Network → VPN → Tailscale → Connect
- **Linux:** `sudo systemctl start tailscale && tailscale up`
- **Windows:** System Tray → Tailscale → Sign in

### 3. SSH Acceso al VPS

```bash
# Quick test
ssh root@100.120.151.91 "echo OK"

# If works → output: OK
# If fails → revise prerequisites above
```

---

## 🚀 Paso a Paso

### Step 1: Prep Your Local Machine

```bash
# On YOUR machine (Mac, Linux, or Windows terminal)

# Clone repo if not done
git clone https://github.com/cloudsysops/opsly.git
cd opsly

# Or if already cloned
cd ~/path/to/opsly
git pull origin main
```

### Step 2: Verify Prerequisites

```bash
# Check SSH
ssh-keygen -l -f ~/.ssh/id_rsa

# Check Tailscale
tailscale status | grep 100.120.151.91

# Both should work without errors
```

### Step 3: Run Validation

```bash
# Option A: Use helper script
bash scripts/validate-peskids-local.sh

# Option B: Direct
./scripts/peskids-orchestrator.sh --task validate-vps
```

### Step 4: Interpret Results

**If you see:**
```
[✓] SSH connectivity OK
[✓] Docker available
[✓] Opsly directory exists
[✓] API health check passed
[✓] Peskids health endpoints configured
```
✅ **SUCCESS** — Proceed to deployment

**If you see:**
```
[ERROR] SSH connection failed
```
❌ **FAIL** — Review VPS-VALIDATION-GUIDE.md troubleshooting section

---

## 🎯 Full Workflow

```
Your Machine (Terminal)
├─ Step 1: cd /path/to/opsly
├─ Step 2: tailscale status (verify 100.120.151.91 connected)
├─ Step 3: ssh root@100.120.151.91 "echo OK" (verify SSH works)
├─ Step 4: bash scripts/validate-peskids-local.sh
│  │
│  └─ Script calls:
│     ├─ Check SSH available
│     ├─ Check Tailscale
│     ├─ Test SSH to VPS
│     └─ Run peskids-orchestrator.sh --task validate-vps
│        │
│        └─ Orchestrator validates:
│           ├─ SSH connectivity
│           ├─ Docker
│           ├─ Services running
│           ├─ API health
│           └─ Peskids endpoints
│
├─ Step 5: Read output
│  ├─ All ✓ → Proceed to deploy
│  └─ Any ✗ → Debug using VPS-VALIDATION-GUIDE.md
│
└─ Step 6: Report results to team
```

---

## 🔗 Related Documents

- [`scripts/peskids-orchestrator.sh`](../scripts/peskids-orchestrator.sh) — Main orchestrator
- [`scripts/validate-peskids-local.sh`](../scripts/validate-peskids-local.sh) — Local helper
- [`docs/VPS-VALIDATION-GUIDE.md`](VPS-VALIDATION-GUIDE.md) — Detailed troubleshooting
- [`docs/VPS-VALIDATION-OPTIONS.md`](VPS-VALIDATION-OPTIONS.md) — 3 validation approaches

---

## ❓ FAQ

**Q: Why can't Claude Code do this?**  
A: Remote execution environments have network restrictions. SSH and Tailscale are not available, and outbound connections are whitelisted (only specific hosts).

**Q: Can I run it from GitHub Actions instead?**  
A: Yes! See `VPS-VALIDATION-OPTIONS.md` → Option C for GitHub Actions setup. Requires self-hosted runner on VPS or SSH secrets in GitHub.

**Q: What if Tailscale isn't configured?**  
A: You need VPN access to reach VPS private IP. Contact ops team to set up Tailscale client on your machine.

**Q: Can I run it from anywhere?**  
A: Only from machines that have:
- ✅ SSH client installed
- ✅ Tailscale connected (or direct VPS access)
- ✅ VPN/network access to 100.120.151.91

---

## ✅ Summary

| What | Where | How |
|------|-------|-----|
| **Claude Code** | Remote env | Creates scripts + docs ✅ |
| **SSH/Tailscale** | Your machine | You execute validation ✅ |
| **VPS Access** | Private IP | Via Tailscale VPN ✅ |
| **Deployment** | Your machine | bash scripts/peskids-orchestrator.sh ✅ |

---

*Last updated: 2026-06-22 by Claude (claude-haiku-4-5-20251001)*
