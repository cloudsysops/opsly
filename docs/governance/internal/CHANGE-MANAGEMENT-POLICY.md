# Change Management Policy

**Version:** 1.0 | **Effective:** 2026-05-25 | **Owner:** Cristian Botero  
**Review:** Annually | **Policy ID:** ops-change-v1

---

## 1. Purpose

Ensure all changes to production systems are authorized, tested, and documented to reduce risk of service disruption and security vulnerabilities.

## 2. Change Categories

| Category | Examples | Approval required |
|----------|---------|-------------------|
| Standard | Bug fixes, config updates, new features | PR review (self or peer) |
| Significant | New sub-processors, schema changes, auth changes | Architecture Decision Record (ADR) |
| Emergency | P0 hotfix, revoke compromised credential | Post-hoc ADR within 48h |

## 3. Standard Change Process

1. **Branch:** `feat/*` or `fix/*` from `main` (see GIT-WORKFLOW.md)
2. **Code:** Follow pre-commit hooks (type-check, lint, structure guard)
3. **Test:** `npm run type-check` + relevant unit tests green
4. **PR:** Include Summary, Test Plan, Risk Assessment in PR body
5. **Review:** Self-review minimum; peer review for T0 system changes
6. **Merge:** Squash merge to `main`; CI auto-deploys to Vercel

## 4. Database Migration Process

1. New file in `supabase/migrations/` (sequential numbering)
2. Use `IF NOT EXISTS` and `ON CONFLICT DO NOTHING`
3. Include RLS policies
4. Test in local Supabase first
5. Apply to production only via Supabase dashboard or `supabase db push --linked`

## 5. Architecture Decision Records

All significant changes require an ADR in `docs/adr/ADR-NNN.md`:
- Decision context, options considered, decision made, consequences
- Current highest: see `docs/adr/` for latest ADR number

## 6. Prohibited Without Explicit Approval

- Direct commits to `main` (except documentation fixes)
- `supabase db reset` on production
- Deletion of Supabase tables or columns without migration
- Changes to RLS policies without review
- Adding new third-party services without SUB-PROCESSORS.md update
