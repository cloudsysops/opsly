# Runbook: despliegue Capa 2 — Insights Engine (heurístico)

No se requieren API keys nuevas (OpenAI, etc.). El motor usa `usage_events` y escribe en `tenant_insights`.

**Orden recomendado:** Supabase → Doppler/`CRON_SECRET` → (opcional) semilla SQL → cron → portal.

---

## PASO 1 — Base de datos (Supabase)

1. Confirmar migración en repo: `supabase/migrations/0030_tenant_insights.sql` (tablas `platform.tenant_insights`, `platform.ml_model_snapshots`).
2. `usage_events` ya existe desde migraciones anteriores (`0009_usage_events.sql`); **no** inventes columnas `event_type` / `payload` en esa tabla.

**Aplicar migraciones**

```bash
# Desde la raíz del repo, con CLI enlazada al proyecto
npx supabase db push
```

O bien: copiar el SQL de `0030_tenant_insights.sql` al **SQL Editor** de Supabase y ejecutarlo.

**Check:** En Table Editor (schema `platform`) existen `tenant_insights` y `usage_events`.

---

## PASO 2 — Variables (Doppler / `.env` del API)

| Variable                                    | Uso                                                            |
| ------------------------------------------- | -------------------------------------------------------------- |
| `CRON_SECRET`                               | Protege `GET/POST /api/cron/generate-insights` (y otros cron). |
| `SUPABASE_SERVICE_ROLE_KEY`                 | Lectura/escritura en `platform.*` desde la API.                |
| `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_URL` | Cliente Supabase en servidor.                                  |

Generar secreto (local, no commitear el valor):

```bash
openssl rand -hex 32
```

Configúralo en Doppler `prd` (o staging) y redeploy / `vps-bootstrap` según tu flujo.

---

## PASO 3 — Semilla de prueba (opcional)

La tabla real es **`platform.usage_events`** con columnas entre otras: `tenant_slug`, `model`, `tokens_input`, `tokens_output`, `cost_usd`, `cache_hit`, `created_at`.

**3a — Actividad repartida (~90 días)** — útil para forecast / anomalías:

```sql
INSERT INTO platform.usage_events (
  tenant_slug,
  model,
  tokens_input,
  tokens_output,
  cost_usd,
  cache_hit,
  created_at
)
SELECT
  'TU_TENANT_SLUG',
  'gpt-4o-mini',
  (10 + floor(random() * 100))::integer,
  (5 + floor(random() * 50))::integer,
  (random() * 0.08)::numeric(10, 6),
  random() > 0.75,
  NOW() - (random() * interval '90 days')
FROM generate_series(1, 400);
```

Sustituye `TU_TENANT_SLUG` por el slug real (ej. `smiletripcare`).

**3b — Forzar señal de “sin uso reciente” (churn heurístico)**  
Inserta eventos solo con fechas **anteriores a hace 8 días** (ajusta el intervalo si hace falta):

```sql
INSERT INTO platform.usage_events (
  tenant_slug, model, tokens_input, tokens_output, cost_usd, cache_hit, created_at
)
SELECT
  'TU_TENANT_SLUG',
  'gpt-4o-mini',
  50, 25,
  0.01::numeric(10, 6),
  false,
  NOW() - (interval '10 days' + random() * interval '80 days')
FROM generate_series(1, 50);
```

El tenant debe estar **`status = 'active'`** en `platform.tenants` para que aplique la regla de churn del motor.

---

## PASO 4 — Ejecutar el motor

**Local** (API en `:3000`, mismo `CRON_SECRET` que en `.env`):

```bash
curl -sS -X POST "http://127.0.0.1:3000/api/cron/generate-insights" \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -H "Content-Type: application/json"
```

**Producción** (sustituye dominio y secreto):

```bash
curl -sS -X POST "https://api.TU_DOMINIO_BASE/api/cron/generate-insights" \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -H "Content-Type: application/json"
```

Respuesta esperada: JSON con `ok`, `tenants`, `totalInserted` (números según datos).

**Programar:** GitHub Actions, cron en VPS, o Uptime Kuma “heartbeat” con la misma URL y cabecera (cuidado: no expongas `CRON_SECRET` en logs).

---

## PASO 5 — Verificar portal

1. Login en el portal con un usuario cuyo JWT lleve el `tenant_slug` correcto.
2. Abrir `/dashboard/developer` — bloque **Inteligencia predictiva** (si la API devuelve insights).
3. Si no ves nada: confirma migración, que el cron devolvió 200, que hay filas en `usage_events` para ese slug, y que el tenant está `active`.

---

## Entornos: ¿cuál primero?

| Orden sugerido          | Motivo                                                                                                                       |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **1. Staging / local**  | Validar `db push`, semilla y `curl` sin riesgo en prod.                                                                      |
| **2. Producción (VPS)** | Tras imagen API desplegada con este código + Doppler con `CRON_SECRET` + migración aplicada en el proyecto Supabase de prod. |

Si algo falla, revisa logs del contenedor `app` y respuesta JSON del cron (401 → `CRON_SECRET` no coincide o vacío).
