/**
 * @file Skill simulator utilities
 * @description
 * Developer helper to simulate how driver skills affect a single job outcome.
 * - Computes salary impact, fuel savings, time reduction, revenue bonuses and insurance savings.
 * - Meant for dev/debug use (can be called from console or a debug UI).
 *
 * Assumptions (documented in code):
 * - Base speed: 60 km/h
 * - Base fuel consumption: 35 L / 100 km (adjustable)
 * - Fuel price default: 1.60 (currency units per litre)
 * - Working hours per month: 160
 * - Job value calculation mirrors simplified rules from job generator:
 *   baseRatePerKm = 2.5, weight modifiers, jobType multipliers, cargo bonuses, + weight component
 *
 * NOTE: This is a non-critical dev helper. It intentionally reproduces a small, deterministic
 * subset of the economic logic to make it easy to reason about skill ROI.
 */

/**
 * @description Simulation result interface describing numeric outputs
 */
export interface SimulationResult {
  input: {
    skills: string[];
    distanceKm: number;
    weightTons: number;
    cargoType: string;
    jobType: 'local' | 'state' | 'international';
    baseSalaryMonthly: number;
    fuelPricePerLitre: number;
  };
  derived: {
    baseJobValue: number;
    revenueWithSkillBonuses: number;
    fuelCostBaseline: number;
    fuelCostWithSkills: number;
    travelTimeBaselineHours: number;
    travelTimeWithSkillsHours: number;
    driverSalaryCostBaseline: number;
    driverSalaryCostWithSkills: number;
    insuranceCostBaseline: number;
    insuranceCostWithSkills: number;
    profitBaseline: number;
    profitWithSkills: number;
    profitDelta: number;
    salaryMultiplierFromSkills: number;
    skillCountMultiplier: number;
  };
  details: {
    appliedSkillEffects: Record<string, number>;
    notes: string[];
  };
}

/**
 * @description Utility: replicate job value calculation used by the generator (approximate)
 * @param distance number (km)
 * @param weight number (tons)
 * @param cargoType string
 * @param jobType string
 * @returns rounded job value (number)
 */
function calculateJobValue(distance: number, weight: number, cargoType: string, jobType: string) {
  const baseRatePerKm = 2.5;

  // Weight multipliers (same rules as job generator)
  let weightMultiplier = 1.0;
  if (weight <= 8) weightMultiplier = 1.4;
  else if (weight <= 16) weightMultiplier = 1.0;
  else weightMultiplier = 0.8;

  // Job type multipliers
  let jobMultiplier = 1.0;
  if (jobType === 'state') jobMultiplier = 1.6;
  else if (jobType === 'international') jobMultiplier = 2.2;

  // Cargo type bonuses (heuristic)
  let cargoBonus = 1.0;
  if (cargoType.includes('Frozen') || cargoType.includes('Refrigerated')) cargoBonus = 1.25;
  if (cargoType.includes('Hazardous')) cargoBonus = 1.35;
  if (cargoType.includes('Bulk')) cargoBonus = 1.1;
  if (cargoType.includes('Construction')) cargoBonus = 1.15;
  if (cargoType.includes('Heavy')) cargoBonus = 1.3;

  const basePrice = (distance * baseRatePerKm) * weightMultiplier * jobMultiplier * cargoBonus;
  const weightComponent = weight * 15;
  return Math.round(basePrice + weightComponent);
}

/**
 * @description Calculate fuel consumption (litres) for a trip
 * @param distanceKm number
 * @param baseLper100km number
 * @param fuelEfficiencyModifier decimal e.g. 0.08 for 8% improvement
 * @returns litres consumed (number)
 */
function calculateFuelLitres(distanceKm: number, baseLper100km: number, fuelEfficiencyModifier: number) {
  const effectiveLper100 = baseLper100km * (1 - fuelEfficiencyModifier);
  return (distanceKm * effectiveLper100) / 100;
}

/**
 * @description Small helper to read skill metadata and aggregate helpful numeric effects
 * NOTE: We only parse common driver-related effect names used in the skills database.
 */
import { skillsDatabase, calculateSkillValue, getSkillsSalaryMultiplier } from './skillsDatabase';

