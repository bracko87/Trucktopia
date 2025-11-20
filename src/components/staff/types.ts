/**
 * types.ts
 *
 * File-level:
 * Shared TypeScript types for staff UI components.
 */

/**
 * StaffRole
 * @description Allowed staff roles for role-specific panels.
 */
export type StaffRole = 'manager' | 'driver' | 'mechanic' | 'dispatcher';

/**
 * StaffData
 * @description Minimal staff data required by the role panels and primitives.
 */
export interface StaffData {
  id: string;
  name?: string;
  age?: number;
  nationality?: string;
  location?: string;
  kilometers?: number;
  tours?: number;
  happinessPct?: number; // 0..100
  fitPct?: number; // 0..100
  role: StaffRole;
}