/**
 * vehicleAvailability.ts
 *
 * Shared availability computation for vehicle-like entities (trucks, trailers).
 *
 * Purpose:
 * - Provide a single source of truth for status phase computation so trucks and
 *   trailers use identical rules and labels.
 *
 * Responsibilities:
 * - Parse common ETA shapes safely
 * - Prefer concrete future ETA values when deciding "delivering"
 * - Treat "delivered" text as NOT delivering when there's no future ETA
 * - Export determineAvailability used across UI and action logic
 */

/**
 * AvailabilityResult
 * @description Detailed availability result including human readable status and flags
 *              used by UI components to render identical status phases and visuals.
 */
export interface AvailabilityResult {
  /** Human readable status text (e.g. 'Available', 'On Job', 'Non-Available (Delivering)', 'Maintenance', 'Broken') */
  statusText: string;
  /** Whether the vehicle/trailer is considered available for actions (sell, assign, etc.) */
  isAvailable: boolean;
  /** Flag indicating mechanical breakage / needs repair */
  isBroken: boolean;
  /** Flag indicating the item is under maintenance / servicing */
  isMaintenance: boolean;
  /** Flag indicating the item is currently in-transit / incoming delivery (treated as non-available) */
  isDelivering: boolean;
  /** Flag indicating the item is assigned / on job */
  isOnJob: boolean;
}

/**
 * parseDateLike
 * @description Try to parse many shapes (ISO string, timestamp, days offset) into a Date or null
 * @param val potential date-like value
 */
function parseDateLike(val: any): Date | null {
  if (val == null) return null;

  // If numeric (ms or days), attempt robust parse
  if (typeof val === 'number' && Number.isFinite(val)) {
    // Heuristic: if value > 1e12 treat as ms timestamp, else treat as days offset
    if (val > 1e12) return new Date(val);
    // treat as days offset
    return new Date(Date.now() + Number(val) * 24 * 60 * 60 * 1000);
  }

  // If string, try a few formats
  const s = String(val).trim();
  if (!s) return null;

  // handle pure numeric strings
  if (/^\d+$/.test(s)) {
    const n = Number(s);
    if (n > 1e12) return new Date(n);
    // treat as days offset if small integer
    return new Date(Date.now() + n * 24 * 60 * 60 * 1000);
  }

  // try Date.parse
  const parsed = Date.parse(s);
  if (!Number.isNaN(parsed)) return new Date(parsed);

  return null;
}

/**
 * determineAvailability
 * @description Compute availability and a canonical status string for vehicles (trucks or trailers).
 *
 * Status phases (priority order):
 * 1) Broken
 * 2) Maintenance
 * 3) Delivering (treated as Non-Available / delivering)
 * 4) On Job
 * 5) Available
 *
 * Notes:
 * - A deliveryEta that points to the past is considered "delivered" and will NOT mark the vehicle as delivering.
 * - Raw status text containing "delivered" does not by itself force a delivering state.
 * - Future ETA or explicit in-transit tokens will mark the entity as delivering.
 *
 * @param entity any - object representing trailer or truck
 * @param isAssignedProp boolean - explicit assigned flag (from parent)
 * @returns AvailabilityResult
 */
