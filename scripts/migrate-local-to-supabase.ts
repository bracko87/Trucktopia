/**
 * migrate-local-to-supabase.ts
 *
 * Migration scaffold: reads a localStorage JSON export (from browser) and POSTs
 * canonical finance payloads to a configured server migration endpoint.
 *
 * Responsibilities:
 * - Load localStorage export file (JSON).
 * - Extract finance-related artifacts (company, balance, transactions/history, pending items).
 * - Build idempotent payloads and POST them to MIGRATE_ENDPOINT.
 * - Persist per-user migration status to an output JSON file for resumability.
 *
 * NOTE:
 * - This is a scaffold intended for dry-run and staging use. It expects Node 18+ (global fetch).
 * - Configure MIGRATE_ENDPOINT as an environment variable or pass --endpoint=... flag.
 * - Usage: node --loader ts-node/esm scripts/migrate-local-to-supabase.ts path/to/localstorage.json --out status.json
 */

/**
 * File-level imports
 */
import fs from 'fs';
import path from 'path';
import process from 'process';

/**
 * Type definitions
 */

/**
 * LocalStorageDump
 * @description Simple mapping of localStorage keys => string values exported from browser.
 */
interface LocalStorageDump {
  [key: string]: string | null;
}

/**
 * TransactionItem
 * @description Minimal transaction shape used for migration payloads.
 */
interface TransactionItem {
  id: string;
  timestamp: string;
  amount: number;
  type: string;
  meta?: Record<string, any>;
  // idempotency key will be attached at migration time
}

/**
 * CompanyFinanceSnapshot
 * @description Canonical snapshot we will send to the server for a single user.
 */
interface CompanyFinanceSnapshot {
  email: string;
  companyId?: string;
  clientBalance?: number;
  pendingTransactions: TransactionItem[];
  historyTransactions: TransactionItem[];
  sourceKeys: string[]; // keys from localStorage that were read
}

/**
 * UserMigrationStatus
 * @description Persisted per-user migration outcome so we can resume or audit.
 */
interface UserMigrationStatus {
  email: string;
  companyId?: string;
  migratedAt?: string | null;
  success?: boolean;
  response?: any;
  error?: string | null;
  inputKeys: string[];
}

/**
 * Simple utility: safe JSON parse
 */
const safeJsonParse = (txt: string | null) => {
  if (!txt) return null;
  try { return JSON.parse(txt); } catch { return null; }
};

/**
 * generateIdempotencyKey
 * @description Create a deterministic-ish uuid style string used as idempotency key.
 * Note: This is NOT a cryptographically secure UUID, but is stable for dry-run scaffolding.
 */
const generateIdempotencyKey = (prefix = '') => {
  const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  return `${prefix}${Date.now().toString(36)}-${s4()}${s4()}-${Math.floor(Math.random() * 1e6).toString(36)}`;
};

/**
 * extractFinanceArtifacts
 * @description Inspect the localStorage dump and try to build a CompanyFinanceSnapshot
 */
const extractFinanceArtifacts = (dump: LocalStorageDump): CompanyFinanceSnapshot | null => {
  // Heuristics: common keys we expect to find; adapt to your app's exact keys
  const keys = Object.keys(dump);
  const emailKey = keys.find(k => k.includes('tm_current_user') || k === 'tm_current_user' || k.endsWith('_email'));
  const userEmail = (() => {
    if (emailKey === 'tm_current_user') {
      try { return dump[emailKey] ?? null; } catch { return null; }
    }
    // fallback: try to find tm_user_state_<email> stored object
    const stateKey = keys.find(k => k.startsWith('tm_user_state_'));
    if (stateKey) {
      const parsed = safeJsonParse(dump[stateKey]);
      if (parsed && parsed.isAuthenticated && parsed.company && parsed.company.email) return parsed.company.email;
    }
    return null;
  })();

  // Try company balance keys
  const companyKey = keys.find(k => k.startsWith('tm_user_state_') || k === 'tm_admin_state' || k.startsWith('tm_company_'));
  let clientBalance: number | undefined = undefined;
  let companyId: string | undefined = undefined;

  if (companyKey) {
    const parsed = safeJsonParse(dump[companyKey]);
    if (parsed && typeof parsed.company === 'object') {
      try {
        companyId = parsed.company.id ?? parsed.company._id ?? undefined;
        clientBalance = Number(parsed.company.capital ?? parsed.company.balance ?? parsed.company.cap ?? parsed.company.capital_cents ?? NaN);
        if (Number.isNaN(clientBalance)) clientBalance = undefined;
      } catch { /* ignore */ }
    } else if (parsed && typeof parsed.capital === 'number') {
      clientBalance = parsed.capital;
    }
  }

  // Transactions history/pending heuristics
  const pendingKey = keys.find(k => k.toLowerCase().includes('pending') && k.toLowerCase().includes('trans'));
  const historyKey = keys.find(k => k.toLowerCase().includes('transactions') || k.toLowerCase().includes('tx_history') || k.toLowerCase().includes('transaction_history'));

  const pendingRaw = pendingKey ? safeJsonParse(dump[pendingKey]) : null;
  const historyRaw = historyKey ? safeJsonParse(dump[historyKey]) : null;

  const toTxItems = (arr: any): TransactionItem[] => {
    if (!Array.isArray(arr)) return [];
    return arr.map((it: any, idx: number) => {
      const id = it.id ?? it.txId ?? it._id ?? `local-${idx}-${Date.now()}`;
      const ts = it.timestamp ?? it.createdAt ?? new Date().toISOString();
      const amt = Number(it.amount ?? it.value ?? 0);
      const type = it.type ?? it.kind ?? 'migration';
      return { id: String(id), timestamp: String(ts), amount: amt, type, meta: it.meta ?? {} };
    });
  };

  const pendingTransactions = toTxItems(pendingRaw);
  const historyTransactions = toTxItems(historyRaw);

  // If nothing found, bail
  if (!userEmail && !companyKey && pendingTransactions.length === 0 && historyTransactions.length === 0) return null;

  const usedKeys = [emailKey, companyKey, pendingKey, historyKey].filter(Boolean) as string[];

  return {
    email: String(userEmail ?? 'unknown'),
    companyId,
    clientBalance,
    pendingTransactions,
    historyTransactions,
    sourceKeys: usedKeys
  };
};

