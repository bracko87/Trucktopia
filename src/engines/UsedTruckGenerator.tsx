/**
 * src/engines/UsedTruckGenerator.tsx
 *
 * UI-less background engine that generates used truck offers daily.
 *
 * Responsibilities:
 * - Generate N used truck offers (default 300) once per game-day at 00:35 (prefers in-game time when available).
 * - Each offer includes id, sourceId, brand, model, productionYear (>=2010), kilometers, condition (40..90),
 *   price computed from the new price constrained to 40%..80% and biased by condition/age/km.
 * - Persist offers to localStorage key: tm_used_truck_offers and timestamp key: tm_used_truck_offers_generatedAt.
 * - Export helpers: readOffersFromStorage(), generateUsedOffers(), forceRegenerateUsedOffers(), readGenerationTimestamp().
 *
 * Notes:
 * - The component prefers in-game time by reading GameContext via useGame(). If no in-game time is detected,
 *   it falls back to local wall-clock but does an immediate initial generation if storage is empty or stale.
 * - The component dispatches a CustomEvent 'tm:used-offers-generated' with detail { count } on generation.
 */

import React from 'react';
import { useGame } from '../contexts/GameContext';
import { TRUCKS } from '../data/trucks';

/**
 * STORAGE_KEY
 * @description Local storage key for the generated used offers.
 */
export const STORAGE_KEY = 'tm_used_truck_offers';
/**
 * STORAGE_TS_KEY
 * @description Local storage key for the generation timestamp.
 */
export const STORAGE_TS_KEY = 'tm_used_truck_offers_generatedAt';

/**
 * DEFAULT_OFFER_COUNT
 * @description Default number of offers to generate on daily regeneration.
 */
export const DEFAULT_OFFER_COUNT = 300;

/**
 * clamp
 * @description Clamp number n to [min, max]
 */
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/**
 * rand
 * @description Random float in [min, max)
 */
function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

/**
 * randInt
 * @description Random integer in [min, max]
 */
function randInt(min: number, max: number) {
  return Math.floor(rand(min, max + 1));
}

/**
 * getCanonicalTrucks
 * @description Flatten TRUCKS small/medium/big into a single array for sampling.
 */
