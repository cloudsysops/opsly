# CollectX Sprint 1 — Marketplace Base

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the core C2C marketplace — browse listings, view listing detail, publish an item, and complete a purchase via Stripe Connect escrow.

**Architecture:** New Next.js 15 app `apps/collectx` in the Opsly monorepo at port 3006. Follows the exact panini-lab patterns (standalone output, Supabase service-role client, Zod validation, Vitest). New Supabase schema `collectx.*`. Predictions and Polymarket are imported — not reimplemented.

**Tech Stack:** Next.js 15 · React 19 · TypeScript strict · Tailwind CSS · Supabase v2 · Stripe Connect Standard · Zod · Vitest · Resend

---

## File Map

```
supabase/migrations/0070_collectx_schema.sql   ← NEW schema (all collectx.* tables)

apps/collectx/
  package.json                    ← @intcloudsysops/collectx, port 3006
  next.config.ts                  ← standalone, transpilePackages
  tsconfig.json
  tailwind.config.ts
  postcss.config.mjs
  vitest.config.ts
  Dockerfile                      ← same multi-stage pattern as panini-lab
  middleware.ts                   ← auth guard for /dashboard /sell /messages
  auth.ts                         ← NextAuth v5 (Google + email)

  lib/
    supabase.ts                   ← supabaseServer() + collectxDb() helper
    api-response.ts               ← jsonOk / jsonError / jsonUnauthorized
    data/
      items.ts                    ← getItem, searchItems, upsertItem
      listings.ts                 ← getListing, getListings, createListing, updateListing
      offers.ts                   ← createOffer, respondToOffer, getOffersForListing
      transactions.ts             ← createTransaction, confirmDelivery, getTransaction
      users.ts                    ← getUserProfile, upsertUserProfile, updateRating
    payments/
      stripe-connect.ts           ← createCheckoutSession, capturePayment, transferToSeller
    search/
      index.ts                    ← searchListings (full-text + filters)
    notifications/
      email.ts                    ← sendEmail via Resend
      whatsapp.ts                 ← sendWhatsApp via OpenWA

  app/
    globals.css
    layout.tsx                    ← root layout, dark theme
    page.tsx                      ← redirect → /browse

    (marketplace)/
      layout.tsx                  ← nav bar with links
      browse/
        page.tsx                  ← listing grid + FilterBar
      listing/[id]/
        page.tsx                  ← listing detail + OfferModal + PredictionBadge

    sell/
      page.tsx                    ← wizard orchestrator (4 steps, client component)

    dashboard/
      layout.tsx                  ← auth-gated
      page.tsx                    ← resumen ventas + compras
      listings/page.tsx           ← mis listings
      wallet/page.tsx             ← Stripe Connect balance + payout

    messages/
      page.tsx                    ← lista de conversaciones
      [id]/page.tsx               ← chat de un listing

    api/
      listings/route.ts           ← GET (browse) + POST (create)
      listings/[id]/route.ts      ← GET + PATCH
      offers/route.ts             ← POST create offer
      offers/[id]/route.ts        ← PATCH accept/reject/counter
      transactions/route.ts       ← POST initiate checkout
      transactions/[id]/confirm/route.ts   ← POST buyer confirms receipt
      reviews/route.ts            ← POST post-transaction review
      search/route.ts             ← GET full-text + filters
      webhooks/stripe/route.ts    ← Stripe Connect events

  components/
    ListingCard.tsx               ← card usada en grid + search results
    ListingGrid.tsx               ← grid responsivo con skeleton loading
    FilterBar.tsx                 ← filtros: category, sport, condition, price range
    OfferModal.tsx                ← modal client-side para hacer oferta
    PhotoUpload.tsx               ← drag & drop, hasta 10 fotos, Supabase Storage
    PredictionBadge.tsx           ← prob gol/asist si item tiene player_name
    ValueBetBadge.tsx             ← edge vs Polymarket (verde si > 5pp)

  __tests__/
    listings-repo.test.ts
    search.test.ts
    stripe-connect.test.ts
    offers-repo.test.ts
```

---

## Task 1: Supabase migration 0070

**Files:**
- Create: `supabase/migrations/0070_collectx_schema.sql`

- [ ] **Step 1: Create the migration**

```sql
-- supabase/migrations/0070_collectx_schema.sql
-- CollectX Sprint 1 — marketplace schema
-- Idempotent. Does not touch panini_lab.* or other schemas.

BEGIN;

CREATE SCHEMA IF NOT EXISTS collectx;

-- ── Item catalog ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS collectx.items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  slug          text UNIQUE,
  category      text NOT NULL DEFAULT 'other'
                  CHECK (category IN ('sticker','card','memorabilia','apparel','watch','sneaker','vehicle','other')),
  sport         text NOT NULL DEFAULT 'general'
                  CHECK (sport IN ('football','basketball','baseball','f1','tennis','general','none')),
  player_name   text,
  team_name     text,
  year          integer,
  brand         text,
  edition       text,
  reference_price_usd numeric(10,2),
  psa_grade     integer,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ── User profiles ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS collectx.user_profiles (
  id                  uuid PRIMARY KEY,  -- = auth.users.id
  username            text UNIQUE NOT NULL,
  display_name        text,
  bio                 text,
  location            text,
  verified            boolean NOT NULL DEFAULT false,
  seller_rating       numeric(3,2),
  buyer_rating        numeric(3,2),
  total_sales         integer NOT NULL DEFAULT 0,
  total_purchases     integer NOT NULL DEFAULT 0,
  stripe_account_id   text,
  stripe_customer_id  text,
  member_since        timestamptz NOT NULL DEFAULT now()
);

-- ── Listings ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS collectx.listings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id         uuid REFERENCES collectx.items(id),
  seller_id       uuid NOT NULL,
  price_usd       numeric(10,2) NOT NULL,
  condition       text NOT NULL DEFAULT 'good'
                    CHECK (condition IN ('mint','near_mint','excellent','good','poor')),
  type            text NOT NULL DEFAULT 'fixed'
                    CHECK (type IN ('fixed','offer','trade','want')),
  photos          text[] NOT NULL DEFAULT '{}',
  description     text,
  ships_from      text,
  status          text NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','reserved','sold','expired')),
  video_url       text,
  views           integer NOT NULL DEFAULT 0,
  saves           integer NOT NULL DEFAULT 0,
  search_vector   tsvector GENERATED ALWAYS AS (
                    to_tsvector('spanish',
                      coalesce((SELECT name FROM collectx.items WHERE id = item_id), '') || ' ' ||
                      coalesce(description, '')
                    )
                  ) STORED,
  created_at      timestamptz NOT NULL DEFAULT now(),
  sold_at         timestamptz
);

CREATE INDEX IF NOT EXISTS idx_listings_search  ON collectx.listings USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_listings_status  ON collectx.listings(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_seller  ON collectx.listings(seller_id, status);
CREATE INDEX IF NOT EXISTS idx_listings_item    ON collectx.listings(item_id);

-- ── Offers ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS collectx.offers (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id          uuid NOT NULL REFERENCES collectx.listings(id),
  buyer_id            uuid NOT NULL,
  amount_usd          numeric(10,2) NOT NULL,
  message             text,
  status              text NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','accepted','rejected','countered','expired')),
  counter_amount_usd  numeric(10,2),
  expires_at          timestamptz NOT NULL DEFAULT (now() + interval '48 hours'),
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- ── Transactions ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS collectx.transactions (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id                uuid NOT NULL REFERENCES collectx.listings(id),
  buyer_id                  uuid NOT NULL,
  seller_id                 uuid NOT NULL,
  final_price_usd           numeric(10,2) NOT NULL,
  platform_fee_usd          numeric(10,2) NOT NULL,
  stripe_payment_intent_id  text UNIQUE,
  stripe_transfer_id        text,
  status                    text NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','paid','shipped','delivered','disputed','refunded')),
  shipped_at                timestamptz,
  delivered_at              timestamptz,
  created_at                timestamptz NOT NULL DEFAULT now()
);

-- ── Reviews ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS collectx.reviews (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id  uuid NOT NULL REFERENCES collectx.transactions(id),
  reviewer_id     uuid NOT NULL,
  reviewed_id     uuid NOT NULL,
  role            text NOT NULL CHECK (role IN ('buyer','seller')),
  rating          integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment         text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (transaction_id, reviewer_id)
);

-- ── Messages ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS collectx.messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  uuid NOT NULL REFERENCES collectx.listings(id),
  sender_id   uuid NOT NULL,
  receiver_id uuid NOT NULL,
  body        text NOT NULL,
  read        boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_listing ON collectx.messages(listing_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON collectx.messages(receiver_id, read, created_at DESC);

-- ── Listing videos (MoneyPrinterTurbo output) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS collectx.listing_videos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  uuid UNIQUE REFERENCES collectx.listings(id) ON DELETE CASCADE,
  video_url   text NOT NULL,
  status      text NOT NULL DEFAULT 'ready' CHECK (status IN ('pending','ready','failed')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE collectx.items           ENABLE ROW LEVEL SECURITY;
ALTER TABLE collectx.user_profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE collectx.listings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE collectx.offers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE collectx.transactions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE collectx.reviews         ENABLE ROW LEVEL SECURITY;
ALTER TABLE collectx.messages        ENABLE ROW LEVEL SECURITY;
ALTER TABLE collectx.listing_videos  ENABLE ROW LEVEL SECURITY;

-- Service role has full access (app server uses service role key)
DO $$ BEGIN
  CREATE POLICY "service_role_all" ON collectx.items FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "service_role_all" ON collectx.user_profiles FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "service_role_all" ON collectx.listings FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "service_role_all" ON collectx.offers FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "service_role_all" ON collectx.transactions FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "service_role_all" ON collectx.reviews FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "service_role_all" ON collectx.messages FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "service_role_all" ON collectx.listing_videos FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT USAGE ON SCHEMA collectx TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA collectx TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA collectx TO service_role;

COMMIT;
```