export function determineAvailability(entity: any, isAssignedProp: boolean = false): AvailabilityResult {
  const rawStatus = String(entity?.status ?? '').toLowerCase();

  /**
   * Broken detection
   * - numeric condition < 30
   * - textual indicators
   */
  const cond = typeof entity?.condition === 'number' ? entity.condition : NaN;
  const isBroken =
    (!Number.isNaN(cond) && cond < 30) ||
    rawStatus.includes('broken') ||
    rawStatus.includes('repair') ||
    rawStatus.includes('damaged');

  /**
   * Maintenance detection
   */
  const isMaintenance =
    rawStatus.includes('maintenance') ||
    rawStatus.includes('servicing') ||
    rawStatus.includes('service') ||
    rawStatus.includes('in maintenance') ||
    rawStatus.includes('scheduled maintenance');

  /**
   * Delivering / in-transit detection (improved)
   *
   * Heuristics:
   * - If deliveryEta exists and parses to a date in the future -> delivering.
   * - If deliveryEta exists and is in the past -> treated as delivered (not delivering).
   * - If rawStatus contains explicit in-transit tokens (incoming, in-transit, delivering)
   *   treat as delivering unless rawStatus clearly says 'delivered' and there's no future ETA.
   * - If deep data source (_source) has inTransit/incoming flags we consider them, but prefer
   *   concrete future ETA if available to avoid stale flags blocking actions.
   */
  const now = Date.now();

  // attempt to parse ETA from common fields
  const parsedEta =
    parseDateLike(entity?.deliveryEta ?? entity?.marketEntry?.deliveryEta ?? entity?.availableIn ?? null) ??
    parseDateLike(entity?.availableInDays ?? null);

  const hasFutureEta = parsedEta !== null && parsedEta.getTime() > now;
  const hasPastEta = parsedEta !== null && parsedEta.getTime() <= now;

  // raw textual incoming tokens (excluding 'delivered' — handled below)
  const hasIncomingToken =
    /(?:incoming|in-?transit|transit|delivering|onroute|on route)/i.test(rawStatus) &&
    !/delivered/i.test(rawStatus);

  const src = entity?._source ?? {};
  const srcHasInTransitFlag = Boolean(src?.incoming || src?.inTransit || src?.in_transit);
  const srcParsedEta = parseDateLike(src?.deliveryEta ?? src?.availableIn ?? null);
  const srcHasFutureEta = srcParsedEta !== null && srcParsedEta.getTime() > now;

  // Consider entity delivered token or explicit delivered flag on _source
  const rawIndicatesDelivered = /delivered/i.test(rawStatus) || Boolean(src?.delivered === true || entity?.delivered === true);

  // Decide delivering:
  // - future ETA present => delivering
  // - else if raw incoming tokens present => delivering
  // - else if source has inTransit flag and no contradicting "delivered with past ETA" => delivering
  let isDelivering = false;

  if (hasFutureEta || srcHasFutureEta) {
    isDelivering = true;
  } else if (hasIncomingToken) {
    // only mark delivering from raw token when we don't clearly have a "delivered" indication
    if (!rawIndicatesDelivered) isDelivering = true;
  } else if (srcHasInTransitFlag) {
    // respect source flag unless source contains a past ETA or explicit delivered flag
    if (srcHasFutureEta) {
      isDelivering = true;
    } else if (!Boolean(src?.delivered === true) && !rawIndicatesDelivered) {
      // ambiguous source flag (no ETA) -> we still treat as delivering (conservative)
      isDelivering = true;
    }
  }

  // If there is an explicit delivered indicator AND no future ETA, treat as delivered (not delivering)
  if (rawIndicatesDelivered && !hasFutureEta && !srcHasFutureEta) {
    isDelivering = false;
  }

  // Additionally, if parsed ETA exists but is in the past we treat as delivered (not delivering)
  if (hasPastEta) {
    isDelivering = false;
  }

  /**
   * Assigned / on-job detection
   */
  const isOnJob =
    isAssignedProp ||
    /assigned|on job|on-job|on_job|onroute|on route/i.test(rawStatus) ||
    Boolean(entity?.assignedJobId || entity?.assignedJob);

  /**
   * Resolve canonical status text with priority
   */
  let statusText = 'Available';
  if (isBroken) statusText = 'Broken';
  else if (isMaintenance) statusText = 'Maintenance';
  else if (isDelivering) statusText = 'Non-Available (Delivering)';
  else if (isOnJob) statusText = 'On Job';

  const isAvailable = statusText === 'Available';

  return {
    statusText,
    isAvailable,
    isBroken,
    isMaintenance,
    isDelivering,
    isOnJob
  };
}