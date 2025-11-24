/*
 * remove_sync_trigger_migrated_collections.sql
 *
 * Safe rollback to remove the automatic sync trigger and function for migrated_collections.
 * NOTE: Do NOT drop the compatibility column here unless you have verified all clients
 *       have been updated to use collection_key (or write collection_name explicitly).
 *
 * Usage:
 *  - Run this file when you are ready to remove the DB shim.
 *  - Recommended: run the verification queries and ensure no application logs reference collection_name.
 */

/* 1) Drop trigger (idempotent) */
DROP TRIGGER IF EXISTS trg_sync_collection_name ON public.migrated_collections;

/* 2) Drop trigger function (idempotent) */
DROP FUNCTION IF EXISTS public.sync_collection_name();

/*
 * Optional: If you truly want to remove the compatibility column (only do this after
 * thoroughly verifying all producers/consumers no longer require it), run:
 *
 * ALTER TABLE public.migrated_collections DROP COLUMN IF EXISTS collection_name;
 *
 * Consider creating a backup first:
 *
 * BEGIN;
 * CREATE TABLE IF NOT EXISTS migrated_collections_backup AS TABLE public.migrated_collections WITH NO DATA;
 * INSERT INTO migrated_collections_backup SELECT * FROM public.migrated_collections;
 * COMMIT;
 *
 * Then you can safely drop the column.
 */