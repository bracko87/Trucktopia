/**
 * useServerGameClock.tsx
 * 
 * Synchronizes and STARTS the local game clock based on server extrapolation.
 */

import { useEffect, useRef } from 'react';
import { setGameOffsetMs, startClock } from '../utils/gameClock';

export default function useServerGameClock() {
  const endpoint = '/.netlify/functions/get-game-time';
  const resyncIntervalMs = 60_000; // Resync every minute to prevent drift
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    const fetchAndSync = async () => {
      try {
        const resp = await fetch(`${endpoint}?t=${Date.now()}`, { cache: 'no-store' });
        if (!resp.ok) return;

        const body = await resp.json();
        const serverMs = Number(body?.nowUtcMs);
        
        if (Number.isFinite(serverMs)) {
          // Set the offset relative to local system time
          const offset = Math.floor(serverMs - Date.now());
          setGameOffsetMs(offset);
          
          // CRITICAL: Start the clock so it ticks every 500ms locally
          startClock();
        }
      } catch (err) {
        console.warn('useServerGameClock: sync failed', err);
      }
    };

    fetchAndSync();

    const intervalId = window.setInterval(() => {
      if (mounted.current) fetchAndSync();
    }, resyncIntervalMs);

    return () => {
      mounted.current = false;
      window.clearInterval(intervalId);
    };
  }, []);
}