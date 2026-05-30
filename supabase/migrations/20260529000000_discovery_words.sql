-- M5.1 — Discovery mode: provenance + lifecycle on words, + a duplicate-card backstop.

-- Provenance, kept after promotion. Existing rows backfill to 'manual' via the default.
ALTER TABLE words ADD COLUMN IF NOT EXISTS origin TEXT NOT NULL DEFAULT 'manual'
  CHECK (origin IN ('manual', 'discovery'));

-- Discovery lifecycle (nullable; only set for origin='discovery').
ALTER TABLE words ADD COLUMN IF NOT EXISTS discovery_status TEXT
  CHECK (discovery_status IN ('pending', 'kept', 'promoted', 'known'));

-- Topic key the batch belongs to (for resume).
ALTER TABLE words ADD COLUMN IF NOT EXISTS discovery_topic TEXT;

-- Background-enrichment claim: atomic claim + stale-claim recovery (see /api/discovery/enrich).
ALTER TABLE words ADD COLUMN IF NOT EXISTS discovery_claimed_at TIMESTAMPTZ;

-- A discovery_status is only meaningful for discovery rows.
ALTER TABLE words DROP CONSTRAINT IF EXISTS discovery_status_origin_chk;
ALTER TABLE words ADD CONSTRAINT discovery_status_origin_chk
  CHECK (origin = 'discovery' OR discovery_status IS NULL);

-- Partial discovery rows carry no distractors and a single example — empty arrays are valid.
ALTER TABLE words ALTER COLUMN distractors SET DEFAULT '[]'::jsonb;
ALTER TABLE words ALTER COLUMN examples SET DEFAULT '[]'::jsonb;

-- Fast resume / enrich-claim lookups.
CREATE INDEX IF NOT EXISTS words_discovery_idx
  ON words (user_id, discovery_topic, discovery_status)
  WHERE origin = 'discovery';

-- Backstop against double-enrichment ever creating two cards for one word.
-- The claim mechanism already prevents this; the constraint is belt-and-suspenders.
ALTER TABLE review_cards DROP CONSTRAINT IF EXISTS review_cards_word_id_unique;
ALTER TABLE review_cards ADD CONSTRAINT review_cards_word_id_unique UNIQUE (word_id);

NOTIFY pgrst, 'reload schema';