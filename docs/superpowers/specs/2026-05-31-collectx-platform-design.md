# CollectX — Plataforma Integrada de Coleccionables + Predicciones

**Fecha:** 2026-05-31  
**Estado:** Aprobado para implementación  
**Tenant:** `collectx` (nuevo en Opsly Incubator)  
**URL destino:** `collectx.op-sly.com` → dominio propio futuro

---

## Contexto

Panini Lab demostró que combinar coleccionables + predicciones deportivas + Polymarket es un producto viable. CollectX es la evolución: un **marketplace C2C multi-deporte, multi-categoría** para LatAm en USD, con predicciones de jugadores en cada listing y generación automática de video (MoneyPrinterTurbo).

**Principio central — no duplicar, integrar:**
- El motor de predicciones (`lib/predictions/`) construido en panini-lab se importa directamente.
- El sidecar de Polymarket (`apps/polymarket-agent`) escribe en el mismo schema de Supabase que lee CollectX.
- MoneyPrinterTurbo corre como servicio compartido en el VPS, llamado vía n8n.
- Auth, Stripe, Resend, OpenWA — todos reutilizados desde los patrones existentes de Opsly.

---

## Coleccionables cubiertos

`sticker | card | memorabilia | apparel | watch | sneaker | vehicle | other`  
Deportes: `football | basketball | baseball | f1 | tennis | general`  
Marcas: Panini, Topps, Nike, Rolex, Funko, y cualquier objeto físico coleccionable/vintage.

---

## Arquitectura

```
apps/collectx/              ← ÚNICO app nuevo (Next.js 15)
  app/
    (marketplace)/
      page.tsx              ← Home: featured + búsqueda
      browse/               ← Catálogo filtrable
      browse/[category]/    ← Por categoría
      listing/[id]/         ← Detalle + compra + predicciones + video
      sell/                 ← Wizard de publicación (4 pasos)
      profile/[username]/   ← Perfil público
      dashboard/            ← Mi cuenta (ventas, wallet, colección)
      messages/             ← Chat C2C
    api/
      listings/             ← CRUD listings
      offers/               ← Ofertas / contra-ofertas
      transactions/         ← Stripe checkout + capture
      reviews/              ← Post-transacción
      search/               ← Full-text + filtros
      webhooks/stripe/      ← Connect events
  lib/
    data/
      listings.ts           ← repo listings (patrón paniniDb)
      items.ts              ← catálogo de items
      transactions.ts       ← pagos y escrow
      users.ts              ← perfiles + reputación
    payments/
      stripe-connect.ts     ← Connect Standard + escrow
    search/
      index.ts              ← Postgres tsvector
    predictions/            ← IMPORTA de apps/panini-lab/lib/predictions/
    polymarket/             ← IMPORTA de apps/panini-lab/lib/polymarket/
    notifications/
      email.ts              ← Resend (reutiliza patrón Opsly)
      whatsapp.ts           ← OpenWA (reutiliza patrón Opsly)

apps/polymarket-agent/      ← Python sidecar ya construido
  main.py                   ← WebSocket Polymarket → Supabase
  (escribe en collectx.polymarket_markets — mismo schema)

infra/
  docker-compose.moneyprinter.yml   ← MoneyPrinterTurbo (servicio compartido VPS)
  docker-compose.collectx.yml       ← CollectX app

.n8n/1-workflows/collectx/
  generate-listing-video.json       ← listing → MoneyPrinterTurbo → video URL
  weekly-predictions-recap.json     ← cron lunes → video resumen predicciones
```

**No se crean:** módulos nuevos de predicciones, nuevo cliente Supabase, nuevo auth, nueva lógica de Stripe — todo se importa/reutiliza.

---

## Modelo de datos — schema `collectx.*`