function aggregateSkillEffects(skills: string[]) {
  const applied: Record<string, number> = {
    fuel_efficiency: 0,
    route_speed: 0,
    time_reduction: 0,
    cargo_bonus: 0,
    oversized_bonus: 0,
    tanker_bonus: 0,
    livestock_bonus: 0,
    hazardous_pay: 0,
    insurance_discount: 0,
    customs_speed: 0,
    permit_handling: 0
  };

  const notes: string[] = [];

  skills.forEach((name) => {
    const skill = (skillsDatabase as Record<string, any>)[name];
    if (!skill) {
      notes.push(`Unknown skill "${name}" ignored.`);
      return;
    }
    skill.effects.forEach((effect: any) => {
      // Map known effect types into our aggregated object (take max for some, sum for others)
      const t = effect.type;
      const v = effect.value;
      if (t === 'fuel_efficiency' || t === 'fuel_savings') {
        applied.fuel_efficiency = Math.max(applied.fuel_efficiency, v);
      } else if (t === 'route_speed' || t === 'time_reduction' || t === 'time_reduction') {
        // These both reduce time; treat as additive small effects
        applied.route_speed = Math.max(applied.route_speed, v);
        applied.time_reduction = Math.max(applied.time_reduction, v);
      } else if (t === 'cargo_bonus' || t === 'cargo_bonus') {
        applied.cargo_bonus = Math.max(applied.cargo_bonus, v);
      } else if (t === 'oversized_bonus') {
        applied.oversized_bonus = Math.max(applied.oversized_bonus, v);
      } else if (t === 'tanker_bonus') {
        applied.tanker_bonus = Math.max(applied.tanker_bonus, v);
      } else if (t === 'livestock_bonus') {
        applied.livestock_bonus = Math.max(applied.livestock_bonus, v);
      } else if (t === 'hazardous_pay') {
        applied.hazardous_pay = Math.max(applied.hazardous_pay, v);
      } else if (t === 'insurance_discount') {
        applied.insurance_discount = Math.max(applied.insurance_discount, v);
      } else if (t === 'customs_speed') {
        applied.customs_speed = Math.max(applied.customs_speed, v);
      } else if (t === 'permit_handling') {
        applied.permit_handling = Math.max(applied.permit_handling, v);
      } else {
        // Unknown effect mapped as note
        notes.push(`Skill "${name}" has effect "${t}"=${v} (not modelled directly but recorded).`);
      }
    });
  });

  return { applied, notes };
}

/**
 * @description Simulate the impact of given driver skills on a single job and return numeric breakdown.
 * @param skills string[] - skill names as used in skillsDatabase (exact keys)
 * @param opts simulation options
 * @returns SimulationResult
 */
