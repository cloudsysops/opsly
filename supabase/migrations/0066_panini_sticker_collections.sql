-- Migration: 0066 - Panini Sticker Collections Schema
-- Phase 1 of BBC sticker assistant implementation
-- Tables: tournaments, stickers, sticker_inventory, sticker_wishlist, sticker_marketplace_listings

-- Tournaments table: Collections (World Cup, Euros, Copa America, etc)
CREATE TABLE IF NOT EXISTS public.tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,                    -- "World Cup 2022", "Euros 2024"
  year INT NOT NULL,
  country TEXT,
  total_stickers INT,                    -- Total cards in collection
  total_cards INT DEFAULT 0,             -- Unique cards (some repeat in sets)
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stickers table: Individual card definitions
CREATE TABLE IF NOT EXISTS public.stickers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  number INT NOT NULL,                   -- Card number (1-682, etc)
  player_name TEXT,
  country TEXT,                          -- Team/country represented
  position TEXT,                         -- goalkeeper, defender, midfielder, forward
  club_name TEXT,
  jersey_number INT,
  rarity_level TEXT,                     -- 'common', 'rare', 'ultra_rare'
  card_type TEXT,                        -- 'player', 'team_badge', 'coach', 'special'
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tournament_id, number)
);

-- Sticker inventory: Which stickers user owns
CREATE TABLE IF NOT EXISTS public.sticker_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,                 -- FK to auth.users
  sticker_id UUID NOT NULL REFERENCES public.stickers(id) ON DELETE CASCADE,
  quantity INT DEFAULT 1,                -- Duplicates
  condition TEXT,                        -- 'mint', 'near_mint', 'used'
  acquired_date TIMESTAMPTZ,
  source TEXT,                           -- 'purchased', 'traded', 'scanned'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, user_id, sticker_id)
);

-- Sticker wishlist: Stickers user wants
CREATE TABLE IF NOT EXISTS public.sticker_wishlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  sticker_id UUID NOT NULL REFERENCES public.stickers(id) ON DELETE CASCADE,
  priority INT,                          -- 1=urgent, 5=nice_to_have
  max_price DECIMAL(10,2),               -- Budget for this sticker
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, user_id, sticker_id)
);

-- Marketplace listings: Cache of prices from different venues
CREATE TABLE IF NOT EXISTS public.sticker_marketplace_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sticker_id UUID NOT NULL REFERENCES public.stickers(id) ON DELETE CASCADE,
  marketplace TEXT,                      -- 'mercadolibre', 'ebay', 'facebook', 'local'
  seller_id TEXT,
  price DECIMAL(10,2),
  currency TEXT DEFAULT 'ARS',           -- Currency (ARS, USD, etc)
  listing_url TEXT,
  condition TEXT,                        -- 'mint', 'used', 'near_mint'
  shipping_cost DECIMAL(10,2),
  shipping_time_days INT,
  seller_rating FLOAT,
  in_stock BOOLEAN DEFAULT true,
  scraped_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,                -- Cache expiry
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stickers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sticker_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sticker_wishlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sticker_marketplace_listings ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see own tenant tournaments
CREATE POLICY "sticker_tournaments_tenant_isolation"
  ON public.tournaments
  FOR SELECT
  USING (tenant_id = current_setting('request.jwt.claims', true)::jsonb->>'tenant_id');

-- RLS Policy: Users can only see stickers from own tenant
CREATE POLICY "sticker_cards_tenant_isolation"
  ON public.stickers
  FOR SELECT
  USING (tenant_id = current_setting('request.jwt.claims', true)::jsonb->>'tenant_id');

-- RLS Policy: Users can only see/manage own inventory
CREATE POLICY "sticker_inventory_user_isolation"
  ON public.sticker_inventory
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR auth.role() = 'service_role'
  );

CREATE POLICY "sticker_inventory_user_insert"
  ON public.sticker_inventory
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "sticker_inventory_user_update"
  ON public.sticker_inventory
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "sticker_inventory_user_delete"
  ON public.sticker_inventory
  FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policy: Users can only see/manage own wishlist
CREATE POLICY "sticker_wishlist_user_isolation"
  ON public.sticker_wishlist
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR auth.role() = 'service_role'
  );

CREATE POLICY "sticker_wishlist_user_insert"
  ON public.sticker_wishlist
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "sticker_wishlist_user_update"
  ON public.sticker_wishlist
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "sticker_wishlist_user_delete"
  ON public.sticker_wishlist
  FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policy: Marketplace listings are readable by all (public prices)
-- but only service_role can write/update
CREATE POLICY "sticker_marketplace_listings_read"
  ON public.sticker_marketplace_listings
  FOR SELECT
  USING (true);

CREATE POLICY "sticker_marketplace_listings_write"
  ON public.sticker_marketplace_listings
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "sticker_marketplace_listings_update"
  ON public.sticker_marketplace_listings
  FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tournaments_tenant_id ON public.tournaments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stickers_tournament_id ON public.stickers(tournament_id);
CREATE INDEX IF NOT EXISTS idx_stickers_tenant_id ON public.stickers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stickers_player_name ON public.stickers(player_name);
CREATE INDEX IF NOT EXISTS idx_sticker_inventory_user_id ON public.sticker_inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_sticker_inventory_tenant_user ON public.sticker_inventory(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_sticker_wishlist_user_id ON public.sticker_wishlist(user_id);
CREATE INDEX IF NOT EXISTS idx_sticker_wishlist_tenant_user ON public.sticker_wishlist(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_sticker_marketplace_listings_sticker ON public.sticker_marketplace_listings(sticker_id);
CREATE INDEX IF NOT EXISTS idx_sticker_marketplace_listings_marketplace ON public.sticker_marketplace_listings(marketplace);
