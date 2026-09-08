# Opsly Design System

Multi-tenant **enterprise SaaS** platform for autonomous-agent / IA automation stacks (n8n + Uptime Kuma + LLM Gateway) running behind Traefik on per-tenant Docker Compose isolation. Spanish-first product, "ops-room" hacker aesthetic in the admin surface, more restrained in the customer portal and the public marketing site.

## Source

- **Codebase:** GitHub `cloudsysops/opsly` @ `main` (branch `f930e93…` at time of capture)
- **Apps imported / referenced:**
  - `apps/admin` — internal control plane dashboard (Next.js + Tailwind + shadcn/ui-style primitives, "cyber" theme)
  - `apps/portal` — customer-facing tenant portal (Next.js + Tailwind, terminal-restrained)
  - `apps/web` — public marketing + checkout (Next.js + Tailwind, violet/indigo)

The reader is not assumed to have repo access — every value referenced here is reproduced in `colors_and_type.css` and the preview cards.

## Index

```
README.md                  This file. Brand, tone, visual foundations, iconography.
SKILL.md                   Agent Skills compatible front-matter + invocation rules.
colors_and_type.css        Foundation tokens (color, type, radii, shadow, motion).
fonts/                     Google-Fonts substitutes (see "Font substitution" caveat).
assets/                    Wordmarks, status motifs, background patterns.
preview/                   Small ~700×N HTML cards rendered in the Design System tab.
ui_kits/
  admin/                   "Ops console" cyberpunk dashboard kit (admin surface).
  portal/                  "Terminal" customer portal kit.
  web/                     "Marketing" violet/indigo landing kit.
```

---

## Brand at a glance

**Opsly** is a control plane for running IA automation stacks for SMBs — "deploy n8n + an LLM gateway in minutes, no DevOps". It speaks Spanish (LATAM/ES), is technical without being condescending, and trades on a confident "we run the boring infra so you don't have to" voice. Three surfaces, three aesthetics, one set of tokens:

| Surface          | Vibe                                            | Background       | Primary accent       |
| ---------------- | ----------------------------------------------- | ---------------- | -------------------- |
| **Admin**        | Cyberpunk ops-room, scanlines, neon glow        | `#0A0E27` deep navy | Cyan `#00FFFF`       |
| **Portal**       | Restrained terminal, mono-first, monochrome     | `#0A0A0A` near-black | Green `#22C55E`     |
| **Web**          | Modern SaaS marketing, soft purple gradient     | `#0A0A0A` near-black | Violet `#7C3AED`     |

What unifies them: a near-black canvas, mono numerics with `tabular-nums`, sharp small-radius components, color-band status badges (green/yellow/red/blue/gray), and Spanish copy with *ops* shorthand.

---

## Content fundamentals

The product is **bilingual but biased toward Spanish (es-LA)** — UI strings, marketing, and error messages are Spanish; technical labels and code identifiers stay English (`tenant`, `slug`, `workflow`, `webhook`, `LLM Gateway`).

### Voice & tone

- **Confident, infrastructural, slightly nerdy.** Talks about "control plane", "data plane", "tenants". Doesn't apologize for being technical, but doesn't show off either.
- **"Tú", not "usted".** Marketing addresses the reader directly: *"Despliega tu stack…"*, *"Sin configurar servidores."*
- **Short, declarative sentences.** Marketing leans on noun-verb-result: *"Deploy en minutos."* / *"IA con control de costos."* / *"Zero-Trust por diseño."*
- **Numbers earn their place.** Concrete deltas (*"Ahorra 3 semanas de configuración"*, *"SLA 99.5%"*, *"$49 / mes"*) over vague superlatives.

### Casing

- **Sentence case** for headings and buttons (*"Ver planes y precios →"*, *"Continuar al pago →"*).
- **UPPERCASE with wide tracking** (`tracking-[0.12em]` to `0.24em`) for tiny ops labels in the admin chrome (*"Plataforma · VPS, local…"*, sidebar `Admin` subtitle, KPI labels).
- **lowercase code-style** for status pills and tenant table columns (`active`, `provisioning`, `slug`, `created_at`).
- **Title Case** is rare; reserved for product names (*Mission Control*, *OpenClaw Governance*, *Agent Teams*).

### "I" vs "you"

- The product never says "I". Speaks as a system or a brand: *"Opsly gestiona la infraestructura"*, *"Estamos provisionando tu workspace"*.
- Customer is *"tú"* in marketing, *"el tenant / el cliente"* in admin internals.

