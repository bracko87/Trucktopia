/**
 * src/utils/vehiclePurchaseUtils.ts
 *
 * Helpers for normalizing purchased vehicle/listing objects and assigning them
 * into the correct company arrays (company.trucks | company.trailers).
 *
 * Responsibilities:
 * - Determine canonical vehicleKind ('truck' | 'trailer') for a purchased item.
 * - Normalize the purchased item by setting canonical vehicleKind/type/trailerClass safely.
 * - Preserve market/listing metadata for used offers (condition, kilometers, year, availability).
 * - Provide sensible defaults for new vehicles (condition = 100, mileage = 0).
 * - Insert the normalized item into the correct company array and remove
 *   duplicates from the opposite array.
 *
 * Notes:
 * - This module never persists changes itself. It returns an updatedCompany object.
 *   Callers should persist via GameContext.createCompany(updatedCompany) or other APIs.
 */

import { isTrailer, isTruck, extractTrailerClass, setVehicleKind } from './vehicleTypeUtils';

export type VehicleKind = 'truck' | 'trailer';

/**
 * determineVehicleKind
 * @description Decide canonical vehicleKind for an item. Respects explicit vehicleKind
 *              when present; falls back to heuristics (isTrailer/isTruck). Default
 *              fallback is 'truck' (conservative).
 * @param item any - raw purchased/listing item
 * @returns VehicleKind
 */
export function determineVehicleKind(item: any): VehicleKind {
  if (!item) return 'truck';
  // Respect explicit canonical tag if present
  if (item.vehicleKind === 'trailer' || item.vehicleKind === 'truck') {
    return item.vehicleKind;
  }

  // Prefer explicit type fields
  const type = String(item.type ?? '').toLowerCase();
  if (type === 'trailer') return 'trailer';
  if (type === 'truck' || type === 'tractor' || type === 'tractor-unit') return 'truck';

  // Heuristics
  try {
    if (isTrailer(item)) return 'trailer';
    if (isTruck(item)) return 'truck';
  } catch (err) {
    // If heuristics error, fall through to conservative default
    // eslint-disable-next-line no-console
    console.warn('determineVehicleKind: heuristic failed, using default truck', err);
  }

  // Conservative default
  return 'truck';
}

/**
 * isUsedListing
 * @description Heuristic to detect whether a listing/market item is a used offer.
 *              We treat items as used when:
 *              - explicit category/truckCategory === 'used'
 *              - marketSource includes 'used'
 *              - item.isUsed === true
 *              - listing carries condition or mileage/km fields
 * @param item any
 * @returns boolean
 */
function isUsedListing(item: any): boolean {
  if (!item) return false;
  try {
    const cat = (item.category ?? item.truckCategory ?? '').toString().toLowerCase();
    if (cat === 'used') return true;
    const ms = (item.marketSource ?? '').toString().toLowerCase();
    if (ms && ms.includes('used')) return true;
    if (item.isUsed === true) return true;

    // explicit condition or mileage implies used listing metadata
    if (item.condition != null) return true;
    if (item.mileage != null) return true;
    if (item.kilometers != null) return true;
    if (item.km != null) return true;

    // marketEntry presence is also a strong hint the object is a listing
    if (item.marketEntry && (Object.keys(item.marketEntry).length > 0)) return true;
  } catch {
    // ignore and fallback false
  }
  return false;
}

/**
 * safeNumberParse
 * @description Try to coerce numeric-like fields into numbers
 */