```sql
-- Catálogo de items (admin-seeded + user-created)
collectx.items (
  id uuid PK,
  name text NOT NULL,
  slug text UNIQUE,
  category text,           -- sticker|card|memorabilia|apparel|watch|sneaker|vehicle|other
  sport text,              -- football|basketball|baseball|f1|tennis|general|none
  player_name text,        -- vincula con panini-lab predictions
  team_name text,
  year integer,
  brand text,              -- Panini, Topps, Nike, Rolex...
  edition text,
  reference_price_usd numeric,   -- precio de referencia mercado
  psa_grade integer,             -- nullable, solo cards
  created_at timestamptz
)

-- Listings activos y vendidos
collectx.listings (
  id uuid PK,
  item_id uuid → items,
  seller_id uuid → auth.users,
  price_usd numeric NOT NULL,
  condition text,           -- mint|near_mint|excellent|good|poor
  type text,                -- fixed|offer|trade|want
  photos text[],            -- Supabase Storage URLs (max 10)
  description text,
  ships_from text,          -- ISO country code
  status text,              -- active|reserved|sold|expired
  search_vector tsvector GENERATED,  -- full-text index
  video_url text,           -- MoneyPrinterTurbo output (nullable)
  views integer DEFAULT 0,
  saves integer DEFAULT 0,
  created_at timestamptz,
  sold_at timestamptz
)

-- Ofertas y contra-ofertas
collectx.offers (
  id uuid PK,
  listing_id uuid → listings,
  buyer_id uuid → auth.users,
  amount_usd numeric,
  message text,
  status text,              -- pending|accepted|rejected|countered|expired
  counter_amount_usd numeric,
  expires_at timestamptz
)

-- Transacciones completadas
collectx.transactions (
  id uuid PK,
  listing_id uuid → listings,
  buyer_id uuid, seller_id uuid,
  final_price_usd numeric,
  platform_fee_usd numeric,   -- 5%
  stripe_payment_intent_id text,
  stripe_transfer_id text,
  status text,  -- pending|paid|shipped|delivered|disputed|refunded
  shipped_at timestamptz, delivered_at timestamptz
)

-- Reputación post-transacción
collectx.reviews (
  id uuid PK,
  transaction_id uuid → transactions,
  reviewer_id uuid, reviewed_id uuid,
  role text,       -- buyer|seller
  rating integer,  -- 1-5
  comment text
)

-- Perfiles de usuario (extiende auth.users)
collectx.user_profiles (
  id uuid PK → auth.users,
  username text UNIQUE,
  display_name text,
  bio text,
  location text,
  verified boolean DEFAULT false,
  seller_rating numeric,   -- promedio reviews como vendedor
  buyer_rating numeric,
  total_sales integer DEFAULT 0,
  total_purchases integer DEFAULT 0,
  stripe_account_id text,  -- Connect Standard
  stripe_customer_id text,
  member_since timestamptz
)

-- Mensajes entre comprador y vendedor por listing
collectx.messages (
  id uuid PK,
  listing_id uuid → listings,
  sender_id uuid, receiver_id uuid,
  body text,
  read boolean DEFAULT false,
  created_at timestamptz
)

-- Colección personal (items que tengo, no vendo)
collectx.collection (
  id uuid PK,
  user_id uuid → auth.users,
  item_id uuid → items,
  condition text,
  notes text,
  acquired_at timestamptz
)
```

**Índices críticos:**
```sql
CREATE INDEX idx_listings_search ON collectx.listings USING GIN(search_vector);
CREATE INDEX idx_listings_status  ON collectx.listings(status, created_at DESC);
CREATE INDEX idx_listings_seller  ON collectx.listings(seller_id, status);
CREATE INDEX idx_messages_listing ON collectx.messages(listing_id, created_at);
```

---

## Flujos principales

### Compra
```
Browse → Listing Detail → [Comprar / Hacer oferta]
  → Stripe Checkout (escrow, capture_method: manual)
  → Vendedor confirma envío → Comprador confirma recepción (o 7 días)
  → Capture $5 fee → Transfer $95 al vendedor → Reviews habilitadas (48h)
```

### Publicar listing (wizard 4 pasos)
```
1. Categoría + deporte
2. Buscar en catálogo (existente) o crear item nuevo
3. Fotos (hasta 10) + condición
4. Precio + tipo (fijo/oferta/trade) + descripción + país
→ Listing activo → n8n trigger → MoneyPrinterTurbo genera video (async, ~2 min)
```

### Predicciones en listing detail
Si `listing.item.player_name` está en la DB de predicciones de panini-lab:
```typescript
// En listing/[id]/page.tsx
import { predictPlayerProps } from '@/lib/predictions/player-model'  // ← importado de panini-lab
import { getTopValueSignals } from '@/lib/data/repos'                 // ← mismo repo

const pred = await predictPlayerProps(player)
// → muestra prob gol, asistencia, edge vs Polymarket directamente en el listing
```

