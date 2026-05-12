# Hermes + NVIDIA vía AI Gateway interno (API)

## Arquitectura

1. **Admin UI** (opcional) o **script** → `POST /api/agents/hermes/run` (API Next.js, **solo servidor**).
2. **Ruta Hermes** construye mensajes y llama **`runAiGatewayChat`** en `apps/api/lib/ai-gateway/gateway.ts` (mismo proceso Node; **no** llama a NVIDIA desde el navegador).
3. **Gateway** según `AI_GATEWAY_PROVIDER` (por defecto `nvidia`) → `apps/api/lib/ai-gateway/providers/nvidia.ts` → `POST ${NVIDIA_BASE_URL}/chat/completions` con `Authorization: Bearer ${NVIDIA_API_KEY}`.

Hermes **no** importa ni conoce la URL de NVIDIA; solo el gateway. Para cambiar a OpenAI, Claude, OpenRouter u Ollama: añadir proveedor en `lib/ai-gateway/providers/` y ramificar en `gateway.ts` (o enrutar al `apps/llm-gateway` existente si se unifica).

## Variables de entorno

Definidas en `.env.example` (valores en **Doppler** `ops-intcloudsysops` / `prd` en el contenedor `app`):

| Variable | Descripción |
|----------|-------------|
| `NVIDIA_API_KEY` | Clave NVIDIA Build / API Catalog (solo backend). |
| `NVIDIA_BASE_URL` | Por defecto `https://integrate.api.nvidia.com/v1`. |
| `NVIDIA_MODEL_ID` | Modelo en cadena LLM Gateway legacy. |
| `NVIDIA_DEFAULT_MODEL` | Modelo por defecto del AI Gateway Hermes; si vacío se usa `NVIDIA_MODEL_ID`. |
| `AI_GATEWAY_PROVIDER` | `nvidia` (extensible). |
| `AI_GATEWAY_TIMEOUT_MS` | Timeout fetch al proveedor. |
| `AI_GATEWAY_MAX_PROMPT_CHARS` | Límite total de caracteres en `messages`. |
| `AI_GATEWAY_DEFAULT_MAX_TOKENS` | `max_tokens` por defecto si no viene en el body. |

**Smoke script** (`npm run test:hermes-nvidia`):

- `OPSLY_API_URL` — base API (ej. `http://127.0.0.1:3000`).
- `PLATFORM_ADMIN_TOKEN` — token admin para `Authorization: Bearer` (misma política que otras rutas admin de la API).

## Cómo obtener NVIDIA API key

1. Cuenta en [NVIDIA Build](https://build.nvidia.com/) / API Catalog.
2. Crear API key con permisos para el modelo elegido (NIM).
3. Copiar la clave a Doppler **`NVIDIA_API_KEY`** (nunca en repo ni en `NEXT_PUBLIC_*`).

Comprobar el **model id** exacto en el catálogo antes de producción (`NVIDIA_DEFAULT_MODEL` / `NVIDIA_MODEL_ID`).

## Probar en local

1. Cargar env (Doppler o `.env.local` en `apps/api`) con `NVIDIA_API_KEY` y resto de vars.
2. `npm run dev --workspace=@intcloudsysops/api` (puerto 3000 por defecto).
3. Opción A — script: `PLATFORM_ADMIN_TOKEN=... OPSLY_API_URL=http://127.0.0.1:3000 npm run test:hermes-nvidia`  
   (`requireAdminAccess` acepta el mismo token que otras rutas admin **o** JWT Supabase de super-admin; el script usa token estático.)
4. Opción B — Admin (`npm run dev --workspace=@intcloudsysops/admin`, típicamente `:3001`): iniciar sesión, sidebar **Hermes** → ruta **`/agents/hermes`** (la app admin no usa prefijo `/admin` en el path; el host es `admin.*`).

## Desplegar en VPS

1. Añadir secretos en Doppler `prd` para el servicio **`app`**.
2. `vps-bootstrap` / recrear contenedor API para que cargue las nuevas vars.
3. Verificar que **no** exista `NVIDIA_API_KEY` en build-args del portal ni variables `NEXT_PUBLIC_*` con la clave.

## Cambiar de modelo

- Ajustar `NVIDIA_DEFAULT_MODEL` o enviar `model` en el body de `POST /api/ai/chat` / `POST /api/agents/hermes/run`.
- Validar en catálogo NVIDIA que el id sea el correcto para Chat Completions.

## Riesgos y costos

- **Coste por token** según tarifa NVIDIA del modelo.
- **Rate limits** del proveedor; el gateway devuelve mensaje seguro sin filtrar cuerpos de error con secretos.
- **Prompt injection**: las rutas no sustituyen auth; el operador admin debe confiar en el contenido que pega (mitigación: no exponer esta ruta públicamente).

## Próximos proveedores

Implementar en `lib/ai-gateway/providers/` (p. ej. `openai.ts`, `openrouter.ts`) y extender `runAiGatewayChat` + `AI_GATEWAY_PROVIDER`. Opcional: delegar en `apps/llm-gateway` para una sola implementación HTTP.

## Verificación (repo)

- `npm run type-check` — en la raíz (Turbo); valida API y admin entre otros workspaces.
- `npm run lint` — Turbo; el admin puede marcar algunos paths como ignorados según ESLint local.
- `npm run build --workspace=@intcloudsysops/api` y `npm run build --workspace=@intcloudsysops/admin`.
- Con API en marcha y `NVIDIA_API_KEY` en el proceso del servidor: `npm run test:hermes-nvidia` (`PLATFORM_ADMIN_TOKEN` + `OPSLY_API_URL`).
