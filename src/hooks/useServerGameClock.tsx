/**
 * useServerGameClock.tsx
 *
 * React hook that synchronizes the client (UI) clock with the authoritative
 * server-side game time. Pattern:
 *  - Fetch initial game time from server endpoint (Netlify function at /.netlify/functions/get-game-time)
 *  - Compute offset = serverTimeMs - Date.now()
 *  - Call setGameOffsetMs(offset) so utils/gameClock.nowUtcMs() follows server time and advances locally
 *  - Re-fetch periodically to correct drift (default: 60 seconds)
 *
 * Responsibilities:
 * - Provide a simple hook UI components can call once (e.g. in Layout or App)
 * - Avoids continuous DB hits by using an initial fetch + local ticking
 */

import { useEffect, useRef } from 'react';
import { setGameOffsetMs } from '../utils/gameClock';

/**
 * UseServerGameClockOptions
 * @description Options for the hook
 */
interface UseServerGameClockOptions {
  /** Netlify function path or any server endpoint that returns { nowUtcMs:number } */
  endpoint?: string;
  /** Re-sync interval in milliseconds (default: 60s) */
  resyncIntervalMs?: number;
  /** Whether to auto-start local ticking (we only set offset so ticking happens automatically) */
  autoStart?: boolean;
}

/**
 * useServerGameClock
 * @description Synchronize client clock with server game_time.
 *              Call this once at app startup (Layout or App).
 */
export default function useServerGameClock(options?: UseServerGameClockOptions) {
  const endpoint = options?.endpoint ?? '/.netlify/functions/get-game-time';
  const resyncIntervalMs = options?.resyncIntervalMs ?? 60_000;
  const autoStart = options?.autoStart ?? true;

  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    let intervalId: number | undefined;

    const fetchAndSync = async () => {
      try {
        const resp = await fetch(endpoint, { cache: 'no-store' });
        if (!resp.ok) {
          // don't throw — we want the app to continue even if the server call fails
          // console.warn('useServerGameClock: server responded with', resp.status);
          return;
        }
        const body = await resp.json();
        // server returns nowUtcMs in ms
        const serverMs = Number(body?.nowUtcMs ?? body?.nowUtc ?? body?.now);
        if (!Number.isFinite(serverMs)) return;

        // Compute offset so nowUtcMs() === serverMs and local Date.now() will advance the clock
        const offset = Math.floor(serverMs - Date.now());
        setGameOffsetMs(offset);

        // Optionally start the clock engine if desired (do not force start if app has other logic)
        if (autoStart) {
          // startClock() is intentionally not called here to avoid surprising side-effects.
          // The core gameClock will advance automatically because we set offset relative to Date.now().
        }
      } catch (err) {
        // swallow — UI should remain functional even if server sync fails
        // eslint-disable-next-line no-console
        console.warn('useServerGameClock: failed to fetch server game time', err);
      }
    };

    // Initial fetch
    fetchAndSync();

    // Periodic resync to correct drift
    intervalId = window.setInterval(() => {
      if (!mounted.current) return;
      fetchAndSync();
    }, resyncIntervalMs) as unknown as number;

    return () => {
      mounted.current = false;
      if (intervalId) clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, resyncIntervalMs, autoStart]);
}