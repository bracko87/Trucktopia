/**
 * inGameTime.ts
 *
 * File-level:
 * Small helper utilities to prefer the in-game clock when producing Date values.
 *
 * Purpose:
 * - Provide consistent source of "now" and date arithmetic based on the game's in-memory clock
 *   (when available in gameState.gameClock.now or similar fields).
 * - Fall back to real world Date when game clock is not available.
 *
 * Usage:
 * - Import getInGameDate, addGameDays, inGameNowISO and pass the game's gameState
 *   (or the game object) when available:
 *     const start = getInGameDate(gameState);
 *     const end = addGameDays(start, days, gameState);
 */
 
/**
 * getInGameDate
 * @description Return a Date object representing the in-game current time when available,
 *              otherwise fall back to new Date().
 * @param gameState optional game state object where a clock may be present
 * @returns Date
 */
export function getInGameDate(gameState?: any): Date {
  try {
    // Common keys used across projects: gameClock.now (ISO), gameTime.now, time.now, now
    const nowCandidate =
      gameState?.gameClock?.now ?? gameState?.gameTime?.now ?? gameState?.time?.now ?? gameState?.now;
    if (nowCandidate) {
      // Accept ISO string or numeric timestamp
      const asNumber = Number(nowCandidate);
      if (!Number.isNaN(asNumber)) {
        const d = new Date(asNumber);
        if (!Number.isNaN(d.getTime())) return d;
      }
      const d2 = new Date(String(nowCandidate));
      if (!Number.isNaN(d2.getTime())) return d2;
    }
  } catch {
    // ignore and fallback
  }
  return new Date();
}

/**
 * addGameDays
 * @description Add a number of whole days to a provided date. Uses plain calendar arithmetic
 *              and therefore behaves the same regardless of source of Date (real or in-game).
 * @param date base date
 * @param days integer days to add (may be negative)
 * @param _gameState optional gameState - kept for API symmetry and possible future extensions
 * @returns new Date instance
 */
export function addGameDays(date: Date, days: number, _gameState?: any): Date {
  const out = new Date(date.getTime());
  out.setDate(out.getDate() + Math.round(days));
  return out;
}

/**
 * inGameNowISO
 * @description Convenience: returns ISO string for current in-game time (or real now when not available).
 * @param gameState optional gameState object
 * @returns ISO timestamp string
 */
export function inGameNowISO(gameState?: any): string {
  return getInGameDate(gameState).toISOString();
}
