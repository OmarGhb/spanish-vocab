-- M5.3c — Verb-conjugation drill: per-user drill preferences on the profiles table.
-- Stores the user's last-used tense selection + person scope, pre-filled into the
-- drill Setup screen each session (changeable per session). No FSRS impact — the
-- drill is pure practice and never touches review_cards / review_logs.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS drill_tenses       JSONB NOT NULL
    DEFAULT '["presente","preterito","imperfecto","futuro"]',
  ADD COLUMN IF NOT EXISTS drill_person_scope TEXT  NOT NULL DEFAULT 'singular'
    CHECK (drill_person_scope IN ('singular', 'all'));

-- Existing own-row RLS policies (select/insert/update) on `profiles` already cover
-- these columns — no new policy needed.

NOTIFY pgrst, 'reload schema';
