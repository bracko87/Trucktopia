/*
 * scripts/export_company_payloads.sql
 *
 * Purpose:
 * - Find migration_items rows where any nested payload node matches company-related keywords
 *   (using the same recursive walker as the nodes export), then export the full payload rows.
 *
 * Output:
 * - Returns id, collection_name, inserted_at, payload (jsonb). Useful to export full payloads for manual review.
 *
 * Usage (client-side export with psql):
 *  psql "postgres://user:pass@host:5432/dbname" -c "\COPY (SELECT row_to_json(t) FROM ( ... ) t) TO 'migration_company_payloads.jsonl' (FORMAT text)"
 */

/* Find distinct migration_item ids containing a match */
WITH RECURSIVE walk AS (
  SELECT mi.id, mi.collection_name, mi.payload AS node FROM public.migration_items mi

  UNION ALL

  SELECT w.id, w.collection_name, kv.value AS node
  FROM walk w
  JOIN LATERAL (
    SELECT key, value FROM jsonb_each(w.node)
  ) kv ON jsonb_typeof(w.node) = 'object'

  UNION ALL

  SELECT w.id, w.collection_name, arr.elem AS node
  FROM walk w
  JOIN LATERAL jsonb_array_elements(w.node) WITH ORDINALITY arr(elem, ord)
    ON jsonb_typeof(w.node) = 'array'
),
matches AS (
  SELECT DISTINCT id
  FROM walk
  WHERE node::text ILIKE ANY (ARRAY[
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
)

SELECT mi.id, mi.collection_name, mi.inserted_at, mi.payload
FROM public.migration_items mi
WHERE mi.id IN (SELECT id FROM matches)
ORDER BY mi.inserted_at DESC
LIMIT 2000; -- adjust as needed