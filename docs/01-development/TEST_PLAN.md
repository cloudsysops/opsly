# Test plan — intcloudsysops

Casos en formato tabular para QA manual y trazabilidad hacia automatización.

---

## 1. Onboarding Flow

| Test                              | Precondición                                                    | Pasos                                                                     | Resultado esperado                                                                               | Automatizable                      |
| --------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------- |
| Onboard exitoso plan startup      | API, Supabase, Docker y Redis operativos; plan `startup` válido | Ejecutar onboarding (script o flujo Stripe) con slug nuevo y email válido | Fila tenant `active` (o flujo hasta `active`); contenedores del slug en ejecución según política | Parcial (API + DB); E2E con Docker |
| Onboard con slug duplicado        | Ya existe tenant con el mismo `slug`                            | Intentar onboarding con el mismo slug                                     | Error idempotente o 4xx claro; no se pisan datos del tenant existente                            | Sí (API contract)                  |
| Onboard con plan inválido         | API accesible                                                   | Enviar `plan` fuera de enum permitido                                     | 400 con mensaje de validación; sin fila nueva ni jobs                                            | Sí                                 |
| Dry-run muestra plan sin ejecutar | Script `onboard-tenant.sh` disponible                           | `./scripts/onboard-tenant.sh ... --dry-run`                               | Logs/impresión del plan; sin `docker compose up`, sin escrituras en DB/S3                        | Sí (captura stdout)                |
| Rollback si Docker falla          | Simular fallo en `docker compose` (imagen rota o socket)        | Disparar provision real                                                   | Tenant en `failed` o error registrado; sin estado intermedio inconsistente                       | Parcial (mock Docker)              |

---

## 2. Tenant Isolation

| Test                               | Precondición                          | Pasos                                                      | Resultado esperado                                     | Automatizable |
| ---------------------------------- | ------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------ | ------------- |
| Dos tenants no comparten volúmenes | Tenants A y B activos                 | Inspeccionar `docker volume ls` y mounts de cada stack     | Volúmenes distintos; sin bind compartido accidental    | Parcial       |
| Puertos distintos por tenant       | Asignación de puertos en DB o compose | Comparar mapeos host/puerto interno entre A y B            | Sin colisiones; servicios alcanzables solo en su rango | Parcial       |
| Schemas Postgres aislados          | RLS/políticas configuradas            | Conectar con rol tenant A; intentar leer schema de B       | Denegado o vacío según diseño                          | Sí (SQL)      |
| Traefik enruta por subdominio      | DNS wildcard y certificados OK        | `curl -I` a `https://n8n-<slug>.<DOMAIN>` para cada tenant | 200/302 esperado por servicio; no mezcla upstream      | Parcial (E2E) |

---

## 3. Billing & Webhooks

| Test                                            | Precondición                                 | Pasos                                                          | Resultado esperado                                        | Automatizable           |
| ----------------------------------------------- | -------------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------- | ----------------------- |
| checkout.session.completed dispara provisioning | Webhook Stripe → API; modo test              | Enviar evento de checkout completado con metadata de slug/plan | Job encolado o tenant `provisioning` → `active`           | Sí (Stripe CLI fixture) |
| invoice.payment_failed suspende tenant          | Tenant activo con suscripción                | Disparar `invoice.payment_failed`                              | `status = suspended`; containers detenidos según política | Parcial                 |
| Webhook firma inválida retorna 400              | `STRIPE_WEBHOOK_SECRET` correcto en servidor | POST a `/api/webhooks/stripe` con cuerpo y firma incorrectos   | 400; sin efectos laterales                                | Sí                      |
| MRR calculado correctamente                     | Tenants con planes y precios conocidos       | Llamar endpoint de métricas o agregación documentada           | Suma coherente con tabla de precios / Stripe              | Sí (API + fixtures)     |

---

## 4. Backup & Restore

