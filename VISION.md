---
status: canon
owner: product
last_review: 2026-08-27
---

# VISION

Documento canónico: [`docs/01-development/VISION.md`](docs/01-development/VISION.md).

Actualización operativa relacionada (2026-04-28):
- La base **SwarmOps / Hive of Bots** quedó integrada en orchestrator.
- El detalle técnico y de contrato runtime vive en [`docs/design/OAR.md`](docs/design/OAR.md) y estado de sesión en [`AGENTS.md`](AGENTS.md).
- Orden de ejecución acordado: 1) Opsly core estable 2) adapters/skills para LangGraph, n8n y OpenHands 3) MCP seguro 4) Mission Control 5) fork solo si una integración no permite lo que necesitamos.

---

## Enlaces relacionados

- [[README|.]]
- [[README|Inicio]]

## Peskids Franchise

Peskids Franchise es una capacidad operativa del tenant Peskids, no un
control plane ni un tenant independiente. `tenant_slug=peskids` permanece como
la frontera canónica; Llanogrande, Domicilios y futuras franquicias son
unidades dentro de ese tenant.

La experiencia de franquicias puede permanecer temporalmente como runtime
Next separado, pero debe consumir la autenticación Peskids/Supabase y APIs
canónicas. El clon Kvadou solo es un acelerador de UX: su NextAuth, Prisma,
usuarios demo y valores comerciales de ejemplo no son fuentes productivas.

La autorización se resuelve en servidor mediante rol, membresía y alcance de
unidad. Los usuarios de franquicia reciben únicamente los datos necesarios de
su unidad; los datos de alumnos y familias conservan las fronteras de acceso
existentes de Peskids.

### Evolución de producto

1. Sesión canónica y lectura segura de unidades.
2. CRM separado de candidatos y franquiciados.
3. Territorios y ubicaciones.
4. Acuerdos y configuración comercial aprobada.
5. Regalías y pagos.
6. Apertura, checklist y activation gate.
7. Auditorías, formación, manuales y reportes reales.

Los valores de canon, regalías, duración, renovación, proveedores y pagos
requieren aprobación comercial/legal antes de activar contratos o cobros.
