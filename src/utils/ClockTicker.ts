/**
 * ClockTicker.ts
 *
 * Small utility that drives engine ticks from the central game clock.
 *
 * Responsibilities:
 * - Subscribe to the canonical game clock (gameClock.ts) updates and accumulate
 *   in-game time deltas.
 * - Invoke registered callbacks every tickIntervalMs of game-time.
 * - Handle large jumps, negative deltas, pauses and speed changes robustly.
 *
 * Usage:
 * const ticker = createClockTicker(60_000); // one simulated-day tick every 60_000ms of game-time
 * const unsub = ticker.onTick((tickInstantUtcMs) => { /* engine tick */ });
 * ...
 * unsub(); ticker.dispose();
 */

/**
 * @module ClockTicker
 */

import { subscribe as subscribeGameClock, nowUtcMs } from './gameClock';

/**
 * TickCallback
 * @description Signature for tick callbacks invoked by ClockTicker.
 */
export type TickCallback = (tickTimeUtcMs: number) => void;

/**
 * ClockTickerHandle
 * @description Returned handle from createClockTicker.
 */
export interface ClockTickerHandle {
  /**
   * onTick
   * @description Register a tick callback. Returns an unsubscribe function for that callback.
   * @param cb TickCallback
   */
  onTick(cb: TickCallback): () => void;

  /**
   * dispose
   * @description Unsubscribe from the underlying game clock and clear callbacks.
   */
  dispose(): void;
}

/**
 * createClockTicker
 * @description Create a ticker that calls registered callbacks whenever the
 *              accumulated game-time advances by tickIntervalMs.
 *
 * @param tickIntervalMs number of game-time milliseconds per logical tick (default 60_000)
 * @returns ClockTickerHandle
 */
export default function createClockTicker(tickIntervalMs: number = 60_000): ClockTickerHandle {
  // lastNow tracks the last seen game-time instant (UTC ms)
  let lastNow = nowUtcMs();
  // accumulation buffer of game-time deltas (ms)
  let acc = 0;
  const callbacks = new Set<TickCallback>();

  // Subscribe to central game clock updates (fires frequently while running)
  const unsubGameClock = subscribeGameClock((detail: { nowUtcMs: number }) => {
    try {
      const eventNow = detail?.nowUtcMs ?? nowUtcMs();
      // Compute delta since last event. Can be large (jump) or negative (time moved backward).
      let delta = eventNow - lastNow;
      // Move lastNow forward to eventNow for next calculation.
      lastNow = eventNow;

      // Negative or zero delta: do not advance ticks, but keep lastNow in sync.
      if (!(delta > 0)) {
        return;
      }

      acc += delta;

      // If many ticks are due (because of a large jump or high speed), call callbacks multiple times.
      // We compute tickInstant as the nominal instant for each tick (approximate).
      while (acc >= tickIntervalMs) {
        acc -= tickIntervalMs;
        const tickInstant = eventNow - acc;
        // Call each callback defensively.
        callbacks.forEach((cb) => {
          try {
            cb(tickInstant);
          } catch (err) {
            // Swallow callback errors to avoid breaking the ticker loop.
            // Engines should handle their own errors.
            // eslint-disable-next-line no-console
            console.error('ClockTicker callback error', err);
          }
        });
      }
    } catch (err) {
      // Defensive: never let ticker subscription throw.
      // eslint-disable-next-line no-console
      console.error('ClockTicker internal error', err);
    }
  });

  return {
    onTick(cb: TickCallback) {
      callbacks.add(cb);
      return () => callbacks.delete(cb);
    },
    dispose() {
      try {
        unsubGameClock();
      } catch {
        // ignore
      }
      callbacks.clear();
    },
  };
}