| Test                           | Precondición                                | Pasos                                                                       | Resultado esperado                                | Automatizable             |
| ------------------------------ | ------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------- | ------------------------- |
| Backup genera archivos en S3   | Credenciales AWS y `S3_BUCKET`              | `./scripts/backup-tenants.sh` (sin dry-run)                                 | Objeto `S3_PREFIX/<fecha>/<slug>.sql.gz` presente | Parcial (entorno staging) |
| Backup de slug específico      | Script o flags soportan filtro por slug     | Ejecutar backup limitado al slug                                            | Solo artefactos del slug                          | Parcial                   |
| Restore desde fecha específica | Backup existente en S3 para `slug` y `date` | `./scripts/restore-tenant.sh --slug X --date YYYY-MM-DD` (con confirmación) | Schema restaurado; datos acordes al dump          | Parcial                   |
| Restore pide confirmación      | CLI interactivo o flag `--confirm`          | Ejecutar restore sin confirmar                                              | Aborta o exige input explícito                    | Sí (expect/script)        |
| Dry-run no toca S3 ni DB       | Variables de entorno válidas                | `backup-tenants.sh --dry-run` y `restore-tenant.sh --dry-run`               | Solo logs; sin `aws s3 cp` ni `psql` aplicado     | Sí                        |

---

## 5. Suspend / Resume

| Test                                 | Precondición          | Pasos                                | Resultado esperado                                | Automatizable |
| ------------------------------------ | --------------------- | ------------------------------------ | ------------------------------------------------- | ------------- |
| Suspend para containers              | Tenant `active`       | `suspend-tenant.sh` o API            | Contenedores del slug stopped; estado `suspended` | Parcial       |
| Suspend preserva volúmenes           | Volúmenes con datos   | Suspend luego inspeccionar volúmenes | Volúmenes siguen presentes                        | Parcial       |
| Resume reactiva                      | Tenant `suspended`    | Resume vía API o script              | `active`; contenedores up                         | Parcial       |
| Suspend idempotente en ya suspendido | Tenant ya `suspended` | Segundo suspend                      | 200/204 o mensaje idempotente; sin error 5xx      | Sí            |

---

## 6. API Endpoints

| Test                           | Precondición             | Pasos                                          | Resultado esperado                               | Automatizable |
| ------------------------------ | ------------------------ | ---------------------------------------------- | ------------------------------------------------ | ------------- |
| Sin token retorna 401          | Endpoint admin protegido | `GET` sin header `Authorization`               | 401                                              | Sí            |
| Token inválido retorna 401     | Token incorrecto         | `GET` con Bearer inválido                      | 401                                              | Sí            |
| GET /api/health 200 sin token  | API levantada            | `curl /api/health`                             | 200 JSON ok                                      | Sí            |
| Paginación funciona            | Lista con > page size    | `?limit=&cursor=` o equivalente                | Páginas coherentes; sin duplicados entre páginas | Sí            |
| PATCH valida campos permitidos | Recurso existente        | PATCH con campo no permitido o tipo incorrecto | 400; recurso sin cambios inválidos               | Sí            |

---

## 7. Dashboard Admin

| Test                                | Precondición                        | Pasos                                         | Resultado esperado                                            | Automatizable        |
| ----------------------------------- | ----------------------------------- | --------------------------------------------- | ------------------------------------------------------------- | -------------------- |
| Login credenciales inválidas        | Supabase Auth configurado           | Enviar email/password incorrectos en `/login` | Mensaje de error visible (rojo); no sesión                    | Parcial (Playwright) |
| Redirect a /login si no autenticado | Sin cookies de sesión               | Visitar `/dashboard` o `/tenants`             | Redirect a `/login`                                           | Sí                   |
| KPI cards reflejan datos reales     | API y token admin OK                | Cargar `/dashboard`                           | Valores alineados con `/api/metrics` o fuente documentada     | Parcial              |
| Badge de status correcto            | Tenants en distintos estados        | Abrir lista y detalle                         | Colores/labels según `active` / `suspended` / `failed` / etc. | Parcial              |
| Modal confirmación en delete        | Detalle tenant                      | Clic Delete; intentar sin escribir slug       | No borra; con slug correcto ejecuta y refresca                | Parcial              |
| Suspend/resume actualizan UI        | Permisos y tenant activo/suspendido | Clic Suspend o Resume                         | Badge y estado coherentes tras revalidación SWR               | Parcial              |
