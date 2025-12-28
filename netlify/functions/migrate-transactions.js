/**
 * migrate-transactions.js
 *
 * Netlify function: one-time migration helper to import local browser transactions
 * into Supabase using the canonical, idempotent RPC (finance_apply_canonical).
 *
 * Expectations:
 * - Environment:
 *   SUPABASE_URL (e.g. https://xyz.supabase.co)
 *   SUPABASE_SERVICE_ROLE (service_role key, SERVER-ONLY)
 *   (optional) MIGRATE_SECRET - a shared secret required in X-Migrate-Secret header
 *
 * - Request: POST JSON body containing an array of transactions or NDJSON lines.
 *   Each transaction object should include:
 *     - localId: string (id used in browser, for diagnostics)
 *     - companyId?: uuid (preferred)
 *     - companySourceId?: string (fallback: find or create company by this source_id)
 *     - deltaCents: number (signed integer; cents to apply to capital; positive = credit)
 *     - type: string (expense|income|loan|repayment|tax|leasing|...)
 *     - description?: string
 *     - category?: string
 *     - meta?: object
 *     - idempotencyKey?: string (if omitted one will be generated server-side)
 *
 * - Response: { processed: number, mappings: Array<{ localId, status, companyId, serverTxId?, balanceAfterCents?, error? }> }
 *
 * Notes:
 * - This function is intended for one-time use and must NOT expose SUPABASE_SERVICE_ROLE to browsers.
 * - finance_apply_canonical RPC is expected to exist in the DB and perform atomic updates + idempotency.
 */

/**
 * @fileoverview Netlify migrate-transactions function
 */

const SUPABASE_URL = process.env.SUPABASE_URL || null;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || null;
const MIGRATE_SECRET = process.env.MIGRATE_SECRET || null;

/**
 * Safe JSON parse for NDJSON or array
 * @param {string} text
 * @returns {any[]}
 */
function parseBodyToArray(text) {
  text = (text || '').trim();
  if (!text) return [];
  try {
    // Try JSON array
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed;
  } catch (e) {
    // fallthrough to NDJSON parse
  }
  // NDJSON: parse lines
  return text.split(/\r?\n/).map((l) => {
    try {
      return JSON.parse(l);
    } catch {
      return null;
    }
  }).filter(Boolean);
}

/**
 * Helper: perform fetch with supabase service role headers
 * @param {string} url
 * @param {object} opts
 * @returns {Promise<Response>}
 */
async function supabaseFetch(url, opts = {}) {
  if (!SUPABASE_SERVICE_ROLE) throw new Error('Missing SUPABASE_SERVICE_ROLE env var');
  const headers = {
    ...(opts.headers || {}),
    apikey: SUPABASE_SERVICE_ROLE,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
    'Content-Type': headersIsJson(opts.headers) ? 'application/json' : (opts.headers && opts.headers['Content-Type']) || 'application/json'
  };
  return fetch(url, { ...opts, headers });
}

/**
 * Check if headers indicate JSON expected
 * @param {Record<string,string>} headers
 * @returns {boolean}
 */
function headersIsJson(headers) {
  if (!headers) return true;
  const ct = headers['Content-Type'] || headers['content-type'] || '';
  return ct.includes('json') || ct === '';
}

/**
 * Build companies endpoint base
 * @returns {string}
 */
function companiesEndpoint() {
  return `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/companies`;
}

/**
 * Build RPC endpoint for finance_apply_canonical
 * @returns {string}
 */
function rpcFinanceApplyEndpoint() {
  return `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/rpc/finance_apply_canonical`;
}

/**
 * Create a simple UUID v4 fallback when none provided (non-crypto)
 * @returns {string}
 */
function uuidv4Fallback() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    // eslint-disable-next-line no-mixed-operators
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Handler
 * @param {import('http').IncomingMessage} event
 * @param {any} context
 */
