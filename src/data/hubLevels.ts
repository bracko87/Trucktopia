/**
 * hubLevels.ts
 *
 * Hub level configuration and facilities mapping for Infrastructure.
 *
 * Responsibilities:
 * - Provide canonical hub level definitions (vehicle limits, office spots).
 * - Provide mapping of which facilities unlock on which levels.
 *
 * Note: upgradeCost changed to 100_000 USD per request.
 */

/**
 * HubLevel
 * @description Describes properties granted by a hub level.
 */
export interface HubLevel {
  level: number;
  vehicleLimit: number;
  officeSpots: number;
  unlocks: string[];
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
 * upgradeCost is set to 100,000 USD per level as requested.
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
    unlocks: ['Parking Yard', 'Maintenance Garage'],
    upgradeCost: 100_000
  },
  {
    level: 3,
    vehicleLimit: 40,
    officeSpots: 8,
    unlocks: ['Staff Training Center', 'Repair Garage'],
    upgradeCost: 100_000
  },
  {
    level: 4,
    vehicleLimit: 70,
    officeSpots: 12,
    unlocks: ['Dispatch Center'],
    upgradeCost: 100_000
  },
  {
    level: 5,
    vehicleLimit: 100,
    officeSpots: 15,
    unlocks: ['Driver Facilities', 'Spare Parts Warehouse'],
    upgradeCost: 100_000
  },
  {
    level: 6,
    vehicleLimit: 140,
    officeSpots: 20,
    unlocks: ['Workshop'],
    upgradeCost: 100_000
  },
  {
    level: 7,
    vehicleLimit: 170,
    officeSpots: 24,
    unlocks: ['Distribution Center'],
    upgradeCost: 100_000
  },
  {
    level: 8,
    vehicleLimit: 200,
    officeSpots: 30,
    unlocks: ['Warehouse'],
    upgradeCost: 100_000
  },
  {
    level: 9,
    vehicleLimit: 300,
    officeSpots: 40,
    unlocks: ['IT/Data Center'],
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
