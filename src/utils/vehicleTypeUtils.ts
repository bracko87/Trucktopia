/**
 * src/utils/vehicleTypeUtils.ts
 *
 * Utility helpers to detect and extract trailer/truck metadata from vehicle/listing objects.
 *
 * Responsibilities:
 * - Provide robust heuristics to decide if an item is a trailer, a truck, or incoming.
 * - Prefer an explicit canonical tag `vehicleKind` when present ('truck' | 'trailer').
 * - Use structured field checks, key-name heuristics and text token matching.
 * - Expose a diagnostic `classifyVehicle` that returns kind + reasons to aid debugging.
 *
 * This file is defensive: it avoids aggressive auto-classification and returns 'unknown'
 * when evidence is mixed.
 */

/**
 * NormalizedVehicle
 * @description Basic shape augmentations we expect on vehicle/listing objects.
 */
export interface NormalizedVehicle {
  vehicleKind?: 'truck' | 'trailer';
  type?: string;
  trailerClass?: string;
  productCategory?: string;
  vehicleType?: string;
  title?: string;
  name?: string;
  model?: string;
  description?: string;
  deliveryEta?: string | null;
  deliveryDays?: number | null;
  status?: string;
  [key: string]: any;
}

/**
 * VehicleKind
 * @description Strongly-typed result values for classification.
 */
export type VehicleKind = 'truck' | 'trailer' | 'unknown';

/**
 * trailerKeywordRegex
 * @description Regex used to detect trailer-like product names. Case-insensitive.
 */
const trailerKeywordRegex = /\b(trailer|semi[- ]?trailer|chassis|container chassis|container|flatbed|reefer|lowboy|step[- ]?deck|stepdeck|car carrier|carrier|tank(er)?|tanker|curtain[s-]?side|curtain sider|walking floor|pneumatic|dolly|drawbar|trailer unit|roller bed|low loader)\b/i;

/**
 * truckKeywordRegex
 * @description Regex used to detect truck-like product names (tractor units, trucks, rigs).
 */
const truckKeywordRegex = /\b(truck|tractor unit|tractor|lorry|cab|rig|tractor-unit|tractor unit|tractor-head|tractor head|tractor truck|haulage|vehicle unit|tractor unit)\b/i;

/**
 * getTextFields
 * @description Helper to build a searchable text string from common fields.
 * @param item any
 * @returns string combined lower-cased text
 */
function getTextFields(item: any): string {
  return `${item.title ?? item.name ?? ''} ${item.model ?? ''} ${item.description ?? ''} ${item.productCategory ?? ''} ${item.vehicleType ?? ''}`
    .trim();
}

/**
 * hasKeyContaining
 * @description Check whether any object keys include a substring (case-insensitive).
 * Useful for identifying fields like 'trailerPayload', 'isTrailer', etc.
 * @param item any
 * @param sub string
 */
function hasKeyContaining(item: any, sub: string): boolean {
  if (!item || typeof item !== 'object') return false;
  const keys = Object.keys(item);
  const lower = sub.toLowerCase();
  return keys.some(k => k.toLowerCase().includes(lower));
}

/**
 * trailerSpecificProps
 * @description Direct indicators that the object is a trailer.
 * Presence of these props strongly indicates a trailer.
 */
const trailerSpecificProps = [
  'kingpin',
  'trailerClass',
  'trailer_type',
  'trailerType',
  'trailerAxles',
  'trailerAxleCount',
  'trailer_length',
  'container_chassis',
  'containerChassis',
  'fifthWheelMount',
  'loadingRamp',
  'reefer', 'curtainside', 'curtainSide', 'lowboy', 'carCarrier'
];

/**
 * truckSpecificProps
 * @description Direct indicators that the object is a truck.
 */
const truckSpecificProps = [
  'engine',
  'horsepower',
  'hp',
  'cabType',
  'cab_type',
  'seats',
  'driverCab',
  'wheelbase',
  'transmission',
  'drive',
  'tractorUnit',
  'tractor_unit',
  'tractor',
];

/**
 * classifyVehicle
 * @description Core classifier that inspects structured fields, keys and text to
 * determine whether an object is a 'truck', 'trailer', or 'unknown'. Returns
 * the kind and array of reasons (diagnostics) explaining the decision.
 *
 * @param item any Vehicle/listing object
 * @returns { kind: VehicleKind; reasons: string[] }
 */