### Emoji

- **Marketing site:** small set of symbolic emoji as feature icons — ⚡ 🧠 🔒 📊 💾 🔗. Only on the public landing's Features grid; not interactive UI.
- **Admin & Portal:** **no emoji.** Lucide icons only.
- **Status & checks:** ASCII glyphs are common — `✓`, `→`, `↑`, `▲`, `▼`, `·`, `—`. Avoid `:)` style emoji.

### Specific copy examples (verbatim, lifted from `apps/web/app/page.tsx`)

> "Automatización IA para tu empresa"
> "Despliega tu stack de agentes autónomos (n8n + IA) en minutos. Sin configurar servidores. Con backups, métricas y SLA garantizado."
> "Más popular" (plan badge)
> "Empezar ahora →" / "Contactar ventas" (CTAs)
> "$49 / mes" (price label — dollar, lowercase /mes, no space variants)
> "Sin costos ocultos. Cancela cuando quieras."

Internal admin examples:

> "Plataforma · VPS, local, orquestación y LLM"
> "Sin Prometheus · valores demo"
> "Actualizado 10/05/2026 14:32:01"
> "Tenants activos 7"

The middle-dot `·` is a brand quirk — it shows up everywhere as a soft separator instead of `|` or `–`.

---

## Visual foundations

### Color

A single token namespace, `--ops-*`, applied differently per surface. Status colors are shared across all surfaces.

| Token             | Hex        | Use                                                                |
| ----------------- | ---------- | ------------------------------------------------------------------ |
| `--ops-bg`        | `#0A0E27`* | Page background (admin); portal/web use `#0A0A0A`                  |
| `--ops-surface`   | `#101734`* | Cards & panels (admin); portal/web use `#111111`                   |
| `--ops-border`    | `#223064`* | Dividers (admin); portal uses `#1E1E1E`                            |
| `--ops-green`     | `#22C55E`  | Primary action (portal), success status, terminal caret            |
| `--ops-yellow`    | `#EAB308`  | Warning / "demo data" / provisioning                               |
| `--ops-red`       | `#EF4444`  | Destructive / failure / over-budget                                |
| `--ops-gray`      | `#94A3B8`  | Muted text, secondary chrome                                       |
| `--ops-blue`      | `#3388FF`  | Info / link / data viz                                             |
| `--ops-cyan`      | `#00FFFF`  | **Admin primary**, selection, holo accent                          |
| `--ops-magenta`   | `#FF00FF`  | Admin secondary highlight, breadcrumb separator                    |
| `--ops-purple`    | `#9D00FF`  | Admin tertiary glow                                                |
| `--ops-violet`    | `#7C3AED`  | **Web primary** (gradient with indigo)                             |
| `--ops-indigo`    | `#6366F1`  | Web gradient companion                                             |

`*` = admin-only deep-navy variant; portal/web stay neutral black.

### Typography

Three families, each used somewhere across the system:

Each surface uses a deliberately different sans:

| Surface     | Sans (UI / body)                       | Mono                  | Display              |
|-------------|----------------------------------------|------------------------|----------------------|
| **Admin**   | **Electrolize** — geometric, condensed, monoline (cyber feel) | **JetBrains Mono** | **Orbitron** — wordmark, KPI digital readouts, panel titles |
| **Portal**  | **Inter** — system-feel, neutral, dense and readable for tenant UI | **JetBrains Mono** | — (Orbitron only on the wordmark) |
| **Web**     | **Inter** — same as portal             | **JetBrains Mono** (only in code blocks / footer slugs) | — |

All three are loaded via `next/font/google` in the source `layout.tsx` files. The design system imports them from the Google Fonts CDN — same families, same weights.

**Token names:**
- `--font-display` → Orbitron
- `--font-sans-admin` → Electrolize (use on admin chrome)
- `--font-sans-portal` → Inter (use on portal chrome)
- `--font-sans-web` → Inter (alias of portal)
- `--font-mono` → JetBrains Mono
- `--font-sans` → alias for `--font-sans-portal` (default)

Web/portal also fall back to system sans (`var(--font-geist-sans)`, system-ui). On the **public web** the body sans defaults to system; only the wordmark uses the gradient text effect.

Type scale (admin reference, condensed):

