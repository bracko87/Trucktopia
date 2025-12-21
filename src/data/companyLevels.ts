/**
 * companyLevels.ts
 * 
 * Master data for Company Tiers.
 * Reflects the public.company_levels table in Supabase.
 */

export interface CompanyTier {
  name: string;
  minScore: number;
  color: string;
}

export const COMPANY_TIERS: CompanyTier[] = [
  { name: 'Seed', minScore: 0.0, color: '#94a3b8' },
  { name: 'Startup', minScore: 0.2, color: '#3b82f6' },
  { name: 'Growth', minScore: 0.4, color: '#6366f1' },
  { name: 'Established', minScore: 0.6, color: '#22c55e' },
  { name: 'Enterprise', minScore: 0.8, color: '#eab308' },
];

/**
 * getTierForScore
 * @description Maps a numeric score (0-1) to the appropriate Tier name.
 */
export function getTierForScore(score: number): string {
  const normalized = Math.max(0, Math.min(1, score));
  // Find the highest tier where the minScore is less than or equal to current score
  const tier = [...COMPANY_TIERS]
    .reverse()
    .find(t => normalized >= t.minScore);
  
  return tier?.name || 'Seed';
}