export function classifyVehicle(item: any): { kind: VehicleKind; reasons: string[] } {
  const reasons: string[] = [];

  if (!item || typeof item !== 'object') {
    reasons.push('invalid-item');
    return { kind: 'unknown', reasons };
  }

  // 1) explicit canonical tag (highest priority)
  if (item.vehicleKind === 'trailer') {
    reasons.push('explicit-vehicleKind=trailer');
    return { kind: 'trailer', reasons };
  }
  if (item.vehicleKind === 'truck') {
    reasons.push('explicit-vehicleKind=truck');
    return { kind: 'truck', reasons };
  }

  // 2) explicit boolean-ish flags or keys in object
  if (item.isTrailer === true || String(item.type ?? '').toLowerCase() === 'trailer' || String(item.kind ?? '').toLowerCase() === 'trailer') {
    reasons.push('explicit-flag-or-type-trailer');
    return { kind: 'trailer', reasons };
  }
  if (item.isTruck === true || String(item.type ?? '').toLowerCase() === 'truck' || String(item.kind ?? '').toLowerCase() === 'truck') {
    reasons.push('explicit-flag-or-type-truck');
    return { kind: 'truck', reasons };
  }

  // 3) check for keys that include 'trailer' or 'tractor' to catch field names
  if (hasKeyContaining(item, 'trailer')) {
    reasons.push('has-key-containing-trailer');
  }
  if (hasKeyContaining(item, 'tractor') || hasKeyContaining(item, 'cab') || hasKeyContaining(item, 'engine')) {
    reasons.push('has-key-containing-tractor-or-truck');
  }

  // 4) look for direct structured properties indicating trailer/truck
  for (const p of trailerSpecificProps) {
    if (p in item) reasons.push(`prop:${p}`);
  }
  for (const p of truckSpecificProps) {
    if (p in item) reasons.push(`prop:${p}`);
  }

  // 5) textual heuristics
  const text = getTextFields(item);
  if (text && trailerKeywordRegex.test(text)) reasons.push('text-match-trailer');
  if (text && truckKeywordRegex.test(text)) reasons.push('text-match-truck');

  // 6) additional heuristics based on numeric fields (conservative)
  const hasTonnage = item.tonnage !== undefined || item.capacity !== undefined || item.payload !== undefined;
  if (hasTonnage) {
    const t = Number(item.tonnage ?? item.capacity ?? item.payload ?? NaN);
    if (!Number.isNaN(t)) {
      if (t <= 3) reasons.push(`tonnage<=3:${t}`);
      else if (t >= 5) reasons.push(`tonnage>=5:${t}`);
    }
  }

  // 7) Decide using strong signals first:
  const trailerSignalCount = reasons.filter(r => r.startsWith('prop:') && trailerSpecificProps.includes(r.slice(5))).length
    + (reasons.includes('has-key-containing-trailer') ? 1 : 0)
    + (reasons.includes('text-match-trailer') ? 1 : 0)
    + (String(item.type ?? '').toLowerCase().includes('trailer') ? 1 : 0);

  const truckSignalCount = reasons.filter(r => r.startsWith('prop:') && truckSpecificProps.includes(r.slice(5))).length
    + (reasons.includes('has-key-containing-tractor-or-truck') ? 1 : 0)
    + (reasons.includes('text-match-truck') ? 1 : 0)
    + (String(item.type ?? '').toLowerCase().includes('tractor') ? 1 : 0)
    + (String(item.type ?? '').toLowerCase().includes('truck') ? 1 : 0);

  // Strong preference rules
  if (trailerSignalCount > 0 && truckSignalCount === 0) {
    reasons.push(`decision:trailer(${trailerSignalCount}-signals)`);
    return { kind: 'trailer', reasons };
  }
  if (truckSignalCount > 0 && trailerSignalCount === 0) {
    reasons.push(`decision:truck(${truckSignalCount}-signals)`);
    return { kind: 'truck', reasons };
  }

  // If both have signals, use tie-breaker:
  if (trailerSignalCount > truckSignalCount) {
    reasons.push(`decision:trailer-tiebreaker(${trailerSignalCount}-${truckSignalCount})`);
    return { kind: 'trailer', reasons };
  }
  if (truckSignalCount > trailerSignalCount) {
    reasons.push(`decision:truck-tiebreaker(${truckSignalCount}-${trailerSignalCount})`);
    return { kind: 'truck', reasons };
  }

  // If neither is decisive, return unknown but include gathered reasons
  reasons.push('decision:unknown');
  return { kind: 'unknown', reasons };
}

