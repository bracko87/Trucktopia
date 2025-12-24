/**
 * hubCapacityEngine.ts
 *
 * Engine utilities to compute hub capacity and assigned vehicle/staff counts.
 */

import { getHubLevel } from '../data/hubLevels';

export interface HubCapacityInfo {
  hubId: string | null;
  hubName?: string | null;
  level: number;
  maxVehicles: number;
  maxStaff: number;
  assignedVehicles: number;
  assignedStaff: number;
  isVehicleFull: boolean;
  isStaffFull: boolean;
}

/**
 * normalizeHubId
 * @description Best-effort extract hub identifier (string) from a hub-like object.
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
 * @description Determine whether an arbitrary item references the given hubId.
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
      item.locationId,
      item.assigned_hub
    ];
    for (const c of candidates) {
      if (!c) continue;
      if (typeof c === 'string' && String(c) === String(hubId)) return true;
      if (typeof c === 'object') {
        if (String(c.id) === String(hubId)) return true;
        if (String(c.name) === String(hubId)) return true;
      }
    }
    if (String(item.deliveryHubId ?? item.hubId ?? item.assignedHubId ?? '') === String(hubId)) return true;
  } catch {
    // ignore
  }
  return false;
}

/**
 * countAssignedVehicles
 * @description Count trucks + trailers assigned to a specific hub id.
 */
export function countAssignedVehicles(company: any, hubId: string | null): number {
  if (!company || !hubId) return 0;
  let count = 0;
  const safeArray = (v: any) => (Array.isArray(v) ? v : []);

  const trucks = safeArray(company.trucks);
  const trailers = safeArray(company.trailers);
  
  for (const t of trucks) if (matchesHub(t, hubId)) count++;
  for (const tr of trailers) if (matchesHub(tr, hubId)) count++;

  return count;
}

/**
 * countAssignedStaff
 * @description Count office staff (Managers/Dispatchers) assigned to a specific hub id.
 */
export function countAssignedStaff(company: any, hubId: string | null): number {
  if (!company || !hubId) return 0;
  let count = 0;
  const staff = Array.isArray(company.staff) ? company.staff : [];

  for (const s of staff) {
    // Only count office staff roles
    if (s.role === 'manager' || s.role === 'dispatcher') {
      if (matchesHub(s, hubId)) count++;
    }
  }
  return count;
}

/**
 * getHubCapacityInfo
 * @description Return a HubCapacityInfo summary for a hub reference.
 */
/**
 * getHubCapacityInfo
 * @description Return a HubCapacityInfo summary. Updated to prefer 'hub_level' from public.hubs schema.
 */
export function getHubCapacityInfo(company: any, hub: any): HubCapacityInfo {
  const hubId = normalizeHubId(hub);
  // Support both DB schema (hub_level) and local state (level)
  const levelNum = typeof hub?.hub_level === 'number' ? hub.hub_level : (typeof hub?.level === 'number' ? hub.level : 1);
  const levelInfo = getHubLevel(levelNum);

  const assignedVehicles = countAssignedVehicles(company, hubId);
  const assignedStaff = countAssignedStaff(company, hubId);

  return {
    hubId,
    hubName: hub?.name || hub?.city || hubId,
    level: levelNum,
    maxVehicles: levelInfo.vehicleLimit,
    maxStaff: levelInfo.officeSpots,
    assignedVehicles,
    assignedStaff,
    isVehicleFull: assignedVehicles >= levelInfo.vehicleLimit,
    isStaffFull: assignedStaff >= levelInfo.officeSpots
  };
}
