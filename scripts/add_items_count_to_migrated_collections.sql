/*
 * scripts/add_items_count_to_migrated_collections.sql
 *
 * Adds a maintained items_count column to migrated_collections and keeps it up-to-date.
 *
 * Behavior:
 * 1) Adds items_count INTEGER DEFAULT 0 if it doesn't exist.
 * 2) Populates items_count based on current migration_items counts.
 * 3) Ensures no NULL values remain.
 * 4) Creates an index on items_count.
 * 5) Creates/updates a trigger function that updates migrated_collections.items_count
 *    whenever migration_items rows are inserted/deleted/updated (handles migrated_collection_id changes).
 *
 * Usage:
 * - Paste the entire file into your SQL editor (or run with psql/docker).
 * - The script is idempotent and safe to re-run.
 *
 * Safety notes:
 * - Back up your DB or test on a staging copy before running in production if you prefer.
 * - The function/trigger is created with CREATE OR REPLACE and DROP TRIGGER IF EXISTS to avoid duplicate triggers.
 */
BEGIN;

-- 1) Add column if missing (default 0)
ALTER TABLE migrated_collections
  ADD COLUMN IF NOT EXISTS items_count integer DEFAULT 0;

-- 2) Populate items_count from migration_items
UPDATE migrated_collections mc
SET items_count = COALESCE(mi.count, 0)
FROM (
  SELECT migrated_collection_id, COUNT(*) AS count
  FROM migration_items
  WHERE migrated_collection_id IS NOT NULL
  GROUP BY migrated_collection_id
) mi
WHERE mc.id = mi.migrated_collection_id;

-- 3) Ensure any remaining NULLs are set to 0
UPDATE migrated_collections
SET items_count = 0
WHERE items_count IS NULL;

-- 4) Add index to speed up queries filtering/sorting by items_count
CREATE INDEX IF NOT EXISTS idx_migrated_collections_items_count
ON migrated_collections(items_count);

-- 5) Create/replace trigger function to maintain items_count on migration_items changes
CREATE OR REPLACE FUNCTION trg_migrated_collections_update_items_count()
RETURNS trigger
LANGUAGE plpgsql AS $$
/**
 * trg_migrated_collections_update_items_count
 *
 * Keeps migrated_collections.items_count accurate when migration_items are added/removed/updated.
 *
 * Behavior:
 * - AFTER INSERT: increment items_count for NEW.migrated_collection_id
 * - AFTER DELETE:  decrement items_count for OLD.migrated_collection_id (floor at 0)
 * - AFTER UPDATE: handle migrated_collection_id changes (decrement old, increment new)
 */
BEGIN
  IF (TG_OP = 'INSERT') THEN
    IF NEW.migrated_collection_id IS NOT NULL THEN
      UPDATE migrated_collections
      SET items_count = COALESCE(items_count, 0) + 1
      WHERE id = NEW.migrated_collection_id;
    END IF;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    IF OLD.migrated_collection_id IS NOT NULL THEN
      UPDATE migrated_collections
      SET items_count = GREATEST(COALESCE(items_count, 0) - 1, 0)
      WHERE id = OLD.migrated_collection_id;
    END IF;
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    -- If migrated_collection_id changed, decrement old and increment new
    IF OLD.migrated_collection_id IS NOT NULL AND OLD.migrated_collection_id <> NEW.migrated_collection_id THEN
      UPDATE migrated_collections
      SET items_count = GREATEST(COALESCE(items_count, 0) - 1, 0)
      WHERE id = OLD.migrated_collection_id;
    END IF;

    IF NEW.migrated_collection_id IS NOT NULL AND OLD.migrated_collection_id <> NEW.migrated_collection_id THEN
      UPDATE migrated_collections
      SET items_count = COALESCE(items_count, 0) + 1
      WHERE id = NEW.migrated_collection_id;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NULL; -- Should not reach here
END;
$$;

-- Ensure we don't create duplicate triggers: drop existing trigger if present
DROP TRIGGER IF EXISTS migration_items_items_count_trg ON migration_items;

-- Create trigger to run AFTER INSERT, DELETE or UPDATE on migration_items
CREATE TRIGGER migration_items_items_count_trg
AFTER INSERT OR DELETE OR UPDATE ON migration_items
FOR EACH ROW
EXECUTE FUNCTION trg_migrated_collections_update_items_count();

COMMIT;

/*
 * Verification queries (run after this script completes):
 *
 * 1) Quick counts
 *    SELECT COUNT(*) AS total_migration_items FROM migration_items;
 *    SELECT COUNT(*) AS migrated_collections_total FROM migrated_collections;
 *
 * 2) Check top collections by items_count
 *    SELECT id, collection_name, items_count
 *    FROM migrated_collections
 *    ORDER BY items_count DESC NULLS LAST
 *    LIMIT 20;
 *
 * 3) Cross-check correctness for a small sample (replace <some_id>):
 *    SELECT (SELECT COUNT(*) FROM migration_items WHERE migrated_collection_id = mc.id) AS actual_count,
 *           mc.items_count
 *    FROM migrated_collections mc
 *    WHERE mc.id IN (SELECT migrated_collection_id FROM migration_items GROUP BY migrated_collection_id ORDER BY COUNT(*) DESC LIMIT 20);
 *
 * 4) Find any mismatches (should return zero rows)
 *    SELECT mc.id, mc.items_count, COALESCE(mi.count,0) AS actual_count
 *    FROM migrated_collections mc
 *    LEFT JOIN (
 *      SELECT migrated_collection_id, COUNT(*) AS count
 *      FROM migration_items
 *      WHERE migrated_collection_id IS NOT NULL
 *      GROUP BY migrated_collection_id
 *    ) mi ON mi.migrated_collection_id = mc.id
 *    WHERE COALESCE(mc.items_count,0) <> COALESCE(mi.count,0)
 *    LIMIT 50;
 *
 * If the mismatch query returns rows, share the top few and I will help debug.
 */