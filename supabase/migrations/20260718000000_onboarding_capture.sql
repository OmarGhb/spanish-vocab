-- Onboarding capture cluster (M6.2b) — the two profile fields the slice-2 steps collect. Mirrors the
-- prior profiles migrations; existing own-row RLS on `profiles` already covers the columns. Both
-- nullable (skip → null → the app's existing fallbacks: display_name → email derivation, level →
-- discovery's core-first default). Apply-on-deploy.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS display_name TEXT;

-- CEFR tier from the niveau step. The value set MUST match lib/discovery-pool.ts DiscoveryLevel — the
-- discovery pool's band ordering (M8) reads this column: a1/a2 → core-first, b1/b2 → extended-first.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS level TEXT CHECK (level IN ('a1', 'a2', 'b1', 'b2'));

NOTIFY pgrst, 'reload schema';
