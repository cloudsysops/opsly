# Franchise OS (Franchise Core Capability Matrix)

> Tenant-agnostic franchise operating brain. **Peskids** is the first adapter —
> sedes y franquicias dentro del mismo tenant `peskids`, nunca un tenant nuevo.

## Non-negotiables

- `tenant` = Opsly tenant · `network` = marca/sistema (1..N por tenant) · `unit`
  = sede/unidad operativa · `franchisee` = contraparte legal (opcional en
  unidades propias · nullable).
- **No** crear tenant por sede/franquicia. **No** GIS engine (geometría se
  persiste; fixture/mapa es abstracción futura). **No** e-signature ahora
  (`SignatureProvider` es un contrato de adapter a futuro: DocuSign / Dropbox Sign).
- **Royalties versionados y reproducibles**: nueva versión = nuevo
  `effectiveFrom`; se cierra `effectiveTo` de la anterior. Un `RoyaltyCalculation`
  es immutable (inputs/calculation/result JSON, `ruleVersion` fijo). Nunca
  recalcular historia silenciosamente.
- Business vertical (piscina, restaurante…) **solo** en adapters de tenant.

## Capability matrix

| Capability | Core lib | Persistence (0098) | Adapter peskids | Estado |
| --- | --- | --- | --- | --- |
| Networks / units / locations | `types.ts` | `franchise_networks`, `franchise_units`, `franchise_locations` | `units.adapter.ts` (map `peskids_franchises`) | ✅ primerslice |
| Territories (exclusividad) | `territory.ts` | `franchise_territories` | — | ✅ core |
| Agreements (estado/alertas) | `agreement.ts` | `franchise_agreements` + junction | — | ✅ core |
| Royalty engine (v1) | `royalty.ts` | `royalty_rules`, `sales_reports`, `royalty_calculations`, `royalty_payments` | `sales-report.adapter.ts` | ✅ core |
| Audits + corrective actions | `audit.ts` | `audit_templates`, `audits`, `audit_findings`, `corrective_actions` | — | ✅ core |
| Opening checklist | types/schema | `opening_checklists`, `opening_tasks` | — | ⏳ pendiente engine |
| Brand standards / suppliers / training / support / docs | tipos | tablas respectivas | — | ⏳ pendiente |
| SignatureProvider (DocuSign/Dropbox) | contrato futuro | `document_ref` | — | 🔮 adapter futuro |
| Payment provider (Wompi/Stripe) | `SalesReportSource` | `source_reference` | vía `wompi-gateway` | 🔮 adapter futuro |

Leyenda: ✅ hecho en este slice · ⏳ pendiente · 🔮 solo contrato.

## Principio de menor slice reutilizable

Este PR entrega: `@intcloudsysops/franchise-core` (librería pura + 55 tests),
migración `0098` (tablas genéricas + RLS service-role + backfill idempotente de
`platform.peskids_franchises`), registro en `config/modules.json` +
`commercial-catalog.json` (`franchise_core`), y el adapter de Peskids (mapping
puro de unidades y revenue → SalesReport). No hay APIs HTTP nuevas aún; el
siguiente incremento conecta repos/service layer y endpoints.

## Pérdida de contexto permitida

- Royalty rule nuevos → `createNextRuleVersion` (jamás UPDATE de reglas viejas).
- Cálculo previo → se explica desde su snapshot; no se re-ejecuta.
- RLS: `royalty_calculations` sin UPDATE/DELETE (patrón `audit_events`).

## Referencias

- Package: `lib/franchise-core/` · Governance: `lib/franchise-core/GOVERNANCE.md`
- Migración: `supabase/migrations/0098_franchise_core.sql`
- Adaptador: `apps/peskids/lib/franchise/`
- Registry: `config/modules.json` (`franchise-core`) · Catálogo: `config/commercial-catalog.json`