/**
 * src/data/trucks/index.ts
 *
 * Purpose:
 * - Central export for truck categories to simplify imports in VehicleMarket.
 */

import { SMALL_TRUCKS } from './small';
import { MEDIUM_TRUCKS } from './medium';
import { BIG_TRUCKS } from './big';

export const TRUCKS = {
  small: SMALL_TRUCKS,
  medium: MEDIUM_TRUCKS,
  big: BIG_TRUCKS
};

export type TruckCategoryKey = keyof typeof TRUCKS;