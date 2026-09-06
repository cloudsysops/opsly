# ADR-049: Peskids usa dashboards como superficie de acción y WhatsApp como aviso

## Status

Accepted

## Date

2026-09-06

## Context

El cliente reporta una alta desconfianza hacia enlaces enviados por WhatsApp
por el volumen de estafas en Colombia. Profesores y familias necesitan recibir
avisos, pero la autenticación, el alcance por unidad y los cambios de estado no
deben depender de un enlace o de texto libre en un chat.

## Decision

Peskids usará el dashboard autenticado como superficie de confianza y de
acción. WhatsApp será inicialmente un canal `notify_only` para avisos,
conversación y escalamiento humano. Se podrá añadir un código corto de un solo
uso como puente, pero nunca sustituirá la sesión, el rol ni la autorización
server-side.

## Alternatives considered

### Enviar enlaces directos en WhatsApp

Se descarta como canal principal por la percepción de fraude, el riesgo de
reenviar enlaces y la posibilidad de confundir tokens con mensajes falsos.

### Ejecutar cambios desde texto libre de WhatsApp

Se descarta inicialmente porque la identidad y el alcance de la clase deben
validarse server-side. Se podrá evaluar después con botones oficiales,
idempotencia, expiración y aprobación humana.

### Dashboard + aviso sin enlace

Se acepta porque conserva una ruta manual reconocible (`peskids.op-sly.com`),
permite sesión/RLS y deja WhatsApp como recordatorio intercambiable.

## Consequences

- El profesor debe tener acceso al dashboard y guardarlo como marcador/PWA.
- WhatsApp no será el único canal de operación.
- Habrá que medir entrega del aviso y tiempo hasta la acción en dashboard.
- El número de WhatsApp puede cambiarse por configuración del proveedor, sin
  convertirlo en una dependencia de autorización.
- El código opcional requerirá hash, expiración, consumo único, tenant
  `peskids` y auditoría.
