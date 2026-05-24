---
status: draft
owner: architecture
last_review: 2026-05-18
tenant_slug: peskids
---

# Peskids — semilla del repo `cloudsysops/peskids-platform`

> **No crear el repositorio en esta fase.** Plan para cuando [INCUBATION-CHECKLIST.md](./INCUBATION-CHECKLIST.md) dispare extracción.

## Propósito del repo

Aplicación y API de producto **Peskids** independiente del monorepo Opsly, con integración opcional por webhooks.

## Stack objetivo

| Capa | Tecnología |
|------|------------|
| Frontend | Next.js 15 (App Router) |
| Lenguaje | TypeScript estricto |
| Estilos | Tailwind CSS |
| Backend / DB | Supabase (Postgres + Auth + RLS) |
| Deploy | Vercel (preview + production) |
| Automatización | n8n exportado o API propia (fase 2) |
| Puente Opsly | Webhooks HTTPS + API key |

## Estructura de carpetas sugerida

```
peskids-platform/
├── apps/
│   └── web/                 # Next.js (marketing + dashboard)
├── packages/
│   └── types/               # Tipos compartidos eventos/API
├── supabase/
│   ├── migrations/
│   └── seed.sql
├── docs/                    # Copia/adaptación de docs/tenants/peskids/
├── workflows/               # Export n8n JSON versionado
├── .env.example             # Sin secretos
├── vercel.json
└── README.md
```

## Bootstrap (comandos futuros — no ejecutar ahora)

```bash
# Ejemplo ilustrativo cuando exista org/repo
# npx create-next-app@latest apps/web --typescript --tailwind --app
# npx supabase init
# Copiar docs desde opsly: docs/tenants/peskids → docs/
```

## Variables de entorno (`.env.example`)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# App
NEXT_PUBLIC_APP_URL=

# Opsly bridge (opcional)
OPSLY_WEBHOOK_URL=
OPSLY_WEBHOOK_SECRET=
OPSLY_TENANT_SLUG=peskids

# Feature flags
PESKIDS_AI_SUGGESTIONS_ENABLED=true
PESKIDS_AUTO_SEND_ENABLED=false
```

## Migración desde incubación

| Desde Opsly | Acción |
|-------------|--------|
| `docs/tenants/peskids/*` | Copiar y mantener historial git |
| DATA-MODEL | Primera migración SQL |
| CRM n8n | Export + adaptar webhooks a API Peskids |
| Leads en hoja/DB temp | Script import one-off |
| `config/tenants/peskids.json` | No copiar; reemplazar por env del nuevo repo |

## Integración Opsly opcional

### Saliente (Peskids → Opsly)

POST eventos documentados en [EXTRACTION-PLAN.md](./EXTRACTION-PLAN.md).

### Entrante (Opsly → Peskids)

Solo si se define contrato (p. ej. métricas de uso). Evitar acoplar a BullMQ.

## CI/CD mínimo (Vercel)

- PR: lint + type-check + tests
- `main` → production
- Preview por PR

## Gobernanza

- Repo privado `cloudsysops/peskids-platform`
- CODEOWNERS: owner producto + ops
- Sin secretos en git; Vercel env + Supabase dashboard

## Criterios de “repo listo”

- [ ] Login owner (Supabase Auth)
- [ ] CRUD leads + feedback (mínimo)
- [ ] Webhook receptor `lead.created` de prueba
- [ ] Deploy preview Vercel
- [ ] AI policy implementada (solo drafts)

## Relación con Opsly post-cutover

| Opción | Descripción |
|--------|-------------|
| A | Opsly solo hosting n8n legacy hasta sunset |
| B | Opsly + billing LLM |
| C | Desconexión total; Opsly archivado para Peskids |

Decisión: ___ (documentar en ADR del nuevo repo).

---

## Enlaces relacionados

- [[tenants/peskids/README|peskids]]
- [[brain/README|Brain Central]]