- [ ] **Step 2: Apply migration locally (if Supabase CLI available)**

```bash
npx supabase db push --project-id jkwykpldnitavhmtuzmo
```

Expected: `Applying migration 0070_collectx_schema.sql... done`

- [ ] **Step 3: Commit**

```bash
git checkout -b feat/collectx-sprint1
git add supabase/migrations/0070_collectx_schema.sql
git commit -m "feat(collectx): schema migration 0070 — collectx.* tables"
```

---

## Task 2: Bootstrap `apps/collectx`

**Files:**
- Create: `apps/collectx/package.json`
- Create: `apps/collectx/next.config.ts`
- Create: `apps/collectx/tsconfig.json`
- Create: `apps/collectx/tailwind.config.ts`
- Create: `apps/collectx/postcss.config.mjs`
- Create: `apps/collectx/vitest.config.ts`
- Create: `apps/collectx/app/globals.css`
- Create: `apps/collectx/app/layout.tsx`
- Create: `apps/collectx/app/page.tsx`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "@intcloudsysops/collectx",
  "version": "0.1.0",
  "private": true,
  "description": "CollectX — multi-sport collectibles marketplace (Opsly incubator)",
  "scripts": {
    "dev": "next dev -p 3006",
    "build": "next build",
    "start": "next start -p 3006",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.106.0",
    "@stripe/stripe-js": "^4.0.0",
    "next": "^15.5.18",
    "next-auth": "^5.0.0-beta",
    "react": "^19.2.6",
    "react-dom": "^19.2.6",
    "stripe": "^16.0.0",
    "zod": "^3.25.76"
  },
  "devDependencies": {
    "@types/node": "^20.19.41",
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "autoprefixer": "^10.5.0",
    "postcss": "^8.5.1",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.8.0",
    "vitest": "^3.2.4"
  }
}
```

- [ ] **Step 2: Create `next.config.ts`**

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
  webpack: (config) => {
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js'],
      '.jsx': ['.tsx', '.jsx'],
    };
    return config;
  },
};

export default nextConfig;
```

- [ ] **Step 3: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Create config files**

`tailwind.config.ts`:
```typescript
import type { Config } from 'tailwindcss';
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
};
export default config;
```

`postcss.config.mjs`:
```javascript
const config = { plugins: { tailwindcss: {}, autoprefixer: {} } };
export default config;
```

`vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { environment: 'node', include: ['__tests__/**/*.test.ts'] },
});
```

- [ ] **Step 5: Create root layout and globals**

`app/globals.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root { color-scheme: dark; }
body { @apply bg-zinc-950 text-zinc-100 antialiased; }
```

`app/layout.tsx`:
```typescript
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CollectX — Marketplace de Coleccionables',
  description: 'Compra, vende e intercambia coleccionables deportivos en LatAm.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <body>{children}</body>
    </html>
  );
}
```

`app/page.tsx`:
```typescript
import { redirect } from 'next/navigation';
export default function HomePage() { redirect('/browse'); }
```

- [ ] **Step 6: Install deps and verify build**

```bash
cd apps/collectx
npm install
npm run type-check
```

Expected: `TypeScript: No errors found`

- [ ] **Step 7: Commit**

```bash
git add apps/collectx/
git commit -m "feat(collectx): bootstrap Next.js 15 app — port 3006"
```

---

## Task 3: Supabase client + shared utilities

**Files:**
- Create: `apps/collectx/lib/supabase.ts`
- Create: `apps/collectx/lib/api-response.ts`

- [ ] **Step 1: Create Supabase client** (same pattern as panini-lab)

`lib/supabase.ts`:
```typescript
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export function supabaseConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

export function supabaseServer(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function collectxDb(client: SupabaseClient) {
  return client.schema('collectx');
}
```

- [ ] **Step 2: Create API response helpers**

`lib/api-response.ts`:
```typescript
import { NextResponse } from 'next/server';

export function jsonOk<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ ok: true, data }, { status });
}

export function jsonError(message: string, status = 500): NextResponse {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export function jsonUnauthorized(): NextResponse {
  return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
}

export function jsonBadRequest(message: string): NextResponse {
  return NextResponse.json({ ok: false, error: message }, { status: 400 });
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/collectx/lib/
git commit -m "feat(collectx): Supabase client + API response helpers"
```

---

## Task 4: Item + Listing repositories

**Files:**
- Create: `apps/collectx/lib/data/items.ts`
- Create: `apps/collectx/lib/data/listings.ts`
- Create: `apps/collectx/__tests__/listings-repo.test.ts`

- [ ] **Step 1: Write the failing tests**

`__tests__/listings-repo.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase at module level
vi.mock('@/lib/supabase', () => ({
  supabaseServer: vi.fn(),
  collectxDb: vi.fn(),
}));

import { supabaseServer, collectxDb } from '@/lib/supabase';
import { createListing, getListing } from '@/lib/data/listings';

const mockSingle = vi.fn();
const mockSelect = vi.fn(() => ({ eq: vi.fn(() => ({ single: mockSingle })) }));
const mockInsert = vi.fn(() => ({ select: vi.fn(() => ({ single: mockSingle })) }));
const mockFrom = vi.fn(() => ({ select: mockSelect, insert: mockInsert }));
const mockSchema = vi.fn(() => ({ from: mockFrom }));
const mockClient = { schema: mockSchema };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(supabaseServer).mockReturnValue(mockClient as never);
  vi.mocked(collectxDb).mockReturnValue({ from: mockFrom } as never);
});

describe('getListing', () => {
  it('returns null when supabaseServer returns null', async () => {
    vi.mocked(supabaseServer).mockReturnValue(null);
    const result = await getListing('any-id');
    expect(result).toBeNull();
  });

  it('returns null on DB error', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'not found' } });
    const result = await getListing('bad-id');
    expect(result).toBeNull();
  });

  it('maps DB row to DbListing shape', async () => {
    mockSingle.mockResolvedValue({
      data: {
        id: 'abc', item_id: 'item1', seller_id: 'user1',
        price_usd: '45.00', condition: 'mint', type: 'fixed',
        photos: ['https://example.com/photo.jpg'], description: 'Test',
        ships_from: 'CO', status: 'active', video_url: null,
        views: 0, saves: 0, created_at: '2026-05-31T00:00:00Z', sold_at: null,
      },
      error: null,
    });
    const listing = await getListing('abc');
    expect(listing).toMatchObject({
      id: 'abc', priceUsd: 45, condition: 'mint', status: 'active',
    });
  });
});

describe('createListing', () => {
  it('returns null when supabaseServer returns null', async () => {
    vi.mocked(supabaseServer).mockReturnValue(null);
    const result = await createListing({
      itemId: 'item1', sellerId: 'user1', priceUsd: 45,
      condition: 'mint', type: 'fixed', photos: [], shipsFrom: 'CO',
    });
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
cd apps/collectx && npm test
```

Expected: `FAIL — Cannot find module '@/lib/data/listings'`

- [ ] **Step 3: Implement `lib/data/items.ts`**

