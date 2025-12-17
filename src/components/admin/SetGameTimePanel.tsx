/**
 * SetGameTimePanel.tsx
 *
 * Admin UI panel to view and update the canonical server game time.
 *
 * Responsibilities:
 * - Fetch and display current authoritative server time (via /.netlify/functions/get-game-time).
 * - Allow admins to set server time to "now" or provide an ISO/datetime-local string.
 * - Require an admin key (x-admin-key) for secure calls to the set-game-time function.
 * - Save admin key to localStorage for convenience.
 */

import React, { useEffect, useState } from 'react';
import { Clock, Check, XCircle } from 'lucide-react';

/**
 * parseToUtcMs
 * @description Convert user input (ISO or datetime-local) to UTC epoch ms. Returns null when invalid.
 * @param v input string
 */
function parseToUtcMs(v: string): number | null {
  if (!v) return null;
  // If value looks like a plain number, treat as ms
  const maybeNum = Number(v);
  if (!Number.isNaN(maybeNum) && String(v).length > 3) return Math.floor(maybeNum);
  // Try Date.parse for ISO or timezone-aware strings
  const parsed = Date.parse(v);
  if (!Number.isNaN(parsed)) return parsed;
  // Try treating datetime-local (no timezone) as local and convert to UTC ms
  // HTML input datetime-local gives a local wall-clock string like "2025-12-01T18:00"
  try {
    const d = new Date(v);
    const t = d.getTime();
    if (!Number.isNaN(t)) return t;
  } catch {
    // fallthrough
  }
  return null;
}

/**
 * SetGameTimePanel
 * @description Small admin panel UI to get/set server game time.
 */
const SetGameTimePanel: React.FC = () => {
  const [serverTimeIso, setServerTimeIso] = useState<string | null>(null);
  const [serverTimeMs, setServerTimeMs] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [adminKey, setAdminKey] = useState<string>(() => localStorage.getItem('admin_key') || '');
  const [inputValue, setInputValue] = useState<string>('');
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);

  /**
   * fetchServerTime
   * @description Fetch current authoritative game time from serverless endpoint.
   */
  async function fetchServerTime() {
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch('/.netlify/functions/get-game-time', { cache: 'no-store' });
      if (!res.ok) {
        setStatus({ ok: false, message: `Failed to fetch server time: ${res.status}` });
        setLoading(false);
        return;
      }
      const body = await res.json();
      const nowUtcMs = Number(body?.nowUtcMs ?? body?.nowUtc ?? body?.now);
      if (!Number.isFinite(nowUtcMs)) {
        setStatus({ ok: false, message: 'Server responded but payload missing nowUtcMs' });
      } else {
        setServerTimeMs(nowUtcMs);
        setServerTimeIso(new Date(nowUtcMs).toISOString());
      }
    } catch (err: any) {
      setStatus({ ok: false, message: `Error fetching server time: ${String(err?.message ?? err)}` });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchServerTime();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * saveAdminKey
   * @description Persist admin key to localStorage for convenience.
   */
  function saveAdminKey(k: string) {
    setAdminKey(k);
    try {
      if (k) localStorage.setItem('admin_key', k);
      else localStorage.removeItem('admin_key');
    } catch {
      // ignore storage errors
    }
  }

  /**
   * callSetGameTime
   * @description Call serverless function to set game time. Accepts epoch ms.
   * @param ms epoch ms to set on server
   */
  async function callSetGameTime(ms: number) {
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch('/.netlify/functions/set-game-time', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(adminKey ? { 'x-admin-key': adminKey } : {}),
        },
        body: JSON.stringify({ now: ms }),
      });
      const text = await res.text();
      let json: any = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        // non-json response
      }
      if (!res.ok) {
        setStatus({ ok: false, message: `Server error: ${res.status} ${text || ''}` });
      } else {
        const newNow = Number(json?.nowUtcMs ?? json?.nowUtc ?? json?.now ?? ms);
        setServerTimeMs(newNow);
        setServerTimeIso(new Date(newNow).toISOString());
        setStatus({ ok: true, message: `Server time updated: ${new Date(newNow).toISOString()}` });
      }
    } catch (err: any) {
      setStatus({ ok: false, message: `Request failed: ${String(err?.message ?? err)}` });
    } finally {
      setLoading(false);
    }
  }

  /**
   * handleSetNow
   * @description Set server time to current client now (UTC ms).
   */
  const handleSetNow = async () => {
    const ms = Date.now();
    await callSetGameTime(ms);
  };

  /**
   * handleSetFromInput
   * @description Parse input and call set-game-time with parsed ms.
   */
  const handleSetFromInput = async () => {
    const ms = parseToUtcMs(inputValue);
    if (!ms) {
      setStatus({ ok: false, message: 'Invalid date/time input. Use ISO or numeric epoch ms.' });
      return;
    }
    await callSetGameTime(ms);
  };

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 max-w-3xl">
      <div className="flex items-center space-x-3 mb-4">
        <div className="p-2 rounded-md bg-slate-700 text-sky-400">
          <Clock className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Admin: Set Server Game Time</h3>
          <p className="text-sm text-slate-400">View and update the authoritative game clock (server-side).</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <div className="text-xs text-slate-400 mb-1">Current Server Time</div>
          <div className="text-sm text-white font-medium">
            {loading && !serverTimeIso ? 'Loading…' : serverTimeIso ?? 'Unknown'}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {serverTimeMs ? `UTC Epoch ms: ${serverTimeMs}` : null}
          </div>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">Admin Key</label>
          <div className="flex gap-2">
            <input
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              onBlur={(e) => saveAdminKey(e.target.value)}
              placeholder="x-admin-key..."
              className="flex-1 bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none"
            />
            <button
              onClick={() => {
                saveAdminKey(adminKey);
                setStatus({ ok: true, message: 'Admin key saved to localStorage' });
              }}
              className="px-3 py-2 bg-sky-600 hover:bg-sky-700 rounded text-white text-sm"
            >
              Save
            </button>
          </div>
          <div className="text-xs text-slate-500 mt-1">The admin key is sent as header x-admin-key.</div>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-xs text-slate-400 mb-1">Set Time (ISO / datetime-local / epoch ms)</label>
        <div className="flex gap-2">
          <input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="e.g. 2025-12-01T22:27:11+01:00 or 1760000000000"
            className="flex-1 bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none"
          />
          <button
            onClick={handleSetFromInput}
            disabled={loading}
            className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded text-sm"
          >
            Set
          </button>
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={handleSetNow}
            disabled={loading}
            className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
          >
            Set to Now
          </button>
          <button
            onClick={fetchServerTime}
            disabled={loading}
            className="px-3 py-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white rounded text-sm"
          >
            Refresh
          </button>
        </div>
      </div>

      {status && (
        <div className={`flex items-start gap-2 p-3 rounded ${status.ok ? 'bg-green-900/20 border border-green-700' : 'bg-rose-900/20 border border-rose-700'}`}>
          {status.ok ? <Check className="w-4 h-4 text-green-400" /> : <XCircle className="w-4 h-4 text-rose-400" />}
          <div className="text-sm text-white">{status.message}</div>
        </div>
      )}
    </div>
  );
};

export default SetGameTimePanel;