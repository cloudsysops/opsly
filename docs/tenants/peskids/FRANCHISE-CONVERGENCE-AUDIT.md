# Peskids Franchise — clone audit

## Dependency classification

| Area | Current clone dependency | Decision | Reason / follow-up |
|---|---|---|---|
| Next/React | Next `^16.3.0`, React 19 | REPLACE Next with monorepo `^15.5.22`; KEEP React 19 | Avoid duplicate Next runtimes and use the root lock/version. Next 16 exposed legacy handler signatures across the clone. |
| Maps | Leaflet, Mapbox GL, React Leaflet 4 | KEEP Leaflet/Mapbox UI; REPLACE React Leaflet with 5 | React Leaflet 4 peers React 18; v5 peers React 19. Map provider remains optional for MVP. |
| Prisma | Prisma Client/schema in `apps/peskids-franchise/prisma` | DEV/LEGACY ONLY | It owns cloned business state and cannot be a production source of truth. Generate only for isolated compatibility/tests until API adapters replace screens. |
| NextAuth | `next-auth` + Prisma adapter + Google provider | REMOVE from production path | Peskids Supabase auth is canonical. Demo credentials and Acme-domain OAuth must not be exposed. |
| Stripe | `stripe` and Connect-oriented clone code | DEFER | Audit only until Peskids decides fee collection, royalties debit, marketplace payouts and payment rail. |
| LMS | Academy/bootcamp models and UI | KEEP UI, DEFER backend | Use only after canonical training assignment/completion contracts exist; classify content before production. |
| Documents | Dropbox Sign, S3, rich editor and PDF stack | DEFER/ADAPTER | Reuse existing storage/signature/document services; do not create a second blob store or signing authority. |
| Charts/analytics | Recharts, D3 overrides, demo financial queries | KEEP library; REPLACE data source | Charts must consume canonical Peskids/Core aggregates and carry a source; remove demo MRR assumptions. |
| UI libraries | dnd-kit, Tiptap, Heroicons, React Flow, Tailwind v3 | KEEP selectively | Retain only for screens that survive convergence; no new UI dependency for backend gaps. |

## Authentication evidence

The clone's `src/lib/auth.ts` configures NextAuth, `PrismaAdapter`, a Google
provider restricted to `@acmefranchise.com`, and a credentials provider that
accepts `demo@acmefranchise.com` / `demo`. This is incompatible with the
Peskids production boundary. A canonical-session adapter must be added only
after the runtime/SSO cookie boundary is chosen; copying a Supabase session or
accepting a browser-provided role would create an authorization flaw.

## Demo/legacy leakage scan

The following values are present in clone code/fixtures and must be treated as
non-production until removed or explicitly gated:

- Acme branding, `acmefranchise.com`, demo users and fake invoice/activity data.
- Children's chess/Chess at Three content and Heroku demo URLs.
- `$45,000`, `7%`, `10 years`, `$200/week` and weekly minimum royalty examples.

No real Peskids records should be backfilled from these fixtures. No Prisma
drop or production migration is authorized by this audit.

## Bounded legacy debt

The clean Next 15 build measured 23,162 inherited Prettier diagnostics and 26
legacy Next route-validator errors before this slice. They fall into three
categories: clone-wide quote/formatting drift, synchronous dynamic-route
`params` signatures, and missing local `date-fns` resolution from the dirty
workspace lock/install state. The proposed cleanup is a separate compatibility
PR; this slice formats and lints only touched files and does not add broad
ignores.
