# tenant-onboarding-agent

HTTP preview service for Academy-vertical tenant onboarding. Wraps
[`@intcloudsysops/academy-blueprint`](../../lib/academy-blueprint) — the
same builder/validator logic used by
[`scripts/blueprints/generate-academy-tenant.mjs`](../../scripts/blueprints/generate-academy-tenant.mjs)
— behind a small Fastify API, so a form or another service can get a
validated onboarding preview without shelling out to the CLI.

## History

This app previously polled a Prisma `TenantInvitation` table and queued
tasks to an external `AGENT_MANAGER_URL` (Hermes agent-manager). That
code had no `package.json` (not a real npm workspace member — couldn't
build, type-check, or run), depended on a Prisma schema that doesn't
exist anywhere in this repo, and pointed at infrastructure this repo has
no other trace of. It was replaced outright rather than repaired,
per the decision to connect this app to the Academy blueprint/tenant
generator system instead.

## Endpoints

- `GET /health` — liveness check.
- `POST /onboard/academy/preview` — given `{ slug, displayName, domain, ownerEmail, locale?, timezone?, franchises? }`,
  returns the validated `config/blueprints/academy/instances/<slug>.json`
  contract, `config/tenants/<slug>.json`, templated seed files, and a
  concrete "what's left" checklist with a total time estimate — **preview
  only, nothing is written to disk**. Returns `409` if the slug already
  has a tenant config. To actually create the files, run
  `scripts/blueprints/generate-academy-tenant.mjs --write` (a human- or
  agent-run CLI step, deliberately not exposed as a write-capable HTTP
  endpoint — see that script's header comment for why).

## Local development

```bash
npm install
npm run dev --workspace=@intcloudsysops/tenant-onboarding-agent
curl -X POST http://localhost:3004/onboard/academy/preview \
  -H "Content-Type: application/json" \
  -d '{"slug":"swim-cali","displayName":"Swim Cali","domain":"https://www.swimcali.com","ownerEmail":"owner@swimcali.com"}'
```

## Docker

```bash
docker build -f apps/tenant-onboarding-agent/Dockerfile -t tenant-onboarding-agent .
```

Build context must be the repo root (this app depends on the
`@intcloudsysops/academy-blueprint` workspace package). **Not verified
against a real Docker daemon** — the sandbox this was authored in only
had the Docker client, no daemon, so the multi-stage build is correct on
paper (follows npm's documented partial-workspace-install pattern) but
hasn't actually been run. Verify before relying on it in a real deploy.

The running container reads `config/blueprints/academy/**` and
`config/tenants/**` from the filesystem at request time — those aren't
baked into the image, so mount or otherwise provide the current repo
checkout at deploy time.