function getCanonicalTrucks(): any[] {
  try {
    const small = (TRUCKS.small || []).map((t: any) => ({ ...t }));
    const medium = (TRUCKS.medium || []).map((t: any) => ({ ...t }));
    const big = (TRUCKS.big || []).map((t: any) => ({ ...t }));
    return [...small, ...medium, ...big].filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * computeUsedPercent
 * @description Compute price percent (0.40..0.80) of new price biased by condition/age/km.
 *              NOTE: condition is expected to be in the range 40..90 for this generator.
 * @param params condition, ageYears, kilometers
 * @returns percent between 0.40 and 0.80
 */
export function computeUsedPercent(params: { condition: number; ageYears: number; kilograms?: number; kilometers: number }): number {
  const { condition, ageYears, kilometers } = params;

  // Base random percent between 0.40 and 0.80
  const base = rand(0.40, 0.80);

  // Condition bias:
  // - Generator uses condition in range 40..90.
  // - Normalize 40 -> 0, 90 -> 1 to compute bias.
  const conditionNorm = clamp((condition - 40) / 50, 0, 1);
  // conditionBias roughly -0.15..+0.15 (same scale as before)
  const conditionBias = (conditionNorm - 0.5) * 0.3;

  // Age bias: older reduces percent up to -0.3 (for ~20+ years)
  const ageFactor = clamp(ageYears / 20, 0, 1);
  const ageBias = -ageFactor * 0.3;

  // Kilometers bias: scales to -0.15 for very high km (~400k+)
  const kmFactor = clamp(kilometers / 400000, 0, 1);
  const kmBias = -kmFactor * 0.15;

  const raw = base + conditionBias + ageBias + kmBias;
  return clamp(raw, 0.4, 0.8);
}

/**
 * generateOfferFromTruck
 * @description Generate a single used truck offer from a canonical truck blueprint.
 *              Adds deliveryDays and availability for used trucks so they show up as
 *              immediate..2 days delivery according to the requested behaviour.
 */
function generateOfferFromTruck(blue: any, idx: number) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const newPrice = Number(blue?.price ?? blue?.msrp ?? 0) || 0;

  // production year between 2010 and currentYear - 1 (not brand new)
  const maxYear = Math.max(2010, currentYear - 1);
  const productionYear = randInt(2010, maxYear);
  const ageYears = Math.max(0, currentYear - productionYear);

  // kilometers: ageYears * (8k..45k) + jitter
  const avgKmPerYear = rand(8000, 45000);
  const kilometers = Math.max(0, Math.round(ageYears * avgKmPerYear + randInt(0, 20000)));

  // condition: integer 40..90 (minimum 40 enforced)
  const condition = randInt(40, 90);

  // percent: compute between 0.40..0.80 biased by condition/age/km
  const percent = computeUsedPercent({ condition, ageYears, kilometers });

  const rawPrice = Math.round(newPrice * percent);
  // If newPrice is 0 (unknown), we synthesise a fallback price to make offers visible.
  const roundedPrice = newPrice > 0 ? Math.round(rawPrice / 100) * 100 : Math.round((50000 * percent) / 100) * 100;

  // Delivery for used trucks: immediate..2 days (0..2)
  const deliveryDays = randInt(0, 2);
  const availability = deliveryDays === 0 ? 'immediately' : `${deliveryDays} day${deliveryDays === 1 ? '' : 's'}`;

  const offerId = `used-${String(blue?.id ?? 'truck')}-${Date.now()}-${idx}-${Math.floor(Math.random() * 9000 + 1000)}`;

  const offer = {
    id: offerId,
    sourceId: blue?.id ?? null,
    brand: blue?.brand ?? blue?.make ?? 'Unknown',
    model: blue?.model ?? blue?.name ?? '',
    tonnage: blue?.tonnage ?? blue?.truckCategory ?? null,
    price: roundedPrice,
    condition,
    productionYear,
    kilometers,
    createdAt: new Date().toISOString(),
    marketSource: 'used-generator',
    specifications: blue?.specifications ? { ...blue.specifications } : undefined,
    deliveryDays,
    availability,
  };

  return offer;
}

/**
 * generateUsedOffers
 * @description Generate `count` used offers and persist them to localStorage.
 */
export function generateUsedOffers(count = DEFAULT_OFFER_COUNT) {
  const canonical = getCanonicalTrucks();
  if (!canonical.length) {
    // No canonical trucks available: return empty but still write timestamp so we don't repeatedly try
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
      localStorage.setItem(STORAGE_TS_KEY, new Date().toISOString());
      // dispatch event for consumers
      window.dispatchEvent(new CustomEvent('tm:used-offers-generated', { detail: { count: 0 } }));
      // log for debugging
      // eslint-disable-next-line no-console
      console.debug('[UsedTruckGenerator] No canonical trucks available — persisted empty offers.');
    } catch {
      // ignore storage errors
    }
    return [];
  }

  const offers: any[] = [];
  for (let i = 0; i < count; i++) {
    const tpl = canonical[Math.floor(Math.random() * canonical.length)];
    const offer = generateOfferFromTruck(tpl, i);
    offers.push(offer);
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(offers));
    localStorage.setItem(STORAGE_TS_KEY, new Date().toISOString());
  } catch {
    // ignore storage errors
  }

  try {
    window.dispatchEvent(new CustomEvent('tm:used-offers-generated', { detail: { count: offers.length } }));
  } catch {
    // ignore
  }

  // eslint-disable-next-line no-console
  console.debug(`[UsedTruckGenerator] Generated ${offers.length} used offers and persisted to localStorage.`);

  return offers;
}

/**
 * readOffersFromStorage
 * @description Read used offers from localStorage; return empty array on failure.
 */
export function readOffersFromStorage(): any[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

/**
 * readGenerationTimestamp
 * @description Read the ISO timestamp string of the last generation; return null on failure.
 */
export function readGenerationTimestamp(): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_TS_KEY);
    if (!raw) return null;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return null;
    return raw;
  } catch {
    return null;
  }
}

/**
 * forceRegenerateUsedOffers
 * @description Public helper to regenerate offers on-demand.
 */
export function forceRegenerateUsedOffers(count = DEFAULT_OFFER_COUNT) {
  // eslint-disable-next-line no-console
  console.debug('[UsedTruckGenerator] forceRegenerateUsedOffers called');
  return generateUsedOffers(count);
}

/**
 * tryGetGameDate
 * @description Heuristically extract an in-game Date object from provided gameState.
 * Returns null when no parseable in-game time is found.
 */
