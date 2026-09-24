-- M8 Phase 1a — additive EN gloss on the shared discovery pool.
--
-- Nullable with NO default: a row that has no English gloss yet is the honest state, and the
-- missing-gloss rule (lib/bilingual.ts `glossFor`) renders Spanish-only for that row rather than
-- falling back to French. A '' default would make "not yet translated" indistinguishable from
-- "translated to empty".
--
-- Untouched by design: the (theme_key, lower(word)) unique index, the (theme_key, band, status)
-- read index, RLS, and 20260824000000_discovery_pool_seed.sql. The seed's contract is
-- `ON CONFLICT ... DO NOTHING` on all 10 of its INSERTs, so replaying it can never overwrite the
-- EN values a later data migration writes — verified before this milestone was planned.
--
-- `example` JSONB gains an `en` key with no DDL at all.
--
-- The EN content itself lands separately, in Phase 1b's generated data migration, after human
-- review of the proposed glosses. This migration only makes the column exist.
--
-- Apply-on-deploy, in either order relative to the deploy: nothing reads `en` yet, and every
-- existing SELECT names its columns explicitly, so adding one is invisible to the running app.

ALTER TABLE discovery_pool ADD COLUMN IF NOT EXISTS en TEXT;

NOTIFY pgrst, 'reload schema';

-- ── Post-apply verification (Supabase SQL editor) ──────────────────────────────────────────────
--
-- The column exists and every row is NULL (nothing has been translated yet):
--
--    SELECT count(*) AS total, count(en) AS with_en FROM discovery_pool;
--    -- expect: total = 672, with_en = 0
--
-- After Phase 1b's data migration, this is the one that must return 0:
--
--    SELECT count(*) FROM discovery_pool
--    WHERE status = 'active' AND (en IS NULL OR example->>'en' IS NULL);
