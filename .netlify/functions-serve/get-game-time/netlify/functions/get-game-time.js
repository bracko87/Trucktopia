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

// netlify/functions/get-game-time.ts
var get_game_time_exports = {};
__export(get_game_time_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(get_game_time_exports);
var SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
var SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
var handler = async (event, context) => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Missing Supabase credentials" })
    };
  }
  try {
    const url = `${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/game_time?id=eq.1&select=current_time,updated_at`;
    const resp = await fetch(url, {
      method: "GET",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        Accept: "application/json"
      }
    });
    const data = await resp.json();
    if (!Array.isArray(data) || data.length === 0) {
      return { statusCode: 404, body: JSON.stringify({ error: "game_time row not found" }) };
    }
    const row = data[0];
    const dbGameTime = new Date(row.current_time).getTime();
    const dbRealTime = new Date(row.updated_at).getTime();
    const realNow = Date.now();
    const elapsedMs = realNow - dbRealTime;
    const projectedTimeMs = dbGameTime + elapsedMs;
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-cache" },
      body: JSON.stringify({
        nowUtcMs: projectedTimeMs,
        debug: {
          db_game_time: new Date(dbGameTime).toISOString(),
          db_updated_at: new Date(dbRealTime).toISOString(),
          elapsed_since_update_ms: elapsedMs
        }
      })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Unexpected error", message: err.message })
    };
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
//# sourceMappingURL=get-game-time.js.map
