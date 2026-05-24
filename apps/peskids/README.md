---
status: draft
owner: operations
last_review: 2026-05-24
type: app-doc
tags:
  - opsly/app
---

# Peskids MVP

After-school program management platform. Incubated in Opsly, designed for extraction to independent product.

## Quick Start

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with Supabase credentials

# Run development server
npm run dev

# Open http://localhost:3004
```

## Architecture

**Frontend:** Next.js 14 + React + TypeScript + Tailwind CSS  
**Backend:** Next.js API routes  
**Database:** Supabase (PostgreSQL)  
**Real-time:** Supabase Realtime (WebSocket)  
**Events:** Opsly Event Bus (during incubation)

## Key Features

✅ **Landing Page** — Hero + lead capture form  
✅ **Admin Dashboard** — Real-time cards (leads, students, feedback, follow-ups)  
✅ **Lead Capture** — Form submission + database persistence  
✅ **Parent Feedback** — Satisfaction ratings (1-5) + alerts for low scores  
✅ **Multi-tenant Isolation** — RLS at database layer  
✅ **Event-Driven** — All actions emit to Opsly event bus  
✅ **Approval-First** — No auto-send, owner controls everything  
✅ **Admin Auth** — Protected /admin route + API authentication  
⚠️ **Follow-up Management** — Dashboard view only (no create/edit yet)  

## Project Structure

```
apps/peskids/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   ├── leads/         # POST /api/leads
│   │   ├── feedback/      # POST /api/feedback
│   │   └── dashboard/     # GET /api/dashboard
│   ├── admin/             # Protected admin pages
│   │   └── page.tsx       # Dashboard
│   ├── page.tsx           # Landing page
│   ├── thanks/            # Confirmation page
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles
├── lib/                   # Shared utilities
│   ├── types.ts          # TypeScript types
│   ├── supabase.ts       # Supabase client
│   └── events.ts         # Event emission
├── package.json
├── tsconfig.json
├── next.config.js
└── README.md
```

## Database Schema

See `docs/tenants/peskids/DASHBOARD-SPEC.md` and `FORMS-SPEC.md` for full specs.

**Tables:**
- `leads` — Program inquiries
- `students` — Enrolled students
- `feedback` — Parent satisfaction surveys
- `followups` — Action items to complete

## Real-Time Updates

Dashboard updates every 2 seconds via polling. In production, use Supabase Realtime subscriptions.

## Events

All user actions emit events to Opsly event bus:
- `lead.created` — New lead submitted
- `lead.updated` — Lead status changed
- `feedback.created` — Feedback submitted
- `feedback.alert` — Low satisfaction alert
- `followup.created` — Follow-up added
- `followup.completed` — Follow-up marked done

See `docs/tenants/peskids/EVENT-CONTRACT.md` for event schemas.

## Deployment

This app is designed for extraction to standalone repository. To deploy:

1. **During Incubation:** Deploy as part of Opsly monorepo
2. **After Extraction:** Deploy to separate Vercel/Cloud instance

Environment variables:
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Anon key
- `SUPABASE_SERVICE_ROLE_KEY` — Service role (server-side only)
- `NEXT_PUBLIC_TENANT_ID` — Tenant identifier (default: "peskids")
- `NEXT_PUBLIC_OPSLY_EVENT_BUS_URL` — Event bus endpoint (during incubation)

## Testing Locally

1. Set up Supabase (local or cloud project)
2. Run migrations to create tables
3. Configure `.env.local`
4. `npm run dev`
5. Visit http://localhost:3004
6. Submit lead form → redirects to thanks page
7. Visit http://localhost:3004/admin → see dashboard

## Documentation

- [MVP Plan](../../docs/tenants/peskids/MVP-PLAN.md)
- [Dashboard Spec](../../docs/tenants/peskids/DASHBOARD-SPEC.md)
- [Forms Spec](../../docs/tenants/peskids/FORMS-SPEC.md)
- [Event Contract](../../docs/tenants/peskids/EVENT-CONTRACT.md)
- [Blueprint Mapping](../../docs/tenants/peskids/BLUEPRINT-MAPPING.md)
- [Extraction Plan](../../docs/tenants/peskids/EXTRACTION-PLAN.md)

## License

MIT (during incubation in Opsly)  
Proprietary (after extraction)

See `docs/tenants/peskids/EXTRACTION-PLAN.md#License-Decision` for details.

---

## Enlaces relacionados

- [[apps/peskids/README|peskids]]
- [[README|Inicio]]
