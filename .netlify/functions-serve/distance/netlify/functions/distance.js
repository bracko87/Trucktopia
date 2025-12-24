"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// netlify/functions/distance.ts
var distance_exports = {};
__export(distance_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(distance_exports);

// src/utils/server/getSupabaseDistance.ts
async function getSupabaseDistance(fromCity, toCity) {
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables");
  }
  if (!fromCity || !toCity) return null;
  const base = SUPABASE_URL.replace(/\/$/, "");
  const qs = new URLSearchParams({
    select: "km,from_city,to_city",
    from_city: `eq.${fromCity}`,
    to_city: `eq.${toCity}`
  });
  const url = `${base}/rest/v1/distances?${qs.toString()}`;
  try {
    const resp = await fetch(url, {
      method: "GET",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        Accept: "application/json"
      }
    });
    if (!resp.ok) {
      const txt = await resp.text().catch(() => "");
      console.warn(`Supabase distances REST returned ${resp.status}: ${txt}`);
    } else {
      const data = await resp.json();
      if (Array.isArray(data) && data.length > 0) {
        const row = data[0];
        if (typeof row.km === "number" && Number.isFinite(row.km)) {
          return row.km;
        }
      }
    }
    const qs2 = new URLSearchParams({
      select: "km,from_city,to_city",
      from_city: `eq.${toCity}`,
      to_city: `eq.${fromCity}`
    });
    const url2 = `${base}/rest/v1/distances?${qs2.toString()}`;
    const resp2 = await fetch(url2, {
      method: "GET",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        Accept: "application/json"
      }
    });
    if (!resp2.ok) {
      const txt2 = await resp2.text().catch(() => "");
      console.warn(`Supabase distances REST reverse returned ${resp2.status}: ${txt2}`);
      return null;
    }
    const data2 = await resp2.json();
    if (Array.isArray(data2) && data2.length > 0) {
      const row = data2[0];
      if (typeof row.km === "number" && Number.isFinite(row.km)) {
        return row.km;
      }
    }
    return null;
  } catch (err) {
    console.error("Error querying Supabase distances:", err);
    return null;
  }
}

// netlify/functions/distance.ts
var handler = async (event) => {
  try {
    const { from, to } = event?.queryStringParameters || {};
    if (!from || !to) {
      return { statusCode: 400, body: "from and to required" };
    }
    const km = await getSupabaseDistance(from, to);
    return {
      statusCode: km != null ? 200 : 404,
      body: JSON.stringify({ km })
    };
  } catch (err) {
    console.error("Distance function error:", err?.message ?? err);
    return { statusCode: 500, body: "internal error" };
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
//# sourceMappingURL=distance.js.map
