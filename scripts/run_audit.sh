#!/usr/bin/env bash
/**
 * scripts/run_audit.sh
 *
 * Run the public.audit_migrated_collections() function once and append results to a log.
 *
 * Usage:
 *  - Option A (recommended): set PG_CONN (postgresql://user:pass@host:port/db)
 *      export PG_CONN='postgresql://myuser:mypassword@myhost:5432/mydb'
 *      ./scripts/run_audit.sh
 *
 *  - Option B (preferred for security): set individual env vars and use .pgpass or PGPASSWORD
 *      export PGHOST='myhost'
 *      export PGUSER='myuser'
 *      export PGPASSWORD='mypassword'   # temporary in shell
 *      export PGDATABASE='mydb'
 *      ./scripts/run_audit.sh
 *      unset PGPASSWORD
 *
 * Notes:
 *  - Do NOT run this script inside psql. Run it from a shell/terminal.
 *  - Protect credentials: use .pgpass or store connection string in a restricted file.
 */

set -euo pipefail

LOGFILE="${LOGFILE:-/var/log/audit_migrated_collections.log}"
TIMESTAMP=$(date +"%Y-%m-%dT%H:%M:%S%z")

echo "[$TIMESTAMP] Starting migrated_collections audit" >> "$LOGFILE"

# Compose psql command
if [ -n "${PG_CONN:-}" ]; then
  PSQL_CMD=(psql "$PG_CONN" -c "SELECT * FROM public.audit_migrated_collections();")
else
  # Use environment variables: PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE
  PSQL_CMD=(psql -h "${PGHOST:-localhost}" -p "${PGPORT:-5432}" -U "${PGUSER:-}" -d "${PGDATABASE:-}" -c "SELECT * FROM public.audit_migrated_collections();")
fi

# Run the command and append stdout/stderr to logfile
if "${PSQL_CMD[@]}" >> "$LOGFILE" 2>&1; then
  echo "[$(date +"%Y-%m-%dT%H:%M:%S%z")] Audit completed successfully" >> "$LOGFILE"
  exit 0
else
  echo "[$(date +"%Y-%m-%dT%H:%M:%S%z")] Audit FAILED" >> "$LOGFILE"
  exit 1
fi