/**
 * hubUtils.ts
 *
 * Utilities to compute hub-derived limits (vehicle limit, staff limit) and
 * tolerant lookup of the main hub from a company or gameState object.
 *
 * Purpose:
 * - Centralize the logic for determining which hub is the "main" hub.
 * - Compute the effective vehicle and staff limits using data/hubLevels.
 */

import { getHubLevel } from '../data/hubLevels';

/**
 * CompanyLike
 * @description Minimal subset of company/gameState used to determine hubs.
 */
export interface CompanyLike {
  company?: any;
  infrastructure?: any;
  hubs?: any[];
  hub?: any;
}

/**
 * MainHubInfo
 * @description Derived information for a company's primary hub.
 */
export interface MainHubInfo {
  hub: any | null;
  level: number;
  vehicleLimit: number;
  staffLimit: number;
}

/**
 * getMainHubInfo
 * @description Determine company main hub and derive vehicle/staff limits.
 * @param ctx CompanyLike - a company object or the top-level gameState
 * @returns MainHubInfo
 */
export function getMainHubInfo(ctx: CompanyLike): MainHubInfo {
  const company = (ctx && (ctx.company ?? ctx)) || ctx;
  // tolerant hub lookup
  let hubsArr: any[] = [];
  if (Array.isArray(company?.hubs) && company.hubs.length > 0) {
    hubsArr = company.hubs;
  } else if (company?.hub && typeof company.hub === 'object') {
    hubsArr = [company.hub];
  } else if (Array.isArray(company?.infrastructure?.hubs) && company.infrastructure.hubs.length > 0) {
    hubsArr = company.infrastructure.hubs;
  } else if (Array.isArray(ctx?.hubs) && ctx.hubs.length > 0) {
    hubsArr = ctx.hubs;
  } else {
    hubsArr = [];
  }

  const mainHubId = company?.mainHubId ?? (hubsArr[0] ? String(hubsArr[0].id ?? hubsArr[0].name ?? '') : null);
  const selected = hubsArr.find((h: any) => String(h?.id ?? h?.name ?? '') === String(mainHubId)) ?? hubsArr[0] ?? null;

  const levelNum = selected && typeof selected.level === 'number' ? Math.max(1, Math.round(selected.level)) : 1;
  const levelInfo = getHubLevel(levelNum);

  return {
    hub: selected,
    level: levelNum,
    vehicleLimit: levelInfo.vehicleLimit,
    staffLimit: levelInfo.officeSpots
  };
}

/**
 * getCompanyLimits
 * @description Convenience alias that returns { vehicleLimit, staffLimit } for a company/gameState.
 * @param ctx CompanyLike
 */
export function getCompanyLimits(ctx: CompanyLike) {
  const info = getMainHubInfo(ctx);
  return { vehicleLimit: info.vehicleLimit, staffLimit: info.staffLimit, hub: info.hub, level: info.level };
}