export function simulateSkillImpact(
  skills: string[],
  opts?: {
    distanceKm?: number;
    weightTons?: number;
    cargoType?: string;
    jobType?: 'local' | 'state' | 'international';
    baseSalaryMonthly?: number;
    fuelPricePerLitre?: number;
    baseFuelLper100km?: number;
  }
): SimulationResult {
  // Defaults & assumptions
  const distanceKm = opts?.distanceKm ?? 500;
  const weightTons = opts?.weightTons ?? 8;
  const cargoType = opts?.cargoType ?? 'Dry Goods';
  const jobType = opts?.jobType ?? 'state';
  const baseSalaryMonthly = opts?.baseSalaryMonthly ?? 2000; // currency units / month
  const fuelPricePerLitre = opts?.fuelPricePerLitre ?? 1.6;
  const baseFuelLper100km = opts?.baseFuelLper100km ?? 35; // litres per 100 km
  const workingHoursPerMonth = 160;
  const baseSpeedKmh = 60; // average speed used in generator

  // Base job value (using local replica of generator's formula)
  const baseJobValue = calculateJobValue(distanceKm, weightTons, cargoType, jobType);

  // Aggregate skill effects (we support the most impactful fields)
  const { applied, notes } = aggregateSkillEffects(skills);

  // Revenue with cargo bonuses: apply only if skill matches cargo type
  let revenueWithSkillBonuses = baseJobValue;
  // Apply cargo-specific skill bonuses if they match cargoType
  if (applied.cargo_bonus > 0 && (cargoType.includes('Frozen') || cargoType.includes('Refrigerated'))) {
    revenueWithSkillBonuses = Math.round(revenueWithSkillBonuses * (1 + applied.cargo_bonus));
  }
  if (applied.oversized_bonus > 0 && cargoType.includes('Heavy')) {
    revenueWithSkillBonuses = Math.round(revenueWithSkillBonuses * (1 + applied.oversized_bonus));
  }
  if (applied.tanker_bonus > 0 && cargoType.toLowerCase().includes('tanker') ) {
    revenueWithSkillBonuses = Math.round(revenueWithSkillBonuses * (1 + applied.tanker_bonus));
  }
  if (applied.livestock_bonus > 0 && cargoType.toLowerCase().includes('livestock')) {
    revenueWithSkillBonuses = Math.round(revenueWithSkillBonuses * (1 + applied.livestock_bonus));
  }
  if (applied.hazardous_pay > 0 && cargoType.toLowerCase().includes('hazard') || cargoType.toLowerCase().includes('hazardous')) {
    revenueWithSkillBonuses = Math.round(revenueWithSkillBonuses * (1 + applied.hazardous_pay));
  }
  // Generic cargo_bonus fallback - apply if cargoBonus > 0 and cargoType is relevant
  if (applied.cargo_bonus > 0 && !['Frozen','Refrigerated','Heavy','tanker','livestock','hazardous','hazard'].some(k => cargoType.includes(k))) {
    revenueWithSkillBonuses = Math.round(revenueWithSkillBonuses * (1 + applied.cargo_bonus * 0.35)); // partial bonus for generic
  }

  // Fuel calculations
  const fuelLitresBaseline = calculateFuelLitres(distanceKm, baseFuelLper100km, 0);
  const fuelCostBaseline = Math.round(fuelLitresBaseline * fuelPricePerLitre);

  const fuelEfficiencyModifier = applied.fuel_efficiency ?? 0; // e.g. 0.08 for 8%
  const fuelLitresWithSkills = calculateFuelLitres(distanceKm, baseFuelLper100km, fuelEfficiencyModifier);
  const fuelCostWithSkills = Math.round(fuelLitresWithSkills * fuelPricePerLitre);

  // Time calculations
  const travelTimeBaselineHours = distanceKm / baseSpeedKmh;
  // Combine route_speed and explicit time_reduction (use max)
  const timeReduction = Math.max(applied.route_speed, applied.time_reduction);
  const travelTimeWithSkillsHours = Math.max(0.1, travelTimeBaselineHours * (1 - timeReduction)); // floor

  // Driver salary cost for the job (hourly salary * hours)
  // Salary calculation: baseMonthly * product(skill salaryMultipliers) * skillCountMultiplier
  const { totalMultiplier: productSkillMultiplier } = calculateSkillValue(skills);
  const skillCountMultiplier = getSkillsSalaryMultiplier(skills.length);
  const salaryMultiplierFromSkills = productSkillMultiplier * skillCountMultiplier;

  const driverMonthlyBaseline = baseSalaryMonthly;
  const driverMonthlyWithSkills = Math.round(baseSalaryMonthly * salaryMultiplierFromSkills);

  const driverHourlyBaseline = driverMonthlyBaseline / workingHoursPerMonth;
  const driverHourlyWithSkills = driverMonthlyWithSkills / workingHoursPerMonth;

  const driverSalaryCostBaseline = Math.round(driverHourlyBaseline * travelTimeBaselineHours);
  const driverSalaryCostWithSkills = Math.round(driverHourlyWithSkills * travelTimeWithSkillsHours);

  // Insurance costs (assumption: 3% of job revenue baseline)
  const insuranceCostBaseline = Math.round(baseJobValue * 0.03);
  const insuranceDiscount = applied.insurance_discount ?? 0;
  const insuranceCostWithSkills = Math.round(insuranceCostBaseline * (1 - insuranceDiscount));

  // Profit calculations (very simplified)
  const profitBaseline = Math.round(baseJobValue - fuelCostBaseline - driverSalaryCostBaseline - insuranceCostBaseline);
  const profitWithSkills = Math.round(revenueWithSkillBonuses - fuelCostWithSkills - driverSalaryCostWithSkills - insuranceCostWithSkills);
  const profitDelta = Math.round(profitWithSkills - profitBaseline);

  const result: SimulationResult = {
    input: {
      skills,
      distanceKm,
      weightTons,
      cargoType,
      jobType,
      baseSalaryMonthly,
      fuelPricePerLitre
    },
    derived: {
      baseJobValue,
      revenueWithSkillBonuses,
      fuelCostBaseline,
      fuelCostWithSkills,
      travelTimeBaselineHours: Number(travelTimeBaselineHours.toFixed(2)),
      travelTimeWithSkillsHours: Number(travelTimeWithSkillsHours.toFixed(2)),
      driverSalaryCostBaseline,
      driverSalaryCostWithSkills,
      insuranceCostBaseline,
      insuranceCostWithSkills,
      profitBaseline,
      profitWithSkills,
      profitDelta,
      salaryMultiplierFromSkills: Number(salaryMultiplierFromSkills.toFixed(3)),
      skillCountMultiplier: Number(skillCountMultiplier.toFixed(3))
    },
    details: {
      appliedSkillEffects: applied,
      notes
    }
  };

  return result;
}

