ALTER TABLE words ADD COLUMN IF NOT EXISTS form_annotation TEXT;
NOTIFY pgrst, 'reload schema';
