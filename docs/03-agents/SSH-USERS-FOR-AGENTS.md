---
status: draft
owner: operations
last_review: 2026-10-05
type: agent-doc
tags:
  - opsly/agents
---

# SSH — qué usuario usar (humanos y agentes)

Documento **canónico** para que agentes (Cursor, Claude, automatismos) y personas no mezclen usuarios entre máquinas Opsly.

**Principio:** el **usuario de tu Mac** (p. ej. `dragon` / `cboteros`) es solo local. Los **usuarios remotos** son distintos por host; un comando `ssh` debe usar explícitamente el usuario de la tabla siguiente.

---

## Tabla rápida

| Destino | Usuario SSH | IP / nombre Tailscale | Uso típico |
| ------- | ----------- | --------------------- | ---------- |
| **VPS** (control plane, `/opt/opsly`) | **`vps-dragon`** | `100.120.151.91` / `vps-dragon` | Docker plataforma, Traefik, API, Redis, deploy |
| **PC gamer / home-gpu-01** (WSL + Windows) | **`opsly`** | MagicDNS **`smdqcia-pc`** (IP actual vía Tailscale) | Repo `~/opsly`, worker GPU, OBS. Shell default = **WSL** vía Windows OpenSSH `:22`. Windows: `powershell.exe` remoto |
| **Worker Ubuntu** (Mac 2011, legacy) | **`opslyquantum`** | `100.80.41.29` / `opsly-worker` | Orchestrator legacy; ver PR retire Mac2011 |
| **Mac principal** (desarrollo) | **`dragon`** (opsly-quantum) | `100.89.38.3` / `opsly-quantum` | Cursor en Mac; **no** es el usuario del PC gamer |

**No usar** el nodo MagicDNS `smdqcia-wsl` / `100.115.197.109` como destino de recuperación: en `infra/nodes-registry.json` está marcado como phantom/legacy. Camino canónico = solo **`smdqcia-pc`**. Si `:22` cae, reparar con `ensure-smdqcia-agent-access.ps1` (Admin), no inventar un segundo host.

Comandos de referencia (desde el Mac):

```bash
ssh opsly@smdqcia-pc 'cd ~/opsly && git status -sb'          # WSL (DefaultShell)
ssh opsly@smdqcia-pc "powershell.exe -NoProfile -Command 'Write-Output WIN_OK'"
ssh vps-dragon@100.120.151.91
```

Plantilla SSH Mac: `cboteros/opsly-bootstrap` → `ssh/config.mac` + `scripts/mac-apply-ssh-config.sh`.  
Reparación en el PC (Admin): `scripts/ops/ensure-smdqcia-agent-access.ps1`.

---

## ¿Tengo que cambiar de usuario en mi Mac antes de abrir Cursor / el agente?

**No.** Seguí trabajando con tu usuario normal (`cboteros` u otro). El agente hereda tu sesión en la **Mac**; eso no obliga a ser `vps-dragon` ni `opslyquantum` localmente.

Lo que debe quedar claro es **otro**: cuando el agente (o un script) ejecute **`ssh` a un servidor**, en la orden debe figurar el **usuario remoto correcto** de la tabla (p. ej. `ssh vps-dragon@100.120.151.91`, no `ssh root@…` al VPS salvo excepción documentada).

---

## VPS → worker (scripts, healthchecks)

- Usuario en el **VPS:** `vps-dragon`.
- Salida hacia el worker: conectarse como **`opslyquantum@`** al worker (Tailscale).
- En el VPS desplegado suele existir la clave **`~/.ssh/vps_to_nodes`** (par dedicado); el alias SSH **`opsly-mac2011-ip`** apunta a `opslyquantum@100.80.41.29` con esa clave.

Detalle y endurecimiento: [`VPS-SSH-WORKER-NODES.md`](VPS-SSH-WORKER-NODES.md).

---

## Nombres que suelen confundir

| Nombre                    | Qué es                                                                                                                                                    |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`opslyquantum`**        | Usuario **Linux** en el worker Ubuntu (repo, Ollama, workers). **Usar** en SSH al worker.                                                                 |
| **opsly-quantum** (skill) | Procedimiento en `skills/user/`; **no** es un usuario UNIX.                                                                                               |
| **`dragon`**              | Aparece en configs antiguas o en el hostname; **no** usar como usuario Linux del worker en documentación nueva si el sistema está con **`opslyquantum`**. |
| **`cboteros`**            | Usuario humano típico en la Mac admin; **no** sustituye a `opslyquantum` en el worker.                                                                    |

---

## Referencias

- [`TAILSCALE-NOMENCLATURA.md`](TAILSCALE-NOMENCLATURA.md) — MagicDNS, `~/.ssh/config` plantilla
- [`WORKER-SETUP-MAC2011.md`](WORKER-SETUP-MAC2011.md) — Fase SSH en el worker
- [`SESSION-GIT-SYNC.md`](SESSION-GIT-SYNC.md) — `git pull` en cada host

---

## Enlaces relacionados

- [[03-agents/README|03-agents]]
- [[brain/README|Brain Central]]
