/**
 * GameClockBootstrap.tsx
 *
 * Small bootstrap component that seeds the canonical game clock with an authoritative time.
 *
 * Responsibilities:
 * - Accept an ISO timestamp (initialIso) and set the canonical game time using setGameNowMs.
 * - If no initialIso is provided, optionally fetch authoritative time from a server endpoint.
 * - Optionally start the game clock so time advances automatically.
 * - Provide optional debug logging for verification.
 *
 * Usage examples:
 * <GameClockBootstrap initialIso="2025-12-01T22:27:11+01:00" start={true} debug={false} />
 * <GameClockBootstrap fetchUrl="/.netlify/functions/time" start={true} debug={true} />
 */

import React, { useEffect } from 'react';
import { setGameNowMs, setGameOffsetMs, startClock } from '../../utils/gameClock';

/**
 * Props
 * @property initialIso optional ISO timestamp string to seed the game clock (e.g. "2025-12-01T22:27:11+01:00")
 * @property start whether to call startClock() after seeding (default true)
 * @property debug whether to log debug messages
 * @property fetchUrl optional server URL to fetch authoritative time from when initialIso is not provided
 *                   expected response: { now: number } where now is epoch ms
 * @property fetchTimeoutMs timeout for fetch in ms (default 5000)
 */
interface Props {
  initialIso?: string | null;
  start?: boolean;
  debug?: boolean;
  fetchUrl?: string | null;
  fetchTimeoutMs?: number;
}

/**
 * fetchWithTimeout
 * @description Fetch wrapper that aborts after timeoutMs.
 * @param url request url
 * @param timeoutMs milliseconds before abort
 */
async function fetchWithTimeout(url: string, timeoutMs: number) {
  const controller = new AbortController();
  const id = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, credentials: 'same-origin' });
    return res;
  } finally {
    clearTimeout(id);
  }
}

/**
 * tryFetchServerTime
 * @description Try to fetch { now } from fetchUrl and return epoch ms or null on failure.
 * @param fetchUrl endpoint to call
 * @param timeoutMs fetch timeout
 * @param debug whether to console.debug
 */
async function tryFetchServerTime(fetchUrl: string, timeoutMs: number, debug = false): Promise<number | null> {
  try {
    if (debug) console.info('[GameClockBootstrap] fetching server time from', fetchUrl);
    const res = await fetchWithTimeout(fetchUrl, timeoutMs);
    if (!res.ok) {
      if (debug) console.warn('[GameClockBootstrap] server time fetch returned non-ok', res.status);
      return null;
    }
    const data = await res.json();
    if (data && typeof data.now === 'number' && Number.isFinite(data.now)) {
      if (debug) console.info('[GameClockBootstrap] server time received', data.now);
      return Math.floor(data.now);
    }
    if (debug) console.warn('[GameClockBootstrap] server time payload missing "now" numeric field', data);
    return null;
  } catch (err) {
    if (debug) console.warn('[GameClockBootstrap] fetch error', err);
    return null;
  }
}

/**
 * GameClockBootstrap
 * @description React component that seeds the central gameClock on mount.
 *
 * Behavior:
 * - If initialIso is provided and is a valid date string, it sets setGameNowMs(parsedMs).
 * - Else if fetchUrl is provided, attempts to fetch the authoritative time and set it.
 * - If neither provided or all fails, the component remains a no-op (safe).
 * - If start is true (default), calls startClock() to let the in-game time progress.
 */
const GameClockBootstrap: React.FC<Props> = ({
  initialIso = null,
  start = true,
  debug = false,
  fetchUrl = '/.netlify/functions/time',
  fetchTimeoutMs = 5000,
}) => {
  useEffect(() => {
    let didSet = false;

    /**
     * seedFromIso
     * @description Parse ISO and set absolute game time if valid.
     */
    const seedFromIso = (iso: string | null) => {
      if (!iso) return false;
      try {
        const parsed = new Date(iso);
        const ms = parsed.getTime();
        if (Number.isNaN(ms)) {
          if (debug) console.warn('[GameClockBootstrap] initialIso could not be parsed:', iso);
          return false;
        }
        setGameNowMs(ms);
        if (debug) {
          const berlinString = new Date(ms).toLocaleString('en-GB', { timeZone: 'Europe/Berlin' });
          console.info(`[GameClockBootstrap] setGameNowMs(${ms}) => Berlin: ${berlinString}`);
        }
        didSet = true;
        return true;
      } catch (err) {
        if (debug) console.error('[GameClockBootstrap] error parsing initialIso', err);
        return false;
      }
    };

    (async () => {
      // 1) Prefer explicit ISO seed if provided
      if (initialIso && seedFromIso(initialIso)) {
        if (start) {
          startClock();
          if (debug) console.info('[GameClockBootstrap] startClock() called (seeded from ISO)');
        }
        return;
      }

      // 2) Try server-side authoritative time if a fetchUrl is provided
      if (fetchUrl) {
        const serverMs = await tryFetchServerTime(fetchUrl, fetchTimeoutMs, debug);
        if (serverMs !== null) {
          // Use absolute server time anchor
          setGameNowMs(serverMs);
          didSet = true;
          if (debug) {
            const berlinString = new Date(serverMs).toLocaleString('en-GB', { timeZone: 'Europe/Berlin' });
            console.info(`[GameClockBootstrap] setGameNowMs(${serverMs}) => Berlin: ${berlinString} (fetched)`);
          }
          if (start) {
            startClock();
            if (debug) console.info('[GameClockBootstrap] startClock() called (seeded from server fetch)');
          }
          return;
        }
      }

      // 3) fallback: no seed applied
      if (debug && !didSet) {
        console.info('[GameClockBootstrap] no initialIso and server fetch failed/disabled — skipping bootstrap.');
      }
    })();

    // run only once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // No UI — this is a hidden bootstrap only
  return null;
};

export default GameClockBootstrap;
