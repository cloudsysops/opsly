---
status: active
owner: operations
tenant: peskids
type: client-review
date: 2026-08-06
---

# Peskids — revisión cliente (lote Claude + UX)

**Sitio:** https://www.peskids.com
**Health:** `https://www.peskids.com/api/health` → `git_sha` debe coincidir con el deploy de esta sesión.

## Qué hay para probar

### Landing / familia
1. Logo con lettering negro; tipografía Nunito.
2. Familia → **Llanogrande**: sin ciudad; WhatsApp a línea de sede.
3. Familia → **Domicilio**: ciudad + barrio obligatorios; WhatsApp a línea de domicilios; mensaje con resumen (no genérico).

### Formularios profesor / empresa
4. **Trabaja con nosotros**: exige CV + video de natación.
5. **Empresa / alianza**: campo nombre de contacto; el equipo recibe aviso por email (no solo WhatsApp).

### Admin (`/admin`)
6. Menú izquierdo fijo al hacer scroll.
7. En un lead: panel **quick-actions** (Asistió / Matricular / Hold / Cancelar) — oculto si ya está enrolled/active/renewal.
8. Plantillas de respuesta de soporte en el detalle del lead.
9. Tras enviar un lead familia: página `/thanks` con preview WhatsApp de soporte + link al lead.

## Si algo falla

1. Hard refresh / ventana privada (CDN / WhatsApp cachean a veces).
2. Avisar a Opsly con captura + modalidad + qué pantalla.
