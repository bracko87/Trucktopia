/**
 * Distance calculator utility with Haversine formula, pre-computed JSON, and optional Google Maps integration.
 *
 * Strategy (production-friendly, fast, and accurate):
 * 1) Pre-computed JSON matrix (distances.json) for instant lookup when available.
 * 2) Haversine straight-line distance if both cities have coordinates.
 * 3) Estimation fallback if unknown.
 * 4) Optional: Google Maps (Distance Matrix) to fetch precise driving distance on demand.
 *    - Results are cached in localStorage with TTL and reused synchronously by getDistance.
 *
 * Notes:
 * - We DO NOT hardcode API keys. If you want online driving distances:
 *   a) Load Google Maps JS (e.g., via your GoogleMapsLoader) so window.google.maps.DistanceMatrixService is available, or
 *   b) Inject a key at runtime: globalThis.__GOOGLE_MAPS_API_KEY__ = '...';
 * - Calling Google from the browser exposes a key; ensure referrer restrictions and billing safeguards.
 * - For maximum security, proxy requests via your backend and keep the key server-side.
 */

import { cityCoords, hasCoordinates } from './distance-scaffold';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - esbuild supports JSON import; this is a plain object of city->city->km
import distancesData from './distances.json';

/**
 * Shape for the distance matrix loaded from JSON.
 */
type DistanceMatrix = Record<string, Record<string, number>>;

/**
 * Merge built-in JSON distances into a working matrix.
 * You can extend distances.json offline using your generator script to cover more cities.
 */
const distanceMatrix: DistanceMatrix = distancesData as DistanceMatrix;

/**
 * Config options for optional online distance fetching.
 */
interface OnlineDistanceOptions {
  /**
   * Enable or disable online fetching (Google Distance Matrix).
   * Default: false (safe by default).
   */
  enableOnline?: boolean;
  /**
   * Time-to-live (hours) for cached online distances in localStorage.
   * Default: 336 hours (14 days).
   */
  cacheTTLHours?: number;
  /**
   * If true and Google JS API is available (window.google), we prefer using the JS client
   * instead of HTTP REST (avoids CORS and is the recommended browser approach).
   * Default: true.
   */
  preferGoogleJsApi?: boolean;
  /**
   * Region bias for city names (improves geocoding on Google side). Example: 'eu'
   * This is a hint; Google may still resolve globally.
   */
  regionBias?: string;
}

/**
 * Runtime options (mutable). Defaults are safe for offline/local usage.
 */
const onlineOptions: Required<OnlineDistanceOptions> = {
  enableOnline: false,
  cacheTTLHours: 14 * 24,
  preferGoogleJsApi: true,
  regionBias: 'eu',
};

/**
 * Small utility to update online options at runtime.
 */
export function setOnlineDistanceOptions(options: OnlineDistanceOptions = {}): void {
  Object.assign(onlineOptions, options);
}

/**
 * Read-only snapshot of current options.
 */
export function getOnlineDistanceOptions(): Readonly<Required<OnlineDistanceOptions>> {
  return { ...onlineOptions };
}

/**
 * Convert degrees to radians.
 */
function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Calculate Haversine distance between two coordinates in kilometers.
 */
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const radLat1 = toRad(lat1);
  const radLat2 = toRad(lat2);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radLat1) * Math.cos(radLat2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.asin(Math.sqrt(a));

  return R * c;
}

/**
 * Key construction used for localStorage caching.
 * We store cached distances both directions (A|B and B|A) for O(1) lookup.
 */
function pairKey(a: string, b: string): string {
  return `${a}__|__${b}`;
}

/**
 * LocalStorage cache entry for a pair distance.
 */
interface CacheEntry {
  /** kilometers */
  km: number;
  /** unix epoch ms */
  ts: number;
}

/**
 * Storage namespace & helpers.
 */
const LS_KEY = 'distanceCacheV1';
function loadCache(): Record<string, CacheEntry> {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, CacheEntry>) : {};
  } catch {
    return {};
  }
}
function saveCache(cache: Record<string, CacheEntry>): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(cache));
  } catch {
    // ignore quota errors
  }
}

/**
 * In-memory cache shadow (avoids repeated JSON parse and storage hits).
 */
const memCache: Record<string, CacheEntry> = { ...loadCache() };

/**
 * Try to read a cached driving distance for a city pair (either direction).
 * Returns number if found and not expired; otherwise null.
 */