| Role                    | Size / weight                | Notes                             |
| ----------------------- | ---------------------------- | --------------------------------- |
| Wordmark                | 18px / 600 / Orbitron        | tracking 0.16em                   |
| Section eyebrow         | 11–12px / 400 / mono UPPER   | tracking 0.12–0.24em, gray text   |
| Card title              | 14px / 600 / Orbitron        | tracking 0.12em, **cyan** in admin|
| KPI value               | 24–32px / 500 / mono         | `tabular-nums`                    |
| Body                    | 14px / 400 / Electrolize     | text-neutral-100                  |
| Status pill             | 12px / 500 / sans            | `lowercase`                       |
| Code / slug / log       | 12–13px / 400 / JetBrains    |                                   |
| Marketing H1            | 48–60px / 800 / system sans  | gradient on key word              |

### Backgrounds

- **Admin:** layered radial gradients (cyan, purple, magenta clouds) over deep navy + an animated `.cyber-grid-bg` (44px grid, 16s pan, scanline overlay).
- **Portal:** flat near-black, occasional 1px borders, no gradients in the chrome.
- **Web:** flat near-black with a single soft violet bloom under the hero (`bg-violet-600/10 blur-3xl`).
- No photographic imagery in the product; **no hand-drawn illustrations**; **no repeating raster textures**. Atmosphere is pure CSS.

### Animation & motion

- **Keyframes (admin):** `pulse-dot` 1.2s, `blink` 1s step, `scanline` 8s linear, `neon-flicker` 2.4s, `grid-pan` 16s linear.
- **Easing:** mostly `ease` / `ease-out` defaults; portal buttons use `ease-out 150ms`.
- **Hover (admin):** `cyber-hover` lifts 2px, swaps border to cyan, adds cyan box-shadow.
- **Hover (portal):** background tint shift only, no transform; or `-translate-y-px` on `elevated` cards.
- **Hover (web):** `-translate-y-1` on pricing cards, color shift on links.
- **Press (portal):** `active:scale-[0.99]` on default buttons, `0.98` on primary.
- **Press (admin):** none — buttons just darken.
- **Reduced motion:** all animations clamped to 0.01ms in `@media (prefers-reduced-motion: reduce)`.

### Borders, radii, shadow

| Surface | Default radius   | Notes                                                                      |
| ------- | ---------------- | -------------------------------------------------------------------------- |
| Admin   | `rounded` (4px)  | Buttons, inputs, badges. **`rounded-2xl`** (16px) for cards (with holo border). |
| Portal  | `rounded-sm` (2px) | Buttons, badges. **`rounded-xl`** (12px) for cards.                       |
| Web     | `rounded-lg` (8px) for buttons/inputs. **`rounded-2xl`** for `.ops-card`. |

Shadow systems:

- **Admin** uses `box-shadow` as **glow**: `0 0 18px rgba(157,0,255,0.18)` on cards, neon-cyan rings on focus, scaling up on hover. There's no traditional ambient shadow.
- **Portal** uses dim ambient shadow on `elevated` cards: `shadow-lg shadow-black/40`, hover `shadow-xl`.
- **Web** uses a single soft violet halo on the highlighted plan: `shadow-[0_0_40px_rgba(139,92,246,0.15)]`.

The signature admin treatment is **`.holo-border`**: a transparent border with a `linear-gradient(120deg, cyan, magenta, purple)` painted into it via two stacked `background:` layers (padding-box + border-box). Used on cards, the sidebar, and the topbar.

### Transparency & blur

- Sticky chrome uses backdrop-blur: admin topbar `bg-ops-bg/85 backdrop-blur`, portal header `backdrop-blur-md supports-[backdrop-filter]:bg-ops-bg/70`, web nav `bg-[#0a0a0a]/80 backdrop-blur-sm`.
- **Hover-tinted backgrounds** are always low-alpha against the dark canvas (e.g. `bg-ops-cyan/10`, `bg-ops-green/15`) — this is the dominant fill pattern instead of solid swatches.

### Layout rules

- **Admin:** fixed 240px sidebar (`holo-border neon-glow`), main column `ml-[240px]`, content padded `p-6`. Sticky topbar at `top-0 z-30`, mt-4 with horizontal margin so the holo border breathes.
- **Portal:** centered max-w-5xl, sticky header, sm/lg breakpoints at 640/1024.
- **Web:** centered max-w-6xl for grids, max-w-5xl for hero, fixed top nav `h-16`.
- All three: vertical rhythm in 4px multiples; chrome on dark, content also on dark — depth comes from borders, not from card-on-page contrast.

