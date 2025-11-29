/**
 * src/components/fleet/TrailerNormalizer.tsx
 *
 * Background normalizer that ensures purchased/incoming items that are trailers
 * are correctly labeled and placed in the appropriate company arrays (trucks vs trailers).
 *
 * Responsibilities:
 * - Add a canonical vehicleKind ('truck' | 'trailer') when missing.
 * - Move mis-assigned items between company.trucks and company.trailers when heuristics indicate they belong elsewhere.
 * - Correct inconsistent items in company.trailers (move back to trucks) if they clearly are not trailers.
 *
 * Safety principles:
 * - Do not override an explicit vehicleKind set by other systems.
 * - Be conservative: only move items when heuristics strongly indicate misplacement.
 * - Use createCompany (GameContext) to persist normalization once per-change and avoid loops using a guard.
 */

import React, { useEffect, useRef } from 'react';
import { useGame } from '../../contexts/GameContext';
import { isTrailer, isTruck, setVehicleKind, extractTrailerClass } from '../../utils/vehicleTypeUtils';

/**
 * candidateIncomingKeys
 * @description Known candidate keys that may be used by different purchase flows
 *              to store incoming / purchased items.
 */
const candidateIncomingKeys = [
  'incomingVehicles',
  'incoming',
  'deliveries',
  'purchasedItems',
  'purchaseQueue',
  'incomingDeliveries',
  'incoming_items',
  'incoming_items_queue',
  'deliveriesQueue',
  'incoming_items_list'
];

/**
 * TrailerNormalizer
 * @description React component that mounts as a background normalizer and repairs/makes canonical vehicleKind
 *              and ensures items are in the correct company arrays.
 */
const TrailerNormalizer: React.FC = () => {
  const { gameState, createCompany } = useGame();
  const guardRef = useRef(false);

  useEffect(() => {
    const company = gameState?.company;
    if (!company) return;

    // Prevent rapid re-entrancy; allow one normalization round at a time.
    if (guardRef.current) return;
    guardRef.current = true;

    try {
      let didChange = false;
      // Work on a shallow copy
      const updatedCompany: any = { ...company };

      // 1) Normalize candidate incoming/purchases arrays by setting vehicleKind when missing
      for (const key of candidateIncomingKeys) {
        const arr = Array.isArray(updatedCompany[key]) ? updatedCompany[key].slice() : null;
        if (!arr) continue;

        const newArr = arr.map((it: any) => {
          // If canonical tag exists, respect it
          if (it?.vehicleKind === 'trailer' || it?.vehicleKind === 'truck') {
            return { ...it };
          }

          // Use heuristics to decide
          if (isTrailer(it)) {
            didChange = true;
            const trailerClass = it.trailerClass ?? extractTrailerClass(it) ?? undefined;
            return { ...it, vehicleKind: 'trailer', ...(trailerClass ? { trailerClass } : {}) };
          } else if (isTruck(it)) {
            didChange = true;
            return { ...it, vehicleKind: 'truck' };
          }
          return { ...it };
        });

        if (didChange) {
          updatedCompany[key] = newArr;
        }
      }

      // 2) Repair items placed in company.trucks that are trailers -> move to company.trailers
      const trucksArr = Array.isArray(updatedCompany.trucks) ? updatedCompany.trucks.slice() : [];
      const trailersArr = Array.isArray(updatedCompany.trailers) ? updatedCompany.trailers.slice() : [];

      const remainingTrucks: any[] = [];
      const trailersToAdd: any[] = [];

      for (const t of trucksArr) {
        // If item already explicitly marked as truck keep it
        if (t?.vehicleKind === 'truck') {
          remainingTrucks.push(t);
          continue;
        }

        // If item explicitly trailer keep as trailer (rare if mis-saved)
        if (t?.vehicleKind === 'trailer') {
          // make sure it's actually in trailers list
          trailersToAdd.push(t);
          didChange = true;
          continue;
        }

        // Heuristic: if it looks like a trailer, move it
        if (isTrailer(t)) {
          didChange = true;
          const trailerClass = t.trailerClass ?? extractTrailerClass(t) ?? undefined;
          trailersToAdd.push({ ...t, type: 'trailer', vehicleKind: 'trailer', ...(trailerClass ? { trailerClass } : {}) });
        } else {
          // Keep as truck; ensure canonical tag exists
          if (!t.vehicleKind) {
            didChange = true;
            remainingTrucks.push({ ...t, vehicleKind: 'truck' });
          } else {
            remainingTrucks.push({ ...t });
          }
        }
      }

      // 3) Repair items in company.trailers that are clearly trucks -> move back to trucks
      const remainingTrailers: any[] = [];
      const trucksToAddFromTrailers: any[] = [];

      for (const tr of trailersArr) {
        // If canonical tag says truck, move it back
        if (tr?.vehicleKind === 'truck') {
          didChange = true;
          trucksToAddFromTrailers.push({ ...tr, type: 'truck', vehicleKind: 'truck' });
          continue;
        }

        // If canonical trailer or heuristic trailer, keep
        if (tr?.vehicleKind === 'trailer' || isTrailer(tr)) {
          // ensure canonical trailer tag
          if (!tr.vehicleKind) {
            didChange = true;
            remainingTrailers.push({ ...tr, vehicleKind: 'trailer' });
          } else {
            remainingTrailers.push({ ...tr });
          }
          continue;
        }

        // Heuristic says it's not a trailer -> move to trucks
        if (!isTrailer(tr)) {
          didChange = true;
          trucksToAddFromTrailers.push({ ...tr, type: 'truck', vehicleKind: 'truck' });
        } else {
          remainingTrailers.push({ ...tr });
        }
      }

      // Merge arrays if we discovered moved items
      if (trailersToAdd.length > 0) {
        updatedCompany.trucks = remainingTrucks;
        updatedCompany.trailers = [...trailersToAdd, ...(Array.isArray(updatedCompany.trailers) ? updatedCompany.trailers : [])];
      } else {
        updatedCompany.trucks = remainingTrucks;
      }

      if (trucksToAddFromTrailers.length > 0) {
        updatedCompany.trailers = remainingTrailers;
        updatedCompany.trucks = [...(Array.isArray(updatedCompany.trucks) ? updatedCompany.trucks : []), ...trucksToAddFromTrailers];
      } else {
        updatedCompany.trailers = remainingTrailers;
      }

      // 4) If any normalization changes were applied, persist via createCompany (defensive)
      if (didChange) {
        try {
          if (typeof createCompany === 'function') {
            createCompany(updatedCompany);
          } else {
            // eslint-disable-next-line no-console
            console.warn('TrailerNormalizer: createCompany not available - normalization not persisted.');
          }
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('TrailerNormalizer: failed to persist normalized company', err);
        }
      }
    } finally {
      // allow another normalization pass after a short delay (prevents infinite loops)
      setTimeout(() => {
        guardRef.current = false;
      }, 1000);
    }
  }, [gameState, createCompany]);

  return null;
};

export default TrailerNormalizer;