exports.handler = async function (event, context) {
  try {
    // Basic method check
    if (!event || event.httpMethod !== 'POST') {
      return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed, use POST' }) };
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Server not configured: SUPABASE_URL or SUPABASE_SERVICE_ROLE missing' }) };
    }

    // Optional simple secret guard
    if (MIGRATE_SECRET) {
      const provided = (event.headers && (event.headers['x-migrate-secret'] || event.headers['X-Migrate-Secret'])) || null;
      if (!provided || provided !== MIGRATE_SECRET) {
        return { statusCode: 401, body: JSON.stringify({ error: 'Missing or invalid X-Migrate-Secret header' }) };
      }
    }

    // Parse body: allow JSON array or NDJSON
    const text = event.body || '';
    const items = parseBodyToArray(text);
    if (!Array.isArray(items) || items.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Empty payload: provide an array of transactions or NDJSON lines' }) };
    }

    const mappings = [];

    // For caching company source_id -> id lookups
    const companyCache = new Map();

    // iterate sequentially (keeps logs readable). You can parallelize later if needed.
    for (const raw of items) {
      const tx = raw || {};
      const localId = tx.localId || tx.id || uuidv4Fallback();
      const entry = { localId, status: 'pending' };
      try {
        // Validation: require deltaCents and type
        if (typeof tx.deltaCents !== 'number') {
          entry.status = 'skipped';
          entry.error = 'Missing deltaCents (signed integer cents)';
          mappings.push(entry);
          continue;
        }
        if (!tx.type) {
          entry.status = 'skipped';
          entry.error = 'Missing type';
          mappings.push(entry);
          continue;
        }

        // Resolve company id
        let companyId = tx.companyId || null;
        const sourceId = tx.companySourceId || tx.sourceId || tx.company_key || null;

        if (!companyId && sourceId) {
          if (companyCache.has(sourceId)) {
            companyId = companyCache.get(sourceId);
          } else {
            // Query companies by source_id
            const qUrl = `${companiesEndpoint()}?source_id=eq.${encodeURIComponent(sourceId)}&select=id`;
            const qRes = await supabaseFetch(qUrl, { method: 'GET' });
            if (!qRes.ok) {
              throw new Error(`Failed to query companies by source_id: ${qRes.status} ${await qRes.text()}`);
            }
            const arr = await qRes.json();
            if (Array.isArray(arr) && arr.length > 0 && arr[0].id) {
              companyId = arr[0].id;
              companyCache.set(sourceId, companyId);
            } else {
              // Create a minimal company record (best-effort) so migration can continue
              const createBody = {
                source_id: sourceId,
                name: tx.companyName || `Imported ${sourceId}`,
                email: null,
                capital: 0,
                capital_cents: 0,
                balance_cents: 0,
                imported_from: 'migration',
                data: {}
              };
              const createRes = await supabaseFetch(`${companiesEndpoint()}`, {
                method: 'POST',
                headers: { Prefer: 'return=representation' },
                body: JSON.stringify(createBody)
              });
              if (!createRes.ok) {
                const txt = await createRes.text().catch(() => '');
                throw new Error(`Failed to create company for source_id ${sourceId}: ${createRes.status} ${txt}`);
              }
              const created = await createRes.json();
              if (Array.isArray(created) && created[0] && created[0].id) {
                companyId = created[0].id;
                companyCache.set(sourceId, companyId);
              } else if (created && created.id) {
                companyId = created.id;
                companyCache.set(sourceId, companyId);
              } else {
                throw new Error(`Unexpected create company response for source_id ${sourceId}`);
              }
            }
          }
        }

        if (!companyId) {
          entry.status = 'skipped';
          entry.error = 'No companyId or resolvable sourceId provided';
          mappings.push(entry);
          continue;
        }

        entry.companyId = companyId;

        // Prepare RPC params
        const idempotencyKey = tx.idempotencyKey || tx.idempotency_key || (`mig-${localId}`) || uuidv4Fallback();

        const rpcPayload = {
          p_company_id: companyId,
          p_delta: Number(tx.deltaCents || 0),
          p_type: String(tx.type),
          p_description: tx.description || tx.desc || null,
          p_meta: tx.meta || {},
          p_idempotency_key: idempotencyKey,
          p_actor_user_id: tx.actorUserId || null
        };

        // Call finance_apply_canonical RPC (expect representation)
        const rpcUrl = rpcFinanceApplyEndpoint();
        const rpcRes = await supabaseFetch(rpcUrl, {
          method: 'POST',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify(rpcPayload)
        });

        if (!rpcRes.ok) {
          const bodyTxt = await rpcRes.text().catch(() => '');
          throw new Error(`finance_apply_canonical failed: ${rpcRes.status} ${bodyTxt}`);
        }

        const rpcBody = await rpcRes.json().catch(() => null);
        // Supabase returns an array representation when Prefer: return=representation is used (or a row)
        let returned = null;
        if (Array.isArray(rpcBody) && rpcBody.length > 0) returned = rpcBody[0];
        else returned = rpcBody;

        // Extract transaction id and balance after if present
        const serverTxId = returned && (returned.id || returned.tx_id || null) ? (returned.id || returned.tx_id) : null;
        const balanceAfter = returned && (returned.balance_after ?? returned.new_balance_cents ?? returned.balanceAfter) ? (returned.balance_after ?? returned.new_balance_cents ?? returned.balanceAfter) : null;

        entry.status = 'ok';
        entry.serverTxId = serverTxId || null;
        entry.balanceAfterCents = typeof balanceAfter === 'number' ? Number(balanceAfter) : null;
        entry.idempotencyKey = idempotencyKey;
        mappings.push(entry);
      } catch (err) {
        entry.status = 'error';
        entry.error = String(err && err.message ? err.message : err);
        mappings.push(entry);
      }
    } // end for

    return {
      statusCode: 200,
      body: JSON.stringify({ processed: mappings.length, mappings })
    };
  } catch (finalErr) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: String(finalErr && finalErr.message ? finalErr.message : finalErr) })
    };
  }
};