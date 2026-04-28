-- M2.5: migrate words.definition from TEXT to JSONB { es, fr }
-- Staging column strategy — zero data-loss window.

-- Step 1: add staging column
ALTER TABLE words ADD COLUMN definition_new JSONB;

-- Step 2: copy existing French text into new structure; es left empty for backfill script
UPDATE words
SET definition_new = jsonb_build_object('es', '', 'fr', definition);

-- Step 3: enforce NOT NULL now that every row has a value
ALTER TABLE words ALTER COLUMN definition_new SET NOT NULL;

-- Step 4: drop old TEXT column
ALTER TABLE words DROP COLUMN definition;

-- Step 5: rename to final name
ALTER TABLE words RENAME COLUMN definition_new TO definition;
