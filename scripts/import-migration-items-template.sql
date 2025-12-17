-- import-migration-items-template.sql
--
-- Supabase / Postgres SQL template to import a migration payload JSON array into migration_items.
-- Usage:
-- 1) Open Supabase SQL editor.
-- 2) Create a small test payload: copy a small portion of migration-payload.json and paste it between the $$ markers below
--    OR replace the entire [ ... ] JSON with your file's array.
-- 3) First run the PREVIEW SELECT (uncomment PREVIEW block) to inspect the payload rows that will be inserted.
-- 4) When satisfied, run the INSERT block.
--
-- IMPORTANT: Start with a small payload (1-5 entries) to test. You already created backup_migration_items; restore if needed.

-- Example structure expected in the JSON array:
-- [
--   {
--     "id": "uuid-string",
--     "migrated_collection_id": null,
--     "collection_name": "tm_game_state",
--     "item": { ... arbitrary JSON ... },
--     "inserted_at": "2025-11-19T12:34:56.000Z"
--   },
--   ...
-- ]

/* === STEP 1: Paste your exported JSON array inside the $$...$$ below === */
WITH payload AS (
  SELECT $$ 
  [ /* <-- REPLACE THIS with the JSON array contents from migration-payload.json */ ]
  $$::jsonb AS data
),

-- Unpack the array into rows
payload_items AS (
  SELECT
    (elem ->> 'id')::uuid AS id,
    NULLIF(elem ->> 'migrated_collection_id', 'null')::uuid AS migrated_collection_id,
    (elem ->> 'collection_name')::text AS collection_name,
    elem -> 'item' AS item,
    COALESCE((elem ->> 'inserted_at')::timestamptz, now()) AS inserted_at
  FROM payload, jsonb_array_elements(payload.data) AS elems(elem)
)

-- === PREVIEW (run this first to inspect what will be inserted) ===
-- SELECT * FROM payload_items LIMIT 50;

-- === WHEN READY: run the INSERT below to push into migration_items ===
INSERT INTO migration_items (id, migrated_collection_id, collection_name, item, inserted_at)
SELECT id, migrated_collection_id, collection_name, item, inserted_at
FROM payload_items;

/* === OPTIONAL: validation queries ===
-- Count how many were inserted from your payload by timestamp window
SELECT COUNT(*) FROM migration_items WHERE inserted_at >= now() - interval '1 hour';

-- Show a few sample items
SELECT id, collection_name, jsonb_pretty(item) AS item_preview FROM migration_items ORDER BY inserted_at DESC LIMIT 20;
*/
