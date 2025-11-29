/**
 * src/components/market/VehicleSpecsSelector.tsx
 *
 * Centralized vehicle specs classification and renderer.
 *
 * Responsibilities:
 * - Classify a vehicle as big / medium / small using conservative heuristics.
 * - Ensure explicit 'medium' classification always yields Capacity (Max payload) display
 *   (i.e. SmallTruckSpecsBox) unless a stronger numeric indicator forces Big.
 * - Render BigTruckSpecsBox for big trucks (GCW-focused) and SmallTruckSpecsBox for
 *   medium/small trucks (Capacity-focused).
 *
 * Notes:
 * - This file is intentionally small and focused to avoid layout changes.
 * - Includes brief debug logging to help validate classification during testing.
 */

import React, { useMemo, useEffect } from 'react';
import BigTruckSpecsBox from './BigTruckSpecsBox';
import SmallTruckSpecsBox from './SmallTruckSpecsBox';

/**
 * Props
 * @description Component props for VehicleSpecsSelector.
 */
interface Props {
  vehicle: any | null;
}

/**
 * parseNumberLike
 * @description Safely parse numeric-like values for tonnage / capacity heuristics.
 */
function parseNumberLike(input: any): number | null {
  if (input === undefined || input === null) return null;
  if (typeof input === 'number') return Number.isFinite(input) ? input : null;
  const s = String(input).replace(/[,\\s]+/g, '');
  const m = s.match(/(-?\\d+(\\.\\d+)?)/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

/**
 * VehicleSpecsSelector
 * @description Decide which specs box to render for the supplied vehicle.
 *
 * Classification rules (prioritized):
 * 1) If numeric tonnage >= 13 -> Big
 * 2) Else if truckCategory/category explicitly contains 'medium' -> Medium
 * 3) Else if textual hints strongly indicate Big -> Big
 * 4) Else numeric tonnage buckets: medium [7.5,13), small <7.5
 * 5) Fallback to conservative small/big detectors if available
 *
 * IMPORTANT: explicit 'medium' tag now takes precedence over textual big hints.
 */
const VehicleSpecsSelector: React.FC<Props> = ({ vehicle }) => {
  const specs = vehicle?.specifications ?? {};

  const classification = useMemo(() => {
    if (!vehicle) return { isBig: false, isMedium: false, isSmall: false, tonnage: null };

    // Top-level textual hints
    const topCategory = String(vehicle.truckCategory ?? vehicle.category ?? '').toLowerCase();
    const brandModelText = `${String(vehicle.brand ?? '')} ${String(vehicle.model ?? '')}`.toLowerCase();

    // Strong big hint words (kept concise)
    const bigHints = [
      'big',
      'heavy',
      'artic',
      'articulated',
      'semi',
      'tractor',
      'rigid',
      'combination',
      'long-haul',
      'heavy-duty',
      'heavy duty',
    ];
    const textIndicatesBig = bigHints.some((h) => topCategory.includes(h) || brandModelText.includes(h));

    // Small hint words
    const smallHints = ['van', 'tge', 'koffer', 'small', 'light', 'panel', 'sprinter', 'transit', 'lt', 'luton'];
    const textIndicatesSmall = smallHints.some((h) => topCategory.includes(h) || brandModelText.includes(h));

    // Numeric detection (tonnage / capacity / payload)
    const tonnageCandidates = [
      vehicle.tonnage,
      specs.tonnage,
      specs.capacity,
      specs.payload,
      vehicle.payload,
      vehicle.capacity,
    ];
    let tonnage: number | null = null;
    for (const c of tonnageCandidates) {
      const p = parseNumberLike(c);
      if (p !== null) {
        tonnage = p;
        break;
      }
    }

    // Interpret very large numeric values as kg -> convert to tonnes heuristic
    if (tonnage !== null && Math.abs(tonnage) > 50) {
      // If the raw number seems like kilograms, convert to tonnes
      tonnage = +(tonnage / 1000);
    }

    // NOTE: numeric threshold for Big is 13 tonnes
    const numericIsBig = tonnage !== null && tonnage >= 13;
    const numericIsMedium = tonnage !== null && tonnage >= 7.5 && tonnage < 13;
    const numericIsSmall = tonnage !== null && tonnage < 7.5;

    // Final classification with clear priority:
    // 1) Numeric big wins
    // 2) Explicit 'medium' tag wins (unless numeric big is true)
    // 3) Textual big hints applied after explicit medium check
    // 4) Numeric medium / small as fallback
    // 5) Textual small hints as last resort
    const explicitMedium = topCategory.includes('medium') || (String(vehicle.category ?? '').toLowerCase() === 'medium');

    let isBig = false;
    let isMedium = false;
    let isSmall = false;

    if (numericIsBig) {
      isBig = true;
    } else if (explicitMedium) {
      // explicit medium tag should force Medium unless numericIsBig (already handled)
      isMedium = true;
    } else if (textIndicatesBig) {
      isBig = true;
    } else if (numericIsMedium) {
      isMedium = true;
    } else if (numericIsSmall) {
      isSmall = true;
    } else if (textIndicatesSmall) {
      isSmall = true;
    } else {
      // default conservative fallback: treat as medium if category/tonnage hint medium otherwise small
      isMedium = topCategory.includes('truck') || topCategory.includes('medium');
    }

    return { isBig, isMedium, isSmall, tonnage };
  }, [vehicle, specs]);

  // Debug info to help verification in preview environment
  useEffect(() => {
    if (!vehicle) return;
    // eslint-disable-next-line no-console
    console.debug('[VehicleSpecsSelector] classification:', classification, 'vehicle:', {
      id: vehicle.id,
      truckCategory: vehicle.truckCategory ?? vehicle.category,
      tonnage: classification.tonnage,
      specs,
    });
  }, [vehicle, classification, specs]);

  if (!vehicle) return null;

  // Big trucks -> show GCW-focused box
  if (classification.isBig) {
    return <BigTruckSpecsBox specs={specs} forceShow={true} />;
  }

  // Medium & Small -> show Capacity (Max payload) box
  return <SmallTruckSpecsBox specs={specs} forceShow={classification.isMedium || classification.isSmall} />;
};

export default VehicleSpecsSelector;