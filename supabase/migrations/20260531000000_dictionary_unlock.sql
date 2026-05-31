-- M5.2b — Personal dictionary unlock: first per-user settings table.
-- Holds the sticky `dictionary_unlocked` flag. Access to /dictionary is governed
-- solely by this flag (sticky: once true, never reset even if memorized count drops).

CREATE TABLE IF NOT EXISTS profiles (
  user_id             UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  dictionary_unlocked BOOLEAN     NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own profile"
  ON profiles FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