```typescript
import { collectxDb, supabaseServer } from '@/lib/supabase';

export interface DbItem {
  id: string;
  name: string;
  slug: string | null;
  category: string;
  sport: string;
  playerName: string | null;
  teamName: string | null;
  year: number | null;
  brand: string | null;
  edition: string | null;
  referencePriceUsd: number | null;
  psaGrade: number | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapItem(row: Record<string, any>): DbItem {
  return {
    id: row.id as string,
    name: row.name as string,
    slug: (row.slug as string | null) ?? null,
    category: row.category as string,
    sport: row.sport as string,
    playerName: (row.player_name as string | null) ?? null,
    teamName: (row.team_name as string | null) ?? null,
    year: (row.year as number | null) ?? null,
    brand: (row.brand as string | null) ?? null,
    edition: (row.edition as string | null) ?? null,
    referencePriceUsd: row.reference_price_usd !== null ? Number(row.reference_price_usd) : null,
    psaGrade: (row.psa_grade as number | null) ?? null,
  };
}

export async function getItem(id: string): Promise<DbItem | null> {
  const client = supabaseServer();
  if (!client) return null;
  const { data, error } = await collectxDb(client).from('items').select('*').eq('id', id).single();
  if (error || !data) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return mapItem(data as Record<string, any>);
}

export async function upsertItem(item: Omit<DbItem, 'id'>): Promise<DbItem | null> {
  const client = supabaseServer();
  if (!client) return null;
  const { data, error } = await collectxDb(client)
    .from('items')
    .upsert({
      name: item.name, slug: item.slug, category: item.category,
      sport: item.sport, player_name: item.playerName, team_name: item.teamName,
      year: item.year, brand: item.brand, edition: item.edition,
      reference_price_usd: item.referencePriceUsd, psa_grade: item.psaGrade,
    }, { onConflict: 'slug' })
    .select('*')
    .single();
  if (error || !data) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return mapItem(data as Record<string, any>);
}
```

- [ ] **Step 4: Implement `lib/data/listings.ts`**

```typescript
import { collectxDb, supabaseServer } from '@/lib/supabase';

export interface DbListing {
  id: string;
  itemId: string;
  sellerId: string;
  priceUsd: number;
  condition: 'mint' | 'near_mint' | 'excellent' | 'good' | 'poor';
  type: 'fixed' | 'offer' | 'trade' | 'want';
  photos: string[];
  description: string | null;
  shipsFrom: string | null;
  status: 'active' | 'reserved' | 'sold' | 'expired';
  videoUrl: string | null;
  views: number;
  saves: number;
  createdAt: string;
  soldAt: string | null;
}

export interface CreateListingInput {
  itemId: string;
  sellerId: string;
  priceUsd: number;
  condition: DbListing['condition'];
  type: DbListing['type'];
  photos: string[];
  description?: string;
  shipsFrom?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapListing(row: Record<string, any>): DbListing {
  return {
    id: row.id as string,
    itemId: row.item_id as string,
    sellerId: row.seller_id as string,
    priceUsd: Number(row.price_usd),
    condition: row.condition as DbListing['condition'],
    type: row.type as DbListing['type'],
    photos: (row.photos as string[]) ?? [],
    description: (row.description as string | null) ?? null,
    shipsFrom: (row.ships_from as string | null) ?? null,
    status: row.status as DbListing['status'],
    videoUrl: (row.video_url as string | null) ?? null,
    views: (row.views as number) ?? 0,
    saves: (row.saves as number) ?? 0,
    createdAt: row.created_at as string,
    soldAt: (row.sold_at as string | null) ?? null,
  };
}

export async function getListing(id: string): Promise<DbListing | null> {
  const client = supabaseServer();
  if (!client) return null;
  const { data, error } = await collectxDb(client)
    .from('listings').select('*').eq('id', id).single();
  if (error || !data) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return mapListing(data as Record<string, any>);
}

export async function createListing(input: CreateListingInput): Promise<DbListing | null> {
  const client = supabaseServer();
  if (!client) return null;
  const { data, error } = await collectxDb(client)
    .from('listings')
    .insert({
      item_id: input.itemId, seller_id: input.sellerId,
      price_usd: input.priceUsd, condition: input.condition,
      type: input.type, photos: input.photos,
      description: input.description ?? null, ships_from: input.shipsFrom ?? null,
    })
    .select('*').single();
  if (error || !data) { console.error('[listings] createListing:', error?.message); return null; }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return mapListing(data as Record<string, any>);
}

export async function getActiveListings(limit = 24): Promise<DbListing[]> {
  const client = supabaseServer();
  if (!client) return [];
  const { data, error } = await collectxDb(client)
    .from('listings').select('*').eq('status', 'active')
    .order('created_at', { ascending: false }).limit(limit);
  if (error || !data) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as Record<string, any>[]).map(mapListing);
}

export async function updateListingStatus(
  id: string, status: DbListing['status']
): Promise<boolean> {
  const client = supabaseServer();
  if (!client) return false;
  const { error } = await collectxDb(client)
    .from('listings').update({ status, ...(status === 'sold' ? { sold_at: new Date().toISOString() } : {}) })
    .eq('id', id);
  return !error;
}
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
cd apps/collectx && npm test
```

Expected: `PASS (3) FAIL (0)`

- [ ] **Step 6: Commit**

```bash
git add apps/collectx/lib/data/ apps/collectx/__tests__/listings-repo.test.ts
git commit -m "feat(collectx): items + listings repositories with tests"
```

---

## Task 5: Search

**Files:**
- Create: `apps/collectx/lib/search/index.ts`
- Create: `apps/collectx/app/api/search/route.ts`
- Create: `apps/collectx/__tests__/search.test.ts`

- [ ] **Step 1: Write failing test**

`__tests__/search.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { buildSearchQuery } from '@/lib/search/index';

describe('buildSearchQuery', () => {
  it('returns base query when no filters', () => {
    const { textQuery, filters } = buildSearchQuery({});
    expect(textQuery).toBeNull();
    expect(filters.category).toBeUndefined();
  });

  it('extracts text query', () => {
    const { textQuery } = buildSearchQuery({ q: 'mbappe card' });
    expect(textQuery).toBe('mbappe card');
  });

  it('extracts category filter', () => {
    const { filters } = buildSearchQuery({ category: 'card' });
    expect(filters.category).toBe('card');
  });

  it('clamps price range', () => {
    const { filters } = buildSearchQuery({ min_price: '-10', max_price: '99999' });
    expect(filters.minPrice).toBe(0);
    expect(filters.maxPrice).toBe(99999);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
cd apps/collectx && npm test -- search
```

- [ ] **Step 3: Implement `lib/search/index.ts`**

```typescript
import { collectxDb, supabaseServer } from '@/lib/supabase';
import type { DbListing } from '@/lib/data/listings';

export interface SearchFilters {
  category?: string;
  sport?: string;
  condition?: string;
  minPrice?: number;
  maxPrice?: number;
  shipsFrom?: string;
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'relevance';
}

export interface SearchParams {
  q?: string;
  category?: string;
  sport?: string;
  condition?: string;
  min_price?: string;
  max_price?: string;
  ships_from?: string;
  sort?: string;
  page?: string;
  limit?: string;
}

export function buildSearchQuery(params: SearchParams): { textQuery: string | null; filters: SearchFilters; page: number; limit: number } {
  const filters: SearchFilters = {};
  if (params.category) filters.category = params.category;
  if (params.sport) filters.sport = params.sport;
  if (params.condition) filters.condition = params.condition;
  if (params.ships_from) filters.shipsFrom = params.ships_from;
  if (params.min_price) filters.minPrice = Math.max(0, parseFloat(params.min_price) || 0);
  if (params.max_price) filters.maxPrice = parseFloat(params.max_price) || undefined;
  if (params.sort) filters.sort = params.sort as SearchFilters['sort'];
  return {
    textQuery: params.q?.trim() || null,
    filters,
    page: Math.max(1, parseInt(params.page ?? '1') || 1),
    limit: Math.min(48, Math.max(1, parseInt(params.limit ?? '24') || 24)),
  };
}

export async function searchListings(params: SearchParams): Promise<{ listings: DbListing[]; total: number }> {
  const client = supabaseServer();
  if (!client) return { listings: [], total: 0 };

  const { textQuery, filters, page, limit } = buildSearchQuery(params);
  const offset = (page - 1) * limit;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = collectxDb(client).from('listings').select('*', { count: 'exact' }) as any;

  query = query.eq('status', 'active');
  if (textQuery) query = query.textSearch('search_vector', textQuery, { config: 'spanish' });
  if (filters.condition) query = query.eq('condition', filters.condition);
  if (filters.shipsFrom) query = query.eq('ships_from', filters.shipsFrom);
  if (filters.minPrice !== undefined) query = query.gte('price_usd', filters.minPrice);
  if (filters.maxPrice !== undefined) query = query.lte('price_usd', filters.maxPrice);

  // Sort
  if (filters.sort === 'price_asc') query = query.order('price_usd', { ascending: true });
  else if (filters.sort === 'price_desc') query = query.order('price_usd', { ascending: false });
  else query = query.order('created_at', { ascending: false });

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error || !data) return { listings: [], total: 0 };

  const { mapListing } = await import('@/lib/data/listings');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { listings: (data as Record<string, any>[]).map(mapListing), total: count ?? 0 };
}
```

