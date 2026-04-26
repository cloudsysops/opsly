# LocalRank — Guía de testing (Opsly beta)

## Bienvenido a Opsly beta

Eres uno de nuestros primeros testers externos: tu feedback ayuda a definir el producto.

## Tus servicios

| Servicio    | URL                                            |
| ----------- | ---------------------------------------------- |
| Portal      | https://portal.ops.smiletripcare.com           |
| n8n         | https://n8n-localrank.ops.smiletripcare.com    |
| Uptime Kuma | https://uptime-localrank.ops.smiletripcare.com |

_(Las URLs asumen el tenant `localrank` desplegado en el VPS de staging.)_

**Nota de seguridad:** acceso SSH de administración solo por Tailscale (`100.120.151.91`).
Las webs públicas están detrás de Cloudflare (Proxy ON recomendado para `*.ops.smiletripcare.com`).

## Qué probar esta semana

### Día 1 — Acceso básico

- [ ] Activar cuenta con el enlace del email de invitación
- [ ] Explorar el portal (modo Developer)
- [ ] Entrar a n8n y revisar workflows disponibles

### Día 2 — Automatizaciones

- [ ] Crear un workflow simple (ej.: webhook → notificación cuando llega un lead)
- [ ] Comprobar que Uptime Kuma refleja tus servicios

### Día 3 — Generación de contenido (experimental, Business+)

- [ ] Confirmar con soporte que el tenant está en plan Business o Enterprise
- [ ] Confirmar `NOTEBOOKLM_ENABLED=true` para el entorno
- [ ] Subir un PDF de reporte de cliente
- [ ] Pedir generación de podcast resumen
- [ ] Verificar que recibes audio + slides + infografía

## Checklist rápido (smoke test)

- [ ] `https://portal.ops.smiletripcare.com` carga login
- [ ] `https://n8n-localrank.ops.smiletripcare.com` responde
- [ ] `https://uptime-localrank.ops.smiletripcare.com` responde
- [ ] Invitación del tenant recibida y activada
- [ ] Si NotebookLM está habilitado: artifacts generados correctamente

### Día 4 — Feedback

- [ ] Usar el chat del portal ante cualquier comportamiento raro
- [ ] Responder con honestidad: ¿valorarías ~$49/mes para tu agencia?
- [ ] Indicar qué añadirías para operación diaria

## Cómo dar feedback

Usa el botón de feedback en el portal. El sistema clasifica mensajes para priorizar bugs, mejoras e ideas.

## Contacto

- **Tu cuenta:** jkbotero78@gmail.com
- **Fundador:** cboteros1@gmail.com (Cristian)
