/**
 * RemoteStats.tsx
 *
 * File-level:
 * Admin stat grid that fetches counts from a serverless endpoint and renders
 * 4 stat cards (Total Users, With Companies, Active Today, Storage Used).
 *
 * Purpose:
 * - Never render raw or escaped HTML returned by remote endpoints.
 * - Provide a short sanitized error message, and allow callers to opt-out of showing it
 *   via the `hideErrors` prop (useful for AdminDashboard).
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Users, Building, BarChart3, Settings, RefreshCw } from 'lucide-react';

/**
 * StatsShape
 * @description Expected shape from the remote stats endpoint.
 */
interface StatsShape {
  totalUsers?: number | null;
  usersWithCompanies?: number | null;
  activeToday?: number | null;
  storageUsed?: number | null | undefined;
}

/**
 * Props
 * @description Component props for RemoteStats.
 */
interface Props {
  /**
   * hideErrors
   * @description When true, the component will NOT render the sanitized error box.
   */
  hideErrors?: boolean;
}

/**
 * SanitizedError
 * @description Internal compact error representation used by the UI.
 */
interface SanitizedError {
  shortMessage: string;
  detailCode?: 'html' | 'forbidden' | 'network' | 'other';
}

/**
 * isHtmlLike
 * @description Detect if a string looks like HTML (tags or full document).
 */
const isHtmlLike = (s: string) => /<\/?[a-z][\s\S]*>/i.test(s) || /<!doctype html/i.test(s) || /<html/i.test(s);

/**
 * sanitizeForUi
 * @description Convert any raw error into a short sanitized message suitable for UI.
 *              Avoids returning raw server bodies (HTML/text).
 * @param raw unknown raw message or Error
 */
const sanitizeForUi = (raw: unknown): SanitizedError => {
  if (raw == null) {
    return { shortMessage: 'Unable to load stats', detailCode: 'other' };
  }
  const s = String(raw).trim();

  // If it's clearly HTML or overly long, present a generic hint
  if (isHtmlLike(s) || s.length > 400) {
    if (/403|forbidden/i.test(s)) {
      return { shortMessage: 'Unable to load stats (403 Forbidden). Check function logs or env vars.', detailCode: 'forbidden' };
    }
    return { shortMessage: 'Unable to load stats (remote server returned HTML). Check function logs.', detailCode: 'html' };
  }

  // Short textual error: clamp length to 120 chars
  const cleaned = s.replace(/[\r\n]+/g, ' ');
  return {
    shortMessage: cleaned.length > 120 ? cleaned.slice(0, 120) + '…' : cleaned,
    detailCode: /network/i.test(s) ? 'network' : 'other'
  };
};

/**
 * fetchStatsJson
 * @description Fetch helper that prefers JSON and throws concise errors for non-JSON responses.
 *              Does not return raw HTML bodies.
 * @param url endpoint to call
 */
const fetchStatsJson = async (url: string) => {
  const res = await fetch(url, { credentials: 'same-origin' });
  const contentType = (res.headers.get('content-type') || '').toLowerCase();

  if (!res.ok) {
    // If server returned JSON with an error payload, try to use it
    if (contentType.includes('application/json')) {
      const body = await res.json().catch(() => null);
      const msg = body?.message || body?.error || `${res.status} ${res.statusText}`;
      throw new Error(String(msg));
    }
    // For HTML/text error pages (like nginx 403), do not fetch body — throw safe status
    throw new Error(`${res.status} ${res.statusText}`);
  }

  // Successful response: prefer JSON
  if (contentType.includes('application/json')) {
    return res.json();
  }

  // If server returned text but it's JSON-like, attempt to parse; otherwise throw.
  const text = await res.text().catch(() => null);
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error('Remote endpoint returned non-JSON response.');
  }
};

/**
 * RemoteStats
 * @description Renders a 4-card stat grid and a sanitized error box. The error box
 *              can be suppressed by setting hideErrors to true.
 */
const RemoteStats: React.FC<Props> = ({ hideErrors = false }) => {
  const [stats, setStats] = useState<StatsShape | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<SanitizedError | null>(null);
  const [attempt, setAttempt] = useState<number>(0); // used to trigger retries

  /**
   * load
   * @description Fetch stats and set state; sanitize any errors.
   */
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const json = await fetchStatsJson('/.netlify/functions/supabase-stats');
      setStats({
        totalUsers: typeof json.totalUsers === 'number' ? json.totalUsers : null,
        usersWithCompanies: typeof json.usersWithCompanies === 'number' ? json.usersWithCompanies : null,
        activeToday: typeof json.activeToday === 'number' ? json.activeToday : null,
        storageUsed: typeof json.storageUsed === 'number' ? json.storageUsed : null
      });
    } catch (err: any) {
      setStats(null);
      setError(sanitizeForUi(err?.message ?? err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, attempt]);

  /**
   * renderValue
   * @description Render numbers or placeholders consistently.
   */
  const renderValue = (v: number | string | null | undefined) => {
    if (loading) return '…';
    if (v === null || typeof v === 'undefined') return '—';
    if (typeof v === 'number') return v.toLocaleString();
    return String(v);
  };

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="flex items-center space-x-2 mb-2">
            <Users className="w-5 h-5 text-blue-400" />
            <div className="text-sm text-slate-400">Total Users</div>
          </div>
          <div className="text-2xl font-bold text-white">{renderValue(stats?.totalUsers)}</div>
        </div>

        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="flex items-center space-x-2 mb-2">
            <Building className="w-5 h-5 text-green-400" />
            <div className="text-sm text-slate-400">With Companies</div>
          </div>
          <div className="text-2xl font-bold text-white">{renderValue(stats?.usersWithCompanies)}</div>
        </div>

        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="flex items-center space-x-2 mb-2">
            <BarChart3 className="w-5 h-5 text-yellow-400" />
            <div className="text-sm text-slate-400">Active Today</div>
          </div>
          <div className="text-2xl font-bold text-white">{renderValue(stats?.activeToday)}</div>
        </div>

        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="flex items-center space-x-2 mb-2">
            <Settings className="w-5 h-5 text-purple-400" />
            <div className="text-sm text-slate-400">Storage Used</div>
          </div>
          <div className="text-2xl font-bold text-white">
            {renderValue(stats?.storageUsed ? `${stats.storageUsed} KB` : stats?.storageUsed)}
          </div>
        </div>
      </div>

      {/* Sanitized error UI. Suppressed when hideErrors === true. */}
      {!hideErrors && error && (
        <div className="mt-3 flex items-center justify-between bg-slate-800 border border-slate-700 rounded-lg p-3">
          <div className="text-sm text-rose-400">
            {error.shortMessage}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setAttempt(a => a + 1)}
              className="inline-flex items-center space-x-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-sm text-white px-3 py-1 rounded-md"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry</span>
            </button>

            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                // Minimal guidance instead of printing logs into the page
                alert('Please check your serverless function logs and ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE env vars are set.');
              }}
              className="text-sm text-slate-400 underline hover:text-white"
            >
              Check function logs
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default RemoteStats;