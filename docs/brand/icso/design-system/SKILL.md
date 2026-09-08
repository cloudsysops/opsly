---
name: opsly-design-system
description: Design system for Opsly — multi-tenant SaaS control plane for IA automation stacks. Three surfaces (cyber admin / terminal portal / marketing web) over one Spanish-first dark token set.
---

# Opsly Design System — Skill

## When to invoke

Use this design system whenever you are designing **for the Opsly product** — its admin control plane, customer portal, public marketing site, internal docs, sales decks, status pages, or any artifact whose audience already recognizes the brand. If the user mentions *Opsly*, *cloudsysops*, *n8n stack*, *LLM gateway*, *control plane*, or asks for "the dashboard / portal / pricing page" without further qualifier, this is the canonical kit.

Do **not** use this system for unrelated projects, or for projects where the user has explicitly asked for a different brand. Don't apply it as a generic "ops dashboard" template — the cyber treatment is opinionated and Spanish-first.

## How to use

1. **Read `README.md` first.** It documents brand voice, copy conventions, color tokens, type, motion, and iconography. Every claim about which color/font/radius applies where lives there.
2. **Pick the surface.** The same `--ops-*` token set is applied differently on each:
   - `apps/admin` → `--ops-admin-bg/-surface/-border` + cyan/magenta/purple glow + `holo-border` + `cyber-grid-bg`. Headers in **Orbitron** uppercase cyan, body in **Electrolize**.
   - `apps/portal` → `--ops-bg/-surface/-border` (near-black) + ops-green primary, no glow, no scanlines. Headers in system sans semibold, mono-first numerics.
   - `apps/web` → near-black canvas + **violet (#7C3AED) → indigo** gradient on the hero word; rounded-2xl cards with a single soft violet halo on the highlighted plan.
3. **Link or inline `colors_and_type.css`.** It declares the full token set + type presets (`.ops-wordmark`, `.ops-h1`, `.ops-eyebrow`, `.ops-kpi-value`, etc.) + utility classes (`.holo-border`, `.neon-glow`, `.cyber-grid-bg`, animation keyframes, reduced-motion override).
4. **Pick a UI kit as a reference**, not a copy:
   - `ui_kits/admin/dashboard.html` — full cyber dashboard pattern.
   - `ui_kits/portal/dashboard.html` — restrained customer portal.
   - `ui_kits/web/landing.html` — marketing hero / pricing.
5. **Use Lucide for icons** (`https://unpkg.com/lucide@latest`) at 16–20px stroke 1.5–1.6. The marketing site is the only place emoji are allowed (feature grid only).
6. **Write Spanish copy.** Sentence case headings/buttons; UPPERCASE wide-tracked mono for tiny ops labels; lowercase mono-style for status pills (`active`, `provisioning`, `failed`); the middle-dot `·` is the brand separator. See README "Specific copy examples" for verbatim source strings.

## Don't

- Don't mix surface treatments on one page (no cyan glow on a portal screen, no green primary on a marketing CTA — use violet).
- Don't introduce new accent colors. The neon palette (cyan/magenta/purple) is **admin-only**; the violet/indigo gradient is **web-only**; status colors (green/yellow/red/blue/gray) are shared.
- Don't add filler illustrations. Atmosphere comes from CSS (grid, scanline, holo, glow). No hand-drawn SVGs, no photography unless the user provides real assets.
- Don't drop the cyber chrome wholesale onto a customer-facing surface — the portal is intentionally restrained because tenants live there.
- Don't rebrand to English by default. The product is Spanish-first; switch only on explicit request.

## Files

- `README.md` — full brand & visual spec
- `colors_and_type.css` — tokens + presets + utilities
- `assets/` — wordmark (gradient + mono), grid pattern, holo gradient strip
- `preview/` — reviewable design-system cards (colors, type, components, brand)
- `ui_kits/admin/dashboard.html` — admin reference layout
- `ui_kits/portal/dashboard.html` — portal reference layout
- `ui_kits/web/landing.html` — marketing reference layout
- `index.html` — entry point linking everything above
