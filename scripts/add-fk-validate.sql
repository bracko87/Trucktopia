-- scripts/add-fk-validate.sql
--
-- Purpose:
--   Create supporting index and add a FOREIGN KEY from migration_items.migrated_collection_id
--   to migrated_collections.id using the safe NOT VALID -> VALIDATE pattern.
--
-- Notes:
-- - Run this only after taking a backup (see scripts/backup-instructions.txt).
-- - Adding the FK as NOT VALID is very fast and blocks little/no time. VALIDATE will check every row;
--   the validate step can be done when load is acceptable.
--
-- Usage:
--   psql "postgres://user:pass@host:port/dbname" -f scripts/add-fk-validate.sql
--
-- Step 0: Re-run quick verification (optional but recommended)
--   SELECT COUNT(*) FROM migration_items;
--   SELECT COUNT(*) FROM migrated_collections;
--   <run the mismatch query from your verification script to be extra safe>

-- Step 1: Create index (if missing)
CREATE INDEX IF NOT EXISTS idx_migration_items_migrated_collection_id
  ON migration_items(migrated_collection_id);

-- Step 2: Add FK constraint as NOT VALID (safe & instant)
ALTER TABLE migration_items
  ADD CONSTRAINT fk_migrated_collection
  FOREIGN KEY (migrated_collection_id)
  REFERENCES migrated_collections(id)
  NOT VALID;

-- Step 3: Quick metadata check to ensure constraint would be valid in theory.
-- This query returns any rows that would violate the FK (expected: zero rows).
WITH violating AS (
  SELECT mi.id, mi.migrated_collection_id
  FROM migration_items mi
  WHERE mi.migrated_collection_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM migrated_collections mc WHERE mc.id = mi.migrated_collection_id)
)
SELECT COUNT(*) AS violating_rows_count FROM violating;

-- If the violating_rows_count returns 0, proceed to validation.
-- Step 4: Validate the FK constraint (this scans the table)
-- NOTE: VALIDATE may take time depending on row counts and DB load — run during a maintenance window if you prefer.
ALTER TABLE migration_items VALIDATE CONSTRAINT fk_migrated_collection;

-- Step 5: Post-validate quick checks (optional)
-- Confirm constraint is validated and present:
SELECT conname, convalidated
FROM pg_constraint
WHERE conname = 'fk_migrated_collection';

-- Confirm no mismatches remain:
SELECT
  mc.id,
  mc.collection_name,
  COALESCE(mc.items_count,0) AS items_count,
  COALESCE(mi.count,0) AS actual_count
FROM migrated_collections mc
LEFT JOIN (
  SELECT migrated_collection_id, COUNT(*) AS count
  FROM migration_items
  WHERE migrated_collection_id IS NOT NULL
  GROUP BY migrated_collection_id
) mi ON mi.migrated_collection_id = mc.id
WHERE COALESCE(mc.items_count,0) <> COALESCE(mi.count,0)
LIMIT 20;

-- End of script.
-- If you want, I can produce a version that runs VALIDATE in a transaction or with a progress notice. 