### Color vibe of imagery

There is **no imagery** in the product proper. Synthetic data viz uses ops-green / ops-yellow / ops-red gauges (see `CpuGauge` traffic-light thresholds at <60 / <85 / >=85), and the b/w of the chrome is uninterrupted by photography.

If imagery is ever introduced, the system bias is **cool, high-contrast, monochromatic with a single accent** — never warm, never grainy, never illustrative.

### Cards

- **Admin card:** `rounded-2xl`, `holo-border`, `bg-ops-surface/85` (translucent), `shadow-[0_0_18px_rgba(157,0,255,0.18)]`, `cyber-hover` (lift + cyan glow). Header has `border-b border-ops-border/70 p-3`, title is uppercase Orbitron in cyan.
- **Portal card:** `rounded-xl border border-ops-border bg-ops-surface`. Three variants: `default`, `elevated` (shadow + hover lift), `bordered` (2px green border for emphasis). Title is sans-semibold neutral-100.
- **Web card (`.ops-card`):** `bg-[#111] border border-white/10 rounded-2xl`. Highlighted pricing card adds `border-violet-500/60 shadow-[0_0_40px_rgba(139,92,246,0.15)]`.

---

## Iconography

**Lucide React** is the canonical icon set across `apps/admin` and `apps/portal`. Used at `h-4 w-4` for nav, `h-3 w-3` for inline link affordances. Stroke style; no fill. Active nav icons get `animate-neon-flicker` in the admin.

Icons referenced by name in the codebase (sidebar): `LayoutDashboard`, `Boxes`, `Server`, `Mail`, `BarChart3`, `Network`, `Activity`, `LayoutGrid`, `Gavel`, `CircleDollarSign`, `BookOpen`, `MessageSquare`, `ShieldCheck`, `ShieldAlert`, `Settings`, plus `ChevronDown`, `ChevronRight`, `ExternalLink` in tables.

Because Lucide is **CDN-available**, the design system links it from `https://unpkg.com/lucide@latest` rather than vendoring SVGs. (Substitution flag: when working on production code, use the npm package `lucide-react` to match the source.)

**Emoji** are used **only** on the public marketing site, in the Features grid: ⚡ 🧠 🔒 📊 💾 🔗. They're treated as decorative glyphs at 30px, not as a UI affordance.

**Unicode glyphs** that act as icons: `→` (CTAs and breadcrumbs), `·` (mid-dot separator everywhere), `✕` (modal close), `✓` (feature list checkmark in violet on web), `▲` `▼` (KPI trend arrows), `↑` `↓` (portal KPI trend arrows). These are first-class design elements — prefer them over importing a Lucide icon for the same job at small sizes.

**No custom SVG illustrations exist in the repo.** All atmosphere comes from CSS effects (grid, scanline, glow, holo-border). When adding imagery to a design, copy a real photo or screenshot — do **not** hand-draw an SVG.

### Available assets in this design system

- `assets/opsly-wordmark.svg` — recreated wordmark (Orbitron-style, cyan→magenta gradient). Used as the project mark.
- `assets/opsly-wordmark-mono.svg` — single-color (currentColor) variant.
- `assets/grid-pattern.svg` — the 44px cyber grid as a tileable SVG.
- `assets/holo-gradient.svg` — the holo border gradient as a standalone strip.

---

## Font substitution

**Source uses Google Fonts** (`Orbitron`, `Electrolize`, `JetBrains Mono`) loaded via `next/font/google`. The design system imports them from the same Google Fonts CDN — **no substitutions needed**, but the font files are not vendored locally. If working offline, drop the `.woff2` files into `fonts/` and update the `@font-face` declarations in `colors_and_type.css`. **Flagged for the user:** confirm whether you want fonts vendored in or CDN-loaded.

---

## Caveats & open questions

- The repo has no canonical logo file — the wordmark in this kit is **recreated** from the gradient text used in source (`bg-gradient-to-r from-violet-400 to-indigo-400`). If you have an official Opsly mark, drop it in `assets/` and update the `<img>` references.
- Spanish copy is preserved verbatim from the source for authenticity. If the brand expands to additional locales the type system still applies.
- The admin "cyber" theme is heavy. The UI kit honors it but production usage should consider a `prefers-reduced-motion` story (already partially implemented in source).
