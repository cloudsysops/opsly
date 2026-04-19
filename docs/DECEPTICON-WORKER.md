# Decepticon en worker opsly-mac2011 (Ubuntu)

Guía para instalar [Decepticon](https://github.com/PurpleAILAB/Decepticon) en el nodo worker (Mac 2011 + Ubuntu, usuario típico `opslyquantum`, Tailscale **opsly-worker** / peer **opsly-mac2011**), **aislado** del monorepo Opsly en `~/opsly`, y notas sobre **integración con el LLM Gateway** de Opsly.

**Relación:** complementa [`WORKER-SETUP-MAC2011.md`](WORKER-SETUP-MAC2011.md), [`TAILSCALE-NOMENCLATURA.md`](TAILSCALE-NOMENCLATURA.md) y [`ARCHITECTURE-DISTRIBUTED-FINAL.md`](ARCHITECTURE-DISTRIBUTED-FINAL.md).

---

## Disclaimer legal y operativo

Decepticon es una herramienta de **red team** autónoma. **No** la uses contra sistemas o redes sin **autorización por escrito** del responsable. El uso no autorizado es ilegal. Opsly no se hace responsable del mal uso.

**Red:** no expongas el dashboard web, el sandbox Kali ni el C2 a Internet. Acceso administrativo solo por **Tailscale** o SSH equivalente; el tráfico público del worker no debe mapear puertos de Decepticon.

---

## Estado validado en worker (referencia)

Comprobaciones puntuales vía SSH (`opslyquantum@100.80.41.29`):

| Comprobación | Resultado típico |
|--------------|-------------------|
| Disco `/` | Suficiente si hay decenas de GB libres (Decepticon + imágenes Docker son pesadas) |
| RAM | ~16 GiB en referencia Opsly; conviene dejar margen si ya corre **Ollama** + orchestrator |
| `docker` | Instalado; usuario en grupo `docker` |
| **Docker Compose v2** | El instalador oficial exige `docker compose version`. En un host solo con el paquete `docker.io` puede **faltar** el plugin: instalar `docker-compose-plugin` (ver abajo) |
| Puertos locales | `11434` suele estar en uso (**Ollama**). `3000` / `4000` / `2024` suelen estar **libres** para Decepticon; verificar con `ss -tlnp` antes del primer arranque |
| Conflicto con Opsly | El API Next de Opsly corre en el **VPS**, no en el worker; el riesgo es **competencia de CPU/RAM/disco** entre stacks Docker del mismo host |

---

## Prerrequisito: Docker Compose v2

El script `https://decepticon.red/install` ejecuta `preflight` y falla si `docker compose version` no existe.

En Ubuntu 24.04:

```bash
sudo apt-get update
sudo apt-get install -y docker-compose-plugin
docker compose version
```

Documentación Docker: [Install Compose plugin](https://docs.docker.com/compose/install/linux/).

**Sin `sudo`:** si no puedes instalar el paquete del sistema, instala el binario del plugin en el usuario (mismo efecto que `docker compose`):

```bash
mkdir -p ~/.docker/cli-plugins
curl -fsSL "https://github.com/docker/compose/releases/download/v2.32.4/docker-compose-linux-x86_64" \
  -o ~/.docker/cli-plugins/docker-compose
chmod +x ~/.docker/cli-plugins/docker-compose
docker compose version
```

(En **aarch64**, sustituye `docker-compose-linux-aarch64` en la URL.)

**PATH:** el instalador deja `decepticon` en `~/.local/bin`. En SSH no interactivo añade `export PATH="$HOME/.local/bin:$PATH"` o usa login shell.

---

## Instalación (oficial)

1. SSH al worker (desde la Mac principal, con Tailscale activo):

   ```bash
   ssh opslyquantum@100.80.41.29
   # o el alias definido en ~/.ssh/config (p. ej. opsly-worker)
   ```

2. Instalar el CLI y los ficheros bajo `~/.decepticon` (revisar el script antes si no quieres `curl | bash` opaco):

   ```bash
   curl -fsSL https://decepticon.red/install -o /tmp/decepticon-install.sh
   less /tmp/decepticon-install.sh
   bash /tmp/decepticon-install.sh
   ```

   Variables útiles: `DECEPTICON_HOME` (directorio de instalación), `SKIP_PULL=true` (omitir pull de imágenes en la primera pasada).

3. Añadir `~/.local/bin` al `PATH` si el instalador lo indica (o reiniciar la shell).

4. **Configurar claves LLM** (no commitear en el repo; usar Doppler o editor local):

   ```bash
   decepticon config
   ```

   Al menos una de: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_API_KEY` en `~/.decepticon/.env` (plantilla upstream: `.env.example` del repo Decepticon).

5. **Arranque:**

   ```bash
   decepticon
   ```

   Dashboard web (si usas el flujo con web): según la documentación de Decepticon, `make web` desde un clone del repo; puerto por defecto **`WEB_PORT=3000`**. Acceso solo en **localhost** en el worker o túnel SSH:

   ```bash
   # Desde la Mac principal
   ssh -L 3000:127.0.0.1:3000 opslyquantum@100.80.41.29
   # Luego abrir http://127.0.0.1:3000 en el navegador local
   ```

6. **Demo opcional (entorno aislado):** `decepticon demo`

7. **Parada:** `decepticon stop` (conserva datos; ver documentación upstream para `make clean` y reset de volúmenes).

---

## Rutas y puertos (referencia)

| Ruta / variable | Uso |
|-----------------|-----|
| `~/.decepticon/` | Configuración, `docker-compose.yml`, `.env`, `config/litellm.yaml`, `workspace/` |
| `~/.local/bin/decepticon` | Launcher |
| `WEB_PORT` (default 3000) | Dashboard web |
| `LITELLM_PORT` (default 4000) | Proxy LiteLLM **interno** de Decepticon |
| `LANGGRAPH_PORT` (default 2024) | Servicio LangGraph (según `.env.example` upstream) |

Si un puerto choca con otro servicio, fíjalo en `~/.decepticon/.env` **antes** de levantar el stack.

---

## Integración con Opsly LLM Gateway (spike)

### Resultado del análisis de código

Decepticon incorpora **LiteLLM propio** y espera llamadas al ecosistema de proveedores estándar (Anthropic/OpenAI/Google) vía su `config/litellm.yaml` y contenedores.

El **LLM Gateway** de Opsly (`apps/llm-gateway`, puerto típico **3010** en el VPS) **no** es un sustituto directo del endpoint **OpenAI** `https://api.openai.com/v1/chat/completions` para clientes genéricos:

- `POST /v1/chat/completions` está implementado como **planner** opsly: exige `tenant_slug` y mensajes, y la respuesta es un JSON con forma `planner` + `llm` + `request_id`, **no** el formato `{ choices: [...] }` de OpenAI (`handleChatCompletionsPlanner` en [`apps/llm-gateway/src/planner-route.ts`](../apps/llm-gateway/src/planner-route.ts)).
- `POST /v1/text` es un contrato propio (`tenant_slug`, `prompt`, `task_type`, etc.) en [`text-completion-route.ts`](../apps/llm-gateway/src/text-completion-route.ts).
- `GET /health` es liveness.

Por tanto, **LiteLLM dentro de Decepticon no puede apuntar “tal cual”** al gateway Opsly como `api_base` OpenAI-compatible sin **nueva ruta** en el gateway que proxee chat completions al estilo OpenAI o sin **fork/patch** en Decepticon.

### Dos planos LLM (estado recomendado hasta nuevo diseño)

| Plano | Dónde | Facturación / trazabilidad Opsly |
|-------|--------|----------------------------------|
| **Opsly** | `LLM_GATEWAY_URL` → VPS `:3010`, uso desde orchestrator, API, workers | `tenant_slug`, `request_id`, `usage_events` cuando aplica |
| **Decepticon** | LiteLLM local + claves en `~/.decepticon/.env` | Coste y uso según proveedores directos; **no** unificado con métricas Opsly salvo trabajo manual o ETL |

### Si en el futuro se unifica

- Exponer en el gateway un **shim OpenAI** (misma forma que OpenAI) que internamente llame a `llmCall` / `LLMRequest`, o
- Enrutar solo parte del tráfico de Decepticon mediante variables soportadas upstream en `litellm.yaml`.

Cabeceras y cuerpo alineados a Opsly: `tenant_slug`, `request_id` (ver [`AGENTS.md`](../AGENTS.md) y tipos en `apps/llm-gateway/src/types.ts`).

---

## Verificación desde el repo Opsly

```bash
./scripts/check-decepticon-worker.sh
./scripts/check-decepticon-worker.sh --dry-run
```

Variables: `DECEPTICON_WORKER_SSH` (destino SSH completo, p. ej. `opslyquantum@100.80.41.29`), o `WORKER_USER` + `WORKER_TAILSCALE_NAME` como en [`verify-platform-smoke.sh`](../scripts/verify-platform-smoke.sh). Si el hostname MagicDNS no resuelve desde tu máquina (p. ej. sin Tailscale activo en el cliente), fuerza IP: `DECEPTICON_WORKER_SSH=opslyquantum@100.80.41.29 ./scripts/check-decepticon-worker.sh`.

---

## Referencias externas

- [Decepticon — Getting Started](https://github.com/PurpleAILAB/Decepticon/blob/main/docs/getting-started.md)
- [Decepticon — install script](https://decepticon.red/install) (preflight: Docker Compose v2)
