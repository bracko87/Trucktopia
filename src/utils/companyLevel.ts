/**
 * companyLevel.ts
 *
 * Utilities to compute a normalized company progress score and map it to a human-friendly tier.
 *
 * Responsibilities:
 * - Provide computeCompanyLevel which returns a tier key, display name, color token and numeric score (0..1).
 * - Provide helper to compute progress to the next tier for UI progress bars.
 *
 * The implementation uses simple normalizers and weights which can be tuned for game balance.
 */

/**
 * CompanyMetrics
 * @description Minimal metrics used to compute company level and score.
 */
export interface CompanyMetrics {
  trucks?: number;
  trailers?: number;
  capital?: number;
  monthlyIncome?: number;
  completedJobs?: number;
  hubs?: number;
  staffQuality?: number; // 0..1
}

/**
 * LevelResult
 * @description Result of computing the company level.
 */
export interface LevelResult {
  key: string;
  name: string;
  color: string;
  score: number; // 0..1
}

/**
 * tierThresholds
 * @description Thresholds mapping for score -> tier key/name.
 */
const tierThresholds: Array<{ min: number; key: string; name: string; color: string }> = [
  { min: 0.8, key: 'enterprise', name: 'Enterprise', color: 'text-yellow-400' },
  { min: 0.6, key: 'established', name: 'Established', color: 'text-green-400' },
  { min: 0.4, key: 'growth', name: 'Growth', color: 'text-indigo-400' },
  { min: 0.2, key: 'startup', name: 'Startup', color: 'text-blue-400' },
  { min: 0.0, key: 'seed', name: 'Seed', color: 'text-slate-400' },
];

/**
 * computeCompanyLevel
 * @description Compute a normalized company score (0..1) from metrics and map to a tier.
 * @param metrics CompanyMetrics metrics used to compute the score
 * @returns LevelResult containing {key, name, color, score}
 */
export function computeCompanyLevel(metrics: CompanyMetrics): LevelResult {
  // Safe default metrics
  const trucks = Math.max(0, metrics.trucks || 0);
  const trailers = Math.max(0, metrics.trailers || 0);
  const capital = Math.max(0, metrics.capital || 0);
  const monthlyIncome = Math.max(0, metrics.monthlyIncome || 0);
  const completedJobs = Math.max(0, metrics.completedJobs || 0);
  const hubs = Math.max(0, metrics.hubs || 0);
  const staffQuality = Math.min(1, Math.max(0, metrics.staffQuality ?? 0.5));

  // Normalizers (caps chosen to produce sensible progression)
  const norm = {
    // approximate fleet strength, trailers count half weight of trucks
    fleet: Math.min(1, (trucks + trailers * 0.5) / 50), // cap at ~50 trucks
    // finance: treat capital plus some months of revenue as effective capital
    finance: Math.min(1, (capital + monthlyIncome * 6) / 500_000), // effective cap ~€500k
    ops: Math.min(1, completedJobs / 2_000), // cap at ~2000 completed jobs
    infra: Math.min(1, hubs / 10), // cap at 10 hubs
    staff: staffQuality, // already 0..1
  };

  // Weights (tunable)
  const weights = { fleet: 0.30, finance: 0.25, ops: 0.20, infra: 0.15, staff: 0.10 };

  const score =
    norm.fleet * weights.fleet +
    norm.finance * weights.finance +
    norm.ops * weights.ops +
    norm.infra * weights.infra +
    norm.staff * weights.staff;

  // Map to tier by descending thresholds
  const normalizedScore = Math.max(0, Math.min(1, score));
  for (const t of tierThresholds) {
    if (normalizedScore >= t.min) {
      return { key: t.key, name: t.name, color: t.color, score: normalizedScore };
    }
  }

  // Fallback (should never reach)
  return { key: 'seed', name: 'Seed', color: 'text-slate-400', score: normalizedScore };
}

/**
 * computeProgressToNextTier
 * @description Given a score (0..1), compute percent progress to the next tier boundary (0..100).
 *              If at highest tier, returns 100.
 * @param score 0..1
 * @returns progress percent 0..100
 */
export function computeProgressToNextTier(score: number): number {
  const ordered = [...tierThresholds].sort((a, b) => a.min - b.min);
  // If at or above top threshold, return 100
  const top = Math.max(...ordered.map((t) => t.min));
  if (score >= top) return 100;

  // Find current threshold and next threshold
  let current = ordered[0];
  for (let i = 0; i < ordered.length; i++) {
    if (score >= ordered[i].min) {
      current = ordered[i];
    } else {
      const next = ordered[i];
      // Map score from current.min..next.min => 0..1
      const range = next.min - current.min;
      const relative = range <= 0 ? 1 : (score - current.min) / range;
      return Math.max(0, Math.min(100, Math.round(relative * 100)));
    }
  }

  return Math.round(score * 100);
}