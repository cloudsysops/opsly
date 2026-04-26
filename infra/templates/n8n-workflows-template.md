# Plantilla de workflows n8n por tenant

Referencia para Fase 2: qué automatizar por defecto en cada stack tenant (p. ej. `smiletripcare`, `peskids`).  
Los workflows **no** se versionan aquí como JSON; se documentan para crearlos en la UI de n8n.

## Cómo crear en la UI de n8n

1. Abrir `https://n8n-<slug>.<PLATFORM_DOMAIN>/` (basic auth según credenciales del tenant).
2. **Workflows → Add workflow**.
3. Añadir nodos y credenciales (Supabase, SMTP, Slack, etc.) según la tabla inferior.
4. Activar el workflow y probar con **Execute workflow**.

## Workflows sugeridos

### 1. Sincronización de datos críticos

| Campo           | Valor                                                                          |
| --------------- | ------------------------------------------------------------------------------ |
| **Trigger**     | Webhook o Cron (cada 15 min)                                                   |
| **Acción**      | Leer Supabase (schema tenant) → notificar Slack/Email si hay registros en cola |
| **Estado**      | TODO                                                                           |
| **Tipo tenant** | startup, business                                                              |

### 2. Recordatorios / SLA

| Campo           | Valor                                                           |
| --------------- | --------------------------------------------------------------- |
| **Trigger**     | Cron diario                                                     |
| **Acción**      | Consultar tabla de citas o tareas; enviar email de recordatorio |
| **Estado**      | TODO                                                            |
| **Tipo tenant** | business, enterprise                                            |

### 3. Backup lógico / export

| Campo           | Valor                                 |
| --------------- | ------------------------------------- |
| **Trigger**     | Cron semanal                          |
| **Acción**      | Export CSV o snapshot a S3 compatible |
| **Estado**      | TODO                                  |
| **Tipo tenant** | enterprise                            |

### 4. Alertas desde Uptime Kuma

| Campo           | Valor                                          |
| --------------- | ---------------------------------------------- |
| **Trigger**     | Webhook desde Uptime Kuma cuando monitor cae   |
| **Acción**      | Reenviar a Discord/Slack del cliente           |
| **Estado**      | READY (patrón estándar webhook → HTTP Request) |
| **Tipo tenant** | todos                                          |

### 5. Onboarding checklist interno

| Campo           | Valor                                     |
| --------------- | ----------------------------------------- |
| **Trigger**     | Manual o al crear usuario                 |
| **Acción**      | Enviar plantilla de bienvenida multi-paso |
| **Estado**      | TODO                                      |
| **Tipo tenant** | startup                                   |

## Leyenda de estado

| Estado    | Significado                                        |
| --------- | -------------------------------------------------- |
| **TODO**  | Pendiente de definir reglas de negocio del cliente |
| **READY** | Patrón genérico documentado; implementar en UI     |
| **PROD**  | Activo y monitorizado en el tenant                 |
