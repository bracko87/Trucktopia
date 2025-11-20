/**
 * src/data/trucks.ts
 *
 * Purpose:
 * - Central truck data module that aggregates small / medium / big truck arrays.
 * - Exports shared truck interfaces / types and the TRUCKS grouped object.
 *
 * Notes:
 * - Added extended truck metadata: reliability, durability, speed and maintenanceGroup.
 * - These fields are used by maintenance & incident engines.
 */

/**
 * TruckSpecifications
 * @description Optional detailed technical specs for a truck.
 */
export interface TruckSpecifications {
  /** Cargo capacity in tonnes or liters (string or number) */
  capacity?: number | string;
  /** Engine displacement and power description */
  enginePower?: string;
  /** Fuel consumption in L/100 km */
  fuelConsumption?: number;
  /** Supported cargo types */
  cargoTypes?: string[];
  /** Additional freeform notes */
  notes?: string;
}

/**
 * Truck
 * @description Data shape for a truck used in the marketplace UI.
 *              Extended with engine-maintenance and incident related fields:
 *              - reliability: 'A' | 'B' | 'C' (A = very reliable)
 *              - durability: 1-10 (higher = more durable)
 *              - speed?: number (km/h) - used by driving engine when available
 *              - maintenanceGroup: 1|2|3 (defines cost & duration groups)
 */
export interface Truck {
  id: string;
  brand: string;
  model: string;
  price: number;
  category: 'new' | 'used';
  condition: number;
  availability: string;
  tonnage: number;
  leaseRate?: number;
  truckCategory?: string;
  image?: string;
  specifications?: TruckSpecifications;
  /**
   * Reliability categories:
   * A = very reliable, B = mid reliable, C = not reliable
   */
  reliability?: 'A' | 'B' | 'C';
  /**
   * Durability: 1 (lowest) ... 10 (highest)
   * Used to calculate how long a truck resists defects and time between required maintenance.
   */
  durability?: number;
  /**
   * Speed in km/h; driving engine will use this if present, otherwise fallback to default.
   */
  speed?: number;
  /**
   * MaintenanceGroup:
   * 1 = low cost, 1 day
   * 2 = mid cost, 1-2 days
   * 3 = expensive, 2-4 days
   */
  maintenanceGroup?: 1 | 2 | 3;
}

/**
 * TruckCategoryKey
 * @description Keys used to identify truck groups in the UI (small / medium / big)
 */
export type TruckCategoryKey = 'small' | 'medium' | 'big';

/**
 * Import grouped arrays.
 * These files export SMALL_TRUCKS / MEDIUM_TRUCKS / BIG_TRUCKS arrays.
 * Kept modular to avoid a single huge file when many entries exist.
 */
import { SMALL_TRUCKS } from './trucks/small';
import { MEDIUM_TRUCKS } from './trucks/medium';
import { BIG_TRUCKS } from './trucks/big';

/**
 * TRUCKS
 * @description Aggregated truck collections grouped by size.
 */
export const TRUCKS: {
  small: Truck[];
  medium: Truck[];
  big: Truck[];
} = {
  small: SMALL_TRUCKS as Truck[],
  medium: MEDIUM_TRUCKS as Truck[],
  big: BIG_TRUCKS as Truck[]
};