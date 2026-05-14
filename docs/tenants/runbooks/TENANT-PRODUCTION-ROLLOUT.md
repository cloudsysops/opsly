# Rollout progresivo a producción — cohortes (Opsly)

> **Canónico:** editar este archivo (`docs/tenants/runbooks/`). Stub: [`docs/stubs/TENANT-PRODUCTION-ROLLOUT.md`](../../stubs/TENANT-PRODUCTION-ROLLOUT.md).

Estrategia de **rollout gradual** por cohortes para minimizar riesgo al promover tenants a producción con la superficie API canónica y controles endurecidos.

## 1. Principios

- Un **cohorte** = conjunto de tenants que comparten la misma ventana de validación y el mismo “gate” de salida.
- **No big bang:** migrar proxy web→API y checks por oleadas.
- **Rollback por tenant:** poder volver el tráfico o el estado del tenant sin afectar al resto del cohorte si es posible.

## 2. Cohortes sugeridas

| Cohorte | Tenants típicos | Objetivo |
| ------- | ---------------- | -------- |
| **P0 — Piloto** | 1 tenant de menor riesgo o staging interno | Validar proxy, health, invitaciones, webhooks |
| **P1 — Early** | Tenants con tráfico bajo / mismo plan | Validar costos LLM y colas |
| **P2 — General** | Resto de slugs activos | Paridad completa con checklist |

(Ajustar nombres según `docs/tenants/production/TENANT-PRODUCTION-BASELINE.md`.)

## 3. Gates entre fases

Antes de pasar de **Pn → Pn+1**:

1. Checklist al **100%** en todos los tenants del cohorte actual: [TENANT-PRODUCTION-CHECKLIST.md](./TENANT-PRODUCTION-CHECKLIST.md).
2. **Sin incidentes** P1 abiertos en la categoría “provisioning / billing / auth”.
3. **Type-check + tests** del workspace tocado en verde en `main` (o rama de release acordada).
4. **Deploy** API + web alineados (misma versión de contrato proxy).

## 4. Rollback por tenant

| Situación | Acción |
| --------- | ------ |
| Regresión solo en un slug | Suspender stack tenant (`scripts`/`opsly.sh` según runbook); notificar; no re-desplegar cohorte completo sin causa |
| Fallo proxy web | Revertir variable `INTERNAL_API_URL` o imagen `web` a última known-good |
| Fallo persistencia tenants | Bloquear **P*** siguientes; hotfix API; ver baseline riesgo #3 |

Documentar cada rollback en `AGENTS.md` (sesión) o ticket.

## 5. Comunicación

- Avisar a owners de tenant **antes** de ventana de cambio (email/discord interno).
- Congelar **onboard masivo** durante la ventana del cohorte si el gate es crítico.

## Referencias

- [TENANT-PRODUCTION-BASELINE.md](../production/TENANT-PRODUCTION-BASELINE.md)
- [TENANT-PRODUCTION-HARDENING.md](../production/TENANT-PRODUCTION-HARDENING.md)
- [OPERATIONS-HANDBOOK.md](../../runbooks/OPERATIONS-HANDBOOK.md) (si aplica procedimiento VPS)
