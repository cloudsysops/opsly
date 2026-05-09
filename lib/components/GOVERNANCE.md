# lib/components Governance

## Ownership

- **Owner:** Claude (AI agent)
- **Maintainers:** Frontend Engineering Team
- **Escalation:** Engineering Lead

## Component Standards

All components in `lib/components/` must:

1. **Be reusable** — Used by 2+ applications (portal, admin, local-services, etc.)
2. **Be accessible** — WCAG 2.1 AA compliant
3. **Be type-safe** — Full TypeScript props
4. **Be tested** — Unit + storybook coverage
5. **Be documented** — Clear README, props, examples

## Versioning

- Semantic versioning (MAJOR.MINOR.PATCH)
- New props: MINOR bump
- Breaking props: MAJOR bump

## Review Process

1. **Scope:** Changes to `lib/components/` or consuming apps
2. **Approvers:** 1 (Frontend Maintainer)
3. **Checks:**
   - ✅ Component appears in 2+ apps
   - ✅ TypeScript strict mode
   - ✅ Accessibility tests pass
   - ✅ Storybook story created
   - ✅ No console errors/warnings

## Adding New Components

1. Create component in `lib/components/ui/` or `lib/components/hooks/`
2. Add TypeScript types (no `any`)
3. Create storybook story in `.storybook/`
4. Add unit tests in `__tests__/`
5. Update `lib/components/index.ts` exports
6. Document in `README.md`

## Dependency Policy

### Allowed

- React, React-DOM
- Tailwind CSS (utilities only)
- @types/* packages

### Forbidden

- State management (Redux, Zustand) — use Context API
- Heavy dependencies (lodash, moment) — write minimal utilities
- Browser APIs without fallback (localStorage, fetch without wrapper)

## Accessibility Checklist

- [ ] Keyboard navigation (Tab, Enter, Escape)
- [ ] Screen reader labels (aria-label, aria-describedby)
- [ ] Color contrast (4.5:1 for text)
- [ ] Focus visible (outline, ring)
- [ ] Semantic HTML (button, form, label)

## Deprecation

1. Mark component as `@deprecated` in JSDoc
2. Provide replacement component
3. Minimum 2 minor releases before removal
4. Update all consuming code before removing

## See Also

- `README.md` — API documentation
- `.storybook/` — Storybook configuration
- `styles/tokens.ts` — Design tokens