function getCachedDrivingDistance(a: string, b: string): number | null {
  const now = Date.now();
  const ttlMs = onlineOptions.cacheTTLHours * 3600 * 1000;

  const k1 = pairKey(a, b);
  const k2 = pairKey(b, a);

  const e1 = memCache[k1];
  if (e1 && now - e1.ts <= ttlMs) return e1.km;

  const e2 = memCache[k2];
  if (e2 && now - e2.ts <= ttlMs) return e2.km;

  return null;
}

/**
 * Write a cache entry for both directions.
 */
function putCachedDrivingDistance(a: string, b: string, km: number): void {
  const now = Date.now();
  const entry: CacheEntry = { km: round1(km), ts: now };
  memCache[pairKey(a, b)] = entry;
  memCache[pairKey(b, a)] = entry;
  saveCache(memCache);
}

/**
 * Round to one decimal place.
 */
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Optional: Fetch precise driving distance using Google Maps Distance Matrix.
 * Returns kilometers, or null if not available or failed.
 *
 * This function DOES NOT change the synchronous getDistance behavior directly.
 * Instead, on success it caches the result so future getDistance() calls can use it synchronously.
 */
export async function warmDistance(fromCity: string, toCity: string): Promise<number | null> {
  if (!onlineOptions.enableOnline) return null;
  if (!fromCity || !toCity) return null;
  if (fromCity === toCity) {
    const km = Math.floor(Math.random() * 28) + 5;
    putCachedDrivingDistance(fromCity, toCity, km);
    return km;
  }

  // 1) Prefer Google JS API if available (no CORS issues).
  const g = (globalThis as any).google;
  if (onlineOptions.preferGoogleJsApi && g?.maps?.DistanceMatrixService) {
    try {
      const km = await getDrivingDistanceViaGoogleJs(fromCity, toCity);
      if (km != null) {
        putCachedDrivingDistance(fromCity, toCity, km);
        return km;
      }
    } catch {
      // fall through to REST
    }
  }

  // 2) Fallback to REST if a key is injected at runtime.
  const apiKey =
    (globalThis as any).__GOOGLE_MAPS_API_KEY__ ||
    (globalThis as any).__GMAPS_KEY__ ||
    '';

  if (apiKey) {
    try {
      const km = await getDrivingDistanceViaRest(fromCity, toCity, apiKey, onlineOptions.regionBias);
      if (km != null) {
        putCachedDrivingDistance(fromCity, toCity, km);
        return km;
      }
    } catch {
      // swallow to keep app stable
    }
  }

  return null;
}

/**
 * Google Maps JS API path (uses window.google.maps.DistanceMatrixService).
 */
async function getDrivingDistanceViaGoogleJs(fromCity: string, toCity: string): Promise<number | null> {
  return new Promise((resolve) => {
    try {
      const g = (globalThis as any).google;
      const service = new g.maps.DistanceMatrixService();

      service.getDistanceMatrix(
        {
          origins: [{ query: fromCity }],
          destinations: [{ query: toCity }],
          travelMode: g.maps.TravelMode.DRIVING,
          unitSystem: g.maps.UnitSystem.METRIC,
          region: onlineOptions.regionBias,
        },
        (response: any, status: string) => {
          if (status !== 'OK' || !response?.rows?.[0]?.elements?.[0]) {
            resolve(null);
            return;
          }
          const el = response.rows[0].elements[0];
          if (el.status !== 'OK' || !el.distance?.value) {
            resolve(null);
            return;
          }
          // value is meters
          resolve(round1(el.distance.value / 1000));
        }
      );
    } catch {
      resolve(null);
    }
  });
}

/**
 * REST path (Distance Matrix HTTP API). May be blocked by CORS in some browsers.
 * Prefer the JS API on the web to avoid CORS.
 */
