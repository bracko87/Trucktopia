/**
 * node-idempotency-test.ts
 *
 * Small TypeScript Node script to fire concurrent RPC calls with the same idempotency key
 * and report whether duplicates were created or if the DB returned the same transaction.
 *
 * Usage (Node 18+):
 *   ENDPOINT="https://your.supabase.url/rest/v1/rpc/finance_apply_atomic" \
 *   API_KEY="your-api-key" \
 *   COMPANY_ID="00000000-0000-0000-0000-000000000000" \
 *   node --loader ts-node/esm scripts/node-idempotency-test.ts
 *
 * Environment variables:
 * - ENDPOINT (required) : full URL to your RPC endpoint
 * - API_KEY  (optional) : apikey (used as 'apikey' and Authorization Bearer header)
 * - COMPANY_ID (required) : target company UUID used by the RPC body
 * - IDEMPOTENCY_KEY (optional) : reuse this key; otherwise a random UUID will be generated
 * - CONCURRENCY (optional) : number of concurrent requests per batch (default 8)
 * - ATTEMPTS (optional) : total number of requests to send (default 16)
 *
 * Notes:
 * - This script expects global fetch (Node 18+). If fetch is not present it will error.
 * - Keep credentials safe. Run against a non-production environment unless you know what you're doing.
 */

/**
 * Minimal helpers and types
 */
import crypto from 'crypto';

/**
 * genUUID
 * @description Generate a v4 UUID string using node's crypto
 * @returns string
 */
function genUUID(): string {
  return ([1e7] as any).toString().replace(/[018]/g, (c: any) =>
    (Number(c) ^ (crypto.randomBytes(1)[0] & (15 >> (Number(c) / 4)))).toString(16)
  );
}

/**
 * extractTxId
 * @description Attempt to extract a canonical transaction id from the RPC response.
 *              Supports common shapes: { transaction: { id } }, { id }, { transaction_id }, array rows.
 * @param resp any parsed JSON
 * @returns string | null
 */
function extractTxId(resp: any): string | null {
  if (!resp) return null;
  if (typeof resp === 'object') {
    if (resp.transaction && typeof resp.transaction.id === 'string') return resp.transaction.id;
    if (typeof resp.id === 'string') return resp.id;
    if (typeof resp.transaction_id === 'string') return resp.transaction_id;
    // Supabase function might return { id: ..., newBalanceCents: ... } or single row array
    if (Array.isArray(resp) && resp.length > 0) {
      const first = resp[0];
      if (first && typeof first.id === 'string') return first.id;
      if (first && first.transaction && typeof first.transaction.id === 'string') return first.transaction.id;
    }
  }
  return null;
}

/**
 * sendRpc
 * @description Send a single POST to the configured endpoint with the canonical body.
 * @param endpoint string
 * @param headers Record<string,string>
 * @param body any
 * @returns Promise<any> parsed JSON or thrown error
 */
async function sendRpc(endpoint: string, headers: Record<string, string>, body: any): Promise<any> {
  if (typeof (globalThis as any).fetch !== 'function') {
    throw new Error('global fetch not available. Run on Node 18+ or provide a fetch polyfill.');
  }

  const res = await (globalThis as any).fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    body: JSON.stringify(body)
  });

  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    // not JSON — return text
    return { rawText: text, status: res.status, ok: res.ok };
  }
}

/**
 * main
 * @description Orchestrate multiple concurrent RPC calls with the same idempotency key
 */
