-- Theming — add four palettes to the color-theme picker (Fiesta · Olive · Prune · Aubergine).
-- The theme column's CHECK constraint (from 20260621000000_theme_pref.sql) hard-lists the allowed
-- ids, so it must be widened or the profiles write is rejected for any new theme. Drop the old
-- inline-named constraint and re-add the full set under an explicit name.
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_theme_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_theme_check
    CHECK (theme IN ('sepia', 'ardoise', 'indigo', 'nuit', 'fiesta', 'olive', 'prune', 'aubergine'));

NOTIFY pgrst, 'reload schema';
