-- First-run onboarding gate (M6.2a) — per-user flag on the profiles row. false = the user has not
-- finished (or skipped) the post-signup onboarding flow yet; the (app) layout redirects them into
-- /onboarding until it flips true (set on completion OR "Passer"). Mirrors the theme_pref /
-- immersion_mode pattern; existing own-row RLS on `profiles` already covers the column.
--
-- Backfill: every row that exists at migration time predates onboarding, so mark it completed — we
-- don't want to force existing users through a flow they've effectively already lived. Only NEW
-- signups (row created lazily after this migration) inherit the false default and see onboarding.
-- Apply-on-deploy.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false;

UPDATE profiles SET onboarding_completed = true WHERE onboarding_completed = false;

NOTIFY pgrst, 'reload schema';
