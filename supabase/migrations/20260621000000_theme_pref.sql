-- Theming milestone — per-user color theme on the profiles row. Drives the root data-theme
-- attribute (Sépia default · Ardoise · Indigo · Nuit/dark). Mirrors the M5.5i settings pattern;
-- existing own-row RLS on `profiles` already covers the column.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS theme TEXT NOT NULL DEFAULT 'sepia'
    CHECK (theme IN ('sepia', 'ardoise', 'indigo', 'nuit'));

NOTIFY pgrst, 'reload schema';
