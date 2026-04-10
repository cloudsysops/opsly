# Billing Flush Worker — Vercel (cron + secretos + alertas)

## 1. Secreto `CRON_SECRET`

Genera un valor aleatorio (mínimo recomendado: 16 caracteres; para 32 bytes en base64):

```bash
openssl rand -base64 32
```

**Dónde configurarlo**

| Entorno | Acción |
|--------|--------|
| **Vercel (producción / preview)** | Project → **Settings** → **Environment Variables** → nombre `CRON_SECRET`, valor el string generado, entornos deseados (Production, Preview, Development). **Redeploy** tras crear o rotar el secreto. |
| **Local** | En `apps/api/.env.local` (no commitear): `CRON_SECRET=<mismo valor o uno distinto solo para dev>`. |

Vercel envía automáticamente este valor en las invocaciones programadas como cabecera:

`Authorization: Bearer <valor de CRON_SECRET>`

No hace falta (ni es posible) declarar esa cabecera en `vercel.json`: la plataforma la inyecta cuando la variable existe en el proyecto.

El handler en `apps/api/app/api/cron/flush-billing/route.ts` acepta también `x-cron-secret` para pruebas manuales.

## 2. Cron (`apps/api/vercel.json`)

El archivo vive en **`apps/api/vercel.json`** porque es la raíz de la app Next.js que se despliega. Si el proyecto de Vercel tiene **Root Directory** = `apps/api`, Vercel lo detecta al desplegar.

Contenido relevante: ruta `/api/cron/flush-billing`, expresión `*/5 * * * *` (UTC, cada 5 minutos).

**Límites de plan:** en el plan **Hobby**, los cron de Vercel solo pueden ejecutarse **como máximo una vez al día**; una expresión cada 5 minutos **no es válida** en Hobby. Para `*/5 * * * *` hace falta un plan de equipo (p. ej. Pro) según [documentación de Vercel](https://vercel.com/docs/cron-jobs/usage-and-pricing).

## 3. Activación en Vercel (checklist)

1. **Subir código** con `vercel.json` en el directorio raíz del despliegue (`apps/api` si aplica).
2. **Variables de entorno:** `CRON_SECRET`, `REDIS_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (y el resto que requiera la API en producción).
3. **Desplegar** (push a la rama conectada o deploy manual).
4. **Verificar cron:** Project → **Settings** → **Cron Jobs**: debe listarse el job con path `/api/cron/flush-billing` y la expresión configurada.
5. **Logs:** Runtime Logs filtrando por path del cron; si hay fallos parciales, se emite una línea JSON en stderr con `"level":"error"` y métricas (ver abajo).

## 4. Alertas (logging estructurado)

Si hay fallos de insert/delete Redis, mensajes en `errors`, o Redis no configurado, el route handler y el script CLI llaman a `logBillingFlushFailureToStdout()` y se escribe **un JSON por línea** en stderr, por ejemplo:

```json
{
  "level": "error",
  "message": "Billing Flush Partial Failure",
  "metrics": {
    "processed_keys": 100,
    "inserted_ok": 98,
    "deleted_ok": 97,
    "delete_failed": 1,
    "insert_failed": 1
  }
}
```

Puedes crear **Log Drains** o reglas en Vercel/Datadog/Sentry sobre `delete_failed > 0` o `level = error`.

## 5. Prueba manual local

```bash
curl -sS -H "Authorization: Bearer $CRON_SECRET" "http://localhost:3000/api/cron/flush-billing"
```

---

**Nota monorepo:** Si el proyecto Vercel usa la raíz del repositorio completo (sin Root Directory `apps/api`), duplica o mueve `vercel.json` junto al `package.json` de la app Next que se construye, o ajusta la configuración del proyecto para que el build apunte a `apps/api`.
