-- Discovery shared pool (M8) — the cost-cap milestone. A theme-keyed, NOT user-scoped corpus every
-- user draws from, so a theme is generated ONCE instead of per-user-per-open. Discovery reads filter +
-- order this pool (minus the user's words); per-user live generation stays only as an exhaustion
-- fallback. AI/TTS spend stops scaling with users. Apply-on-deploy.
--
-- Writes go exclusively through the service-role client (adminSupabase) in the fill route — there is
-- deliberately NO user-facing insert/update/delete policy. Reads are shared: any authenticated user
-- may SELECT the whole pool (the key departure from the app's own-row RLS everywhere else).
CREATE TABLE IF NOT EXISTS discovery_pool (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_key TEXT NOT NULL,                      -- a DISCOVERY_TOPICS key, or 'esencial' (curated essentials)
  word TEXT NOT NULL,                           -- bare Spanish headword, no article
  fr TEXT NOT NULL,                             -- short French gloss
  pos TEXT NOT NULL,                            -- standard notation (n.m., v., adj., …)
  gender TEXT CHECK (gender IN ('m', 'f')),     -- nullable: only gendered nouns
  example JSONB NOT NULL,                       -- { es, fr } — single, matches the discovery card
  band TEXT NOT NULL DEFAULT 'core' CHECK (band IN ('core', 'extended')),
  fill_source TEXT NOT NULL CHECK (fill_source IN ('generated', 'curated')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'flagged')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pool-level dedup: a word appears once per theme (case/space-insensitive on the headword).
CREATE UNIQUE INDEX IF NOT EXISTS discovery_pool_theme_word_idx
  ON discovery_pool (theme_key, lower(word));

-- Read path: filter by theme + active status, order by band.
CREATE INDEX IF NOT EXISTS discovery_pool_read_idx
  ON discovery_pool (theme_key, band, status);

ALTER TABLE discovery_pool ENABLE ROW LEVEL SECURITY;

-- Shared read: every logged-in user can read the whole pool. No user write policies exist, so all
-- inserts/updates/deletes require the service-role key (fill route). This is intentional.
CREATE POLICY "Authenticated users read the pool"
  ON discovery_pool FOR SELECT USING (auth.uid() IS NOT NULL);

NOTIFY pgrst, 'reload schema';
