/**
 * incomingDeliveryUtils.ts
 *
 * Pure utilities that handle IncomingDeliveries lifecycle without side-effects.
 *
 * Responsibilities:
 * - Provide processIncomingDeliveries(company) which moves delivered incoming items
 *   into the appropriate fleet arrays in an idempotent way.
 * - Provide a small helper for type detection when type is missing.
 */

import type { IncomingDelivery, ProcessResult } from '../types/incomingDelivery';

/**
 * detectTypeFromSpec
 * @description Heuristic to detect whether an incoming spec represents a truck or trailer
 * @param spec payload to inspect
 * @returns 'truck' | 'trailer' | 'unknown'
 */
function detectTypeFromSpec(spec?: Record<string, any>): 'truck' | 'trailer' | 'unknown' {
  if (!spec || typeof spec !== 'object') return 'unknown';

  // Trailer-specific heuristics
  if ('tonnage' in spec || 'axles' in spec || 'cargoClass' in spec || 'trailerClass' in spec) {
    return 'trailer';
  }

  // Truck-specific heuristics
  if ('engine' in spec || 'cabType' in spec || 'chassis' in spec || 'maxLoad' in spec) {
    return 'truck';
  }

  return 'unknown';
}

/**
 * processIncomingDeliveries
 * @description Idempotent function that inspects company.incomingDeliveries and moves
 *              any deliveries whose ETA <= now into company.trucks or company.trailers.
 *
 * Behaviour notes:
 * - Does not mutate other unrelated properties.
 * - If an incoming item has an explicit type it is used; otherwise fallbacks are used.
 * - If an item is already present in the target array (based on id or stable sku) the
 *   incoming record is removed without duplicating.
 *
 * @param company Generic company object expected to have trucks?: any[], trailers?: any[], incomingDeliveries?: IncomingDelivery[]
 * @returns ProcessResult containing updatedCompany and moved items list
 */
export function processIncomingDeliveries(company: any): ProcessResult {
  if (!company) {
    return { updatedCompany: company, moved: [] };
  }

  // Clone top-level company shallowly to avoid accidental caller-side mutation expectations
  const updatedCompany = { ...company };
  updatedCompany.trucks = Array.isArray(updatedCompany.trucks) ? [...updatedCompany.trucks] : [];
  updatedCompany.trailers = Array.isArray(updatedCompany.trailers) ? [...updatedCompany.trailers] : [];
  updatedCompany.incomingDeliveries = Array.isArray(updatedCompany.incomingDeliveries) ? [...updatedCompany.incomingDeliveries] : [];

  const now = Date.now();
  const moved: Array<{ incomingId: string; target: 'trucks' | 'trailers' | 'unknown'; item?: any }> = [];

  // Process list - keep items that are not yet delivered
  const remaining: IncomingDelivery[] = [];

  for (const incoming of updatedCompany.incomingDeliveries) {
    try {
      const eta = new Date(incoming.deliveryEta).getTime();
      if (!isNaN(eta) && eta <= now) {
        // determine target
        let type = incoming.type ?? 'unknown';
        if (type === 'unknown' || !type) {
          type = detectTypeFromSpec(incoming.spec);
        }

        const targetArrayName = type === 'trailer' ? 'trailers' : type === 'truck' ? 'trucks' : 'unknown';

        // Resolve item object to push (prefer incoming.spec, fallback sku)
        const itemObj = incoming.spec ?? (incoming.sku ? { sku: incoming.sku } : { id: incoming.id });

        // Duplication prevention: try to find item by unique id or sku in target array
        const alreadyExists =
          targetArrayName !== 'unknown' &&
          updatedCompany[targetArrayName].some((el: any) => {
            if (!el) return false;
            if (el.id && incoming.metadata?.itemId && el.id === incoming.metadata.itemId) return true;
            if (incoming.metadata?.itemId && el.id === incoming.metadata.itemId) return true;
            if (el.id && el.id === incoming.id) return true;
            if (incoming.sku && el.sku && el.sku === incoming.sku) return true;
            return false;
          });

        if (!alreadyExists && targetArrayName !== 'unknown') {
          updatedCompany[targetArrayName].push(itemObj);
          moved.push({ incomingId: incoming.id, target: targetArrayName as 'trucks' | 'trailers', item: itemObj });
        } else {
          // If unknown target or already exists: do not duplicate, but record 'unknown' when unclear
          moved.push({ incomingId: incoming.id, target: alreadyExists ? (targetArrayName as 'trucks' | 'trailers') : 'unknown', item: itemObj });
        }
        // do not push into remaining (effectively removed)
      } else {
        // not yet delivered
        remaining.push(incoming);
      }
    } catch (err) {
      // On errors keep item for later retry (defensive)
      remaining.push(incoming);
      console.error('processIncomingDeliveries: error processing incoming', incoming, err);
    }
  }

  updatedCompany.incomingDeliveries = remaining;

  return { updatedCompany, moved };
}