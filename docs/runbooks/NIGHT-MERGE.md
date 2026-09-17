---
status: canon
owner: operations
last_review: 2026-09-17
---

# Night merge — governed integration queue

`Night merge` integra código en `main`; **no despliega producción**.

La regla canónica es:

```text
merge != release != activation
```

Un merge exitoso hace que `main` sea la verdad de integración. Los workflows de release/promoción aplican por separado cualquier deploy, migración, n8n o activación de tenant y conservan sus propias ventanas y aprobaciones.

## Qué hace cada noche

En las reconciliaciones nocturnas GitHub Actions:

1. Considera únicamente PRs con `night-merge`.
2. Exige PR no-draft, mergeable, `state:ready`, sin blockers y revisión independiente `opsly-independent-review=success` sobre el **head exacto**.
3. Rechaza checks reales pendientes o fallidos; `production-change-window` no se interpreta como fallo de código en esta cola de integración.
4. Procesa un lote pequeño y hace squash-merge con protección de head SHA.
5. Borra únicamente la rama del PR que acaba de integrarse.

El workflow **no**:

- despacha `Deploy`;
- aplica migraciones;
- activa workflows n8n;
- toca datos de producción;
- hace smoke de Peskids como consecuencia de un merge no relacionado;
- crea rollback de producción automáticamente.

## Cómo entra un PR a la cola

La clasificación de impacto asigna rutas:

- `merge:daytime`: dominio desacoplado y sin `release:required`;
- `merge:governed`: Peskids, migraciones/release-required, control-plane u otra superficie sensible.

El auto-label nocturno solo puede añadir `night-merge` a un PR `merge:governed` que además tenga `state:ready` y revisión independiente exact-head. **Control-plane nunca se auto-encola**; requiere una decisión explícita.

No uses `night-merge` como sustituto de una aprobación de producción.

## Labels relacionados

| Label | Efecto |
|---|---|
| `merge:daytime` | Elegible para integración diurna automatizada si todos los demás gates pasan |
| `merge:governed` | Integración sensible; no entra a la cola diurna automática |
| `night-merge` | Encola una integración gobernada nocturna; no autoriza release |
| `release:required` | Después del merge todavía existe un release/apply separado y gobernado |
| `release:none` | El cambio no requiere una activación de producción posterior |
| `hotfix-prod` | Excepción de emergencia para el flujo de producción correspondiente |

## Peskids

Peskids es el tenant/producto actualmente protegido. Los cambios Peskids se clasifican `merge:governed`; no entran al auto-merge diurno. Aunque su código llegue a `main`, eso **no** despliega Peskids.

La promoción de Peskids continúa en su workflow de release y dentro de la ventana definida en [PRODUCTION-CHANGE-WINDOW.md](PRODUCTION-CHANGE-WINDOW.md), salvo un hotfix autorizado.

## Migraciones e infraestructura de release

`supabase/migrations/**`, scripts de deploy/rebuild y superficies equivalentes se clasifican `release:required + merge:governed`.

Integrar el código no aplica la migración ni modifica infraestructura por sí solo.

## Prueba manual

Actions → **Night merge** → Run workflow:

- `dry_run=true`: lista candidatos exact-head sin mergear;
- `force=true`: omite únicamente el reloj de la cola nocturna; no elimina los gates de candidato ni constituye permiso de release.

## Relación con operaciones nocturnas

`nightly-ops` y `Night cleanup` son procesos distintos. Pueden revisar runtime, hacer higiene o ejecutar tareas operativas según sus propios contratos. El hecho de que un PR se integre en Night merge no implica que esas tareas deban desplegar ese commit.

## Contexto histórico

Antes de este desacople, Night merge encadenaba `merge → Deploy → smoke Peskids → rollback`. Ese diseño hacía que cambios de Games, Content, Health Travel o Platform esperaran el mismo camino del único cliente de producción y generó falsos rollbacks cuando un Deploy no se disparaba después de merges hechos con `GITHUB_TOKEN`.

Desde 2026-09-17, la cola canónica termina en **merge**. Release y rollback pertenecen al workflow del servicio/tenant que realmente se promueve.

## Enlaces relacionados

- [[PRODUCTION-CHANGE-WINDOW|Ventana de producción]]
- [[NIGHT-CLEANUP|Night cleanup]]
- [[01-development/AGENT-PROMPT-QUEUE|Cola de prompts]]