/**
 * postToEndpoint
 * @description POST payload to migration endpoint. Expects MIGRATE_ENDPOINT env or endpoint param.
 */
const postToEndpoint = async (endpoint: string, payload: any) => {
  if (!endpoint) throw new Error('No MIGRATE_ENDPOINT configured');
  if (typeof (globalThis as any).fetch !== 'function') {
    throw new Error('Global fetch not available. Use Node 18+ or provide a fetch polyfill.');
  }

  const res = await (globalThis as any).fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    // Keep small timeout behaviors to caller / platform
  });

  const text = await res.text();
  let parsed: any = null;
  try { parsed = JSON.parse(text); } catch { parsed = text; }
  return { status: res.status, body: parsed };
};

/**
 * main
 * @description Orchestrates loading input, extracting finance snapshots and posting them.
 */
const main = async () => {
  try {
    const argv = process.argv.slice(2);
    if (argv.length === 0) {
      console.error('Usage: node scripts/migrate-local-to-supabase.ts path/to/localstorage.json --out status.json [--endpoint=URL] [--batch=1]');
      process.exit(1);
    }

    const inputPath = argv[0];
    const outFlagIndex = argv.findIndex(a => a.startsWith('--out='));
    const outPath = outFlagIndex >= 0 ? argv[outFlagIndex].split('=')[1] : (argv.includes('--out') ? argv[argv.indexOf('--out') + 1] : 'migration-status.json');

    const endpointFlag = argv.find(a => a.startsWith('--endpoint='));
    const endpoint = (endpointFlag ? endpointFlag.split('=')[1] : process.env.MIGRATE_ENDPOINT ?? '') as string;
    if (!endpoint) {
      console.error('MIGRATE_ENDPOINT not provided (env or --endpoint). Aborting.');
      process.exit(1);
    }

    // Read input file
    const inputAbs = path.resolve(process.cwd(), inputPath);
    if (!fs.existsSync(inputAbs)) {
      console.error('Input file not found:', inputAbs);
      process.exit(1);
    }

    const raw = fs.readFileSync(inputAbs, 'utf-8');
    const dump: LocalStorageDump = JSON.parse(raw);
    const snapshot = extractFinanceArtifacts(dump);

    if (!snapshot) {
      console.error('No finance artifacts detected in the provided localStorage export.');
      process.exit(1);
    }

    // Load existing status for resume
    const statusAbs = path.resolve(process.cwd(), outPath);
    let status: Record<string, UserMigrationStatus> = {};
    if (fs.existsSync(statusAbs)) {
      try { status = JSON.parse(fs.readFileSync(statusAbs, 'utf-8')); } catch { status = {}; }
    }

    const userKey = snapshot.email || snapshot.companyId || `user-${Date.now()}`;
    if (status[userKey] && status[userKey].success) {
      console.log('User already migrated (status file). Exiting.');
      process.exit(0);
    }

    // Build payload: attach idempotency keys per transaction
    const attachIdempotency = (tx: TransactionItem) => ({ ...tx, idempotency_key: generateIdempotencyKey(`${snapshot.email}-`) });

    const payload = {
      source: 'localStorage-migration',
      source_keys: snapshot.sourceKeys,
      user_email: snapshot.email,
      company_id: snapshot.companyId,
      client_balance: snapshot.clientBalance,
      pending: snapshot.pendingTransactions.map(attachIdempotency),
      history: snapshot.historyTransactions.map(attachIdempotency),
      migrated_at: new Date().toISOString()
    };

    console.log('Posting migration payload for', snapshot.email, '->', endpoint);
    try {
      const res = await postToEndpoint(endpoint, payload);
      const ok = res.status >= 200 && res.status < 300;
      status[userKey] = {
        email: snapshot.email,
        companyId: snapshot.companyId,
        migratedAt: ok ? new Date().toISOString() : null,
        success: ok,
        response: res.body,
        error: ok ? null : `HTTP ${res.status}`,
        inputKeys: snapshot.sourceKeys
      };
      fs.writeFileSync(statusAbs, JSON.stringify(status, null, 2), 'utf-8');
      if (ok) {
        console.log('Migration accepted. Response:', res.body);
      } else {
        console.error('Migration failed with status', res.status, res.body);
        process.exit(2);
      }
    } catch (err: any) {
      status[userKey] = {
        email: snapshot.email,
        companyId: snapshot.companyId,
        migratedAt: null,
        success: false,
        response: null,
        error: String(err?.message ?? err),
        inputKeys: snapshot.sourceKeys
      };
      fs.writeFileSync(statusAbs, JSON.stringify(status, null, 2), 'utf-8');
      console.error('Request failed:', err);
      process.exit(3);
    }
  } catch (err) {
    console.error('Unexpected error', err);
    process.exit(99);
  }
};

/**
 * Run main when executed directly
 */
if (require.main === module) {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  main();
}