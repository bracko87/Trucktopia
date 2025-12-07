/**
 * netlify/functions/normalize-hubs.js
 *
 * Serverless Netlify function to normalize hubs into authoritative company records.
 *
 * Safety-first approach:
 * - Dry-run by default (no writes).
 * - To allow writes set environment variable SUPABASE_WRITE=true and provide a secret
 *   via NORMALIZE_HUBS_SECRET. Use a service_role key with SUPABASE_KEY for updates.
 *
 * Security note:
 * - Use a secure service key (Supabase service_role) for writes and restrict access
 *   to this function via a scheduler or secret header. Do not expose SUPABASE_KEY
 *   to client-side code.
 */

/**
 * @description Helper to build HTTP responses
 * @param {number} status HTTP status code
 * @param {object} body Response body
 * @returns {object} Netlify function response
 */
function buildResponse(status, body) {
  return {
    statusCode: status,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body, null, 2)
  };
}

/**
 * @description Main handler executed by Netlify
 * @param {object} event Lambda event object
 * @param {object} context Lambda context
 * @returns {Promise<object>} Netlify response
 */
exports.handler = async function (event, context) {
  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_KEY; // service_role key recommended for writes
    const SUPABASE_WRITE = String(process.env.SUPABASE_WRITE || '').toLowerCase() === 'true';
    const SECRET = process.env.NORMALIZE_HUBS_SECRET || null;

    // secret header check for write actions
    const incomingSecret = (event.headers && (event.headers['x-normalize-hubs-secret'] || event.headers['X-Normalize-Hubs-Secret'])) || null;

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return buildResponse(400, {
        ok: false,
        message: 'Missing SUPABASE_URL or SUPABASE_KEY environment variables. Function can run in dry-run mode only without them.'
      });
    }

    // We'll attempt to read source hubs from common tables: infrastructure (infrastructure.hubs) and hubs.
    // These are best-effort queries — adjust table names to your actual schema if different.
    const headers = {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    };

    // Fetch companies
    const companiesUrl = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/companies?select=*`;
    const infraUrl = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/infrastructure?select=*`;
    const hubsUrl = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/hubs?select=*`;

    // Perform reads in parallel
    const [companiesRes, infraRes, hubsRes] = await Promise.all([
      fetch(companiesUrl, { headers }),
      fetch(infraUrl, { headers }).catch(() => ({ ok: false })),
      fetch(hubsUrl, { headers }).catch(() => ({ ok: false }))
    ]);

    if (!companiesRes.ok) {
      const text = await companiesRes.text().catch(() => '');
      return buildResponse(502, { ok: false, message: 'Failed to fetch companies from Supabase REST API', detail: text });
    }

    const companies = await companiesRes.json().catch(() => []);
    const infraData = infraRes && infraRes.ok ? await infraRes.json().catch(() => []) : [];
    const hubsData = hubsRes && hubsRes.ok ? await hubsRes.json().catch(() => []) : [];

    // Gather source hubs from infrastructure rows (try to find .hubs field) and from hubs table
    /** @type {Array<object>} */
    const sourceHubs: Array<any> = [];

    // Extract hubs arrays found inside infrastructure rows
    infraData.forEach((row) => {
      if (Array.isArray(row.hubs) && row.hubs.length > 0) {
        row.hubs.forEach(h => sourceHubs.push(h));
      } else if (Array.isArray(row.nodes) && row.nodes.length > 0) {
        row.nodes.forEach(h => sourceHubs.push(h));
      }
    });

    // Add hubs from standalone hubs table
    if (Array.isArray(hubsData) && hubsData.length) {
      hubsData.forEach(h => sourceHubs.push(h));
    }

    // Deduplicate by id or name
    const seen = new Set();
    const dedupedSourceHubs = sourceHubs.filter((h) => {
      const id = String(h.id || h.name || JSON.stringify(h)).toLowerCase();
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    // For each company that has no hubs or empty hubs array, propose copying dedupedSourceHubs (or subset matched by country / city)
    const plannedUpdates = [];
    for (const company of companies) {
      const companyHasHubs = Array.isArray(company.hubs) && company.hubs.length > 0;
      if (!companyHasHubs && dedupedSourceHubs.length > 0) {
        // Heuristic: attempt match by company.hub?.country or company.country
        let matched = dedupedSourceHubs;

        // If company has hub or country info, filter by matching country/city
        const companyCountry = (company.hub && company.hub.country) || company.country || null;
        if (companyCountry) {
          const filtered = dedupedSourceHubs.filter(h => {
            const c = (h.country || h.city || h.name || '').toString().toLowerCase();
            return c.includes(companyCountry.toString().toLowerCase());
          });
          if (filtered.length > 0) matched = filtered;
        }

        // Prepare the payload that would be used to update company.hubs
        const hubsToApply = matched.map((h) => {
          return {
            id: h.id || h.name || `${Math.random().toString(36).slice(2, 9)}`,
            name: h.name || h.title || h.city || null,
            city: h.city || null,
            capacity: typeof h.capacity === 'number' ? h.capacity : (h.capacity ? Number(h.capacity) : undefined),
            active: typeof h.active === 'boolean' ? h.active : (h.active ? true : false),
            description: h.description || h.notes || null,
            _source: 'normalize-hubs' // internal marker
          };
        });

        plannedUpdates.push({
          companyId: company.id,
          companyName: company.name || company.title || null,
          hubsCountExisting: (company.hubs || []).length,
          hubsToApplyCount: hubsToApply.length,
          hubsToApply
        });
      }
    }

    // If no writes enabled or secret mismatch: return dry-run report
    const writeRequested = SUPABASE_WRITE === true;
    const secretOk = !writeRequested || (SECRET && incomingSecret && incomingSecret === SECRET);

    if (!writeRequested) {
      return buildResponse(200, {
        ok: true,
        mode: 'dry-run',
        message: 'Dry-run complete. No writes performed. To enable writes set SUPABASE_WRITE=true and call with header X-Normalize-Hubs-Secret.',
        counts: {
          companiesTotal: companies.length,
          infrastructureRows: infraData.length,
          hubsTableRows: hubsData.length,
          dedupedSourceHubs: dedupedSourceHubs.length,
          plannedCompanyUpdates: plannedUpdates.length
        },
        plannedUpdates
      });
    }

    if (writeRequested && !SECRET) {
      return buildResponse(400, { ok: false, message: 'Writes are enabled (SUPABASE_WRITE=true) but NORMALIZE_HUBS_SECRET is not configured in the environment.' });
    }

    if (writeRequested && !secretOk) {
      return buildResponse(401, { ok: false, message: 'Invalid or missing secret header for write operation.' });
    }

    // Proceed with updates: PATCH companies with hubs field
    const performed = [];
    for (const plan of plannedUpdates) {
      // PATCH /rest/v1/companies?id=eq.<companyId>
      const patchUrl = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/companies?id=eq.${encodeURIComponent(plan.companyId)}`;
      const patchHeaders = {
        ...headers,
        Prefer: 'return=representation'
      };

      const body = { hubs: plan.hubsToApply };

      const res = await fetch(patchUrl, {
        method: 'PATCH',
        headers: patchHeaders,
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        performed.push({
          companyId: plan.companyId,
          success: false,
          status: res.status,
          detail: text
        });
      } else {
        const updated = await res.json().catch(() => null);
        performed.push({
          companyId: plan.companyId,
          success: true,
          updated: updated || null
        });
      }
    }

    return buildResponse(200, {
      ok: true,
      mode: 'write',
      message: 'Normalization executed.',
      summary: {
        planned: plannedUpdates.length,
        performed: performed.length
      },
      performed
    });
  } catch (err) {
    return buildResponse(500, {
      ok: false,
      message: 'Error during normalization',
      error: String(err)
    });
  }
};