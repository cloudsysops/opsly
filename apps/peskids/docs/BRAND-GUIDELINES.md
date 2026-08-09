# 🎨 Guía de Marca Peskids

**Versión:** 2.0
**Última actualización:** 2026-08-05
**Propósito:** Asegurar consistencia visual en todas las páginas, componentes y mensajes de Peskids.

---

## 🎯 Identidad Visual

### Colores Oficiales

| Nombre | Hex | Tailwind | Uso |
|--------|-----|----------|-----|
| **Teal Primario** | #2DB7B0 | `pk-primary` | CTA, accents, hover states |
| **Deep Blue** | #0D4C63 | `pk-deep` / `pk-ink` | Headers, backgrounds, text |
| **Orange Accent** | #FF5A1F | `pk-accent` | Alerts, energy, secondary CTA |
| **Yellow Warning** | #FFC20E | `pk-sun` | Warnings, highlights |
| **Light Teal** | #A8DDE3 | Secondary accent | Soft backgrounds |
| **White** | #FFFFFF | `pk-surface` | Cards, surfaces |
| **Light Background** | #F7FBFD | `pk-snow` | Page backgrounds |
| **Gray (Borders)** | #E4ECF0 | `pk-border` | Dividers, subtle borders |

### Tipografía

```
Font: Nunito (sans-serif)
  - H1: 2.5rem / 700 bold
  - H2: 2rem / 700 bold
  - H3: 1.5rem / 600 semibold
  - Body: 1rem / 400 regular
  - Small: 0.875rem / 400 regular

Accent Font: Brush (cursive)
  - Used in logo and special emphasis
```

### Border Radius

```
Standard: 1.25rem (pk)
Large: 2rem (pk-lg)
```

---

## 📋 Implementación en Tailwind

### ✅ CORRECTO — Uso de tokens de marca:

```tsx
// Color primario
<button className="bg-pk-primary text-white hover:opacity-90">
  Enviar
</button>

// Background con marca
<div className="bg-pk-snow text-pk-ink p-6 rounded-pk">
  Contenido
</div>

// Header dark
<header className="bg-pk-deep text-white border-b border-pk-border">
  Navigation
</header>

// Border y dividers
<div className="border-b border-pk-border/50">
  Section
</div>
```

### ❌ INCORRECTO — Evitar colores genéricos:

```tsx
// ❌ NO HACER:
<button className="bg-blue-500">Click me</button>
<div className="bg-red-50 text-red-700">Error</div>
<p className="text-gray-600">Text</p>

// ✅ HACER:
<button className="bg-pk-primary">Click me</button>
<div className="bg-pk-bg text-pk-mutedText">Message</div>
<p className="text-pk-mutedText">Text</p>
```

---

## 🎨 Patrón de Colores por Componente

### Botones

**Primario (CTA):**
```tsx
className="bg-pk-primary text-white hover:opacity-90 rounded-pk"
```

**Secundario:**
```tsx
className="border border-pk-primary text-pk-primary bg-white hover:bg-pk-bg"
```

**Accent (WhatsApp/Action):**
```tsx
className="bg-[#25D366] text-white hover:opacity-90"
```

### Cards & Surfaces

```tsx
className="bg-pk-surface border border-pk-border/30 rounded-pk shadow-card"
```

### Backgrounds

- **Page Default:** `bg-pk-snow`
- **Header/Dark:** `bg-pk-deep`
- **Hover/Focus:** `bg-pk-bg`
- **Muted:** `bg-pk-muted`

### Text

- **Primary Text:** `text-pk-ink`
- **Secondary Text:** `text-pk-mutedText`
- **Light Text on Dark:** `text-white`
- **Accent Text:** `text-pk-primary`

---

## 📱 Aplicación en Páginas Clave

### Landing Page (/)
- Hero: `bg-pk-deep` text-white
- Buttons: `bg-pk-primary` / `bg-white text-pk-deep`
- Logo: PeskidsLockup component

### Formularios (/instagram, /forms/*)
- Background: `bg-pk-snow`
- Cards: `bg-pk-surface border-pk-border`
- Buttons: `bg-pk-primary text-white`
- Progress: Use `pk-primary` for progress bars
- Success: Green (`pk-success`) + `pk-primary` accents

### Admin Dashboard
- Sidebar: `bg-pk-deep text-white`
- Cards: `bg-pk-surface` with `border-pk-border`
- Metrics: Use `pk-primary`, `pk-accent`, `pk-sun` for different metrics
- Status: Green (success), Orange (warning), Red (danger)

### Messages (WhatsApp/Email)
- Logo: Use Peskids brand lockup at top
- Primary CTA: Teal (#2DB7B0)
- Text: Dark blue (#0D4C63)
- Footer: Include Instagram link (@peskidsnatación)

---

## 🚫 Colores NO Permitidos en UI

Evita estos colores genéricos de Tailwind; usa equivalentes de marca:

| Evitar | Usar |
|--------|------|
| `bg-blue-*` | `bg-pk-primary`, `bg-pk-deep` |
| `bg-red-*` | `bg-red-50/20` (errors only) |
| `bg-gray-*` | `bg-pk-muted`, `bg-pk-border` |
| `text-blue-*` | `text-pk-ink`, `text-pk-primary` |
| `border-gray-*` | `border-pk-border` |
| `border-blue-*` | `border-pk-primary`, `border-pk-deep` |

---

## ✅ Checklist para Nuevos Componentes

Antes de mergear un componente:

- [ ] Todos los backgrounds usan `pk-*` colors
- [ ] Todo el texto usa `pk-*` o predefinido de marca
- [ ] Borders usan `border-pk-border` o `border-pk-border/50`
- [ ] CTAs primarias usan `bg-pk-primary`
- [ ] Hover states son claros (`opacity-90`, `bg-opacity-95`)
- [ ] No hay colores hardcoded (#fff, #000, etc.) excepto en gradientes especiales
- [ ] El componente se ve bien en light y dark themes
- [ ] Logo/marca visible en encabezados y footers

---

## 🔗 Referencias

- **Logo & Brand Assets:** `/public/brand/`
- **Color Tokens:** `lib/tokens.ts`
- **Brand Config:** `lib/brand.ts`
- **Tailwind Config:** `tailwind.config.ts`
- **Design System:** Figma (Napkin - Design Pack Peskids v2)

---

## 📞 Soporte

Para preguntas sobre marca:
1. Consultar este documento
2. Revisar `lib/tokens.ts` para valores exactos
3. Preguntar al equipo de Peskids

---

**Última revisión:** 2026-08-05
**Próxima revisión:** Después de cambios de marca en redes sociales