async function getDrivingDistanceViaRest(
  fromCity: string,
  toCity: string,
  apiKey: string,
  regionBias?: string
): Promise<number | null> {
  const params = new URLSearchParams({
    units: 'metric',
    origins: fromCity,
    destinations: toCity,
    key: apiKey,
  });
  if (regionBias) params.set('region', regionBias);

  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?${params.toString()}`;

  const res = await fetch(url);
  if (!res.ok) return null;

  const data = await res.json();
  const el = data?.rows?.[0]?.elements?.[0];
  if (el?.status !== 'OK' || !el?.distance?.value) return null;

  return round1(el.distance.value / 1000);
}

/**
 * Get distance between two cities in kilometers (synchronous).
 *
 * Resolution order:
 * - If a cached online (driving) distance exists and is fresh -> use it for best realism.
 * - If present in precomputed distances.json -> return it.
 * - If both cities have coordinates -> Haversine straight-line distance.
 * - Otherwise -> estimate across categories.
 * 
 * IMPORTANT: Returns null for distances over 3500km (unrealistic routes)
 */
export function getDistance(fromCity: string, toCity: string): number | null {
  if (!fromCity || !toCity) return null;

  // Same city route - local delivery (5-32km)
  if (fromCity === toCity) {
    return Math.floor(Math.random() * 28) + 5; // 5-32km
  }

  // 0) Cached online driving distance (if previously warmed).
  const cached = getCachedDrivingDistance(fromCity, toCity);
  if (cached != null) return cached <= 3500 ? cached : null;

  // 1) Check direct distance in pre-computed matrix (distances.json).
  if (distanceMatrix[fromCity] && distanceMatrix[fromCity][toCity] != null) {
    const distance = distanceMatrix[fromCity][toCity];
    return distance <= 3500 ? distance : null;
  }

  // 2) Check reverse distance
  if (distanceMatrix[toCity] && distanceMatrix[toCity][fromCity] != null) {
    const distance = distanceMatrix[toCity][fromCity];
    return distance <= 3500 ? distance : null;
  }

  // 3) Try Haversine calculation if both cities have coordinates
  if (hasCoordinates(fromCity) && hasCoordinates(toCity)) {
    const coords1 = cityCoords[fromCity];
    const coords2 = cityCoords[toCity];
    const distance = haversineDistance(coords1.lat, coords1.lon, coords2.lat, coords2.lon);
    const rounded = round1(distance);
    return rounded <= 3500 ? rounded : null;
  }

  // 4) Estimate distance based on region heuristics
  const estimated = estimateDistance(fromCity, toCity);
  return estimated <= 3500 ? estimated : null;
}

/**
 * Estimate distance between cities when exact data is not available.
 * Simple heuristic with three buckets to retain gameplay pacing.
 */
function estimateDistance(fromCity: string, toCity: string): number {
  const germanCities = [
    'Frankfurt', 'Berlin', 'Munich', 'Hamburg', 'Cologne', 'Stuttgart', 'Düsseldorf', 'Dortmund', 'Leipzig', 'Bremen',
    'Dresden', 'Hanover', 'Nuremberg', 'Mannheim', 'Karlsruhe', 'Wiesbaden', 'Münster', 'Augsburg', 'Aachen', 'Braunschweig',
    'Kiel', 'Lübeck', 'Rostock', 'Magdeburg', 'Freiburg'
  ];

  const fromIsGerman = germanCities.includes(fromCity);
  const toIsGerman = germanCities.includes(toCity);

  // Both cities in Germany - estimate 200-600km
  if (fromIsGerman && toIsGerman) {
    return Math.floor(Math.random() * 400) + 200;
  }

  // One city in Germany, other international - estimate 400-1200km
  if (fromIsGerman || toIsGerman) {
    return Math.floor(Math.random() * 800) + 400;
  }

  // Both cities international - estimate 800-2000km
  return Math.floor(Math.random() * 1200) + 800;
}

/**
 * Get all available cities with distance data (union of known coords + JSON matrix).
 */
export function getAvailableCities(): string[] {
  const fromCoords = Object.keys(cityCoords);
  const fromMatrix = Object.keys(distanceMatrix);
  const all = new Set<string>([...fromCoords, ...fromMatrix]);

  // Also include any destinations inside the JSON matrix values
  for (const k of fromMatrix) {
    for (const dest of Object.keys(distanceMatrix[k] || {})) {
      all.add(dest);
    }
  }
  return Array.from(all).sort();
}

/**
 * Check if city exists in any of our distance sources.
 */
export function cityExists(city: string): boolean {
  if (!city) return false;
  if (city in cityCoords) return true;
  if (distanceMatrix[city]) return true;
  // Scan destinations once
  for (const src in distanceMatrix) {
    if (distanceMatrix[src] && city in distanceMatrix[src]) return true;
  }
  return false;
}

/**
 * Get distance using Haversine formula directly (for testing).
 */
export function getHaversineDistance(fromCity: string, toCity: string): number | null {
  if (!hasCoordinates(fromCity) || !hasCoordinates(toCity)) {
    return null;
  }

  const coords1 = cityCoords[fromCity];
  const coords2 = cityCoords[toCity];

  return haversineDistance(coords1.lat, coords1.lon, coords2.lat, coords2.lon);
}
