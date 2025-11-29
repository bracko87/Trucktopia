/**
 * src/data/trucks/normalize.ts
 *
 * Purpose:
 * - Provide helpers to normalize truck dataset entries so common spec fields are
 *   available in a predictable shape.
 * - Extracts enginePower, fuelConsumption (L/100 km numeric), speed (km/h numeric),
 *   maintenanceGroup (1|2|3 numeric), reliability (A|B|C), durability (1-10 number),
 *   and capacity (string/number) from many common aliases (top-level and nested).
 *
 * Notes:
 * - This module does not invent aggressive defaults. It extracts values when found
 *   and sets null for missing values for consistent presence.
 * - Use this at dataset aggregation time so UI components receive normalized objects.
 */

/**
 * TruckLike
 * @description Minimal loose shape used by the normalizer (we accept any incoming shape).
 */
export interface TruckLike {
  id?: string;
  brand?: string;
  model?: string;
  category?: string;
  tonnage?: number;
  price?: number;
  leaseRate?: number;
  condition?: number;
  availability?: string;
  truckCategory?: string;
  specifications?: { [key: string]: any } | null;
  spec?: { [key: string]: any } | null;
  specs?: { [key: string]: any } | null;
  [key: string]: any;
}

/**
 * parseFirstNumber
 * @description Extract first numeric value from a string (supports decimals).
 */
function parseFirstNumber(input: any): number | null {
  if (input === undefined || input === null) return null;
  if (typeof input === 'number' && !Number.isNaN(input)) return input;
  const s = String(input);
  const m = s.match(/(\d+(\.\d+)?)/);
  if (!m) return null;
  return parseFloat(m[1]);
}

/**
 * getNestedSpecs
 * @description Return the nested spec object from common candidate fields.
 */
function getNestedSpecs(obj: TruckLike | null): { [key: string]: any } | null {
  if (!obj) return null;
  return (obj.specifications ?? obj.spec ?? obj.specs ?? null) as { [key: string]: any } | null;
}

/**
 * extractEnginePower
 * @description Extract a string description of engine power from multiple keys.
 */
function extractEnginePower(t: TruckLike): string | null {
  const candidates = ['enginePower', 'engine', 'engine_power', 'enginePowerDesc', 'power'];
  for (const k of candidates) {
    if (t[k]) return String(t[k]);
  }
  const specs = getNestedSpecs(t);
  if (specs) {
    for (const k of candidates) {
      if (specs[k]) return String(specs[k]);
    }
  }
  return null;
}

/**
 * extractFuelConsumption
 * @description Try to extract fuel consumption in L/100 km as a number from many aliases.
 * - Looks for explicit numeric fields first, then parses strings like "6.5 L/100 km".
 */
function extractFuelConsumption(t: TruckLike): number | null {
  const directCandidates = [
    'fuelConsumption',
    'fuelConsumptionL100km',
    'fuelConsumptionL100Km',
    'fuel_consumption',
    'fuel_l100km',
    'fuelL100km',
    'fuel',
    'consumption',
    'consum'
  ];

  for (const k of directCandidates) {
    const v = t[k];
    if (v !== undefined && v !== null) {
      const n = parseFirstNumber(v);
      if (n !== null) return n;
    }
  }

  const specs = getNestedSpecs(t);
  if (specs) {
    for (const k of directCandidates) {
      const v = specs[k];
      if (v !== undefined && v !== null) {
        const s = String(v);
        // prefer "L/100" pattern
        const m = s.match(/(\d+(\.\d+)?)(?=\s*(L|l)\/100)/);
        if (m) return parseFloat(m[1]);
        const n = parseFirstNumber(s);
        if (n !== null) return n;
      }
    }

    // fallback scanning: look for a string value containing "L/100"
    for (const key of Object.keys(specs)) {
      const val = specs[key];
      if (typeof val === 'string') {
        const mFuel = val.match(/(\d+(\.\d+)?)(?=\s*(L|l)\/100)/);
        if (mFuel) return parseFloat(mFuel[1]);
      }
      if (typeof val === 'number') {
        // heuristics: prefer keys containing fuel or consum
        if (/fuel|consum|l\/100|lper100|litre|liter/i.test(key)) return val;
      }
    }
  }

  return null;
}

/**
 * extractSpeedKmH
 * @description Extract speed in km/h from a number or strings like "120 km/h".
 */
function extractSpeedKmH(t: TruckLike): number | null {
  const candidates = ['speedKmH', 'speed_kmh', 'speed', 'topSpeed', 'speedKm', 'maxSpeed', 'speed_km_h', 'speedKmH'];
  for (const k of candidates) {
    const v = t[k];
    if (v !== undefined && v !== null) {
      const m = String(v).match(/(\d+(\.\d+)?)/);
      if (m) return parseFloat(m[1]);
    }
  }
  const specs = getNestedSpecs(t);
  if (specs) {
    for (const k of candidates) {
      const v = specs[k];
      if (v !== undefined && v !== null) {
        const s = String(v);
        const m = s.match(/(\d+(\.\d+)?)(?=\s*(km|kph|km\/h))/i);
        if (m) return parseFloat(m[1]);
        const m2 = s.match(/(\d+(\.\d+)?)/);
        if (m2) return parseFloat(m2[1]);
      }
    }
  }
  return null;
}

