/*
 * scripts/create_staging_company_candidates.sql
 *
 * Purpose:
 * - Create a lightweight staging table `staging_company_candidates` (if it does not already exist)
 *   and populate it with candidate JSON nodes found in migration_items. This makes SQL inspection,
 *   manual joins and de-duplication easier before promoting to staging_companies.
 *
 * Notes:
 * - The script is idempotent: it uses CREATE TABLE IF NOT EXISTS and inserts only new migration_item_id/path/node
 *   combinations (avoid duplicates using a simple unique index).
 * - Review inserted rows before performing any upsert into staging_companies or public.companies.
 *
 * Usage:
 *  psql "postgres://user:pass@host:5432/dbname" -f scripts/create_staging_company_candidates.sql
 */

/* Create table if missing */
CREATE TABLE IF NOT EXISTS public.staging_company_candidates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  migration_item_id uuid NOT NULL,
  collection_name text,
  path text[],
  node jsonb,
  payload jsonb,
  inserted_at timestamptz,
  discovered_at timestamptz DEFAULT now()
);

-- Unique index to prevent duplicate inserts for same migration_item_id + path + md5(node)
CREATE UNIQUE INDEX IF NOT EXISTS staging_company_candidates_unique_idx
  ON public.staging_company_candidates (migration_item_id, path, (md5(node::text)));

-- Insert matching nodes (only new ones will be inserted due to unique index)
WITH RECURSIVE walk AS (
  SELECT mi.id, mi.collection_name, mi.payload AS node, ARRAY[]::text[] AS path, mi.payload AS root_payload, mi.inserted_at
  FROM public.migration_items mi

  UNION ALL

  SELECT w.id, w.collection_name, kv.value AS node, w.path || kv.key, w.root_payload, w.inserted_at
  FROM walk w
  JOIN LATERAL (
    SELECT key, value FROM jsonb_each(w.node)
  ) kv ON jsonb_typeof(w.node) = 'object'

  UNION ALL

  SELECT w.id, w.collection_name, arr.elem AS node, w.path || ('[' || arr.ord::text || ']'), w.root_payload, w.inserted_at
  FROM walk w
  JOIN LATERAL jsonb_array_elements(w.node) WITH ORDINALITY arr(elem, ord)
    ON jsonb_typeof(w.node) = 'array'
),
matches AS (
  SELECT DISTINCT
    id AS migration_item_id,
    collection_name,
    path,
    node,
    root_payload AS payload,
    inserted_at
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

INSERT INTO public.staging_company_candidates (migration_item_id, collection_name, path, node, payload, inserted_at)
SELECT m.migration_item_id, m.collection_name, m.path, m.node, m.payload, m.inserted_at
FROM matches m
ON CONFLICT DO NOTHING;

-- Quick select for verification
SELECT count(*) AS inserted_candidates FROM public.staging_company_candidates;