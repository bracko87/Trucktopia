/**
 * scripts/insert_placeholder_migration_items.sql
 *
 * @fileoverview
 * Safely insert placeholder migration_items rows for any migrated_collections that
 * currently have no migration_items row and are not yet marked as 'imported'.
 *
 * Behavior:
 * - For each migrated_collections row where NOT EXISTS migration_items.migrated_collection_id = migrated_collections.id
 *   and migrated_collections.status != 'imported':
 *     * Creates a single migration_items row with:
 *         - collection_name (from migrated_collections.collection_name)
 *         - migrated_collection_id (from migrated_collections.id)
 *         - item (jsonb placeholder containing original_data where available)
 *         - imported_at set to now()
 *     * Marks the migrated_collections row as status = 'imported' and imported_at = now()
 *
 * Safety notes:
 * - Run the preview SELECT (below, commented) to inspect affected rows before executing.
 * - This runs in a single transaction. If anything fails the whole operation is rolled back.
 * - Back up your database or test on a staging copy first.
 */

/*
-- Preview the rows that would be affected (run this first, do NOT run the INSERT/UPDATE yet)
SELECT mc.id, mc.collection_name, mc.status, mc.data
FROM migrated_collections mc
WHERE mc.status != 'imported'
  AND NOT EXISTS (SELECT 1 FROM migration_items mi WHERE mi.migrated_collection_id = mc.id)
ORDER BY mc.id
LIMIT 200;
*/

BEGIN;

WITH to_insert AS (
  /*
   * Build one placeholder JSON item per migrated_collections row missing migration_items.
   * The placeholder preserves mc.data in original_data where possible.
   */
  SELECT
    mc.id AS migrated_collection_id,
    mc.collection_name,
    CASE
      WHEN mc.data IS NULL THEN
        jsonb_build_object(
          'placeholder', true,
          'reason', 'staged data is NULL',
          'original_data', NULL
        )
      WHEN jsonb_typeof(mc.data) = 'array' AND jsonb_array_length(mc.data) = 0 THEN
        jsonb_build_object(
          'placeholder', true,
          'reason', 'staged array empty',
          'original_data', mc.data
        )
      ELSE
        /* For arrays/objects/primitives we wrap the original data so nothing is lost. */
        jsonb_build_object(
          'placeholder', true,
          'reason', 'staged data preserved (wrapped)',
          'original_data', mc.data
        )
    END AS item
  FROM migrated_collections mc
  WHERE mc.status != 'imported'
    AND NOT EXISTS (
      SELECT 1 FROM migration_items mi WHERE mi.migrated_collection_id = mc.id
    )
)
, inserted AS (
  /*
   * Insert placeholder migration_items rows.
   * Return migrated_collection_id so we can update the source rows afterwards.
   */
  INSERT INTO migration_items (collection_name, migrated_collection_id, item, imported_at)
  SELECT collection_name, migrated_collection_id, item, now() FROM to_insert
  RETURNING migrated_collection_id
)
-- Mark the migrated_collections rows as imported so they are no longer considered "missing".
UPDATE migrated_collections
SET status = 'imported',
    imported_at = now()
WHERE id IN (SELECT migrated_collection_id FROM inserted);

COMMIT;

/*
-- Optional verification (run after this script completes):
-- 1) Count inserted placeholders in last N minutes:
SELECT COUNT(*) AS placeholders_inserted
FROM migration_items
WHERE imported_at >= now() - interval '30 minutes'
  AND item ? 'placeholder';

-- 2) Re-check missing collections (should be zero):
SELECT COUNT(*) AS missing_collections
FROM migrated_collections mc
LEFT JOIN migration_items mi ON mi.migrated_collection_id = mc.id
WHERE mi.id IS NULL AND mc.status != 'imported';
*/
