/**
 * getSupabaseDistance.ts
 *
 * Server helper to read authoritative driving distances from Supabase.
 *
 * Responsibilities:
 * - Query the Supabase REST API for a driving distance row for a city pair.
 * - Return kilometers (number) when a row is found, or null otherwise.
 *
 * Usage (server-side only):
 * import { getSupabaseDistance } from './utils/server/getSupabaseDistance';
 * const km = await getSupabaseDistance('Frankfurt', 'Nijmegen');
 *
 * Environment variables required (server-side):
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY  (use service role key for server-to-server REST access)
 *
 * Notes:
 * - This helper is intended for server-side usage (Netlify functions, Node server, etc.).
 * - Keep the service role key server-only. Do not expose it to the browser.
 */



/**
 * SupabaseDistanceRow
 * @description Minimal shape expected from the distances table.
 */
interface SupabaseDistanceRow {
  id?: string;
  from_city?: string;
  to_city?: string;
  km?: number;
  // optional reverse or other metadata can be present
}

/**
 * getSupabaseDistance
 * @description Query Supabase REST for a distance row between two cities.
 * Returns the numeric kilometers if found, otherwise null.
 *
 * @param fromCity - origin city name (string)
 * @param toCity - destination city name (string)
 */
export async function getSupabaseDistance(fromCity: string, toCity: string): Promise<number | null> {
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  }

  if (!fromCity || !toCity) return null;

  const base = SUPABASE_URL.replace(/\/$/, '');
  // Assumes table name is "distances" with columns "from_city", "to_city", "km".
  // Adjust table/column names if your schema differs.
  const qs = new URLSearchParams({
    select: 'km,from_city,to_city',
    from_city: `eq.${fromCity}`,
    to_city: `eq.${toCity}`,
  });

  const url = `${base}/rest/v1/distances?${qs.toString()}`;

  try {
    const resp = await fetch(url, {
      method: 'GET',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        Accept: 'application/json',
      },
    });

    if (!resp.ok) {
      // If not found (404) or other server error, try reverse direction below
      // but still attempt to read body for debug.
      const txt = await resp.text().catch(() => '');
      console.warn(`Supabase distances REST returned ${resp.status}: ${txt}`);
    } else {
      const data = (await resp.json()) as SupabaseDistanceRow[];
      if (Array.isArray(data) && data.length > 0) {
        const row = data[0];
        if (typeof row.km === 'number' && Number.isFinite(row.km)) {
          return row.km;
        }
      }
    }

    // Try reverse direction (some tables store only one direction)
    const qs2 = new URLSearchParams({
      select: 'km,from_city,to_city',
      from_city: `eq.${toCity}`,
      to_city: `eq.${fromCity}`,
    });
    const url2 = `${base}/rest/v1/distances?${qs2.toString()}`;

    const resp2 = await fetch(url2, {
      method: 'GET',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        Accept: 'application/json',
      },
    });

    if (!resp2.ok) {
      const txt2 = await resp2.text().catch(() => '');
      console.warn(`Supabase distances REST reverse returned ${resp2.status}: ${txt2}`);
      return null;
    }

    const data2 = (await resp2.json()) as SupabaseDistanceRow[];
    if (Array.isArray(data2) && data2.length > 0) {
      const row = data2[0];
      if (typeof row.km === 'number' && Number.isFinite(row.km)) {
        return row.km;
      }
    }

    return null;
  } catch (err) {
    console.error('Error querying Supabase distances:', err);
    return null;
  }
}