async function main() {
  const ENDPOINT = process.env.ENDPOINT;
  const API_KEY = process.env.API_KEY || '';
  const COMPANY_ID = process.env.COMPANY_ID;
  const IDEMPOTENCY_KEY = process.env.IDEMPOTENCY_KEY || genUUID();
  const CONCURRENCY = Number(process.env.CONCURRENCY || '8');
  const ATTEMPTS = Number(process.env.ATTEMPTS || '16');

  if (!ENDPOINT) {
    console.error('ERROR: ENDPOINT env missing. Set ENDPOINT to your RPC full URL.');
    process.exit(2);
  }
  if (!COMPANY_ID) {
    console.error('ERROR: COMPANY_ID env missing. Set COMPANY_ID to a valid company UUID.');
    process.exit(2);
  }

  console.log(`Endpoint: ${ENDPOINT}`);
  console.log(`Company: ${COMPANY_ID}`);
  console.log(`Idempotency Key: ${IDEMPOTENCY_KEY}`);
  console.log(`Concurrency: ${CONCURRENCY}, Attempts: ${ATTEMPTS}`);
  console.log('Starting test...');

  const headers: Record<string, string> = {};
  if (API_KEY) {
    headers['apikey'] = API_KEY;
    headers['Authorization'] = `Bearer ${API_KEY}`;
  }

  // Build a canonical request body for finance_apply_atomic-like RPC.
  // Adjust the shape to your RPC signature as needed.
  const baseBody = {
    p_company_id: COMPANY_ID,
    p_delta: 10000, // cents (+100.00)
    p_type: 'income',
    p_description: 'Node idempotency test',
    p_meta: {},
    p_idempotency_key: IDEMPOTENCY_KEY,
    p_actor_user_id: null
  };

  const results: Array<{ ok: boolean; status?: number; txId?: string | null; raw?: any; error?: string }> = [];

  const semaphore = {
    active: 0
  };

  // Helper to run single attempt
  const runOne = async (idx: number) => {
    try {
      // Intentionally vary other fields to test different-payload-with-same-key scenario
      const body = { ...baseBody, p_meta: { attempt: idx, note: `attempt-${idx}` } };
      const resp = await sendRpc(ENDPOINT, headers, body);
      const txId = extractTxId(resp);
      results.push({ ok: true, txId, raw: resp });
      console.log(`[${idx}] OK status txId=${txId ?? 'null'}`);
    } catch (err: any) {
      results.push({ ok: false, error: String(err) });
      console.warn(`[${idx}] ERROR ${err?.message ?? err}`);
    }
  };

  // Dispatch in batches respecting concurrency
  const tasks: Promise<void>[] = [];
  for (let i = 0; i < ATTEMPTS; i++) {
    // Wait if active >= concurrency
    while (semaphore.active >= CONCURRENCY) {
      // small delay
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 20));
    }
    semaphore.active++;
    const p = runOne(i).finally(() => {
      semaphore.active--;
    });
    tasks.push(p);
  }

  await Promise.all(tasks);

  // Summarize results
  const successful = results.filter(r => r.ok);
  const txIds = successful.map(s => s.txId).filter(Boolean) as string[];
  const uniqueTx = Array.from(new Set(txIds));
  console.log('--- SUMMARY ---');
  console.log(`Total attempts: ${ATTEMPTS}`);
  console.log(`Successful responses: ${successful.length}`);
  console.log(`Unique tx ids returned: ${uniqueTx.length}`);
  if (uniqueTx.length > 0) {
    console.log('tx ids:');
    uniqueTx.forEach((id) => console.log(' -', id));
  }
  const errors = results.filter(r => !r.ok);
  console.log(`Errors: ${errors.length}`);
  if (errors.length > 0) {
    errors.slice(0, 5).forEach((e, i) => console.log(`[err ${i}]`, e.error ?? e.raw));
  }

  // Basic verdict
  if (uniqueTx.length === 0) {
    console.warn('No transaction id returned by RPC. Inspect raw responses above.');
  } else if (uniqueTx.length === 1) {
    console.log('GOOD: All successful responses returned the same transaction id.');
  } else {
    console.error('BAD: Multiple distinct transaction ids returned. The RPC is not idempotent under concurrency.');
  }
}

main().catch((err) => {
  console.error('Fatal error', err);
  process.exit(1);
});