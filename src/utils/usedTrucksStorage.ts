/**
 * usedTrucksStorage.ts
 *
 * Small localStorage-backed helper for used truck offers and purchased trucks.
 *
 * Responsibilities:
 * - Provide simple get/save helpers for demo offers (tm_used_truck_offers)
 * - Persist purchased trucks per company (tm_purchased_trucks)
 *
 * Notes:
 * - This is intentionally lightweight for a local prototype. In production this
 *   would be replaced by API calls.
 */

/**
 * UsedTruckOffer
 * @description Shape of a used truck offer
 */
export interface UsedTruckOffer {
  id: string;
  modelId?: string;
  title: string;
  price: number;
  condition?: number; // percent
  year?: number;
  km?: number;
  payload?: number; // tons
  specs?: Record<string, any>;
}

/**
 * PurchasedTruck
 * @description Shape stored when a truck is purchased into a company
 */
export interface PurchasedTruck {
  id: string;
  offerId?: string;
  modelId?: string;
  nickname?: string;
  purchasedAt: string;
  purchasePrice: number;
  condition?: number;
  year?: number;
  km?: number;
  payload?: number;
  specs?: Record<string, any>;
}

/**
 * getOffers
 * @description Read used truck offers from localStorage. If none exist, return empty array.
 */
export function getOffers(): UsedTruckOffer[] {
  try {
    const raw = localStorage.getItem('tm_used_truck_offers');
    if (!raw) return [];
    return JSON.parse(raw) as UsedTruckOffer[];
  } catch (e) {
    console.error('getOffers error', e);
    return [];
  }
}

/**
 * saveOffers
 * @description Save used truck offers to localStorage
 */
export function saveOffers(offers: UsedTruckOffer[]) {
  try {
    localStorage.setItem('tm_used_truck_offers', JSON.stringify(offers));
  } catch (e) {
    console.error('saveOffers error', e);
  }
}

/**
 * seedSampleOffers
 * @description Convenience helper to write a couple of sample offers for testing
 */
export function seedSampleOffers() {
  const now = Date.now();
  const samples: UsedTruckOffer[] = [
    {
      id: `offer-${now}-1`,
      modelId: 'heno-xzu720-2025',
      title: 'Heno XZU720 — Used (68% Condition)',
      price: 12600,
      condition: 68,
      year: 2017,
      km: 272300,
      payload: 7.5,
      specs: { engine: '2.0 L • 130 kW', fuel: 'diesel' }
    },
    {
      id: `offer-${now}-2`,
      modelId: 'heno-xzu720-new',
      title: 'Heno XZU720 — Like New (100% Condition)',
      price: 31500,
      condition: 100,
      year: 2025,
      km: 0,
      payload: 3.5,
      specs: { engine: '2.0 L • 130 kW', fuel: 'diesel' }
    }
  ];
  saveOffers(samples);
  return samples;
}

/**
 * getPurchasedTrucks
 * @description Return a map keyed by companyId with arrays of PurchasedTruck
 */
export function getPurchasedTrucksMap(): Record<string, PurchasedTruck[]> {
  try {
    const raw = localStorage.getItem('tm_purchased_trucks');
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, PurchasedTruck[]>;
  } catch (e) {
    console.error('getPurchasedTrucksMap error', e);
    return {};
  }
}

/**
 * getPurchasedForCompany
 * @description Return purchased trucks for a single company id
 */
export function getPurchasedForCompany(companyId: string): PurchasedTruck[] {
  const map = getPurchasedTrucksMap();
  return map[companyId] || [];
}

/**
 * addPurchasedTruck
 * @description Persist a purchased truck under a company id
 */
export function addPurchasedTruck(companyId: string, truck: PurchasedTruck) {
  try {
    const map = getPurchasedTrucksMap();
    const arr = map[companyId] || [];
    arr.push(truck);
    map[companyId] = arr;
    localStorage.setItem('tm_purchased_trucks', JSON.stringify(map));
  } catch (e) {
    console.error('addPurchasedTruck error', e);
  }
}

/**
 * removeOffer
 * @description Remove an offer by id from the offers list (used after purchase)
 */
export function removeOffer(offerId: string) {
  try {
    const offers = getOffers().filter((o) => o.id !== offerId);
    saveOffers(offers);
  } catch (e) {
    console.error('removeOffer error', e);
  }
}