/**
 * @description Convenience helper that runs a simulation and prints a readable summary to console.
 * @param skills string[]
 * @param opts same as simulateSkillImpact opts
 */
export function simulateAndLog(
  skills: string[],
  opts?: {
    distanceKm?: number;
    weightTons?: number;
    cargoType?: string;
    jobType?: 'local' | 'state' | 'international';
    baseSalaryMonthly?: number;
    fuelPricePerLitre?: number;
  }
) {
  const res = simulateSkillImpact(skills, opts);

  // Nicely formatted console output for quick inspection
  // eslint-disable-next-line no-console
  console.groupCollapsed(`[Skill Simulation] ${skills.join(', ') || 'No skills'} — ${res.input.distanceKm}km ${res.input.cargoType}`);
  // eslint-disable-next-line no-console
  console.table({
    'Base Job Value': res.derived.baseJobValue,
    'Revenue with Skill Bonuses': res.derived.revenueWithSkillBonuses,
    'Fuel Cost (base)': res.derived.fuelCostBaseline,
    'Fuel Cost (with skills)': res.derived.fuelCostWithSkills,
    'Travel Time (h, base)': res.derived.travelTimeBaselineHours,
    'Travel Time (h, with skills)': res.derived.travelTimeWithSkillsHours,
    'Driver cost (base)': res.derived.driverSalaryCostBaseline,
    'Driver cost (with skills)': res.derived.driverSalaryCostWithSkills,
    'Insurance (base)': res.derived.insuranceCostBaseline,
    'Insurance (with skills)': res.derived.insuranceCostWithSkills,
    'Profit (base)': res.derived.profitBaseline,
    'Profit (with skills)': res.derived.profitWithSkills,
    'Profit delta': res.derived.profitDelta,
    'Salary multiplier (skills)': res.derived.salaryMultiplierFromSkills
  });
  // eslint-disable-next-line no-console
  console.log('Applied skill numeric summary:', res.details.appliedSkillEffects);
  if (res.details.notes.length) {
    // eslint-disable-next-line no-console
    console.warn('Notes:', res.details.notes);
  }
  // eslint-disable-next-line no-console
  console.groupEnd();

  return res;
}

/**
 * @description Dev-only quick demo runner that returns a couple of pre-made scenarios.
 * Use this for sanity checks quickly.
 */
export function runDemoSimulations() {
  const demoCases = [
    {
      skills: ['Long Haul', 'Route Planning'],
      opts: { distanceKm: 800, weightTons: 10, cargoType: 'Dry Goods', jobType: 'international', baseSalaryMonthly: 2200 }
    },
    {
      skills: ['ADR Certified', 'Tanker Transport'],
      opts: { distanceKm: 250, weightTons: 12, cargoType: 'Hazardous Materials', jobType: 'state', baseSalaryMonthly: 2300 }
    },
    {
      skills: ['Refrigerated Transport', 'Eco Driving'],
      opts: { distanceKm: 120, weightTons: 6, cargoType: 'Frozen / Refrigerated', jobType: 'local', baseSalaryMonthly: 1900 }
    }
  ];

  // eslint-disable-next-line no-console
  console.info('Running demo skill simulations — results will be logged grouped to console.');
  return demoCases.map(c => simulateAndLog(c.skills, c.opts));
}