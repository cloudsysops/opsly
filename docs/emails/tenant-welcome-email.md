# Email de Bienvenida - Cliente Opsly

Plantilla **manual** (complemento al email automático que envía la API vía Resend al usar `POST /api/invitations`). Úsala si quieres un mensaje personal por fuera o como borrador para copiar/pegar.

## Asunto

🚀 ¡Tu plataforma Opsly está lista! — Accede a tus herramientas

---

## Cuerpo del Email

Hola **{NOMBRE_CLIENTE}**,

¡Bienvenido a Opsly! Tu plataforma de automatización y monitoreo está lista para usar.

## 🔑 Tu acceso

**Portal (login y dashboard):** https://portal.ops.smiletripcare.com

> Si recibiste un **enlace de invitación** por email, ábrelo primero para activar tu cuenta; luego podrás entrar al portal con tu usuario y contraseña.

**Panel administrativo de la plataforma** (solo equipo Opsly / demos internas): https://admin.ops.smiletripcare.com

## 🛠️ Tus herramientas

### n8n (Automatización)

**URL:** https://n8n-{TU_SLUG}.ops.smiletripcare.com

Pasos:

1. Abre la URL en tu navegador.
2. Crea tu cuenta de administrador (primera visita).
3. Importa o crea tu primer workflow.
4. Automatiza.

### Uptime Kuma (Monitoreo)

**URL:** https://uptime-{TU_SLUG}.ops.smiletripcare.com

Pasos:

1. Abre la URL.
2. Crea tu cuenta admin (primera visita).
3. Añade tu primer monitor.
4. Configura alertas (email, Discord, etc.).

## 📋 Qué puedes hacer

- Crear workflows automatizados.
- Monitorear sitios y servicios.
- Integrar con tus herramientas habituales.
- Recibir alertas cuando algo falle.

## 🆘 Soporte

Si tienes algún problema:

- Responde al email de invitación o escribe al contacto que te compartió Opsly.
- **Email general (plantilla):** soporte@opsly.io — sustituir por el canal real acordado con tu cuenta.

## 💡 Sugerencias para empezar

1. **n8n:** un workflow simple (por ejemplo notificación por email o webhook).
2. **Uptime:** monitorizar tu sitio web principal o un endpoint de API.
3. **Portal:** revisar modo **developer** / **managed** y métricas disponibles en tu plan.

---

¡Estamos aquí para ayudarte!

El equipo de Opsly

---

## Variables a reemplazar

| Variable | Ejemplo |
|----------|---------|
| `{NOMBRE_CLIENTE}` | Nombre del contacto o comercial |
| `{TU_SLUG}` | Slug del tenant (`localrank`, `jkboterolabs`, …) |

## Emails alternativos

### Recordatorio (día 3)

**Asunto:** ¿Necesitas ayuda con Opsly? — Tips para empezar

Hola {NOMBRE_CLIENTE},

¿Ya pudiste acceder a tu plataforma Opsly?

Si tuviste algún problema, aquí tienes algunos tips:

1. **n8n no carga:** espera unos segundos; el stack puede estar arrancando tras un despliegue.
2. **Uptime no responde:** verifica que el slug en la URL coincida con el de tu tenant (`n8n-{slug}`, `uptime-{slug}`).
3. **Acceso al portal:** usa el enlace de invitación o recuperación de contraseña desde el login del portal.

Cualquier duda, responde a este hilo o a tu contacto en Opsly.

El equipo de Opsly

### Follow-up (día 7)

**Asunto:** ¿Cómo va tu experiencia con Opsly?

Hola {NOMBRE_CLIENTE},

Han pasado unos días desde que activamos tu plataforma.

Nos gustaría saber:

- ¿Pudiste crear tu primer workflow?
- ¿Están funcionando los monitores?
- ¿Hay algo que podamos mejorar?

Tu feedback es muy valioso.

Gracias,  
El equipo de Opsly
