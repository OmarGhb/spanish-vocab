-- M5.5i — Profil / Préférences settings surface: three per-user live-control prefs on `profiles`.
--   cards_per_session — review session size (the cap read by /review's initial fetch + the
--                       in-session "Encore N" refetch); range 10–50 enforced in the UI.
--   autoplay_audio    — auto-play the word's cached audio when the review answer is revealed.
--   playback_speed    — 'lent' | 'normal' | 'rapide'; mapped to an HTMLMediaElement.playbackRate
--                       over the EXISTING cached MP3 (baked at GCP speakingRate 0.9). No re-synthesis,
--                       no cache touch. 'normal' = today's default (playbackRate 1.0). See lib/playback-speed.ts.
-- (No `révisions` column — that figure is a COUNT(*) over review_logs for the user, not stored.)

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS cards_per_session INT     NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS autoplay_audio    BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS playback_speed    TEXT    NOT NULL DEFAULT 'normal'
    CHECK (playback_speed IN ('lent', 'normal', 'rapide'));

-- Existing own-row RLS policies (select/insert/update) on `profiles` already cover these columns
-- — no new policy needed.

NOTIFY pgrst, 'reload schema';
