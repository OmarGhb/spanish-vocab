ALTER TABLE words ADD COLUMN IF NOT EXISTS audio_urls JSONB;
NOTIFY pgrst, 'reload schema';
