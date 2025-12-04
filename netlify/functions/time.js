/**
 * netlify/functions/time.js
 *
 * Minimal Netlify Function that returns the current authoritative server time (epoch ms).
 *
 * Usage:
 * GET /.netlify/functions/time
 *
 * Response:
 * { now: 1672531200000 }
 *
 * Note: Keep this file in JS so Netlify functions run without additional build steps.
 */
exports.handler = async function () {
  try {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ now: Date.now() }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'could not get server time' }),
    };
  }
};
