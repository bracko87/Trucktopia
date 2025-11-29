/**
 * supabase-upsert-game-rules-engines.sql
 *
 * SQL template for creating simple tables and upserting manifest rows.
 *
 * Instructions:
 * 1) Adapt the CREATE TABLE definitions to your naming conventions and run once.
 * 2) For each manifest entry, use the INSERT ... ON CONFLICT DO UPDATE pattern to upsert.
 *
 * Example:
 */

/* -------------------------
   1) Create tables (example)
   ------------------------- */
-- CREATE TABLE game_rules (
--   id TEXT PRIMARY KEY,
--   name TEXT NOT NULL,
--   description TEXT,
--   category TEXT,
--   status TEXT,
--   version TEXT,
--   last_modified TIMESTAMP,
--   author TEXT,
--   code_paths JSONB,
--   notes TEXT,
--   metadata JSONB
-- );

-- CREATE TABLE engines (
--   id TEXT PRIMARY KEY,
--   name TEXT NOT NULL,
--   description TEXT,
--   path TEXT,
--   tags TEXT[],
--   mount_status TEXT,
--   status TEXT,
--   version TEXT,
--   last_modified TIMESTAMP,
--   author TEXT,
--   notes TEXT,
--   metadata JSONB
-- );

-- CREATE TABLE cron_jobs (
--   id TEXT PRIMARY KEY,
--   name TEXT NOT NULL,
--   description TEXT,
--   path TEXT,
--   schedule TEXT,
--   trigger TEXT,
--   status TEXT,
--   last_modified TIMESTAMP,
--   author TEXT,
--   notes TEXT,
--   metadata JSONB
-- );



/* -------------------------
   2) Example upsert (single row)
   ------------------------- */
-- INSERT INTO game_rules (id, name, description, category, status, version, last_modified, author, code_paths, notes, metadata)
-- VALUES (
--   'GR-009',
--   'Reputation Enforcement',
--   'Enforce company.reputation reset/format during persistence and restore flows.',
--   'System',
--   'proposed',
--   '1.0.0',
--   NOW(),
--   'Proposed',
--   '["src/contexts/GameContext.tsx"]'::jsonb,
--   'Proposed entry describing enforcement locations.',
--   '{"enforcement": true}'::jsonb
-- )
-- ON CONFLICT (id) DO UPDATE
-- SET name = EXCLUDED.name,
--     description = EXCLUDED.description,
--     category = EXCLUDED.category,
--     status = EXCLUDED.status,
--     version = EXCLUDED.version,
--     last_modified = EXCLUDED.last_modified,
--     author = EXCLUDED.author,
--     code_paths = EXCLUDED.code_paths,
--     notes = EXCLUDED.notes,
--     metadata = EXCLUDED.metadata;

/* -------------------------
   3) Bulk approach
   ------------------------- */
-- For many rows, either:
--  - Create a temporary table and copy JSON-generated rows into it, then run a single upsert join, OR
--  - Generate multiple INSERT ... VALUES (...) ON CONFLICT statements using a script (preferred).

/* End of template */