/**
 * hubLevels.ts
 * 
 * Master Table for Hub Level Configurations.
 * Defines vehicle capacities and office working spots for all 10 levels.
 */

export interface HubLevel {
  level: number;
  vehicleLimit: number; // Combined trucks + trailers
  officeSpots: number;  // Combined dispatchers + managers
  upgradeCost: number;
  unlocks: string[];
}

/**
 * ALL_FACILITIES
 * @description List of all buildable facilities available in the game.
 */
export const ALL_FACILITIES = [
  'Garage',
  'Maintenance Workshop',
  'Fuel Station',
  'Rest Area',
  'Washing Bay',
  'Driver Lounge',
  'Security Post',
  'Logistics Office'
];

/**
 * Hub Levels Master Configuration
 * Based on user specifications for Levels 1-10.
 */
export const hubLevels: HubLevel[] = [
  { level: 1,  vehicleLimit: 10,  officeSpots: 2,  upgradeCost: 100000, unlocks: [] },
  { level: 2,  vehicleLimit: 20,  officeSpots: 4,  upgradeCost: 150000, unlocks: [] },
  { level: 3,  vehicleLimit: 40,  officeSpots: 8,  upgradeCost: 250000, unlocks: [] },
  { level: 4,  vehicleLimit: 70,  officeSpots: 12, upgradeCost: 400000, unlocks: [] },
  { level: 5,  vehicleLimit: 100, officeSpots: 15, upgradeCost: 600000, unlocks: [] },
  { level: 6,  vehicleLimit: 140, officeSpots: 20, upgradeCost: 850000, unlocks: [] },
  { level: 7,  vehicleLimit: 170, officeSpots: 24, upgradeCost: 1100000, unlocks: [] },
  { level: 8,  vehicleLimit: 200, officeSpots: 30, upgradeCost: 1400000, unlocks: [] },
  { level: 9,  vehicleLimit: 300, officeSpots: 40, upgradeCost: 1800000, unlocks: [] },
  { level: 10, vehicleLimit: 500, officeSpots: 50, upgradeCost: 2500000, unlocks: [] }
];

/**
 * getHubLevel
 * @description Retrieves configuration for a specific level.
 */
export function getHubLevel(level: number): HubLevel {
  const safeLevel = Math.max(1, Math.min(10, Math.round(level || 1)));
  return hubLevels[safeLevel - 1];
}
