/**
 * hubUtils.ts
 *
 * Bridge between the Hubs database and the Master Level configuration.
 * 
 * Responsibilities:
 * - Identify the user's current Main Hub.
 * - Calculate total vehicle and staff limits based on the level.
 * - Provide a link between public.hubs (instance) and hubLevels (rules).
 */

import { getHubLevel } from '../data/hubLevels';

/**
 * CompanyLike
 * @description Flexible interface to accept various state shapes containing hub data.
 */
export interface CompanyLike {
  company?: any;
  infrastructure?: any;
  hubs?: any[];
  hub?: any;
}

/**
 * MainHubInfo
 * @description The resolved limits for the current hub level.
 */
export interface MainHubInfo {
  hub: any | null;
  level: number;
  vehicleLimit: number;
  staffLimit: number;
}

/**
 * getMainHubInfo
 * @description 
 * 1. Finds the main hub from the company data.
 * 2. Reads the 'level' column from the database record.
 * 3. Maps that level to the limits defined in our Master Table.
 * 
 * @param ctx The game state or company object
 */
export function getMainHubInfo(ctx: CompanyLike): MainHubInfo {
  const company = (ctx && (ctx.company ?? ctx)) || ctx;
  
  // 1. Locate Hub Instances
  let hubsArr: any[] = [];
  if (Array.isArray(company?.hubs) && company.hubs.length > 0) {
    hubsArr = company.hubs;
  } else if (company?.hub && typeof company.hub === 'object') {
    hubsArr = [company.hub];
  } else if (Array.isArray(company?.infrastructure?.hubs) && company.infrastructure.hubs.length > 0) {
    hubsArr = company.infrastructure.hubs;
  } else if (Array.isArray(ctx?.hubs) && ctx.hubs.length > 0) {
    hubsArr = ctx.hubs;
  }

  // 2. Identify Main Hub (defaults to the first one found)
  const mainHubId = company?.mainHubId ?? (hubsArr[0] ? String(hubsArr[0].id ?? hubsArr[0].name ?? '') : null);
  const selected = hubsArr.find((h: any) => String(h?.id ?? h?.name ?? '') === String(mainHubId)) ?? hubsArr[0] ?? null;

  // 3. Get Level from Instance (this matches your public.hubs.level column)
  const levelNum = selected && typeof selected.level === 'number' ? Math.max(1, Math.round(selected.level)) : 1;
  
  // 4. Look up Rules from Master Table
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
 * @description Shortcut to get numeric limits for the entire company.
 */
export function getCompanyLimits(ctx: CompanyLike) {
  const info = getMainHubInfo(ctx);
  return { 
    vehicleLimit: info.vehicleLimit, 
    staffLimit: info.staffLimit, 
    hub: info.hub, 
    level: info.level 
  };
}
