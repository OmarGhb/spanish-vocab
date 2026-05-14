CREATE TABLE add_events (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type  TEXT        NOT NULL CHECK (event_type IN (
    'lemma_suggestion_shown',
    'lemma_suggestion_accepted',
    'lemma_collision_shown',
    'lemma_collision_open_existing',
    'lemma_collision_add_anyway'
  )),
  input_word  TEXT        NOT NULL,
  lemma       TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE add_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own events"
  ON add_events FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own events"
  ON add_events FOR INSERT WITH CHECK (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
