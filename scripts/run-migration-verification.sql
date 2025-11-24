/**
 * scripts/run-migration-verification.sql
 *
 * Purpose:
 * - Run a full verification suite for the migration -> migration_items import.
 * - Check counts, NULLs, orphan rows, and consistency between migrated_collections.items_count
 *   and the actual number of migration_items per migrated_collection.
 *
 * Usage:
 * - Run this in psql, Supabase SQL editor, or your DB admin tool.
 * - Review results. If any mismatch / problem rows are found, read the remediation notes below
 *   and reply which remediation step you want to run (I can prepare the exact SQL).
 *
 * Notes:
 * - This file is read-only verification by default. Any fix/update SQL is provided commented-out
 *   so you can review before applying.
 */

-- 1) OVERALL COUNTS
-- Number of rows in migration_items and number of migrated collections
SELECT COUNT(*) AS total_migration_items FROM migration_items;
SELECT COUNT(*) AS migrated_collections_total FROM migrated_collections;

-- 2) NULL / NOT-NULL SANITY CHECKS
-- items_count should not be NULL on migrated_collections
SELECT COUNT(*) AS items_count_null
FROM migrated_collections
WHERE items_count IS NULL;

-- collection_name is NOT NULL on migration_items; verify no rows violate this
SELECT COUNT(*) AS migration_items_missing_collection_name
FROM migration_items
WHERE collection_name IS NULL;

-- 3) ORPHAN DETECTION
-- migration_items rows that reference a non-existent migrated_collections.id
SELECT COUNT(*) AS migration_items_with_missing_mc
FROM migration_items mi
WHERE mi.migrated_collection_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM migrated_collections mc WHERE mc.id = mi.migrated_collection_id);

-- If you want details of the first few orphan rows:
SELECT mi.id, mi.collection_name, mi.migrated_collection_id, mi.imported_at
FROM migration_items mi
WHERE mi.migrated_collection_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM migrated_collections mc WHERE mc.id = mi.migrated_collection_id)
LIMIT 50;

-- 4) items_count CONSISTENCY CHECK (list mismatches)
-- For each migrated_collections row show items_count vs actual count from migration_items
SELECT
  mc.id,
  mc.collection_name,
  COALESCE(mc.items_count,0) AS items_count,
  COALESCE(mi.count,0) AS actual_count,
  COALESCE(mc.items_count,0) - COALESCE(mi.count,0) AS diff
FROM migrated_collections mc
LEFT JOIN (
  SELECT migrated_collection_id, COUNT(*) AS count
  FROM migration_items
  WHERE migrated_collection_id IS NOT NULL
  GROUP BY migrated_collection_id
) mi ON mi.migrated_collection_id = mc.id
WHERE COALESCE(mc.items_count,0) <> COALESCE(mi.count,0)
ORDER BY diff DESC
LIMIT 200;

-- 5) QUICK PROBE FOR TEST / PROBE ROWS (none expected)
SELECT id, collection_name, migrated_collection_id, imported_at
FROM migration_items
WHERE item->> '__test' = 'trigger';

-- 6) TOP COLLECTIONS BY ACTUAL COUNT (spot check)
SELECT mc.id, mc.collection_name, mc.items_count, COALESCE(mi.count,0) AS actual_count
FROM migrated_collections mc
LEFT JOIN (
  SELECT migrated_collection_id, COUNT(*) AS count
  FROM migration_items
  WHERE migrated_collection_id IS NOT NULL
  GROUP BY migrated_collection_id
) mi ON mi.migrated_collection_id = mc.id
ORDER BY actual_count DESC
LIMIT 50;

--------------------------------------------------------------------------------
-- REMEDIATION OPTIONS (commented-out; run only after taking a backup and confirming)
--------------------------------------------------------------------------------

/*
-- A) Normalize migrated_collections.items_count to the actual values.
-- Recommended when you trust migration_items as source of truth and want to repair any drift.
-- Safe approach: run inside a transaction on a maintenance window or after backup.

BEGIN;
-- Set items_count to the counted value where there is at least one migration_items row
UPDATE migrated_collections mc
SET items_count = mi.count
FROM (
  SELECT migrated_collection_id, COUNT(*) AS count
  FROM migration_items
  WHERE migrated_collection_id IS NOT NULL
  GROUP BY migrated_collection_id
) mi
WHERE mc.id = mi.migrated_collection_id;

-- Ensure collections with zero items get a 0 value
UPDATE migrated_collections
SET items_count = 0
WHERE id NOT IN (
  SELECT DISTINCT migrated_collection_id FROM migration_items WHERE migrated_collection_id IS NOT NULL
);

-- Verify a sample after update
SELECT id, collection_name, items_count FROM migrated_collections ORDER BY items_count DESC LIMIT 20;

COMMIT;
*/

--------------------------------------------------------------------------------

/*
-- B) Delete accidental probe/test rows inserted earlier (safe if you are sure they are test rows).
-- This example removes rows that have the probe flag __test in the JSON payload.

BEGIN;
DELETE FROM migration_items
WHERE item->> '__test' = 'trigger'
RETURNING id, collection_name, migrated_collection_id, imported_at;
COMMIT;
*/

--------------------------------------------------------------------------------

/*
-- C) If there are migration_items rows referencing non-existent migrated_collections
-- you have several options:
-- 1) Move them to a "orphaned" collection name: UPDATE SET collection_name = 'orphaned:<old_mc_id>';
-- 2) Set migrated_collection_id = NULL so they remain in migration_items but not linked;
-- 3) Delete them if they are known to be invalid.

-- Example: set migrated_collection_id = NULL for orphan rows (non-destructive)
BEGIN;
UPDATE migration_items mi
SET migrated_collection_id = NULL
WHERE mi.migrated_collection_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM migrated_collections mc WHERE mc.id = mi.migrated_collection_id)
RETURNING id, collection_name, migrated_collection_id;
COMMIT;
*/

--------------------------------------------------------------------------------

/*
-- D) Add FOREIGN KEY constraint safely (NOT VALID then VALIDATE).
-- Run only after verification + backup.

CREATE INDEX IF NOT EXISTS idx_migration_items_migrated_collection_id ON migration_items(migrated_collection_id);

ALTER TABLE migration_items
ADD CONSTRAINT fk_migrated_collection
FOREIGN KEY (migrated_collection_id)
REFERENCES migrated_collections(id)
NOT VALID;

-- Validate when ready (this scans the table)
ALTER TABLE migration_items VALIDATE CONSTRAINT fk_migrated_collection;
*/

--------------------------------------------------------------------------------
-- End of script
--------------------------------------------------------------------------------