/**
 * extractMaintenanceGroup
 * @description Extract maintenance group (1|2|3) from multiple aliases.
 */
function extractMaintenanceGroup(t: TruckLike): number | null {
  const candidates = ['maintenanceGroup', 'maintenance_group', 'maintenance', 'mg', 'maintenanceGroupId', 'maintenanceGroupId'];
  for (const k of candidates) {
    const v = t[k];
    if (v !== undefined && v !== null) {
      const n = Number(v);
      if (!Number.isNaN(n)) return n;
    }
  }
  const specs = getNestedSpecs(t);
  if (specs) {
    for (const k of candidates) {
      const v = specs[k];
      if (v !== undefined && v !== null) {
        const n = Number(v);
        if (!Number.isNaN(n)) return n;
      }
    }
  }
  return null;
}

/**
 * extractReliability
 * @description Extract reliability category (A|B|C) from common keys.
 */
function extractReliability(t: TruckLike): 'A' | 'B' | 'C' | null {
  const candidates = ['reliability', 'reliabilityCategory', 'reliability_rating'];
  for (const k of candidates) {
    const v = t[k];
    if (v && typeof v === 'string') {
      const up = v.trim().toUpperCase();
      if (['A', 'B', 'C'].includes(up)) return up as 'A' | 'B' | 'C';
    }
  }
  const specs = getNestedSpecs(t);
  if (specs) {
    for (const k of candidates) {
      const v = specs[k];
      if (v && typeof v === 'string') {
        const up = v.trim().toUpperCase();
        if (['A', 'B', 'C'].includes(up)) return up as 'A' | 'B' | 'C';
      }
    }
  }
  return null;
}

/**
 * extractDurability
 * @description Extract durability numeric 1-10 from common aliases.
 */
function extractDurability(t: TruckLike): number | null {
  const candidates = ['durability', 'durabilityScore', 'durability_score'];
  for (const k of candidates) {
    const v = t[k];
    if (v !== undefined && v !== null) {
      const n = Number(v);
      if (!Number.isNaN(n)) return n;
    }
  }
  const specs = getNestedSpecs(t);
  if (specs) {
    for (const k of candidates) {
      const v = specs[k];
      if (v !== undefined && v !== null) {
        const n = Number(v);
        if (!Number.isNaN(n)) return n;
      }
    }
  }
  return null;
}

/**
 * extractCapacity
 * @description Extract capacity (payload) string-friendly representation.
 */
function extractCapacity(t: TruckLike): string | null {
  const candidates = ['capacity', 'payload', 'loadCapacity'];
  for (const k of candidates) {
    if (t[k] !== undefined && t[k] !== null) return String(t[k]);
  }
  const specs = getNestedSpecs(t);
  if (specs) {
    for (const k of candidates) {
      if (specs[k] !== undefined && specs[k] !== null) return String(specs[k]);
    }
  }
  return null;
}

/**
 * normalizeTruck
 * @description Return a new object with normalized top-level fields added (or null when not found).
 */
function normalizeTruck(t: TruckLike): TruckLike {
  const enginePower = extractEnginePower(t);
  const fuelConsumption = extractFuelConsumption(t);
  const speed = extractSpeedKmH(t);
  const maintenanceGroup = extractMaintenanceGroup(t);
  const reliability = extractReliability(t);
  const durability = extractDurability(t);
  const capacity = extractCapacity(t);

  // Spread original but add normalized keys top-level for easier consumption by UI
  return {
    ...t,
    // normalized fields (explicit presence; value or null)
    enginePower: t.enginePower ?? enginePower ?? null,
    fuelConsumption: (t.fuelConsumption ?? fuelConsumption) ?? null,
    speed: (t.speed ?? speed) ?? null,
    maintenanceGroup: (t.maintenanceGroup ?? maintenanceGroup) ?? null,
    reliability: (t.reliability ?? reliability) ?? null,
    durability: (t.durability ?? durability) ?? null,
    capacity: (t.capacity ?? capacity) ?? null,
    // also ensure nested specifications contains human-friendly fields when possible
    specifications: {
      ...(getNestedSpecs(t) ?? {}),
      enginePower: (getNestedSpecs(t)?.enginePower ?? enginePower) ?? undefined,
      fuelConsumption: (getNestedSpecs(t)?.fuelConsumption ?? fuelConsumption) ?? undefined,
      speedKmH: (getNestedSpecs(t)?.speedKmH ?? speed) ?? undefined,
      maintenanceGroup: (getNestedSpecs(t)?.maintenanceGroup ?? maintenanceGroup) ?? undefined,
      reliability: (getNestedSpecs(t)?.reliability ?? reliability) ?? undefined,
      durability: (getNestedSpecs(t)?.durability ?? durability) ?? undefined,
      capacity: (getNestedSpecs(t)?.capacity ?? capacity) ?? undefined,
    },
  };
}

/**
 * normalizeTrucks
 * @description Normalize an array of truck-like entries. Returns a new array.
 */
export function normalizeTrucks(trucks: TruckLike[] | undefined | null): TruckLike[] {
  if (!Array.isArray(trucks)) return [];
  return trucks.map((t) => normalizeTruck(t));
}