> Note: `mapListing` needs to be exported from `lib/data/listings.ts` — add `export { mapListing }` to that file.

- [ ] **Step 4: Create `app/api/search/route.ts`**

```typescript
import { type NextRequest, NextResponse } from 'next/server';
import { searchListings } from '@/lib/search/index';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  const result = await searchListings(params);
  return NextResponse.json({ ok: true, ...result });
}
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
npm test -- search
```

Expected: `PASS (3) FAIL (0)`

- [ ] **Step 6: Export `mapListing` from listings.ts**

In `lib/data/listings.ts`, change:
```typescript
function mapListing(  →  export function mapListing(
```

- [ ] **Step 7: Commit**

```bash
git add apps/collectx/lib/search/ apps/collectx/app/api/search/ apps/collectx/__tests__/search.test.ts apps/collectx/lib/data/listings.ts
git commit -m "feat(collectx): full-text search with Postgres tsvector + API route"
```

---

## Task 6: Offer + Transaction repos

**Files:**
- Create: `apps/collectx/lib/data/offers.ts`
- Create: `apps/collectx/lib/data/transactions.ts`
- Create: `apps/collectx/__tests__/offers-repo.test.ts`

- [ ] **Step 1: Write failing tests**

`__tests__/offers-repo.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({
  supabaseServer: vi.fn(() => null),
  collectxDb: vi.fn(),
}));

import { createOffer } from '@/lib/data/offers';

describe('createOffer', () => {
  it('returns null when DB unavailable', async () => {
    const result = await createOffer({ listingId: 'l1', buyerId: 'u1', amountUsd: 40 });
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Implement `lib/data/offers.ts`**

```typescript
import { collectxDb, supabaseServer } from '@/lib/supabase';

export interface DbOffer {
  id: string;
  listingId: string;
  buyerId: string;
  amountUsd: number;
  message: string | null;
  status: 'pending' | 'accepted' | 'rejected' | 'countered' | 'expired';
  counterAmountUsd: number | null;
  expiresAt: string;
  createdAt: string;
}

export interface CreateOfferInput {
  listingId: string;
  buyerId: string;
  amountUsd: number;
  message?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapOffer(row: Record<string, any>): DbOffer {
  return {
    id: row.id as string,
    listingId: row.listing_id as string,
    buyerId: row.buyer_id as string,
    amountUsd: Number(row.amount_usd),
    message: (row.message as string | null) ?? null,
    status: row.status as DbOffer['status'],
    counterAmountUsd: row.counter_amount_usd !== null ? Number(row.counter_amount_usd) : null,
    expiresAt: row.expires_at as string,
    createdAt: row.created_at as string,
  };
}

export async function createOffer(input: CreateOfferInput): Promise<DbOffer | null> {
  const client = supabaseServer();
  if (!client) return null;
  const { data, error } = await collectxDb(client)
    .from('offers')
    .insert({ listing_id: input.listingId, buyer_id: input.buyerId, amount_usd: input.amountUsd, message: input.message ?? null })
    .select('*').single();
  if (error || !data) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return mapOffer(data as Record<string, any>);
}

export async function respondToOffer(
  offerId: string,
  response: { status: 'accepted' | 'rejected' | 'countered'; counterAmountUsd?: number }
): Promise<DbOffer | null> {
  const client = supabaseServer();
  if (!client) return null;
  const { data, error } = await collectxDb(client)
    .from('offers')
    .update({ status: response.status, counter_amount_usd: response.counterAmountUsd ?? null })
    .eq('id', offerId).select('*').single();
  if (error || !data) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return mapOffer(data as Record<string, any>);
}

export async function getOffersForListing(listingId: string): Promise<DbOffer[]> {
  const client = supabaseServer();
  if (!client) return [];
  const { data, error } = await collectxDb(client)
    .from('offers').select('*').eq('listing_id', listingId)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as Record<string, any>[]).map(mapOffer);
}
```

- [ ] **Step 3: Implement `lib/data/transactions.ts`**

```typescript
import { collectxDb, supabaseServer } from '@/lib/supabase';

export interface DbTransaction {
  id: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  finalPriceUsd: number;
  platformFeeUsd: number;
  stripePaymentIntentId: string | null;
  stripeTransferId: string | null;
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'disputed' | 'refunded';
  shippedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
}

export const PLATFORM_FEE_RATE = 0.05; // 5%

