/**
 * create_game_time_table.sql
 *
 * Migration: create the canonical game_time table and ensure a seeded row (id = 1).
 *
 * Purpose:
 * - Stores the authoritative in-game time (current_time) used by serverless functions and the UI.
 * - Seed row id=1 is created or updated so server hooks can read a single canonical time.
 *
 * Notes:
 * - This script targets PostgreSQL (Supabase). Run with appropriate DB credentials.
 * - After deploy, ensure server-side functions use a server/service role key to read/write this table.
 */

BEGIN;

-- Create table if missing
CREATE TABLE IF NOT EXISTS game_time (
  id               INTEGER PRIMARY KEY,
  current_time     TIMESTAMPTZ NOT NULL,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  note             TEXT
);

-- Ensure a single canonical row exists (id = 1). Uses NOW() as initial authoritative time.
INSERT INTO game_time (id, current_time, updated_at)
VALUES (1, NOW(), NOW())
ON CONFLICT (id) DO UPDATE
  SET current_time = EXCLUDED.current_time,
      updated_at   = EXCLUDED.updated_at;

COMMIT;