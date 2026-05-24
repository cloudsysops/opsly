---
status: draft
owner: operations
last_review: 2026-05-24
type: tenant
tags:
  - opsly/tenant
---

# Peskids n8n Setup Guide (WhatsApp + Instagram)

**Objetivo:** Centralizar mensajes de WhatsApp + Instagram en el dashboard de Peskids (approval-first).

---

## Prerequisitos

- Acceso a n8n en VPS (`http://n8n-peskids.{PLATFORM_DOMAIN}`)
- Número de WhatsApp personal o empresarial
- Cuenta de Instagram para recibir DMs
- Cuenta Make.com (gratis: https://make.com)

---

## Parte 1: WhatsApp Receiver (Baileys)

### Paso 1: Crear workflow en n8n

1. Abre n8n: `http://n8n-peskids.{PLATFORM_DOMAIN}`
2. **New → Blank workflow**
3. Copia contenido de `.n8n/1-workflows/peskids/whatsapp-receiver.json`
4. Pega en el editor JSON de n8n
5. Click **Activate**

### Paso 2: Configurar Baileys (QR de WhatsApp)

1. En el workflow activado, verás una sección "Baileys" o "WhatsApp"
2. n8n generará un **QR code**
3. **Abre WhatsApp en tu teléfono** → escanea el QR
4. Confirma el login
5. n8n almacenará la sesión automáticamente

### Paso 3: Verificar webhook

1. Envía un **mensaje de prueba** a tu número desde otro teléfono
2. Abre dashboard de Peskids: `http://peskids.{PLATFORM_DOMAIN}/admin`
3. Verifica que aparezca en card "New Inbound Messages"

✅ **Si ves el mensaje → WhatsApp funciona**

---

## Parte 2: Instagram DM Receiver (Make.com)

### Paso 1: Crear workflow en Make.com

1. Abre Make.com: https://make.com
2. **Create a new scenario**
3. Búsca: **"Instagram"** como trigger
4. Selecciona: **"Instagram Graph API"** → **"Watch Direct Messages"**

### Paso 2: Conectar Instagram

1. Click **"Sign in with Instagram"**
2. Autoriza Make.com para acceder a tus DMs
3. Selecciona tu cuenta de Instagram

### Paso 3: Agregar HTTP POST a n8n

1. Añade módulo: **"HTTP"** → **"Make a request"**
2. Configura:
   - **URL:** `http://n8n-peskids:5678/webhook/peskids-instagram`
   - **Method:** POST
   - **Body:**
     ```json
     {
       "from_id": "{{instagram.user_id}}",
       "sender_handle": "{{instagram.username}}",
       "sender_name": "{{instagram.sender_name}}",
       "message": "{{instagram.message_text}}",
       "messageId": "{{instagram.message_id}}",
       "timestamp": "{{now}}"
     }
     ```

### Paso 4: Guardar y activar

1. Click **"Save"**
2. Click **"Turn on"** (para activar el scenario)

---

## Parte 3: Verificar en Dashboard

1. Abre Peskids: `http://peskids.{PLATFORM_DOMAIN}/admin`
2. Deberías ver card **"New Inbound Messages"** con:
   - ✉️ Mensajes de WhatsApp (teléfono)
   - 📱 Mensajes de Instagram (@handle)
   - 💬 Mensajes de Web form (si hay)

### Enviar un DM de prueba

1. **WhatsApp:** Envía mensaje de tu teléfono a tu número (desde otro celular)
2. **Instagram:** Envía DM desde otra cuenta a tu Instagram
3. Ambos aparecerán en el dashboard dentro de **2 segundos**

---

## Troubleshooting

### "No veo el mensaje en el dashboard"

1. Verifica n8n workflow está **Activated** (icono verde)
2. Chequea logs en n8n: Dashboard → Workflows → whatsapp-receiver → Execution history
3. Asegúrate que Baileys QR fue escaneado correctamente
4. Revisa Make.com scenario está **ON** (switch azul)

### "Baileys dice 'Session expired'"

1. En n8n, click en workflow → **Credentials** → Baileys
2. Click **"Re-authenticate"**
3. Escanea QR nuevamente con tu teléfono

### "Instagram no envía mensajes"

1. Verifica que Make.com scenario está **ON**
2. En Make.com, usa **"Test"** para simular un DM
3. Revisa webhook URL es correcta: `http://n8n-peskids:5678/webhook/peskids-instagram`

---

## Responder Mensajes (Approval-First)

1. Abre Peskids dashboard
2. Click en mensaje (WhatsApp o Instagram)
3. Modal se abre con:
   - Mensaje original (read-only)
   - Campo de respuesta (owner escribe)
   - Botón **"Preview"** (verifica antes)
   - Botón **"Send"** (envía)

4. Owner SIEMPRE ve antes de enviar (approval-first garantizado)

---

## Eventos en Opsly Event Bus

Cada mensaje emite eventos automáticamente:

```json
{
  "event_type": "message.received",
  "tenant_id": "peskids",
  "source": "whatsapp", // or "instagram"
  "sender_contact": "+1234567890", // phone or @handle
  "message_text": "¿Cuánto cuesta el programa?",
  "timestamp": "2026-05-19T16:30:00Z"
}
```

Útil para:
- Auditoría
- Reportes
- Futuros automations (post-MVP)

---

## Seguridad

✅ **Tenant isolation:** Solo Peskids ve sus mensajes (RLS en Supabase)
✅ **No auto-send:** Todo requiere aprobación del owner
✅ **Audit trail:** Todos los mensajes logueados con timestamp
✅ **Credentials:** Secretos en Doppler (no en código ni env)

---

## Próximos pasos (Phase 2)

- Migrar a Meta Business API cuando aprobación llegue
- Agregar smart reply suggestions (approval-first AI)
- Template messages para respuestas comunes
- Análisis de sentimiento de mensajes

---

## Enlaces relacionados

- [[tenants/peskids/README|peskids]]
- [[brain/README|Brain Central]]