/**
 * isTrailer
 * @description Heuristic wrapper for boolean checks. Returns true only when classifier strongly
 * believes the item is a trailer. Conservative: returns false for 'unknown'.
 * @param item any
 * @returns boolean
 */
export function isTrailer(item: any): boolean {
  const res = classifyVehicle(item);
  return res.kind === 'trailer';
}

/**
 * isTruck
 * @description Heuristic wrapper for boolean checks. Returns true only when classifier strongly
 * believes the item is a truck.
 * @param item any
 * @returns boolean
 */
export function isTruck(item: any): boolean {
  const res = classifyVehicle(item);
  return res.kind === 'truck';
}

/**
 * setVehicleKind
 * @description Helper to set the canonical vehicleKind on an item in a non-destructive way.
 *              Does not overwrite an explicit existing vehicleKind unless force=true.
 * @param item any
 * @param kind 'truck' | 'trailer'
 * @param force boolean - when true, overwrite existing vehicleKind
 * @returns any modified item (shallow copy)
 */
export function setVehicleKind(item: any, kind: 'truck' | 'trailer', force = false): any {
  if (!item) return item;
  if (!force && item.vehicleKind && (item.vehicleKind === 'truck' || item.vehicleKind === 'trailer')) {
    return { ...item };
  }
  return { ...item, vehicleKind: kind };
}

/**
 * extractTrailerClass
 * @description Best-effort extraction of a human-friendly trailer class from title/model.
 * @param item any
 * @returns string | undefined trailer class label or undefined when not found
 */
export function extractTrailerClass(item: any): string | undefined {
  const text = String(item.trailerClass ?? item.model ?? item.title ?? item.name ?? '').trim();
  if (!text) return undefined;

  const cleaned = text.replace(/\(.*?\)/g, '').replace(/\b\d+t\b/gi, '').trim();
  const match = cleaned.match(/(.+?)\b(trailer|semi[- ]?trailer|chassis|tanker|flatbed|reefer|lowboy|car carrier|walking floor|curtainside)/i);
  if (match && match[1]) {
    return match[1].trim();
  }

  if (trailerKeywordRegex.test(cleaned)) {
    const m2 = cleaned.match(/([A-Za-z0-9 \-]+?(?:trailer|tanker|chassis|flatbed|reefer|lowboy|carrier|walking floor|curtainside))/i);
    return (m2?.[0] ?? cleaned).trim();
  }

  return undefined;
}

/**
 * isIncoming
 * @description Heuristic to detect incoming/purchased/delivery items. Used to prevent showing
 * the same object both in an incoming list and in the fleet boxes simultaneously.
 *
 * Checks:
 * - explicit flags (incoming, inTransit, purchased)
 * - presence of deliveryEta/eta/deliveryDays/arrivalDate/expectedDelivery
 * - status tokens (in-transit, incoming, purchased, ordered, delivering, transit)
 * - items with `deliveryEta` that are non-empty are considered incoming
 *
 * Returns false for unknown/non-object inputs.
 *
 * @param item any
 * @returns boolean
 */
export function isIncoming(item: any): boolean {
  if (!item || typeof item !== 'object') return false;

  // explicit flags
  const explicitTrue = ['incoming', 'inTransit', 'in_transit', 'isIncoming', 'purchased', 'ordered', 'inbound'];
  for (const f of explicitTrue) {
    if (f in item && Boolean(item[f]) === true) return true;
  }

  // status token matching
  const status = String(item.status ?? item.state ?? '').toLowerCase();
  if (status) {
    if (/(in-?transit|in-?transit|incoming|purchased|ordered|delivering|transit|inbound)/i.test(status)) return true;
  }

  // ETA / delivery fields
  const etaCandidates = [
    item.deliveryEta ?? item.eta ?? item.expectedDelivery ?? item.arrivalDate ?? item.arrivalEta ?? item.etaDate
  ];

  for (const e of etaCandidates) {
    if (e !== undefined && e !== null && String(e).trim() !== '') return true;
  }

  // delivery days / countdown presence
  if (item.deliveryDays !== undefined && item.deliveryDays !== null) return true;
  if (item.daysUntilDelivery !== undefined && item.daysUntilDelivery !== null) return true;

  // last resort: keys that often hold incoming arrays (if object shaped like wrapper)
  // If an object contains fields like 'purchasePrice' and 'deliveryEta' it likely is purchased
  if ((item.purchasePrice || item.price || item.totalPrice) && (item.deliveryEta || item.deliveryDays || status)) {
    return true;
  }

  return false;
}