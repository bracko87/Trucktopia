-- scripts/migration-monitor.sql
--
-- Purpose:
--   Quick, reusable monitoring SQL to detect any future mismatches between
--   migrated_collections.items_count and the actual counts in migration_items.
--   Use in a daily cron job or monitoring system; show results and return non-zero exit code
--   when mismatches are present (wrap in a script that checks rowcount).
--
-- Output: rows where items_count differs from actual count (should be zero rows).
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
LIMIT 500;

-- Useful helper: count of total migration_items (for monitoring growth)
SELECT COUNT(*) AS total_migration_items FROM migration_items;

-- Optional: detect anonymous / probe rows
SELECT COUNT(*) AS probe_rows
FROM migration_items mi
WHERE mi.item->> '__test' = 'trigger';

-- Example of a simple shell wrapper (conceptual, not included here) could:
-- 1) run psql -f scripts/migration-monitor.sql  -t -A -F','  > /tmp/migration_monitor.csv
-- 2) if file non-empty, send alert (mail, webhook).
-- I can provide that wrapper if you want it scheduled via cron or the host's scheduler.