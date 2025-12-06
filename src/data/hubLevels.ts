/**
 * hubLevels.ts
 *
 * Hub level configuration used by Infrastructure pages.
 *
 * Responsibilities:
 * - Provide canonical hub level definitions (vehicle limits, office spots).
 * - Provide the ALL_FACILITIES list used by the FacilitiesPanel.
 *
 * Change introduced:
 * - Facilities are no longer gated per hub level. The unlocks arrays are intentionally
 *   left empty so facilities are available from level 1. Upgrades still affect
 *   vehicleLimit/officeSpots and cost, but do not unlock facilities.
 */

/**
 * HubLevel
 * @description Describes properties granted by a hub level.
 */
export interface HubLevel {
  level: number;
  vehicleLimit: number;
  officeSpots: number;
  unlocks: string[]; // kept for compatibility but intentionally empty per product decision
  upgradeCost: number;
}

/**
 * All facility identifiers used in the UI/logic.
 * Keep these stable strings to allow future expansion.
 */
export const ALL_FACILITIES: string[] = [
  'Parking Yard',
  'Maintenance Garage',
  'Staff Training Center',
  'Repair Garage',
  'Dispatch Center',
  'Driver Facilities',
  'Spare Parts Warehouse',
  'Workshop',
  'Distribution Center',
  'Warehouse',
  'IT/Data Center'
];

/**
 * hubLevels
 * @description Array of HubLevel objects indexed by level-1 (level 1 -> index 0).
 * upgradeCost is set to 100_000 USD per level (kept as requested).
 *
 * NOTE: unlocks arrays intentionally empty so facilities are available from level 1.
 */
export const hubLevels: HubLevel[] = [
  {
    level: 1,
    vehicleLimit: 10,
    officeSpots: 2,
    unlocks: [],
    upgradeCost: 100_000
  },
  {
    level: 2,
    vehicleLimit: 20,
    officeSpots: 4,
    unlocks: [],
    upgradeCost: 100_000
  },
  {
    level: 3,
    vehicleLimit: 40,
    officeSpots: 8,
    unlocks: [],
    upgradeCost: 100_000
  },
  {
    level: 4,
    vehicleLimit: 70,
    officeSpots: 12,
    unlocks: [],
    upgradeCost: 100_000
  },
  {
    level: 5,
    vehicleLimit: 100,
    officeSpots: 15,
    unlocks: [],
    upgradeCost: 100_000
  },
  {
    level: 6,
    vehicleLimit: 140,
    officeSpots: 20,
    unlocks: [],
    upgradeCost: 100_000
  },
  {
    level: 7,
    vehicleLimit: 170,
    officeSpots: 24,
    unlocks: [],
    upgradeCost: 100_000
  },
  {
    level: 8,
    vehicleLimit: 200,
    officeSpots: 30,
    unlocks: [],
    upgradeCost: 100_000
  },
  {
    level: 9,
    vehicleLimit: 300,
    officeSpots: 40,
    unlocks: [],
    upgradeCost: 100_000
  },
  {
    level: 10,
    vehicleLimit: 500,
    officeSpots: 50,
    unlocks: [],
    upgradeCost: 100_000
  }
];

/**
 * getHubLevel
 * @description Return the HubLevel info for a given level (1..10). If level is missing or out of range,
 * returns the nearest valid level object.
 * @param level number
 */
export function getHubLevel(level: number): HubLevel {
  if (!Number.isFinite(level)) level = 1;
  const clamped = Math.max(1, Math.min(hubLevels.length, Math.round(level)));
  return hubLevels[clamped - 1];
}
