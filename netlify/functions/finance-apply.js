/**
 * netlify/functions/finance-apply.js
 *
 * Serverless wrapper around the Supabase finance_apply RPC.
 *
 * Responsibilities:
 * - Call the Supabase RPC finance_apply with service role key
 * - Normalize returned transaction row fields to include USD amount/balance when only cents fields exist
 * - Ensure companies table contains updated balance + cents columns (best-effort)
 * - Return canonical JSON: { success, transaction, newBalanceCents }
 *
 * Notes:
 * - Expects JSON body { companyId, deltaCents, type, description, idempotencyKey, meta }
 * - Requires environment variables SUPABASE_URL and SUPABASE_KEY (service role) set in Netlify.
 */

/* eslint-disable no-console */
const fetch = globalThis.fetch || require('node-fetch');

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_KEY;
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Missing Supabase config on server' }) };
    }

    let payload;
    try {
      payload = JSON.parse(event.body || '{}');
    } catch (err) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
    }

    const {
      companyId,
      deltaCents,
      type = 'adjustment',
      description = null,
      idempotencyKey = null,
      meta = {}
    } = payload;

    if (!companyId || typeof deltaCents !== 'number') {
      return { statusCode: 400, body: JSON.stringify({ error: 'companyId and deltaCents (number) are required' }) };
    }

    // Call Supabase RPC finance_apply via REST
    const rpcUrl = SUPABASE_URL.replace(/\/+$/, '') + '/rest/v1/rpc/finance_apply';
    const rpcBody = {
      p_company_id: companyId,
      p_delta: Math.round(deltaCents),
      p_type: type,
      p_description: description,
      p_meta: meta || {},
      p_idempotency_key: idempotencyKey,
      p_actor_user_id: null
    };

    const rpcRes = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Prefer: 'return=representation'
      },
      body: JSON.stringify(rpcBody)
    });

    const rpcText = await rpcRes.text().catch(() => null);
    let rpcJson = null;
    try {
      rpcJson = rpcText ? JSON.parse(rpcText) : null;
    } catch {
      rpcJson = null;
    }

    if (!rpcRes.ok) {
      // Propagate errors for easier debugging
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'finance_apply RPC failed', status: rpcRes.status, body: rpcJson ?? rpcText })
      };
    }

    // The RPC may return an array with one row or a single object depending on configuration
    const row = Array.isArray(rpcJson) ? rpcJson[0] : rpcJson;
    if (!row) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Invalid RPC response' }) };
    }

    // Normalize transaction fields: prefer amount (USD) and balance_after (USD), fallback to cents
    const tx = { ...row };

    try {
      // handle various naming conventions (amount, amount_cents, balance_after_cents, balance_after)
      if ((tx.amount === null || tx.amount === undefined) && (tx.amount_cents !== null && tx.amount_cents !== undefined)) {
        tx.amount = Number(tx.amount_cents) / 100;
      }
      if ((tx.balance_after === null || tx.balance_after === undefined) && (tx.balance_after_cents !== null && tx.balance_after_cents !== undefined)) {
        tx.balance_after = Number(tx.balance_after_cents) / 100;
      }
      // Expose canonical numeric cents as well
      if (tx.amount_cents === null || tx.amount_cents === undefined) {
        if (typeof tx.amount === 'number') tx.amount_cents = Math.round(tx.amount * 100);
      }
      if (tx.balance_after_cents === null || tx.balance_after_cents === undefined) {
        if (typeof tx.balance_after === 'number') tx.balance_after_cents = Math.round(tx.balance_after * 100);
      }
    } catch (e) {
      // ignore normalization failures
      console.warn('normalization failure', e);
    }

    // Persist canonical company balances (best-effort).
    // Some deployments / DB setups may not have the RPC update companies; ensure companies table consistent.
    try {
      if (tx.balance_after_cents !== null && tx.balance_after_cents !== undefined) {
        const patchUrl = SUPABASE_URL.replace(/\/+$/, '') + `/rest/v1/companies?id=eq.${encodeURIComponent(companyId)}`;
        const patchBody = {
          capital_cents: Number(tx.balance_after_cents),
          balance_cents: Number(tx.balance_after_cents),
          // legacy fields keep parity for UIs still reading them
          capital: Number(tx.balance_after_cents) / 100,
          balance: Number(tx.balance_after_cents) / 100
        };
        // PATCH the companies row (best-effort)
        await fetch(patchUrl, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            Prefer: 'return=representation'
          },
          body: JSON.stringify(patchBody)
        }).catch((err) => {
          console.warn('companies PATCH failed', err);
        });
      }
    } catch (err) {
      console.warn('companies persist attempt failed', err);
    }

    // Build canonical response
    const canonical = {
      success: true,
      transaction: tx,
      newBalanceCents: tx.balance_after_cents ?? null
    };

    return { statusCode: 200, body: JSON.stringify(canonical) };
  } catch (err) {
    console.error('finance-apply error', err);
    return { statusCode: 500, body: JSON.stringify({ error: String(err) }) };
  }
};