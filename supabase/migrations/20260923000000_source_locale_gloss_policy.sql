-- M8 Phase 0 — split profiles.immersion_mode into two orthogonal axes:
--   source_locale  (fr | en)                  the language the learner thinks in
--   gloss_policy   (visible | tap | hidden)   how much translation they want
--
-- Additive + backfilled. immersion_mode is KEPT (deprecated), NOT dropped: the previous deploy
-- still reads it during the apply-on-deploy window, and the new code DUAL-WRITES it (see
-- immersionModeFor in lib/immersion.ts) so a rollback reads correct state. Dropped at Phase 2 close.
--
-- Defaults mirror the immersion_mode default ('fr_es'), so a profiles row that does not exist yet
-- (rows are created lazily on first settings write) resolves to fr + visible — byte-identical to
-- today. The CHECK already admits 'en' so Phase 1 needs no second migration; the API pins
-- source_locale to 'fr' until the Phase 1 discovery_pool EN backfill has shipped.
--
-- Apply-on-deploy. Mirrors 20260715000000_immersion_mode.sql.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS source_locale TEXT NOT NULL DEFAULT 'fr'
    CHECK (source_locale IN ('fr', 'en')),
  ADD COLUMN IF NOT EXISTS gloss_policy  TEXT NOT NULL DEFAULT 'visible'
    CHECK (gloss_policy IN ('visible', 'tap', 'hidden'));

-- Backfill. Total: immersion_mode is NOT NULL on every existing row (20260715000000).
--   fr_es → fr + visible   ·   immersion → fr + tap   ·   totale → fr + hidden
-- Every pre-Phase-0 user is Francophone, so source_locale is unconditionally 'fr'.
UPDATE profiles
SET source_locale = 'fr',
    gloss_policy  = CASE immersion_mode
                      WHEN 'fr_es'     THEN 'visible'
                      WHEN 'immersion' THEN 'tap'
                      WHEN 'totale'    THEN 'hidden'
                    END;

COMMENT ON COLUMN profiles.immersion_mode IS
  'DEPRECATED (M8 Phase 0) - superseded by source_locale x gloss_policy. Dual-written for rollback '
  'safety during the apply-on-deploy window; dropped at Phase 2 close. Do not read in new code.';

NOTIFY pgrst, 'reload schema';

-- ── Post-apply verification (run in the Supabase SQL editor; BOTH must return 0) ────────────────
--
-- 1. Every row maps to its today-equivalent pair:
--
--    SELECT count(*) FROM profiles
--    WHERE (immersion_mode, source_locale, gloss_policy) NOT IN
--          (('fr_es','fr','visible'), ('immersion','fr','tap'), ('totale','fr','hidden'));
--
-- 2. No row acquired a non-FR locale:
--
--    SELECT count(*) FROM profiles WHERE source_locale <> 'fr';
