/**
 * Netlify function: distance.ts
 *
 * Purpose:
 * - Small serverless function to expose authoritative driving distances from Supabase.
 * - Uses server helper (server-only) getSupabaseDistance to keep service role key on the server.
 *
 * Notes:
 * - This function is server-side only and must run in Netlify functions (or other serverless env).
 * - It accepts query params `from` and `to` and returns JSON { km } when found.
 */

import { getSupabaseDistance } from '../../src/utils/server/getSupabaseDistance';

/**
 * handler
 * @description Netlify function handler to return km for a city pair.
 * @param event - Netlify event object
 */
export const handler = async (event: any) => {
  try {
    const { from, to } = (event?.queryStringParameters as Record<string, string>) || {};

    if (!from || !to) {
      return { statusCode: 400, body: 'from and to required' };
    }

    const km = await getSupabaseDistance(from, to);

    return {
      statusCode: km != null ? 200 : 404,
      body: JSON.stringify({ km }),
    };
  } catch (err: any) {
    console.error('Distance function error:', err?.message ?? err);
    return { statusCode: 500, body: 'internal error' };
  }
};