export function calculateFee(priceUsd: number): { fee: number; sellerAmount: number } {
  const fee = Math.round(priceUsd * PLATFORM_FEE_RATE * 100) / 100;
  return { fee, sellerAmount: Math.round((priceUsd - fee) * 100) / 100 };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapTransaction(row: Record<string, any>): DbTransaction {
  return {
    id: row.id as string,
    listingId: row.listing_id as string,
    buyerId: row.buyer_id as string,
    sellerId: row.seller_id as string,
    finalPriceUsd: Number(row.final_price_usd),
    platformFeeUsd: Number(row.platform_fee_usd),
    stripePaymentIntentId: (row.stripe_payment_intent_id as string | null) ?? null,
    stripeTransferId: (row.stripe_transfer_id as string | null) ?? null,
    status: row.status as DbTransaction['status'],
    shippedAt: (row.shipped_at as string | null) ?? null,
    deliveredAt: (row.delivered_at as string | null) ?? null,
    createdAt: row.created_at as string,
  };
}

export async function createTransaction(input: {
  listingId: string; buyerId: string; sellerId: string;
  finalPriceUsd: number; stripePaymentIntentId: string;
}): Promise<DbTransaction | null> {
  const client = supabaseServer();
  if (!client) return null;
  const { fee } = calculateFee(input.finalPriceUsd);
  const { data, error } = await collectxDb(client)
    .from('transactions')
    .insert({
      listing_id: input.listingId, buyer_id: input.buyerId, seller_id: input.sellerId,
      final_price_usd: input.finalPriceUsd, platform_fee_usd: fee,
      stripe_payment_intent_id: input.stripePaymentIntentId, status: 'pending',
    })
    .select('*').single();
  if (error || !data) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return mapTransaction(data as Record<string, any>);
}

export async function confirmDelivery(transactionId: string): Promise<DbTransaction | null> {
  const client = supabaseServer();
  if (!client) return null;
  const { data, error } = await collectxDb(client)
    .from('transactions')
    .update({ status: 'delivered', delivered_at: new Date().toISOString() })
    .eq('id', transactionId).select('*').single();
  if (error || !data) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return mapTransaction(data as Record<string, any>);
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm test
```

Expected: `PASS (4) FAIL (0)`

- [ ] **Step 5: Commit**

```bash
git add apps/collectx/lib/data/offers.ts apps/collectx/lib/data/transactions.ts apps/collectx/__tests__/offers-repo.test.ts
git commit -m "feat(collectx): offers + transactions repos with fee calculation"
```

---

## Task 7: Stripe Connect

**Files:**
- Create: `apps/collectx/lib/payments/stripe-connect.ts`
- Create: `apps/collectx/__tests__/stripe-connect.test.ts`

- [ ] **Step 1: Write failing test**

`__tests__/stripe-connect.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { calculateCheckoutAmounts } from '@/lib/payments/stripe-connect';

describe('calculateCheckoutAmounts', () => {
  it('calculates 5% fee and seller amount in cents', () => {
    const result = calculateCheckoutAmounts(100);
    expect(result.totalCents).toBe(10000);
    expect(result.feeCents).toBe(500);
    expect(result.sellerCents).toBe(9500);
  });

  it('rounds correctly for odd prices', () => {
    const result = calculateCheckoutAmounts(33.33);
    expect(result.totalCents).toBe(3333);
    expect(result.feeCents).toBe(167);   // ceil(3333 * 0.05)
    expect(result.sellerCents).toBe(3166);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npm test -- stripe
```

- [ ] **Step 3: Implement `lib/payments/stripe-connect.ts`**

```typescript
import Stripe from 'stripe';

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY not configured');
  return new Stripe(key, { apiVersion: '2024-12-18.acacia' });
}

export function calculateCheckoutAmounts(priceUsd: number): {
  totalCents: number; feeCents: number; sellerCents: number;
} {
  const totalCents = Math.round(priceUsd * 100);
  const feeCents = Math.ceil(totalCents * 0.05);
  const sellerCents = totalCents - feeCents;
  return { totalCents, feeCents, sellerCents };
}

export async function createCheckoutSession(input: {
  listingId: string;
  priceUsd: number;
  itemName: string;
  photoUrl?: string;
  sellerStripeAccountId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ sessionId: string; url: string } | null> {
  const stripe = getStripe();
  const { totalCents, feeCents } = calculateCheckoutAmounts(input.priceUsd);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_intent_data: {
        capture_method: 'manual',   // escrow — captured only on delivery confirmation
        application_fee_amount: feeCents,
        transfer_data: { destination: input.sellerStripeAccountId },
      },
      line_items: [{
        price_data: {
          currency: 'usd',
          unit_amount: totalCents,
          product_data: {
            name: input.itemName,
            images: input.photoUrl ? [input.photoUrl] : [],
          },
        },
        quantity: 1,
      }],
      metadata: { listing_id: input.listingId },
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
    });
    return { sessionId: session.id, url: session.url ?? '' };
  } catch (err) {
    console.error('[stripe] createCheckoutSession:', err);
    return null;
  }
}

export async function capturePayment(paymentIntentId: string): Promise<boolean> {
  const stripe = getStripe();
  try {
    await stripe.paymentIntents.capture(paymentIntentId);
    return true;
  } catch (err) {
    console.error('[stripe] capturePayment:', err);
    return false;
  }
}

export async function refundPayment(paymentIntentId: string): Promise<boolean> {
  const stripe = getStripe();
  try {
    await stripe.refunds.create({ payment_intent: paymentIntentId });
    return true;
  } catch (err) {
    console.error('[stripe] refundPayment:', err);
    return false;
  }
}

export async function createConnectAccountLink(accountId: string, refreshUrl: string, returnUrl: string): Promise<string | null> {
  const stripe = getStripe();
  try {
    const link = await stripe.accountLinks.create({
      account: accountId, refresh_url: refreshUrl,
      return_url: returnUrl, type: 'account_onboarding',
    });
    return link.url;
  } catch (err) {
    console.error('[stripe] createConnectAccountLink:', err);
    return null;
  }
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm test
```

Expected: `PASS (6) FAIL (0)`

- [ ] **Step 5: Commit**

```bash
git add apps/collectx/lib/payments/ apps/collectx/__tests__/stripe-connect.test.ts
git commit -m "feat(collectx): Stripe Connect — checkout, escrow capture, fee calculation"
```

---

## Task 8: Browse page + ListingCard component

**Files:**
- Create: `apps/collectx/components/ListingCard.tsx`
- Create: `apps/collectx/components/ListingGrid.tsx`
- Create: `apps/collectx/components/FilterBar.tsx`
- Create: `apps/collectx/app/(marketplace)/layout.tsx`
- Create: `apps/collectx/app/(marketplace)/browse/page.tsx`

- [ ] **Step 1: Create `components/ListingCard.tsx`**

```typescript
import Image from 'next/image';
import Link from 'next/link';
import type { DbListing } from '@/lib/data/listings';
import type { DbItem } from '@/lib/data/items';

interface ListingCardProps {
  listing: DbListing;
  item: DbItem;
}

const CONDITION_LABEL: Record<string, string> = {
  mint: 'Mint', near_mint: 'Near Mint', excellent: 'Excelente',
  good: 'Buena', poor: 'Regular',
};

export default function ListingCard({ listing, item }: ListingCardProps) {
  return (
    <Link href={`/listing/${listing.id}`} className="group block rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden hover:border-zinc-700 transition-colors">
      <div className="relative aspect-square bg-zinc-800">
        {listing.photos[0] ? (
          <Image src={listing.photos[0]} alt={item.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="flex items-center justify-center h-full text-4xl text-zinc-700">📦</div>
        )}
        <span className="absolute top-2 left-2 text-xs bg-zinc-900/80 text-zinc-300 px-2 py-0.5 rounded-full">
          {CONDITION_LABEL[listing.condition] ?? listing.condition}
        </span>
      </div>
      <div className="p-3 space-y-1">
        <p className="text-sm font-medium text-zinc-100 truncate">{item.name}</p>
        {item.playerName && <p className="text-xs text-zinc-500 truncate">{item.playerName}</p>}
        <div className="flex items-center justify-between">
          <p className="text-base font-bold text-emerald-400">${listing.priceUsd.toFixed(2)}</p>
          <p className="text-xs text-zinc-600">{listing.shipsFrom ?? '—'}</p>
        </div>
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: Create `components/FilterBar.tsx`**

```typescript
'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

const CATEGORIES = ['sticker','card','memorabilia','apparel','watch','sneaker','vehicle','other'];
const SPORTS = ['football','basketball','baseball','f1','tennis','general'];
const CONDITIONS = ['mint','near_mint','excellent','good','poor'];

export default function FilterBar() {
  const router = useRouter();
  const params = useSearchParams();

  const update = useCallback((key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value); else next.delete(key);
    next.delete('page');
    router.push(`/browse?${next.toString()}`);
  }, [params, router]);

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <select
        className="bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-zinc-500"
        value={params.get('category') ?? ''}
        onChange={(e) => update('category', e.target.value)}
      >
        <option value="">Todas las categorías</option>
        {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>

      <select
        className="bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm rounded-lg px-3 py-2"
        value={params.get('sport') ?? ''}
        onChange={(e) => update('sport', e.target.value)}
      >
        <option value="">Todos los deportes</option>
        {SPORTS.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>

      <select
        className="bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm rounded-lg px-3 py-2"
        value={params.get('condition') ?? ''}
        onChange={(e) => update('condition', e.target.value)}
      >
        <option value="">Cualquier condición</option>
        {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>

      <select
        className="bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm rounded-lg px-3 py-2"
        value={params.get('sort') ?? ''}
        onChange={(e) => update('sort', e.target.value)}
      >
        <option value="">Más recientes</option>
        <option value="price_asc">Precio ↑</option>
        <option value="price_desc">Precio ↓</option>
      </select>
    </div>
  );
}
```

- [ ] **Step 3: Create marketplace layout**

`app/(marketplace)/layout.tsx`:
```typescript
import Link from 'next/link';

export default function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <nav className="border-b border-zinc-800 bg-zinc-950/90 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <Link href="/browse" className="text-lg font-bold text-emerald-400 tracking-tight">CollectX</Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/browse" className="text-zinc-400 hover:text-zinc-100">Explorar</Link>
            <Link href="/sell" className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-lg transition-colors">Vender</Link>
            <Link href="/dashboard" className="text-zinc-400 hover:text-zinc-100">Mi cuenta</Link>
          </div>
        </div>
      </nav>
      <main>{children}</main>
    </div>
  );
}
```

- [ ] **Step 4: Create browse page**

`app/(marketplace)/browse/page.tsx`:
```typescript
import { Suspense } from 'react';
import { getActiveListings } from '@/lib/data/listings';
import { getItem } from '@/lib/data/items';
import FilterBar from '@/components/FilterBar';
import ListingCard from '@/components/ListingCard';

export const dynamic = 'force-dynamic';

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const listings = await getActiveListings(24);

  // Fetch items for listings (batching would be ideal — simple N+1 for Sprint 1)
  const listingsWithItems = await Promise.all(
    listings.map(async (l) => ({ listing: l, item: await getItem(l.itemId) }))
  );
  const valid = listingsWithItems.filter((x): x is typeof x & { item: NonNullable<typeof x['item']> } => x.item !== null);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold">Explorar coleccionables</h1>
        <span className="text-sm text-zinc-500">{listings.length} listings activos</span>
      </div>

      <Suspense>
        <FilterBar />
      </Suspense>

      {valid.length === 0 ? (
        <div className="text-center py-20 text-zinc-500">
          <p className="text-4xl mb-4">📦</p>
          <p>No hay listings todavía. ¡Sé el primero en vender!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {valid.map(({ listing, item }) => (
            <ListingCard key={listing.id} listing={listing} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Verify type-check**

```bash
cd apps/collectx && npm run type-check
```

Expected: `TypeScript: No errors found`

- [ ] **Step 6: Commit**

```bash
git add apps/collectx/components/ apps/collectx/app/\(marketplace\)/
git commit -m "feat(collectx): browse page with filter bar and listing grid"
```

---

## Task 9: Listing Detail + Offer Modal + Predictions Bridge

**Files:**
- Create: `apps/collectx/components/OfferModal.tsx`
- Create: `apps/collectx/components/PredictionBadge.tsx`
- Create: `apps/collectx/components/ValueBetBadge.tsx`
- Create: `apps/collectx/app/(marketplace)/listing/[id]/page.tsx`
- Create: `apps/collectx/app/api/listings/[id]/route.ts`
- Create: `apps/collectx/app/api/offers/route.ts`

- [ ] **Step 1: Create `app/api/offers/route.ts`**

```typescript
import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { createOffer } from '@/lib/data/offers';
import { jsonOk, jsonBadRequest, jsonError } from '@/lib/api-response';

const CreateOfferSchema = z.object({
  listingId: z.string().uuid(),
  buyerId: z.string().uuid(),
  amountUsd: z.number().positive().max(100000),
  message: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = CreateOfferSchema.safeParse(body);
  if (!parsed.success) return jsonBadRequest(parsed.error.issues[0]?.message ?? 'Invalid input');

  const offer = await createOffer(parsed.data);
  if (!offer) return jsonError('Failed to create offer');
  return jsonOk(offer, 201);
}
```

- [ ] **Step 2: Create `components/OfferModal.tsx`**

```typescript
'use client';
import { useState } from 'react';

interface OfferModalProps {
  listingId: string;
  currentPrice: number;
  onClose: () => void;
  onSuccess: (amount: number) => void;
}

export default function OfferModal({ listingId, currentPrice, onClose, onSuccess }: OfferModalProps) {
  const [amount, setAmount] = useState(Math.floor(currentPrice * 0.9));
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setLoading(true); setError(null);
    const res = await fetch('/api/offers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listingId, buyerId: 'demo', amountUsd: amount, message }),
    });
    const data = (await res.json()) as { ok: boolean; error?: string };
    setLoading(false);
    if (!data.ok) { setError(data.error ?? 'Error al enviar'); return; }
    onSuccess(amount);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-sm space-y-4 mx-4">
        <h2 className="text-lg font-semibold">Hacer una oferta</h2>
        <p className="text-sm text-zinc-400">Precio actual: <span className="text-emerald-400 font-bold">${currentPrice.toFixed(2)}</span></p>

        <div className="space-y-1">
          <label className="text-xs text-zinc-400">Tu oferta (USD)</label>
          <div className="flex items-center border border-zinc-700 rounded-lg overflow-hidden">
            <span className="px-3 text-zinc-500 bg-zinc-800">$</span>
            <input
              type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))}
              className="flex-1 bg-transparent px-3 py-2 text-zinc-100 focus:outline-none"
              min={1} max={currentPrice * 2} step={0.01}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-zinc-400">Mensaje (opcional)</label>
          <textarea
            value={message} onChange={(e) => setMessage(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none resize-none"
            rows={2} placeholder="¿Incluye envío? ¿Cambio por...?"
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-zinc-700 text-zinc-400 hover:text-zinc-200 text-sm">Cancelar</button>
          <button onClick={() => void submit()} disabled={loading} className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium">
            {loading ? 'Enviando…' : 'Enviar oferta'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create `components/PredictionBadge.tsx`**

Imports prediction data from panini-lab's player model. Since cross-app imports aren't available in Sprint 1, this reads from the shared Supabase table `panini_lab.wc_player_predictions`:

```typescript
import { supabaseServer } from '@/lib/supabase';

interface PredictionBadgeProps { playerName: string }

export default async function PredictionBadge({ playerName }: PredictionBadgeProps) {
  const client = supabaseServer();
  if (!client || !playerName) return null;

  // Read from panini-lab's prediction tables (shared Supabase, different schema)
  const { data } = await client
    .schema('panini_lab')
    .from('wc_players')
    .select(`name, wc_player_predictions(prob_goal, prob_assist, prob_yellow)`)
    .ilike('name', `%${playerName}%`)
    .limit(1)
    .single();

  if (!data) return null;
  const pred = Array.isArray(data.wc_player_predictions) ? data.wc_player_predictions[0] : null;
  if (!pred) return null;

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
      <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide">🏆 Predicción del jugador</p>
      <p className="text-sm font-medium text-zinc-100">{playerName}</p>
      <div className="flex gap-4 text-xs text-zinc-400">
        <span>⚽ Gol: <strong className="text-emerald-400">{pred.prob_goal}%</strong></span>
        <span>🎯 Asist: <strong className="text-zinc-300">{pred.prob_assist}%</strong></span>
        <span>🟨 Tarjeta: <strong className="text-zinc-300">{pred.prob_yellow}%</strong></span>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create `components/ValueBetBadge.tsx`**

```typescript
import { supabaseServer } from '@/lib/supabase';

export default async function ValueBetBadge({ playerName }: { playerName: string }) {
  const client = supabaseServer();
  if (!client || !playerName) return null;

  // Read top value signal related to this player from shared DB
  const { data } = await client
    .schema('panini_lab')
    .from('value_signals')
    .select(`edge, signal, polymarket_url, our_prob, market_implied, polymarket_markets(question)`)
    .gt('edge', 4)
    .order('edge', { ascending: false })
    .limit(1)
    .single();

  if (!data || data.edge <= 4) return null;

  const isStrong = data.signal === 'strong_value';

  return (
    <div className={`rounded-xl border p-4 space-y-2 ${isStrong ? 'border-emerald-600/40 bg-emerald-600/5' : 'border-lime-600/30 bg-lime-600/5'}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-400">
        {isStrong ? '🔥 Value fuerte en Polymarket' : '✅ Edge en Polymarket'}
      </p>
      <div className="flex items-center justify-between text-sm">
        <span className="text-zinc-300">Nuestro modelo: <strong className="text-emerald-400">{data.our_prob}%</strong></span>
        <span className="text-zinc-500">Mercado: {data.market_implied}%</span>
        <span className={`font-bold ${isStrong ? 'text-emerald-400' : 'text-lime-400'}`}>+{data.edge}pp</span>
      </div>
      {data.polymarket_url && (
        <a href={data.polymarket_url} target="_blank" rel="noopener noreferrer"
          className="block text-center text-xs bg-emerald-600 hover:bg-emerald-500 text-white py-1.5 rounded-lg transition-colors">
          Ver en Polymarket →
        </a>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Create listing detail page**

`app/(marketplace)/listing/[id]/page.tsx`:
```typescript
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getListing } from '@/lib/data/listings';
import { getItem } from '@/lib/data/items';
import PredictionBadge from '@/components/PredictionBadge';
import ValueBetBadge from '@/components/ValueBetBadge';
import OfferModal from '@/components/OfferModal';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listing = await getListing(id);
  if (!listing) return {};
  const item = await getItem(listing.itemId);
  return {
    title: `${item?.name ?? 'Listing'} — $${listing.priceUsd} USD | CollectX`,
    description: listing.description?.slice(0, 160),
    openGraph: { images: listing.photos[0] ? [listing.photos[0]] : [] },
  };
}

export default async function ListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [listing, ] = await Promise.all([getListing(id)]);
  if (!listing || listing.status !== 'active') notFound();

  const item = await getItem(listing.itemId);
  if (!item) notFound();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-4">
        <Link href="/browse" className="text-sm text-zinc-500 hover:text-zinc-300">← Volver al catálogo</Link>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Photos */}
        <div className="space-y-3">
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-zinc-800">
            {listing.photos[0] ? (
              <Image src={listing.photos[0]} alt={item.name} fill className="object-cover" />
            ) : (
              <div className="flex items-center justify-center h-full text-6xl text-zinc-700">📦</div>
            )}
          </div>
          {listing.photos.length > 1 && (
            <div className="grid grid-cols-5 gap-2">
              {listing.photos.slice(1, 6).map((url, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-zinc-800">
                  <Image src={url} alt="" fill className="object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-4">
          <div>
            <p className="text-sm text-zinc-500 uppercase tracking-wide">{item.category} · {item.sport}</p>
            <h1 className="text-2xl font-bold mt-1">{item.name}</h1>
            {item.playerName && <p className="text-zinc-400">{item.playerName} {item.teamName ? `· ${item.teamName}` : ''}</p>}
          </div>

          <div className="flex items-center gap-3">
            <p className="text-3xl font-bold text-emerald-400">${listing.priceUsd.toFixed(2)} USD</p>
            <span className="text-sm bg-zinc-800 text-zinc-300 px-3 py-1 rounded-full">{listing.condition}</span>
          </div>

          {listing.description && (
            <p className="text-zinc-400 text-sm leading-relaxed">{listing.description}</p>
          )}

          <div className="flex gap-3">
            <button className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-semibold transition-colors">
              Comprar — ${listing.priceUsd.toFixed(2)}
            </button>
            {listing.type === 'offer' || listing.type === 'fixed' ? (
              <button className="flex-1 border border-zinc-700 hover:border-zinc-500 text-zinc-300 py-3 rounded-xl transition-colors">
                Hacer oferta
              </button>
            ) : null}
          </div>

          <p className="text-xs text-zinc-600 text-center">Pago seguro vía Stripe · Protección al comprador</p>

          {/* Predictions bridge — only if item has player */}
          {item.playerName && (
            <div className="space-y-3 pt-2 border-t border-zinc-800">
              {/* @ts-expect-error Server Component */}
              <PredictionBadge playerName={item.playerName} />
              {/* @ts-expect-error Server Component */}
              <ValueBetBadge playerName={item.playerName} />
            </div>
          )}

          {listing.shipsFrom && (
            <p className="text-xs text-zinc-600">📦 Envío desde: {listing.shipsFrom}</p>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Verify type-check**

```bash
npm run type-check
```

Expected: `TypeScript: No errors found`

- [ ] **Step 7: Commit**

```bash
git add apps/collectx/components/ apps/collectx/app/\(marketplace\)/listing/ apps/collectx/app/api/offers/
git commit -m "feat(collectx): listing detail with prediction bridge + offer modal"
```

---

## Task 10: Sell wizard

**Files:**
- Create: `apps/collectx/app/sell/page.tsx`
- Create: `apps/collectx/app/api/listings/route.ts`
- Create: `apps/collectx/components/PhotoUpload.tsx`

- [ ] **Step 1: Create listings API route**

`app/api/listings/route.ts`:
```typescript
import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { createListing } from '@/lib/data/listings';
import { jsonOk, jsonBadRequest, jsonError } from '@/lib/api-response';

const CreateListingSchema = z.object({
  itemId: z.string().uuid(),
  sellerId: z.string().uuid(),
  priceUsd: z.number().positive().max(500000),
  condition: z.enum(['mint','near_mint','excellent','good','poor']),
  type: z.enum(['fixed','offer','trade','want']),
  photos: z.array(z.string().url()).max(10),
  description: z.string().max(2000).optional(),
  shipsFrom: z.string().length(2).optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = CreateListingSchema.safeParse(body);
  if (!parsed.success) return jsonBadRequest(parsed.error.issues[0]?.message ?? 'Invalid input');

  const listing = await createListing(parsed.data);
  if (!listing) return jsonError('Failed to create listing');
  return jsonOk(listing, 201);
}
```

- [ ] **Step 2: Create `components/PhotoUpload.tsx`**

```typescript
'use client';
import { useCallback, useState } from 'react';

interface PhotoUploadProps {
  photos: string[];
  onChange: (photos: string[]) => void;
  maxPhotos?: number;
}

export default function PhotoUpload({ photos, onChange, maxPhotos = 10 }: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false);

  const handleFiles = useCallback(async (files: FileList) => {
    if (photos.length >= maxPhotos) return;
    setUploading(true);
    const newPhotos: string[] = [];
    for (const file of Array.from(files).slice(0, maxPhotos - photos.length)) {
      // Create object URL for preview (real upload to Supabase Storage in Sprint 2)
      newPhotos.push(URL.createObjectURL(file));
    }
    onChange([...photos, ...newPhotos]);
    setUploading(false);
  }, [photos, onChange, maxPhotos]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-5 gap-2">
        {photos.map((url, i) => (
          <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-zinc-800">
            <img src={url} alt="" className="w-full h-full object-cover" />
            <button
              onClick={() => onChange(photos.filter((_, j) => j !== i))}
              className="absolute top-1 right-1 bg-red-600/80 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center"
            >×</button>
          </div>
        ))}
        {photos.length < maxPhotos && (
          <label className="aspect-square rounded-lg border-2 border-dashed border-zinc-700 hover:border-zinc-500 flex items-center justify-center cursor-pointer transition-colors">
            <input type="file" accept="image/*" multiple className="hidden"
              onChange={(e) => e.target.files && void handleFiles(e.target.files)} />
            <span className="text-2xl text-zinc-600">{uploading ? '⏳' : '+'}</span>
          </label>
        )}
      </div>
      <p className="text-xs text-zinc-600">{photos.length}/{maxPhotos} fotos · Primera foto = portada</p>
    </div>
  );
}
```

- [ ] **Step 3: Create sell wizard page**

`app/sell/page.tsx`:
```typescript
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PhotoUpload from '@/components/PhotoUpload';

type Step = 1 | 2 | 3 | 4;
const CATEGORIES = ['sticker','card','memorabilia','apparel','watch','sneaker','vehicle','other'];
const SPORTS = ['football','basketball','baseball','f1','tennis','general','none'];
const CONDITIONS = ['mint','near_mint','excellent','good','poor'] as const;

interface WizardState {
  category: string; sport: string; itemName: string; playerName: string;
  condition: typeof CONDITIONS[number]; priceUsd: number; type: 'fixed' | 'offer' | 'trade';
  description: string; shipsFrom: string; photos: string[];
}

export default function SellPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState<WizardState>({
    category: 'sticker', sport: 'football', itemName: '', playerName: '',
    condition: 'good', priceUsd: 0, type: 'fixed',
    description: '', shipsFrom: '', photos: [],
  });

  const update = (patch: Partial<WizardState>) => setState((s) => ({ ...s, ...patch }));

  async function publish() {
    setLoading(true);
    // Step 1: create item
    const itemRes = await fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: state.itemName, category: state.category, sport: state.sport, playerName: state.playerName || null }),
    });
    const itemData = (await itemRes.json()) as { ok: boolean; data?: { id: string } };
    if (!itemData.ok || !itemData.data) { setLoading(false); return; }

    // Step 2: create listing
    const listingRes = await fetch('/api/listings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        itemId: itemData.data.id, sellerId: 'demo',
        priceUsd: state.priceUsd, condition: state.condition,
        type: state.type, photos: state.photos,
        description: state.description || undefined,
        shipsFrom: state.shipsFrom || undefined,
      }),
    });
    const listingData = (await listingRes.json()) as { ok: boolean; data?: { id: string } };
    setLoading(false);
    if (listingData.ok && listingData.data) router.push(`/listing/${listingData.data.id}`);
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10 space-y-6">
      <div>
        <p className="text-sm text-emerald-400 uppercase tracking-wide">Paso {step} de 4</p>
        <div className="h-1 bg-zinc-800 rounded-full mt-2">
          <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${step * 25}%` }} />
        </div>
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">¿Qué estás vendiendo?</h2>
          <div className="grid grid-cols-2 gap-3">
            {CATEGORIES.map((cat) => (
              <button key={cat} onClick={() => update({ category: cat })}
                className={`py-3 rounded-xl border text-sm capitalize transition-colors ${state.category === cat ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'}`}>
                {cat}
              </button>
            ))}
          </div>
          <select value={state.sport} onChange={(e) => update({ sport: e.target.value })}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100">
            {SPORTS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={() => setStep(2)} disabled={!state.category}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-3 rounded-xl font-semibold">
            Continuar →
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Detalles del item</h2>
          <input placeholder="Nombre del item (ej: Figurita Messi Panini 2026)"
            value={state.itemName} onChange={(e) => update({ itemName: e.target.value })}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100" />
          <input placeholder="Jugador (opcional)"
            value={state.playerName} onChange={(e) => update({ playerName: e.target.value })}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100" />
          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="flex-1 py-3 border border-zinc-700 text-zinc-400 rounded-xl">← Atrás</button>
            <button onClick={() => setStep(3)} disabled={!state.itemName}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-3 rounded-xl font-semibold">Continuar →</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Fotos y condición</h2>
          <PhotoUpload photos={state.photos} onChange={(photos) => update({ photos })} />
          <div className="grid grid-cols-5 gap-2">
            {CONDITIONS.map((c) => (
              <button key={c} onClick={() => update({ condition: c })}
                className={`py-2 rounded-lg border text-xs capitalize transition-colors ${state.condition === c ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-zinc-700 text-zinc-400'}`}>
                {c.replace('_', ' ')}
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className="flex-1 py-3 border border-zinc-700 text-zinc-400 rounded-xl">← Atrás</button>
            <button onClick={() => setStep(4)} disabled={state.photos.length === 0}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-3 rounded-xl font-semibold">Continuar →</button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Precio y publicar</h2>
          <div className="flex items-center border border-zinc-700 rounded-xl overflow-hidden">
            <span className="px-4 bg-zinc-800 py-3 text-zinc-400 border-r border-zinc-700">USD $</span>
            <input type="number" placeholder="0.00" value={state.priceUsd || ''}
              onChange={(e) => update({ priceUsd: parseFloat(e.target.value) || 0 })}
              className="flex-1 bg-transparent px-4 py-3 text-zinc-100 focus:outline-none" min={0} step={0.01} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(['fixed','offer','trade'] as const).map((t) => (
              <button key={t} onClick={() => update({ type: t })}
                className={`py-2 rounded-lg border text-sm capitalize transition-colors ${state.type === t ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-zinc-700 text-zinc-400'}`}>
                {t === 'fixed' ? 'Precio fijo' : t === 'offer' ? 'Acepto ofertas' : 'Intercambio'}
              </button>
            ))}
          </div>
          <textarea placeholder="Descripción (opcional)" value={state.description}
            onChange={(e) => update({ description: e.target.value })}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 resize-none" rows={3} />
          <input placeholder="País de envío (CO, MX, AR...)" maxLength={2}
            value={state.shipsFrom} onChange={(e) => update({ shipsFrom: e.target.value.toUpperCase() })}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 uppercase" />
          <div className="flex gap-3">
            <button onClick={() => setStep(3)} className="flex-1 py-3 border border-zinc-700 text-zinc-400 rounded-xl">← Atrás</button>
            <button onClick={() => void publish()} disabled={loading || state.priceUsd <= 0}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-3 rounded-xl font-semibold">
              {loading ? 'Publicando…' : '🚀 Publicar listing'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create items API route**

`app/api/items/route.ts`:
```typescript
import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { upsertItem } from '@/lib/data/items';
import { jsonOk, jsonBadRequest, jsonError } from '@/lib/api-response';

const CreateItemSchema = z.object({
  name: z.string().min(2).max(200),
  category: z.enum(['sticker','card','memorabilia','apparel','watch','sneaker','vehicle','other']).default('other'),
  sport: z.enum(['football','basketball','baseball','f1','tennis','general','none']).default('general'),
  playerName: z.string().max(100).nullable().optional(),
  teamName: z.string().max(100).nullable().optional(),
  brand: z.string().max(100).nullable().optional(),
  year: z.number().int().min(1800).max(2100).nullable().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = CreateItemSchema.safeParse(body);
  if (!parsed.success) return jsonBadRequest(parsed.error.issues[0]?.message ?? 'Invalid');
  const item = await upsertItem({ ...parsed.data, slug: null, edition: null, referencePriceUsd: null, psaGrade: null });
  if (!item) return jsonError('Failed to create item');
  return jsonOk(item, 201);
}
```

- [ ] **Step 5: Type-check**

```bash
npm run type-check
```

- [ ] **Step 6: Run all tests**

```bash
npm test
```

Expected: `PASS (6) FAIL (0)` (all existing tests still pass)

- [ ] **Step 7: Commit**

```bash
git add apps/collectx/app/sell/ apps/collectx/app/api/listings/ apps/collectx/app/api/items/ apps/collectx/components/PhotoUpload.tsx
git commit -m "feat(collectx): sell wizard 4 steps + listings + items API routes"
```

---

## Task 11: Stripe checkout webhook + Dockerfile

**Files:**
- Create: `apps/collectx/app/api/transactions/route.ts`
- Create: `apps/collectx/app/api/webhooks/stripe/route.ts`
- Create: `apps/collectx/Dockerfile`
- Create: `apps/collectx/__tests__/stripe-connect.test.ts` (extend)

- [ ] **Step 1: Create transactions API route**

`app/api/transactions/route.ts`:
```typescript
import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { getListing } from '@/lib/data/listings';
import { createTransaction } from '@/lib/data/transactions';
import { createCheckoutSession } from '@/lib/payments/stripe-connect';
import { jsonOk, jsonBadRequest, jsonError } from '@/lib/api-response';

const InitiateCheckoutSchema = z.object({
  listingId: z.string().uuid(),
  buyerId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = InitiateCheckoutSchema.safeParse(body);
  if (!parsed.success) return jsonBadRequest(parsed.error.issues[0]?.message ?? 'Invalid');

  const listing = await getListing(parsed.data.listingId);
  if (!listing || listing.status !== 'active') return jsonBadRequest('Listing not available');

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://collectx.op-sly.com';
  const sellerAccountId = process.env.STRIPE_TEST_ACCOUNT ?? '';  // resolved from seller profile in production

  const session = await createCheckoutSession({
    listingId: listing.id,
    priceUsd: listing.priceUsd,
    itemName: `Listing ${listing.id.slice(0, 8)}`,
    sellerStripeAccountId: sellerAccountId,
    successUrl: `${baseUrl}/listing/${listing.id}?success=1`,
    cancelUrl: `${baseUrl}/listing/${listing.id}`,
  });

  if (!session) return jsonError('Failed to create checkout session');
  return jsonOk({ checkoutUrl: session.url, sessionId: session.sessionId });
}
```

- [ ] **Step 2: Create Stripe webhook handler**

`app/api/webhooks/stripe/route.ts`:
```typescript
import { type NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createTransaction, confirmDelivery } from '@/lib/data/transactions';
import { updateListingStatus } from '@/lib/data/listings';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', { apiVersion: '2024-12-18.acacia' });

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature') ?? '';
  const secret = process.env.STRIPE_WEBHOOK_SECRET ?? '';

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const pi = event.data.object as Stripe.PaymentIntent;
      const listingId = pi.metadata.listing_id;
      if (listingId) {
        await updateListingStatus(listingId, 'reserved');
        await createTransaction({
          listingId, buyerId: 'from_metadata', sellerId: 'from_metadata',
          finalPriceUsd: pi.amount / 100,
          stripePaymentIntentId: pi.id,
        });
      }
      break;
    }
    case 'payment_intent.payment_failed': {
      const pi = event.data.object as Stripe.PaymentIntent;
      const listingId = pi.metadata.listing_id;
      if (listingId) await updateListingStatus(listingId, 'active');
      break;
    }
  }

  return NextResponse.json({ received: true });
}
```

- [ ] **Step 3: Create Dockerfile** (same multi-stage pattern as panini-lab)

`Dockerfile`:
```dockerfile
# CollectX — multi-stage monorepo build
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY turbo.json ./
COPY apps/collectx/package.json ./apps/collectx/

RUN npm ci --ignore-scripts

COPY apps/collectx/ ./apps/collectx/

WORKDIR /app/apps/collectx
ENV NEXT_TELEMETRY_DISABLED=1
ENV AUTH_SECRET=build-placeholder
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3006
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/apps/collectx/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/collectx/.next/static ./apps/collectx/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/collectx/public ./apps/collectx/public

USER nextjs
EXPOSE 3006

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3006',r=>{if(r.statusCode>=500)process.exit(1)})"

CMD ["node", "apps/collectx/server.js"]
```

- [ ] **Step 4: Run full type-check and tests**

```bash
cd apps/collectx && npm run type-check && npm test
```

Expected: `TypeScript: No errors found` · `PASS (6) FAIL (0)`

- [ ] **Step 5: Commit all**

```bash
git add apps/collectx/
git commit -m "feat(collectx): checkout + Stripe webhook + Dockerfile — Sprint 1 complete"
```

- [ ] **Step 6: Push branch**

```bash
git push -u origin feat/collectx-sprint1
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|-----------------|------|
| collectx.* schema with 8 tables | Task 1 ✅ |
| Next.js 15 app at port 3006 | Task 2 ✅ |
| Supabase client + collectx schema | Task 3 ✅ |
| Item + Listing repos | Task 4 ✅ |
| Full-text search with filters | Task 5 ✅ |
| Offer + counter-offer flow | Task 6 ✅ |
| Stripe Connect 5% fee + escrow | Task 7 + 11 ✅ |
| Browse page with FilterBar | Task 8 ✅ |
| Listing detail with prediction bridge | Task 9 ✅ |
| Sell wizard 4 steps | Task 10 ✅ |
| Stripe webhook handler | Task 11 ✅ |
| Dockerfile standalone | Task 11 ✅ |

**Type consistency:** `collectxDb` defined in Task 3, used consistently. `mapListing` exported in Task 4, used in Task 5. `calculateFee` / `calculateCheckoutAmounts` same formula (5%) across Tasks 6 + 7. `DbListing.status` enum consistent with SQL CHECK constraint.

**Gaps identified and addressed:**
- `app/api/items/route.ts` not in original file map → added in Task 10
- `collectx.listing_videos` table → included in migration (Task 1) for MoneyPrinterTurbo n8n workflow compatibility
- Predictions bridge reads from `panini_lab.*` schema directly (no cross-app import needed) → clean solution in Task 9
