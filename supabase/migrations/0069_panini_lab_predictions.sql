-- Panini Lab v3 — Predictions engine: teams, players, fixtures, results,
--   match/player predictions, Polymarket markets, value signals, affiliate tracking.
-- Idempotent; does not modify other tenant schemas.

BEGIN;

-- ── Teams ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS panini_lab.wc_teams (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  api_id        integer     UNIQUE,          -- API-Football team ID
  name          text        NOT NULL UNIQUE,
  short_name    text,
  iso           text,                        -- ISO alpha-2 flag code
  group_stage   text,                        -- 'A'..'L' (48 teams, 12 groups)
  continent     text,
  fifa_rank     integer,
  recent_form   numeric(5,2),               -- 0–100
  wc_wins       integer     NOT NULL DEFAULT 0,
  logo_url      text,
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ── Players ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS panini_lab.wc_players (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  api_id        integer     UNIQUE,          -- API-Football player ID
  team_id       uuid        REFERENCES panini_lab.wc_teams(id) ON DELETE CASCADE,
  name          text        NOT NULL,
  position      text,                        -- Goalkeeper / Defender / Midfielder / Attacker
  nationality   text,
  age           integer,
  jersey_number integer,
  photo_url     text,
  -- Season stats (current season)
  goals         integer     NOT NULL DEFAULT 0,
  assists       integer     NOT NULL DEFAULT 0,
  yellow_cards  integer     NOT NULL DEFAULT 0,
  red_cards     integer     NOT NULL DEFAULT 0,
  minutes_played integer    NOT NULL DEFAULT 0,
  shots_total   integer     NOT NULL DEFAULT 0,
  rating        numeric(4,2),               -- API-Football player rating
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_panini_players_team
  ON panini_lab.wc_players (team_id);

-- ── Fixtures ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS panini_lab.wc_fixtures (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  api_id        integer     UNIQUE,
  home_team_id  uuid        REFERENCES panini_lab.wc_teams(id),
  away_team_id  uuid        REFERENCES panini_lab.wc_teams(id),
  stage         text,                        -- 'Group A', 'Round of 32', 'Final', etc.
  match_date    timestamptz,
  venue         text,
  city          text,
  status        text        NOT NULL DEFAULT 'scheduled', -- scheduled|live|finished|postponed
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_panini_fixtures_date
  ON panini_lab.wc_fixtures (match_date);
CREATE INDEX IF NOT EXISTS idx_panini_fixtures_status
  ON panini_lab.wc_fixtures (status);

-- ── Results ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS panini_lab.wc_results (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  fixture_id    uuid        UNIQUE REFERENCES panini_lab.wc_fixtures(id) ON DELETE CASCADE,
  home_goals    integer,
  away_goals    integer,
  winner        text,                        -- 'home'|'away'|'draw'
  home_goals_ht integer,                     -- half-time
  away_goals_ht integer,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ── Match predictions ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS panini_lab.wc_match_predictions (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  fixture_id      uuid        UNIQUE REFERENCES panini_lab.wc_fixtures(id) ON DELETE CASCADE,
  prob_home_win   numeric(5,2),             -- 0–100
  prob_draw       numeric(5,2),
  prob_away_win   numeric(5,2),
  predicted_home  integer,                  -- most likely score
  predicted_away  integer,
  model_version   text        NOT NULL DEFAULT 'v1-poisson',
  collection_bonus_applied boolean NOT NULL DEFAULT false,
  computed_at     timestamptz NOT NULL DEFAULT now()
);

-- ── Player predictions ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS panini_lab.wc_player_predictions (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id       uuid        REFERENCES panini_lab.wc_players(id) ON DELETE CASCADE,
  fixture_id      uuid        REFERENCES panini_lab.wc_fixtures(id) ON DELETE CASCADE,
  prob_goal       numeric(5,2),             -- probability of scoring
  prob_assist     numeric(5,2),
  prob_yellow     numeric(5,2),
  prob_red        numeric(5,2),
  model_version   text        NOT NULL DEFAULT 'v1-stats',
  computed_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (player_id, fixture_id)
);

-- ── Polymarket markets ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS panini_lab.polymarket_markets (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  condition_id    text        UNIQUE NOT NULL,  -- Polymarket condition ID
  question        text        NOT NULL,
  category        text,                         -- 'tournament'|'match'|'player'
  fixture_id      uuid        REFERENCES panini_lab.wc_fixtures(id),
  team_id         uuid        REFERENCES panini_lab.wc_teams(id),
  player_id       uuid        REFERENCES panini_lab.wc_players(id),
  outcome_yes_price numeric(5,4),              -- USDC price (0–1) for YES
  outcome_no_price  numeric(5,4),
  volume_usdc     numeric(18,2),
  closes_at       timestamptz,
  active          boolean     NOT NULL DEFAULT true,
  fetched_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_panini_polymarket_fixture
  ON panini_lab.polymarket_markets (fixture_id);
CREATE INDEX IF NOT EXISTS idx_panini_polymarket_active
  ON panini_lab.polymarket_markets (active, fetched_at DESC);

-- ── Value signals ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS panini_lab.value_signals (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id       uuid        REFERENCES panini_lab.polymarket_markets(id) ON DELETE CASCADE,
  our_prob        numeric(5,2),             -- our model probability (0–100)
  market_implied  numeric(5,2),             -- market implied probability (0–100)
  edge            numeric(6,2),             -- our_prob - market_implied (can be negative)
  signal          text,                     -- 'strong_value'|'value'|'fair'|'overpriced'
  polymarket_url  text,
  computed_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_panini_value_signals_edge
  ON panini_lab.value_signals (edge DESC);

-- ── Affiliate clicks ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS panini_lab.affiliate_clicks (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      text,                     -- anonymous session hash
  market_id       uuid        REFERENCES panini_lab.polymarket_markets(id),
  signal_id       uuid        REFERENCES panini_lab.value_signals(id),
  ref_code        text,                     -- affiliate ref param
  destination_url text,
  ip_country      text,                     -- 2-letter ISO country (geo-detected)
  user_agent      text,
  clicked_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_panini_affiliate_clicks_market
  ON panini_lab.affiliate_clicks (market_id, clicked_at DESC);

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE panini_lab.wc_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE panini_lab.wc_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE panini_lab.wc_fixtures ENABLE ROW LEVEL SECURITY;
ALTER TABLE panini_lab.wc_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE panini_lab.wc_match_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE panini_lab.wc_player_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE panini_lab.polymarket_markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE panini_lab.value_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE panini_lab.affiliate_clicks ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "service_role_all_wc_teams"
    ON panini_lab.wc_teams FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "service_role_all_wc_players"
    ON panini_lab.wc_players FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "service_role_all_wc_fixtures"
    ON panini_lab.wc_fixtures FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "service_role_all_wc_results"
    ON panini_lab.wc_results FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "service_role_all_wc_match_predictions"
    ON panini_lab.wc_match_predictions FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "service_role_all_wc_player_predictions"
    ON panini_lab.wc_player_predictions FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "service_role_all_polymarket_markets"
    ON panini_lab.polymarket_markets FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "service_role_all_value_signals"
    ON panini_lab.value_signals FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "service_role_all_affiliate_clicks"
    ON panini_lab.affiliate_clicks FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT USAGE ON SCHEMA panini_lab TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA panini_lab TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA panini_lab TO service_role;

COMMIT;
