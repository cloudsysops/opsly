# Peskids Franchise — convergence matrix

Estado de referencia: 2026-08-25. Esta matriz separa la interfaz clonada de
Kvadou de la fuente de verdad de producción. `tenant_slug` permanece fijo en
`peskids`; una sede/franchise unit no crea otro tenant.

| Capability | Kvadou clone (`apps/peskids-franchise`) | Opsly/Core | Peskids current | Canonical owner | Action |
|---|---|---|---|---|---|
| Authentication/session | NextAuth, Prisma `User`, Google `@acmefranchise.com`, demo credentials | No auth owner; receives trusted identity | Existing Supabase staff auth and `validateStaffRequest` | Peskids auth/session | Thin adapter exists for the read-only units slice; demo login remains dev/test only and legacy auth is not production source |
| Tenant and access scope | Browser/session roles and Prisma relations | `tenantId`, `unitId` contracts; persistence/RLS on server | `tenant_slug=peskids`, staff memberships and franchise scope | Peskids auth + Supabase RLS | Derive tenant, role and unit assignments server-side |
| Franchise candidates | Prisma `Prospect` and CRM pages | Candidate lifecycle belongs in franchise domain | Family/lead CRM is separate | Peskids Franchise candidate service | Canonical candidate pipeline/API/Kanban is implemented in this slice; never mix with parents/students |
| Franchisees | `FranchiseeAccount`, contacts and portal pages | `Franchisee` entity | Existing franchise rows/memberships where applicable | Core + Peskids adapter | Map UI to canonical service |
| Units/locations | `FranchiseeAccount`, `Location`, map fixtures | `FranchiseUnit`, `FranchiseLocation` | `platform.peskids_franchises`, `peskids_franchise_locations`; Llanogrande/Domicilios | Peskids unit model + Core contract | Display real units; no Acme fixtures in production |
| Territories | Territory/map models, Mapbox/Leaflet UI | `Territory`, overlap/exclusivity engine | Peskids unit/location scope; canonical territory APIs on franchise branches | Franchise Core + persistence | Use API adapter; municipality/radius/exclusivity require server validation |
| Agreements/renewals | Prisma `FranchiseAgreement`, demo USD defaults | `FranchiseAgreement` lifecycle and renewal fields | Business values not yet approved | Core + Peskids commercial config | Show pending values until approved; no demo defaults |
| Commercial configuration | Hardcoded/demo fee, royalty and term assumptions | Versioned agreement/royalty contracts | Peskids owns business configuration | Peskids config, validated by Core | Store explicit DRAFT/APPROVED config; legal/commercial approval required |
| Royalties/sales | `RoyaltyConfig`, invoice/payment models and client calculations | Immutable versioned rule/calculation engine | Existing payments/automation capabilities; franchise endpoints on open persistence branch | Core royalty engine + canonical payments | No React math; activate only with approved rule and payment decision |
| Opening/activation | Clone checklist/workflow screens | Opening checklist/task and activation gate | Existing opening workflows, enhanced on open branch | Core opening domain + server API | Unit cannot become active through a UI toggle |
| Audits/findings | Field audit and quality screens | `Audit`, `Finding`, `CorrectiveAction` | Canonical audit persistence on open franchise branch | Core audit + persistence/RLS | Keep UI, replace data source; Peskids template owns categories |
| Training/LMS | Academy, courses and certification UI/content | Training contracts are partial/not a full LMS | Existing Peskids operational training context | Peskids/Core assignment boundary | Reuse UI only after assignment/completion API exists; approve content |
| Manuals/documents | Prisma manual pages/sections and demo content | Document references, not a second blob store | Existing docs/storage capability | Existing storage + canonical document refs | Port references/version/acknowledgement; do not duplicate storage |
| Suppliers/equipment | Supplier, equipment and marketplace-like Prisma models | Generic supplier/catalog capability is not yet production-proven | Peskids business configuration pending | Peskids config + future Core contract | Keep behind feature flag; no marketplace/payment flow |
| Marketing/social | Brand assets, campaigns and social screens | No auto-posting requirement in Core | Peskids brand approvals are product-owned | Peskids approval workflow | Approval-first assets/templates; defer auto-posting |
| Reports | Demo MRR/invoice/activity charts | Aggregates consume canonical entities | Peskids dashboard services and real operational data | Peskids/Core reporting services | Dashboard stats/leads/students are partial; every metric needs a source and every returned field needs PII review |
| Stripe Connect | Clone integration/configuration | Payment rail is outside pure domain core | Existing Stripe/Wompi/payment automations | Peskids payments decision | Audit only; defer Connect until marketplace/payout need is approved |
| RLS | Prisma schema is not a production boundary | Persistence APIs and tenant/unit authorization | Supabase RLS and franchise memberships | Supabase/Postgres + server authorization | Prove A/B isolation and role restrictions with live tests |

## Current integration decision

`apps/peskids-franchise` remains a separate Next runtime temporarily as a UI
shell. Its production routes must call canonical Peskids/Opsly APIs and use
the Peskids session context. A later routing decision can mount the experience
inside `apps/peskids`, but a separate runtime is acceptable only if SSO,
tenant scope and deployment checks remain canonical.

## Explicitly not production-ready yet

- Kvadou NextAuth/Prisma/demo credentials are not an acceptable production path.
- Kvadou commercial values, Acme records, sample invoices and fake charts are
  fixtures/legacy content and must not be surfaced as Peskids truth.
- The canonical unit read/API slice exists, but the broader dashboard is not
  production-ready until student/family PII and all endpoint scopes are reviewed.
- Candidate CRM is additive and pending migration approval; conversion creates
  an approved franchisee and a `prospect` unit through the canonical RPC, never
  an active unit.
- Franchise Core persistence/RLS/opening branches are open PRs and must not be
  assumed merged into `main`.
- Commercial, legal and payment-rail values remain pending until approved;
  no production migration or automatic royalty collection is implied here.
