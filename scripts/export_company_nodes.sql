/*
 * scripts/export_company_nodes.sql
 *
 * Purpose:
 * - Recursively walk jsonb payloads in public.migration_items and extract JSON nodes
 *   that mention company/owner-related keywords (company, owner, capital, source_id, owner_email, etc).
 * - Produce rows with migration_item id, collection_name, path (text[]), node (jsonb), and inserted_at.
 *
 * Usage (client-side export with psql):
 *  # export matching nodes as JSON lines to a file (runs on client; safer than server-side file writes)
 *  psql "postgres://user:pass@host:5432/dbname" -c "\COPY (SELECT row_to_json(t) FROM (  -- adjust connection string
 *    -- paste the SELECT block below here, without the final semicolon
 *  ) t) TO 'migration_company_nodes.jsonl' (FORMAT text)"
 *
 * Or run the SELECT in a DB GUI and export results.
 */

/* Keyword list: extend or shrink as needed */
-- Note: the query is read-only and safe to run on any recent Postgres version (9.6+ with jsonb).
WITH RECURSIVE walk AS (
  -- base: each migration_items row as starting node
  SELECT
    mi.id,
    mi.collection_name,
    mi.payload AS node,
    ARRAY[]::text[] AS path
  FROM public.migration_items mi

  UNION ALL

  -- descend into object fields
  SELECT
    w.id,
    w.collection_name,
    kv.value AS node,
    w.path || kv.key
  FROM walk w
  JOIN LATERAL (
    SELECT key, value FROM jsonb_each(w.node)
  ) kv ON jsonb_typeof(w.node) = 'object'

  UNION ALL

  -- descend into arrays (preserve ordinal in path element)
  SELECT
    w.id,
    w.collection_name,
    arr.elem AS node,
    w.path || ('[' || arr.ord::text || ']')
  FROM walk w
  JOIN LATERAL jsonb_array_elements(w.node) WITH ORDINALITY arr(elem, ord)
    ON jsonb_typeof(w.node) = 'array'
)

SELECT DISTINCT
  mi.id AS migration_item_id,
  walk.collection_name,
  walk.path,
  walk.node AS node_raw,
  jsonb_pretty(walk.node) AS node_pretty,
  mi.inserted_at
FROM walk
JOIN public.migration_items mi ON mi.id = walk.id
WHERE (walk.node)::text ILIKE ANY (ARRAY[
  '%company%',
  '%companies%',
  '%company_name%',
  '%owner%',
  '%owner_email%',
  '%owner_id%',
  '%ownerId%',
  '%capital%',
  '%staff%',
  '%trucks%',
  '%hub%',
  '%hub_id%',
  '%source_id%',
  '%sourceId%'
])
ORDER BY mi.inserted_at DESC, migration_item_id
LIMIT 5000; -- adjust limit if the dataset is large