function tryGetGameDate(gameState: any): Date | null {
  if (!gameState) return null;

  const candidates = [
    gameState?.gameClock?.now,
    gameState?.gameClock?.currentTime,
    gameState?.gameClock?.currentTimeIso,
    gameState?.gameClock?.currentTimeString,
    gameState?.gameTime,
    gameState?.time,
    gameState?.now,
    gameState?.clock?.now,
    gameState?.game_now,
  ];

  for (const c of candidates) {
    if (!c) continue;
    if (typeof c === 'string') {
      const d = new Date(c);
      if (!Number.isNaN(d.getTime())) return d;
      const hhmm = c.match(/^(\d{1,2}):(\d{2})$/);
      if (hhmm) {
        const dayCandidates = [gameState?.gameClock?.date, gameState?.gameClock?.day, gameState?.day, gameState?.gameDay];
        for (const dc of dayCandidates) {
          if (!dc) continue;
          const dayStr = typeof dc === 'string' ? dc : null;
          if (dayStr) {
            const maybe = new Date(`${dayStr}T${hhmm[1].padStart(2, '0')}:${hhmm[2]}:00Z`);
            if (!Number.isNaN(maybe.getTime())) return maybe;
          }
        }
      }
    } else if (typeof c === 'number') {
      const d = new Date(c);
      if (!Number.isNaN(d.getTime())) return d;
    } else if (c instanceof Date) {
      return c;
    }
  }

  const hours =
    typeof gameState?.gameClock?.hours === 'number'
      ? gameState.gameClock.hours
      : typeof gameState?.hours === 'number'
      ? gameState.hours
      : null;
  const minutes =
    typeof gameState?.gameClock?.minutes === 'number'
      ? gameState.gameClock.minutes
      : typeof gameState?.minutes === 'number'
      ? gameState.minutes
      : null;
  const dayIso = typeof gameState?.gameClock?.date === 'string' ? gameState.gameClock.date : null;

  if (hours !== null && minutes !== null && dayIso) {
    const iso = `${dayIso}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00Z`;
    const d = new Date(iso);
    if (!Number.isNaN(d.getTime())) return d;
  }

  return null;
}

/**
 * UsedTruckGenerator
 * @description UI-less React component that mounts and ensures daily regeneration based on in-game time.
 *
 * Behavior:
 * - On mount: generate offers if missing or older than 24h.
 * - If in-game time is available from useGame(), regenerate when in-game time reaches 00:35 (once per in-game day).
 * - Otherwise fall back to checking local wall-clock 00:35 as a backup.
 */
const UsedTruckGenerator: React.FC<{ offerCount?: number }> = ({ offerCount = DEFAULT_OFFER_COUNT }) => {
  const { gameState } = useGame();

  React.useEffect(() => {
    let mounted = true;

    // Initial presence/timestamp check and guaranteed generation when missing/stale
    try {
      const tsRaw = localStorage.getItem(STORAGE_TS_KEY);
      let needs = false;
      if (!tsRaw) needs = true;
      else {
        const ts = new Date(tsRaw);
        if (Number.isNaN(ts.getTime())) needs = true;
        else {
          const diffHrs = (Date.now() - ts.getTime()) / (1000 * 60 * 60);
          if (diffHrs >= 24) needs = true;
        }
      }
      if (needs && mounted) {
        // eslint-disable-next-line no-console
        console.debug('[UsedTruckGenerator] Initial generation needed; generating now.');
        generateUsedOffers(offerCount);
      } else {
        // eslint-disable-next-line no-console
        console.debug('[UsedTruckGenerator] Offers present and fresh (no initial generation required).');
      }
    } catch (err) {
      // fallback to generate
      // eslint-disable-next-line no-console
      console.debug('[UsedTruckGenerator] Error reading timestamp, generating offers as fallback.', err);
      if (mounted) generateUsedOffers(offerCount);
    }

    // Track last generated day key to avoid double runs
    let lastGeneratedDayKey: string | null = (() => {
      try {
        const tsRaw = localStorage.getItem(STORAGE_TS_KEY);
        if (!tsRaw) return null;
        const d = new Date(tsRaw);
        if (Number.isNaN(d.getTime())) return null;
        return d.toISOString().split('T')[0];
      } catch {
        return null;
      }
    })();

    /**
     * shouldGenerateForDate
     * @description Decide if we should generate for the supplied Date instance by comparing to lastGeneratedDayKey.
     */
    function shouldGenerateForDate(d: Date) {
      const dayKey = d.toISOString().split('T')[0];
      return dayKey !== lastGeneratedDayKey;
    }

    // Polling interval checks both game-state-derived time and local wall-clock as fallback.
    const interval = window.setInterval(() => {
      try {
        const inGameDate = tryGetGameDate(gameState);
        if (inGameDate) {
          const hh = inGameDate.getUTCHours();
          const mm = inGameDate.getUTCMinutes();
          if (hh === 0 && mm === 35) {
            if (shouldGenerateForDate(inGameDate)) {
              generateUsedOffers(offerCount);
              lastGeneratedDayKey = inGameDate.toISOString().split('T')[0];
            }
            return;
          }
        }

        // Fallback: local wall-clock (server/browser local time)
        const now = new Date();
        if (now.getHours() === 0 && now.getMinutes() === 35) {
          if (shouldGenerateForDate(now)) {
            generateUsedOffers(offerCount);
            lastGeneratedDayKey = now.toISOString().split('T')[0];
          }
        }
      } catch (e) {
        // ignore
      }
    }, 15 * 1000); // check every 15s to be responsive to in-game time changes

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [gameState, offerCount]);

  return null;
};

export default UsedTruckGenerator;