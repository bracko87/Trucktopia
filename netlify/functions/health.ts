/**
 * health.ts
 *
 * Lightweight Netlify function used for health checks.
 *
 * Responsibilities:
 * - Respond to GET requests (and POST) with a minimal JSON "ok" payload.
 * - Provide simple CORS headers so it can be checked from browsers or tooling.
 *
 * This file is intentionally tiny and isolated so it does not affect the main
 * migrate function behaviour or Netlify method settings.
 */

/**
 * handler
 * @description Netlify function entry point for health checks. Responds to GET and POST.
 * @param {any} event Netlify event object
 * @param {any} context Netlify context object
 * @returns {Promise<any>} Netlify-compatible response
 */
export const handler = async (event: any, context: any) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, X-Health-Check",
  };

  // Preflight handling
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers,
      body: "",
    };
  }

  // Respond for GET and POST (convenience)
  if (event.httpMethod === "GET" || event.httpMethod === "POST") {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true, service: "migrate", version: 1 }),
    };
  }

  // If some other method sneaks through, indicate allowed methods
  return {
    statusCode: 405,
    headers: { ...headers, Allow: "GET, POST, OPTIONS" },
    body: JSON.stringify({ ok: false, error: "Method not allowed" }),
  };
};