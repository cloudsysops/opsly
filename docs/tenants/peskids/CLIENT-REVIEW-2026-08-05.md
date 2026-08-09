---
status: active
owner: operations
tenant: peskids
type: client-review
date: 2026-08-05
deploy_sha: 5589824202bfc2cc9f06b054a8d87499a9d720fa
---

# Peskids — revisión cliente (2026-08-05)

**Sitio:** https://www.peskids.com
**Estado:** cambios **ya en producción** (deploy `55898242`). Pedimos revisión del equipo Peskids.

## Qué se corrigió

1. **WhatsApp domicilio** — si el formulario es *a domicilio*, el chat abre la **línea de domicilios**, no la de sede Llanogrande.
2. **Mensaje de WhatsApp** — deja de ser el texto genérico (*«Hola Peskids, quiero información…»*). Ahora lleva **resumen de la solicitud** (modalidad, datos del form) y, cuando hay lead, **link para el panel de soporte**.
3. **Logo / tipografía** — tipografías de marca cargadas; header sin “Peskids” duplicado al lado del logo circular.

## Checklist de revisión (5–10 min)

- [ ] Completar formulario como **familia → a domicilio** → al abrir WhatsApp, confirmar que es el número de **domicilios**.
- [ ] Leer el mensaje prellenado: debe mencionar **Clases a domicilio** y datos del form (no el mensaje genérico de marketing).
- [ ] Completar otra solicitud como **Llanogrande** → WhatsApp debe ir a la **línea de sede**.
- [ ] Mirar header en móvil y desktop: logo circular legible, tipografía Nunito.
- [ ] (Opcional) En admin, abrir el lead y validar que el link del mensaje coincide.

## Si algo falla

1. Cerrar WhatsApp / probar en ventana privada (a veces cachea el enlace `wa.me`).
2. Avisar a Opsly con captura: modalidad elegida, número que abrió, y texto del mensaje.
3. Health técnico: `https://www.peskids.com/api/health` → `git_sha` debe empezar por `55898242`.

## Referencias internas

- PR: https://github.com/cloudsysops/opsly/pull/905
- Deploy: https://github.com/cloudsysops/opsly/actions/runs/31055618937
- Brand: `docs/brand/peskids/BRAND.md`
