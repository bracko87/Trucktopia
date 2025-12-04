/**
 * gameTime.ts
 *
 * Helpers for interpreting and comparing in-game dates using a canonical game timezone.
 *
 * Responsibilities:
 * - Define the in-game timezone (Europe/Berlin).
 * - Provide robust parsing for date/time values that may be:
 *    - numeric epoch ms
 *    - ISO timestamps with timezone
 *    - naive local-ish timestamps (e.g. "2025-12-01 18:00") which we interpret as Europe/Berlin wall-clock
 * - Provide a helper to compute timezone offset for a given instant using Intl.
 *
 * Why:
 * - Browsers may parse naive date strings differently depending on environment.
 * - For game logic we want deterministic behaviour: naive dates -> Germany timezone.
 */

/**
 * GAME_TIMEZONE
 * @description Canonical in-game timezone used for all date parsing and comparisons.
 */
export const GAME_TIMEZONE = 'Europe/Berlin';

/**
 * getTimeZoneOffsetMs
 * @description Return the offset (ms) between the provided Date instant (UTC epoch) and the wall-clock time in the provided timeZone.
 *              Computed as: offsetMs = instant.getTime() - Date.UTC(partsFromTimeZoneFormatter)
 * @param date Date instant
 * @param timeZone IANA timezone string (default GAME_TIMEZONE)
 * @returns number timezone offset in milliseconds
 */
export function getTimeZoneOffsetMs(date: Date, timeZone: string = GAME_TIMEZONE): number {
  // Use Intl.DateTimeFormat to get time zone local components for the given instant.
  const dtf = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  // formatToParts gives structured parts we can use to build an equivalent UTC timestamp for that zone's wall clock
  const parts = dtf.formatToParts(date).reduce<Record<string, string>>((acc, p) => {
    if (p.type && p.value) acc[p.type] = p.value;
    return acc;
  }, {});

  const year = Number(parts.year || 0);
  const month = Number(parts.month || 1);
  const day = Number(parts.day || 1);
  const hour = Number(parts.hour || 0);
  const minute = Number(parts.minute || 0);
  const second = Number(parts.second || 0);

  const tzWallClockUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  return date.getTime() - tzWallClockUtc;
}

/**
 * parseGameDate
 * @description Parse various date inputs and return a UTC timestamp (ms). Behavior:
 *   - numeric -> interpreted as epoch ms if finite
 *   - Date instance -> its .getTime()
 *   - ISO or timezone-aware strings -> Date.parse(value)
 *   - naive strings (YYYY-MM-DD[ T]HH:mm[:ss]) -> interpreted as Europe/Berlin wall-clock and converted to UTC
 * @param value any input representing a date/time
 * @param timeZone IANA timezone string; defaults to GAME_TIMEZONE
 * @returns number | null UTC timestamp in ms or null when parsing fails
 */
export function parseGameDate(value: any, timeZone: string = GAME_TIMEZONE): number | null {
  if (value === null || value === undefined || value === '') return null;

  // Already numeric epoch ms
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.floor(value);
  }

  // Date instance
  if (value instanceof Date) {
    const t = value.getTime();
    return Number.isFinite(t) ? t : null;
  }

  // String handling
  if (typeof value === 'string') {
    const s = value.trim();

    // If string contains a timezone designator (Z or ±HH or ±HH:MM) or ISO T...Z, rely on Date.parse
    if (/[zZ]|[+\-]\d{2}:\d{2}$|[+\-]\d{2}$/.test(s) || /\dT\d/.test(s)) {
      const parsed = Date.parse(s);
      if (!Number.isNaN(parsed)) return parsed;
      // Fallthrough to attempt manual parse
    }

    // Attempt to parse common naive formats: YYYY[-]MM[-]DD[ T]HH[:mm[:ss]]
    const m = s.match(/^(\d{4})-?(\d{2})-?(\d{2})[ T](\d{2}):?(\d{2})(?::?(\d{2}))?$/);
    if (m) {
      const year = Number(m[1]);
      const month = Number(m[2]);
      const day = Number(m[3]);
      const hour = Number(m[4]);
      const minute = Number(m[5]);
      const second = Number(m[6] ?? 0);

      // Tentative UTC from the wall-clock parts
      const tentativeUtc = Date.UTC(year, month - 1, day, hour, minute, second);

      // Determine offset for the timezone at that instant using the tentativeUtc as reference.
      // The computed offset will be how far the timezone's wall-clock lags/leads UTC for that instant.
      const offsetMs = getTimeZoneOffsetMs(new Date(tentativeUtc), timeZone);

      // Real UTC timestamp for that wall-clock in the timezone
      const realUtc = tentativeUtc - offsetMs;
      return realUtc;
    }

    // Last resort: try Date.parse again
    const fallback = Date.parse(s);
    if (!Number.isNaN(fallback)) return fallback;
  }

  return null;
}

/**
 * nowUtcMs
 * @description Return the current UTC epoch ms. Useful when comparing parsed ETA (which is returned as UTC ms).
 * @returns number
 */
export function nowUtcMs(): number {
  return Date.now();
}
