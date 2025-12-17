-- scripts/find_company_nodes.sql
-- 
-- Purpose:
-- - Safe read-only helpers to locate candidate payload nodes inside public.migration_items
-- - Includes:
--   1) A corrected recursive JSON walker that descends into objects & arrays and
--      finds nodes containing company/owner-related text.
--   2) A faster top-level-array unnester that shows one element per top-level array key.
--
-- Usage:
-- psql -f scripts/find_company_nodes.sql
--
-- Notes:
-- - The recursive walker can be heavier on large datasets. Use LIMIT and review results.
-- - Replace/extend the WHERE filters if you want different keywords.

-- 1) Corrected recursive JSON walk — returns nodes that mention company/owner/capital/staff/trucks/source_id
WITH RECURSIVE walk AS (
  -- base: top-level payload nodes
  SELECT
    mi.id,
    mi.collection_name,
    mi.inserted_at,
    mi.payload AS node,
    ARRAY[]::text[] AS path
  FROM public.migration_items mi

  UNION ALL

  -- descend into object fields (key/value)
  SELECT
    w.id,
    w.collection_name,
    w.inserted_at,
    kv.value AS node,
    w.path || kv.key
  FROM walk w
  JOIN LATERAL (
    SELECT key, value FROM jsonb_each(w.node)
  ) AS kv ON jsonb_typeof(w.node) = 'object'

  UNION ALL

  -- descend into arrays (preserve ordinal index in path)
  SELECT
    w.id,
    w.collection_name,
    w.inserted_at,
    arr.elem AS node,
    w.path || ('[' || arr.ord::text || ']')
  FROM walk w
  JOIN LATERAL jsonb_array_elements(w.node) WITH ORDINALITY AS arr(elem, ord) ON jsonb_typeof(w.node) = 'array'
)
SELECT DISTINCT id, collection_name, inserted_at, path, jsonb_pretty(node) AS node_pretty
FROM walk
WHERE node::text ILIKE ANY (ARRAY[
  '%company%', '%companies%', '%company_name%', '%company_id%', '%owner%', '%owner_email%',
  '%owner_id%', '%capital%', '%staff%', '%trucks%', '%hub%', '%hub_id%', '%source_id%', '%sourceId%'
])
ORDER BY inserted_at DESC
LIMIT 500;

-- 2) Faster top-level-array unnester (sample one element per array and shows key)
SELECT
  mi.id,
  mi.collection_name,
  key,
  jsonb_typeof(mi.payload -> key) AS val_type,
  jsonb_array_elements(mi.payload -> key) AS elem
FROM public.migration_items mi,
LATERAL (SELECT jsonb_object_keys(mi.payload) AS key) keys
WHERE jsonb_typeof(mi.payload -> key) = 'array'
ORDER BY mi.inserted_at DESC
LIMIT 200;

-- 3) Quick helper: show rows where payload is object and has some likely keys (simple)
SELECT id, collection_name, inserted_at, jsonb_pretty(payload) AS payload_pretty
FROM public.migration_items
WHERE jsonb_typeof(payload) = 'object'
  AND (payload ? 'items' OR payload ? 'company_name' OR payload ? 'name' OR payload ? 'owner_id' OR payload ? 'source_id')
ORDER BY inserted_at DESC
LIMIT 200;