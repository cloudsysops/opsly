# SSH — qué usuario usar (humanos y agentes)

Documento **canónico** para que agentes (Cursor, Claude, automatismos) y personas no mezclen usuarios entre máquinas Opsly.

**Principio:** el **usuario de tu Mac** (p. ej. `cboteros`) es solo local. Los **usuarios remotos** son distintos por host; un comando `ssh` debe usar explícitamente el usuario de la tabla siguiente.

---

## Tabla rápida

| Destino | Usuario SSH | IP / nombre Tailscale | Uso típico |
|---------|---------------|------------------------|------------|
| **VPS** (control plane, `/opt/opsly`) | **`vps-dragon`** | `100.120.151.91` (Tailscale) | Docker plataforma, Traefik, API, Redis, deploy |
| **Worker Ubuntu** (Mac 2011, datos plane) | **`opslyquantum`** | `100.80.41.29` o `opsly-worker.<suffix>.ts.net` | Ollama, orchestrator `worker-enabled`, repo `~/opsly`, Decepticon/RTK en usuario |
| **Mac principal** (desarrollo) | **`cboteros`** (ejemplo; el tuyo puede otro) | `opsly-admin` / `100.89.38.3` | Cursor, clon del repo; **no** es el usuario del worker |

Comandos de referencia:

```bash
ssh vps-dragon@100.120.151.91
ssh opslyquantum@100.80.41.29
# Con MagicDNS (sustituir suffix):
# ssh opslyquantum@opsly-worker.<suffix>.ts.net
```

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

| Nombre | Qué es |
|--------|--------|
| **`opslyquantum`** | Usuario **Linux** en el worker Ubuntu (repo, Ollama, workers). **Usar** en SSH al worker. |
| **opsly-quantum** (skill) | Procedimiento en `skills/user/`; **no** es un usuario UNIX. |
| **`dragon`** | Aparece en configs antiguas o en el hostname; **no** usar como usuario Linux del worker en documentación nueva si el sistema está con **`opslyquantum`**. |
| **`cboteros`** | Usuario humano típico en la Mac admin; **no** sustituye a `opslyquantum` en el worker. |

---

## Referencias

- [`TAILSCALE-NOMENCLATURA.md`](TAILSCALE-NOMENCLATURA.md) — MagicDNS, `~/.ssh/config` plantilla
- [`WORKER-SETUP-MAC2011.md`](WORKER-SETUP-MAC2011.md) — Fase SSH en el worker
- [`SESSION-GIT-SYNC.md`](SESSION-GIT-SYNC.md) — `git pull` en cada host