---

## Pagos — Stripe Connect Standard

- Vendedor se registra → `/dashboard/wallet/setup` → redirect a Stripe Connect onboarding
- `payment_intent` con `capture_method: manual` (escrow)
- Capture solo cuando comprador confirma o expiran 7 días
- Fee: 5% para CollectX, 95% para vendedor
- Disputas: stripe.refund() como último recurso tras mediación manual

---

## Notificaciones

| Evento | Resend (email) | OpenWA (WhatsApp) |
|--------|---------------|-------------------|
| Oferta recibida | ✅ | ✅ |
| Oferta aceptada | ✅ | ✅ |
| Pago confirmado | ✅ | ✅ |
| Nuevo mensaje | — | ✅ |
| Saldo disponible | ✅ | — |

WhatsApp = canal primario LatAm. Ambos reutilizan clientes Opsly existentes.

---

## MoneyPrinterTurbo — integración

Servicio compartido en VPS (`infra/docker-compose.moneyprinter.yml`), red `infra_internal`.

**Config:** apunta al LLM Gateway de Opsly (no API keys nuevas para LLM).

**n8n workflow `generate-listing-video`:**
```
Webhook (listing_id) → build script → POST moneyprinter:8080/api/v1/videos
  → video listo → UPDATE collectx.listings SET video_url = ? WHERE id = ?
  → disponible en listing detail como sección "▶ Ver video"
```

**n8n workflow `weekly-predictions-recap`:**
```
Cron lunes 9am → leer top 5 value_signals (edge > 8pp)
  → POST moneyprinter → video de predicciones de la semana
  → publicar en redes sociales del tenant
```

---

## Moderación (v1)

Flags automáticos al publicar:
- Precio < 20% del `reference_price_usd` → flag revisión
- Palabras prohibidas en descripción → flag
- Vendedor nuevo (<3 ventas) + item > $200 → revisión manual

Queue en `collectx.moderation_queue` → admin dashboard (Opsly admin app ya existe).

---

## SEO

Listings = páginas server-rendered con metadata dinámica:
```typescript
export async function generateMetadata({ params }) → {
  title: `${item.name} — $${price} USD | CollectX`,
  description: listing.description.slice(0, 160),
  openGraph: { images: [photos[0]] }
}
```

---

## Stack y reutilización

| Necesidad | Solución | Origen |
|-----------|----------|--------|
| Auth | NextAuth + Supabase | Portal pattern |
| Pagos | Stripe Connect | billing-service pattern |
| Email | Resend | Opsly shared |
| WhatsApp | OpenWA | panini-lab pattern |
| Predicciones | `lib/predictions/*` | panini-lab (import directo) |
| Polymarket data | `apps/polymarket-agent` | Ya construido |
| Video | MoneyPrinterTurbo | Servicio VPS compartido |
| DB | Supabase `collectx.*` | Nuevo schema |
| Deploy | Docker + Traefik + GHCR | Mismo CI/CD |

---

## Sprints de implementación

**Sprint 1 — Marketplace base** (2 semanas)
- `apps/collectx` setup + auth + Supabase schema + Stripe Connect
- Browse / Listing detail / Wizard de venta / Pagos

**Sprint 2 — Social + contenido** (1 semana)
- Mensajes C2C + Notificaciones (email + WhatsApp)
- MoneyPrinterTurbo integration (n8n workflows)

**Sprint 3 — Predicciones integradas** (1 semana)
- Predictions bridge en listing detail (importar de panini-lab)
- Value bets Polymarket en listing (leer polymarket-agent data)

**Sprint 4 — Pulido** (1 semana)
- SEO + metadata + Open Graph
- Moderación + reportes
- Reputación + reviews
- Performance + caching

---

## Verificación

- `npm run type-check` en `apps/collectx` → 0 errores
- `npm run test` → tests unitarios de repos + modelos
- Listing E2E: publicar → comprar → confirmar → review
- Stripe webhook: `payment_intent.succeeded` → escrow → transfer
- Predicción en listing: item con `player_name` → muestra prob gol
- Video: publicar listing → 2 min → `video_url` en DB → visible en UI
- Geo-gate: IP US + CTA Polymarket → bloqueado (HTTP 451)
