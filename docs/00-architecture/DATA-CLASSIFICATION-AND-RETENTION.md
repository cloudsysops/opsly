---
status: policy_proposed
owner: platform
last_review: 2026-08-02
---

# Data Classification and Retention

## Clasificación inicial

| Clase                | Uso                                          | Acceso inicial     | Retención inicial      |
| -------------------- | -------------------------------------------- | ------------------ | ---------------------- |
| `PUBLIC`             | contenido público                            | público/autorizado | según negocio          |
| `INTERNAL`           | operación interna                            | staff autorizado   | 2 años                 |
| `CONFIDENTIAL`       | contratos, pricing, operaciones              | roles específicos  | 5 años                 |
| `SENSITIVE_PERSONAL` | identidad y datos personales                 | mínimo necesario   | mínimo necesario       |
| `SENSITIVE_HEALTH`   | datos administrativos de salud               | roles autorizados  | mínimo legal/operativo |
| `REGULATED`          | datos sujetos a obligación contractual/legal | acceso reforzado   | según contrato/ley     |

Estos valores son defaults de plataforma, no asesoría legal. La retención final
debe configurarse por tenant y revisarse antes de aceptar pacientes reales.

## Reglas

- No almacenar historias clínicas completas si no son necesarias para operar.
- El fixture médico usa únicamente datos sintéticos.
- Archivos sensibles requieren tenant isolation, RBAC, signed URLs con
  expiración y auditoría de lectura/escritura.
- Health responses y logs no incluyen documentos, secretos ni PII innecesaria.
- Eliminación, expiración y retención deben ser operaciones auditables.
- La aceptación de una cotización no equivale a consentimiento clínico.

## Estado real de almacenamiento documental hoy

`grep` de `.storage.from(` en todo el repo encontró exactamente un bucket:
`peskids-staff-uploads` (privado, sin versionado, sin expiración, sin
clasificación). No hay nada más que migrar o romper — el Document Vault de
PR-VENTURE-11 parte de cero, no de un sistema existente a generalizar.

## Scope del sandbox

`medical-tourism-demo` tendrá pagos y comunicaciones externas desactivados,
proveedores ficticios y documentos sintéticos. No se desplegará públicamente.