function safeNumberParse(v: any): number | null {
  if (v === undefined || v === null) return null;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const s = String(v).replace(/[,\s]+/g, '');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * normalizePurchasedItem
 * @description Return a shallow-copied normalized item with canonical vehicleKind and
 *              auxiliary fields set (type, trailerClass when relevant). Also:
 *              - Preserve listing-specific market metadata for used offers (condition/year/km),
 *              - Ensure new vehicles get default metadata (condition=100, mileage=0).
 *              Does NOT override an explicit vehicleKind or trailerClass.
 * @param item any
 * @returns any normalized item
 */
export function normalizePurchasedItem(item: any): any {
  if (!item) return item;
  const copy: any = { ...item };

  // Respect existing canonical tag
  if (!copy.vehicleKind) {
    const kind = determineVehicleKind(copy);
    copy.vehicleKind = kind;
  }

  // Ensure type matches vehicleKind (do not overwrite existing explicit 'trailer' tag)
  if (!copy.type) {
    copy.type = copy.vehicleKind === 'trailer' ? 'trailer' : 'truck';
  }

  // If a trailer and no trailerClass, attempt to extract a friendly class from title/model
  if (copy.vehicleKind === 'trailer' && !copy.trailerClass) {
    const cls = extractTrailerClass(copy);
    if (cls) copy.trailerClass = cls;
  }

  // Determine used/new listing
  const used = isUsedListing(copy);

  // Preserve market metadata for used listings
  if (used) {
    // Condition: keep listing condition if present and numeric, else attempt to derive, else leave undefined
    const candidateCond = copy.condition ?? copy.marketEntry?.condition ?? copy.specifications?.condition;
    const condNum = safeNumberParse(candidateCond);
    if (condNum !== null) {
      copy.condition = condNum;
    } else if (copy.condition == null) {
      // leave undefined so downstream logic can decide fallback
      // but do not force 100%
    }

    // Kilometres / mileage: preserve common keys
    const kmCandidate = copy.kilometers ?? copy.km ?? copy.mileage ?? copy.specifications?.kilometers ?? copy.specifications?.mileage;
    const kmNum = safeNumberParse(kmCandidate);
    if (kmNum !== null) {
      copy.kilometers = kmNum;
      copy.km = kmNum;
      copy.mileage = kmNum;
    }

    // Year: keep listing year if present
    const yearCandidate = copy.year ?? copy.productionYear ?? copy.specifications?.year ?? copy.specifications?.productionYear;
    const yearNum = safeNumberParse(yearCandidate);
    if (yearNum !== null) copy.year = Math.round(yearNum);
  } else {
    // New vehicle defaults
    if (copy.condition == null) copy.condition = 100;
    // Ensure mileage keys are present and normalized to 0
    copy.kilometers = 0;
    copy.km = 0;
    copy.mileage = 0;

    // production year: if not present, set to current year (safe fallback)
    if (copy.year == null) {
      try {
        copy.year = new Date().getFullYear();
      } catch {
        copy.year = new Date().getFullYear();
      }
    }
  }

  return copy;
}

/**
 * assignPurchasedToCompany
 * @description Given a company object and a purchased item, return an updated shallow-copied
 *              company with the item placed into the appropriate list (trucks | trailers).
 *              - Avoids duplicates by id.
 *              - Removes item from opposite list if present.
 *              - Preserves existing array references by returning new arrays (shallow).
 *
 * @param company any - existing company object (may be null)
 * @param item any - purchased listing / vehicle object
 * @returns any updatedCompany
 */
export function assignPurchasedToCompany(company: any, item: any): any {
  const normalized = normalizePurchasedItem(item);
  const id = String(normalized.id ?? normalized._id ?? normalized.uid ?? Math.random().toString(36).slice(2, 9));
  const updatedCompany: any = { ...(company || {}) };

  // Ensure arrays exist
  const trucks: any[] = Array.isArray(updatedCompany.trucks) ? [...updatedCompany.trucks] : [];
  const trailers: any[] = Array.isArray(updatedCompany.trailers) ? [...updatedCompany.trailers] : [];

  // Remove existing occurrences in both arrays (prevent duplicates)
  const removeById = (arr: any[]) => arr.filter((v) => String(v?.id ?? v?._id ?? v?.uid) !== id);

  const cleanedTrucks = removeById(trucks);
  const cleanedTrailers = removeById(trailers);

  // Decide destination
  const kind: VehicleKind = normalized.vehicleKind ?? determineVehicleKind(normalized);

  // When inserting, ensure used listings keep condition/mileage/year preserved (already set by normalizePurchasedItem)
  if (kind === 'trailer') {
    updatedCompany.trailers = [normalized, ...cleanedTrailers];
    updatedCompany.trucks = cleanedTrucks;
  } else {
    // truck
    updatedCompany.trucks = [normalized, ...cleanedTrucks];
    updatedCompany.trailers = cleanedTrailers;
  }

  return updatedCompany;
}

/**
 * existsInCompany
 * @description Utility: returns true when the company already contains an item with that id
 * @param company any
 * @param id string
 * @returns boolean
 */
export function existsInCompany(company: any, id: string): boolean {
  const trucks: any[] = Array.isArray(company?.trucks) ? company.trucks : [];
  const trailers: any[] = Array.isArray(company?.trailers) ? company.trailers : [];
  return trucks.concat(trailers).some((v) => String(v?.id ?? v?._id ?? v?.uid) === String(id));
}