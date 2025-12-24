/**
 * hubPricingEngine.ts
 *
 * Logic for calculating dynamic, deterministic hub pricing.
 */

/**
 * getDeterministicBasePrice
 * @description Generates a consistent base price between $500k and $750k for a specific city.
 * The seed ensures that the same city always costs the same base amount.
 */
export function getDeterministicBasePrice(countryCode: string, city: string): number {
  const seed = `${countryCode.toLowerCase()}-${city.toLowerCase()}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  // Generate a variance of 0 to 250,000 based on the hash
  const variance = Math.abs(hash % 250000);
  return 500000 + variance;
}

/**
 * calculateConstructionCost
 * @description Calculates final cost based on base price and speed premium.
 * Standard construction time is now 60 days.
 * Every day saved (down to 40) costs 1% of the base price.
 */
/**
 * calculateConstructionCost
 * @description 
 * - Base price is locked to 60 days.
 * - Every day faster (down to 40) adds 1% of base price as a premium.
 * - Example: 40 days = 20% premium.
 */
export function calculateConstructionCost(basePrice: number, days: number): number {
  const BASE_DAYS = 60;
  const daysSaved = Math.max(0, BASE_DAYS - days);
  const premiumFactor = 1 + (daysSaved * 0.01);
  return Math.round(basePrice * premiumFactor);
}
