-- FR/ES immersion layer (M6.1a) — per-user immersion mode on the profiles row. Drives the
-- mode-aware chrome resolver + French-gloss gating (fr_es default = today's exact behavior ·
-- immersion = ES chrome + FR tap-to-reveal · totale = ES chrome, no FR). Mirrors the theme_pref
-- pattern; existing own-row RLS on `profiles` already covers the column. Apply-on-deploy.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS immersion_mode TEXT NOT NULL DEFAULT 'fr_es'
    CHECK (immersion_mode IN ('fr_es', 'immersion', 'totale'));

NOTIFY pgrst, 'reload schema';
