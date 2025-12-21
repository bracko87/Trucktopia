/**
 * companyLevel.ts
 * 
 * Shared utilities for level calculations.
 * Synced with CompanyLevelEngine thresholds.
 */

export interface CompanyMetrics {
  trucks?: number;
  trailers?: number;
  capital?: number;
  completedJobs?: number;
  hubs?: number;
  staffQuality?: number; 
}

export interface LevelResult {
  key: string;
  name: string;
  color: string;
  score: number; 
}

const tierThresholds = [
  { min: 0.8, key: 'enterprise', name: 'Enterprise', color: 'text-yellow-400' },
  { min: 0.6, key: 'established', name: 'Established', color: 'text-green-400' },
  { min: 0.4, key: 'growth', name: 'Growth', color: 'text-indigo-400' },
  { min: 0.2, key: 'startup', name: 'Startup', color: 'text-blue-400' },
  { min: 0.0, key: 'seed', name: 'Seed', color: 'text-slate-400' },
];

/**
 * computeCompanyLevel
 * @description Calculates the level result based on current metrics.
 */
export function computeCompanyLevel(metrics: CompanyMetrics): LevelResult {
  const trucks = metrics.trucks || 0;
  const trailers = metrics.trailers || 0;
  const capital = metrics.capital || 0;
  const completedJobs = metrics.completedJobs || 0;
  const hubs = metrics.hubs || 1;
  const staffQuality = metrics.staffQuality || 0;

  const norm = {
    fleet: Math.min(1, (trucks + trailers * 0.5) / 100),
    finance: Math.min(1, capital / 2500000),
    ops: Math.min(1, completedJobs / 5000),
    infra: Math.min(1, hubs / 20),
    staff: staffQuality,
  };

  const score =
    norm.fleet * 0.35 +
    norm.finance * 0.25 +
    norm.ops * 0.15 +
    norm.infra * 0.15 +
    norm.staff * 0.10;

  const normalizedScore = Math.max(0, Math.min(1, score));
  for (const t of tierThresholds) {
    if (normalizedScore >= t.min) {
      return { key: t.key, name: t.name, color: t.color, score: normalizedScore };
    }
  }

  return { key: 'seed', name: 'Seed', color: 'text-slate-400', score: normalizedScore };
}
