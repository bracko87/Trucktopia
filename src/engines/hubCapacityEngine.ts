/**
 * hubCapacityEngine.ts
 *
 * Engine utilities to compute hub capacity and assigned vehicle counts.
 *
 * Responsibilities:
 * - Provide helper functions that determine the maximum allowed vehicles for a hub
 *   (based on hub level) and count how many vehicles (trucks + trailers) are already
 *   assigned to a hub, including incoming/purchased deliveries.
 *
 * This module is pure utility and intentionally side-effect free. It reads hub
 * definitions from data/hubLevels and accepts the company/gameState object as input.
 */

import { getHubLevel } from '../data/hubLevels';

export interface HubCapacityInfo {
  hubId: string | null;
  hubName?: string | null;
  level: number;
  maxAllowed: number;
  assignedCount: number;
  isFull: boolean;
}

/**
 * normalizeHubId
 * @description Best-effort extract hub identifier (string) from a hub-like object.
 * @param hub any
 */
function normalizeHubId(hub: any): string | null {
  if (!hub) return null;
  if (typeof hub === 'string') return hub;
  if (typeof hub.id === 'string' && hub.id.trim() !== '') return hub.id;
  if (typeof hub.name === 'string' && hub.name.trim() !== '') return hub.name;
  return null;
}

/**
 * matchesHub
 * @description Determine whether an arbitrary vehicle/delivery entry references the given hubId.
 * It checks common fields: deliveryHub.id, deliveryHub.name, hubId, assignedHub, location.
 * @param item any
 * @param hubId string | null
 */
function matchesHub(item: any, hubId: string | null): boolean {
  if (!hubId || !item) return false;
  try {
    const candidates = [
      item.deliveryHub,
      item.hub,
      item.assignedHub,
      item.hubId,
      item.location,
      item.locationId
    ];
    for (const c of candidates) {
      if (!c) continue;
      if (typeof c === 'string' && String(c) === String(hubId)) return true;
      if (typeof c === 'object') {
        if (String(c.id) === String(hubId)) return true;
        if (String(c.name) === String(hubId)) return true;
      }
    }
    // Some items encode the hub id as a simple field
    if (String(item.deliveryHubId ?? item.hubId ?? item.assignedHubId ?? '') === String(hubId)) return true;
  } catch {
    // ignore parsing errors
  }
  return false;
}

/**
 * countAssignedVehicles
 * @description Count trucks + trailers assigned to a specific hub id.
 *              Considers company.trucks, company.trailers and common incoming arrays.
 * @param company any
 * @param hubId string | null
 * @returns number
 */
export function countAssignedVehicles(company: any, hubId: string | null): number {
  if (!company || !hubId) return 0;
  let count = 0;

  const safeArray = (v: any) => (Array.isArray(v) ? v : []);

  try {
    const trucks = safeArray(company.trucks);
    const trailers = safeArray(company.trailers);
    const incomingLists = [
      ...safeArray(company.incomingDeliveries),
      ...safeArray(company.purchasedDeliveries),
      ...safeArray(company.incoming),
      ...safeArray(company.deliveries),
      ...safeArray(company.purchaseQueue),
      ...safeArray(company.incoming_items),
      ...safeArray(company.purchased_items)
    ];

    for (const t of trucks) {
      if (matchesHub(t, hubId)) count += 1;
    }

    for (const tr of trailers) {
      if (matchesHub(tr, hubId)) count += 1;
    }

    // Include explicitly incoming items that reference this hub and look like vehicles
    for (const it of incomingLists) {
      // Avoid double counting if it's already part of trucks/trailers by id matching.
      // Use id heuristics:
      const id = String(it?.id ?? it?._id ?? it?.vehicleId ?? '');
      const alreadyPresent = trucks.some((x: any) => String(x?.id ?? '') === id) || trailers.some((x: any) => String(x?.id ?? '') === id);
      if (alreadyPresent) continue;
      if (matchesHub(it, hubId)) count += 1;
    }
  } catch {
    // defensive: on any error return best-effort count so far
  }

  return count;
}

/**
 * getHubMaxAllowed
 * @description Given a hub object (or level number), return the maximum allowed vehicles.
 *              Falls back to level 1 if unknown.
 * @param hub any | number
 * @returns { level: number, maxAllowed: number }
 */
export function getHubMaxAllowed(hub: any | number | null): { level: number; maxAllowed: number } {
  let level = 1;
  try {
    if (typeof hub === 'number' && Number.isFinite(hub)) level = Math.max(1, Math.round(hub));
    else if (hub && typeof hub.level === 'number') level = Math.max(1, Math.round(hub.level));
    else if (hub && typeof hub.level === 'string') level = Math.max(1, Math.round(Number(hub.level) || 1));
  } catch {
    level = 1;
  }
  const info = getHubLevel(level);
  return { level, maxAllowed: info.vehicleLimit };
}

/**
 * getHubCapacityInfo
 * @description Return a HubCapacityInfo summary for a company + hub reference.
 * - hubRef can be a hub object, hub id string, or null to use company's main hub.
 * @param company any
 * @param hubRef any
 */
export function getHubCapacityInfo(company: any, hubRef: any): HubCapacityInfo {
  let resolvedHub: any = null;
  let hubId: string | null = null;
  let hubName: string | null = null;

  try {
    if (!company) {
      return { hubId: null, hubName: null, level: 1, maxAllowed: getHubLevel(1).vehicleLimit, assignedCount: 0, isFull: false };
    }

    // If explicit hub object
    if (hubRef && typeof hubRef === 'object') {
      resolvedHub = hubRef;
    } else if (typeof hubRef === 'string') {
      // try find hub in company.hubs by id/name
      const hubsArr = Array.isArray(company.hubs) ? company.hubs : Array.isArray(company.infrastructure?.hubs) ? company.infrastructure.hubs : [];
      resolvedHub = hubsArr.find((h: any) => String(h?.id ?? h?.name ?? '') === String(hubRef)) ?? { id: hubRef, name: hubRef, level: 1 };
    } else {
      // fallback: company.mainHubId or first hub in hubs array or company.hub
      const hubsArr = Array.isArray(company.hubs) ? company.hubs : Array.isArray(company.infrastructure?.hubs) ? company.infrastructure.hubs : [];
      resolvedHub = company.hub ?? hubsArr[0] ?? (company.mainHubId ? { id: company.mainHubId, level: 1 } : null);
    }

    hubId = normalizeHubId(resolvedHub);
    hubName = (resolvedHub && (resolvedHub.name ?? resolvedHub.title)) || hubId || null;
  } catch {
    hubId = null;
    hubName = null;
    resolvedHub = null;
  }

  const { level, maxAllowed } = getHubMaxAllowed(resolvedHub);
  const assignedCount = countAssignedVehicles(company, hubId);
  const isFull = assignedCount >= maxAllowed;

  return {
    hubId,
    hubName,
    level,
    maxAllowed,
    assignedCount,
    isFull
  };
}