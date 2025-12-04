/**
 * gameClock.ts
 *
 * Central game clock utilities. Provides a single authoritative "game now"
 * which can be:
 * - real system time (default)
 * - an absolute override (setGameNowMs)
 * - an offset relative to real time (setGameOffsetMs)
 * - run at a multiplier speed for accelerated testing
 *
 * Other modules can call nowUtcMs() to get the current game epoch ms.
 * The module emits 'gameClock:updated' CustomEvent on window whenever the
 * reported game time changes so UIs/engines can subscribe.
 */

/**
 * SubscriberEventName
 * @description Name of the global CustomEvent emitted when the game clock updates.
 */
export const GAME_CLOCK_EVENT = 'gameClock:updated';

let absoluteOverrideMs: number | null = null; // absolute epoch ms if set
let offsetMs: number | null = null; // offset relative to real Date.now()
let running = false;
let speed = 1; // 1x by default when running (multiplier)
let intervalId: number | null = null;
let lastTickReal = Date.now();

/**
 * emitUpdate
 * @description Dispatch a global event so listeners can react to time changes.
 */
function emitUpdate() {
  try {
    const detail = { nowUtcMs: nowUtcMs() };
    window.dispatchEvent(new CustomEvent(GAME_CLOCK_EVENT, { detail }));
  } catch {
    // noop (defensive)
  }
}

/**
 * nowUtcMs
 * @description Returns the current authoritative game time as epoch ms (UTC-based).
 * Behavior:
 * - If absoluteOverrideMs is set return that
 * - Else if offsetMs is set return Date.now() + offsetMs
 * - Else return Date.now()
 * @returns number
 */
export function nowUtcMs(): number {
  if (absoluteOverrideMs !== null) {
    return Math.floor(absoluteOverrideMs);
  }
  if (offsetMs !== null) {
    return Math.floor(Date.now() + offsetMs);
  }
  return Date.now();
}

/**
 * setGameNowMs
 * @description Set an absolute in-game time (epoch ms). Pass null to clear.
 * Emits gameClock:updated.
 * @param ms absolute epoch ms or null
 */
export function setGameNowMs(ms: number | null) {
  absoluteOverrideMs = ms !== null ? Math.floor(ms) : null;
  // when an absolute override is set, keep lastTickReal anchored
  lastTickReal = Date.now();
  emitUpdate();
}

/**
 * setGameOffsetMs
 * @description Set a time offset (ms) relative to real time. Passing null clears offset.
 * Example: setGameOffsetMs(3600000) makes game time 1 hour ahead of real time.
 * Emits gameClock:updated.
 * @param ms offset ms or null
 */
export function setGameOffsetMs(ms: number | null) {
  offsetMs = ms !== null ? Math.floor(ms) : null;
  // clearing absolute override—offset takes effect only if override is null
  if (ms !== null) absoluteOverrideMs = null;
  lastTickReal = Date.now();
  emitUpdate();
}

/**
 * advanceGameMs
 * @description Advance the authoritative game time (absolute or offset) by delta ms.
 * If neither absolute nor offset present, this creates an absolute override starting from Date.now() then advances.
 * Emits gameClock:updated.
 * @param deltaMs number milliseconds to advance (can be negative)
 */
export function advanceGameMs(deltaMs: number) {
  if (absoluteOverrideMs !== null) {
    absoluteOverrideMs = Math.floor(absoluteOverrideMs + deltaMs);
  } else if (offsetMs !== null) {
    offsetMs = Math.floor((offsetMs ?? 0) + deltaMs);
  } else {
    // create absolute override anchored at real now and advance it
    absoluteOverrideMs = Math.floor(Date.now() + deltaMs);
  }
  emitUpdate();
}

/**
 * setSpeed
 * @description Configure running speed multiplier (e.g. 1x, 10x).
 * Does NOT toggle running state by itself.
 * @param s multiplier (positive number)
 */
export function setSpeed(s: number) {
  speed = Math.max(0, Number(s) || 0);
}

/**
 * startClock
 * @description Start advancing the clock automatically. The clock will
 * update absoluteOverrideMs or update offsetMs so nowUtcMs() progresses at the chosen speed.
 */
export function startClock() {
  if (running) return;
  running = true;
  lastTickReal = Date.now();
  // tick at 500ms to keep in sync and reasonably responsive
  intervalId = window.setInterval(() => {
    const nowReal = Date.now();
    const deltaReal = nowReal - lastTickReal;
    lastTickReal = nowReal;
    const deltaGame = Math.round(deltaReal * speed);
    // apply deltaGame to whichever mechanism is active
    if (absoluteOverrideMs !== null) {
      absoluteOverrideMs = Math.floor(absoluteOverrideMs + deltaGame);
    } else if (offsetMs !== null) {
      offsetMs = Math.floor((offsetMs ?? 0) + deltaGame);
    } else {
      // when neither set, create offset representing the accumulated difference
      offsetMs = Math.floor(deltaGame);
    }
    emitUpdate();
  }, 500) as unknown as number;
}

/**
 * stopClock
 * @description Stop automatic advancement. Leaves overrides/offset as-is and emits update.
 */
export function stopClock() {
  if (!running) return;
  running = false;
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
  emitUpdate();
}

/**
 * getState
 * @description Return a snapshot of internal clock state (useful for UI)
 */
export function getState() {
  return {
    absoluteOverrideMs,
    offsetMs,
    running,
    speed,
    nowUtcMs: nowUtcMs(),
  };
}

/**
 * subscribe
 * @description Add a listener for gameClock:updated events.
 * @param cb event callback that receives detail { nowUtcMs }
 */
export function subscribe(cb: (detail: { nowUtcMs: number }) => void) {
  const handler = (ev: any) => {
    try {
      cb(ev?.detail ?? { nowUtcMs: nowUtcMs() });
    } catch {
      // noop
    }
  };
  window.addEventListener(GAME_CLOCK_EVENT, handler as EventListener);
  // return unsubscribe
  return () => {
    window.removeEventListener(GAME_CLOCK_EVENT, handler as EventListener);
  };
}

