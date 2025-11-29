/**
 * src/data/trucks/big.ts
 *
 * Purpose:
 * - Store example "big" truck entries used by the vehicle market and fleet UI.
 * - Each entry contains GCW (A|B|C) so the app can decide which trailers the truck can attach.
 *
 * Notes:
 * - Fields are typed and carry engine/consumption/reliability/durability metadata for later engines.
 * - Prices are stored as numeric USD values (no currency symbol).
 * - This file is data-only; visual components read these objects and render them.
 */

/**
 * Truck
 * @description Minimal truck shape used by the market pages and components.
 */
export interface Truck {
  id: string;
  type: 'truck';
  category: 'new' | 'used';
  brand: string;
  model: string;
  tonnage: number;
  price: number;
  leaseRate?: number;
  condition?: number;
  availability?: string;
  specifications?: TruckSpecifications;
  image?: string;
  truckCategory?: 'Small' | 'Medium' | 'Big';
  /**
   * GCW sub-category defines trailer compatibility:
   * - 'A' => trailer below 16t
   * - 'B' => trailer below 26t
   * - 'C' => trailer over 26t
   */
  gcw?: 'A' | 'B' | 'C';
  [key: string]: any;
}

/**
 * TruckSpecifications
 * @description Detailed technical metadata for trucks.
 */
export interface TruckSpecifications {
  capacity?: string | number;
  enginePower?: string;
  horsepower?: number;
  fuelConsumptionL100km?: number;
  fuel?: number | string;
  cargoTypes?: string[];
  speedKmH?: number;
  reliability?: 'A' | 'B' | 'C';
  durability?: number;
  maintenanceGroup?: 1 | 2 | 3;
  fuelTankCapacity?: number;
  gcw?: 'A' | 'B' | 'C';
  [key: string]: any;
}

/**
 * BIG_TRUCKS
 * @description Example tractor units and big trucks (market dataset).
 */
export const BIG_TRUCKS: Truck[] = [
  // ----- User-supplied Mercedes-Benz Actros entries -----
  {
    id: 'mercedes-actros-1831',
    type: 'truck',
    category: 'new',
    brand: 'Mercedes-Benz',
    model: 'Actros 1831',
    tonnage: 18,
    price: 99900,
    condition: 100,
    availability: '2 days',
    specifications: {
      enginePower: 'OM 936 - 230 kW (≈ 313 PS)',
      horsepower: 313,
      fuelConsumptionL100km: 26,
      reliability: 'A',
      durability: 7,
      speedKmH: 80,
      maintenanceGroup: 3,
      fuelTankCapacity: 540
    },
    truckCategory: 'Big',
    gcw: 'A'
  },
  {
    id: 'mercedes-actros-1835',
    type: 'truck',
    category: 'new',
    brand: 'Mercedes-Benz',
    model: 'Actros 1835',
    tonnage: 18,
    price: 108200,
    condition: 100,
    availability: '3 days',
    specifications: {
      enginePower: 'OM 936 - 260 kW (≈ 354 PS)',
      horsepower: 354,
      fuelConsumptionL100km: 29,
      reliability: 'A',
      durability: 8,
      speedKmH: 82,
      maintenanceGroup: 3,
      fuelTankCapacity: 540
    },
    truckCategory: 'Big',
    gcw: 'B'
  },
  {
    id: 'mercedes-actros-1840',
    type: 'truck',
    category: 'new',
    brand: 'Mercedes-Benz',
    model: 'Actros 1840',
    tonnage: 18,
    price: 110400,
    condition: 100,
    availability: '1 day',
    specifications: {
      enginePower: 'OM 470 - 290 kW (≈ 394 PS)',
      horsepower: 394,
      fuelConsumptionL100km: 28,
      reliability: 'A',
      durability: 8,
      speedKmH: 85,
      maintenanceGroup: 3,
      fuelTankCapacity: 560
    },
    truckCategory: 'Big',
    gcw: 'B'
  },
  {
    id: 'mercedes-actros-1843',
    type: 'truck',
    category: 'new',
    brand: 'Mercedes-Benz',
    model: 'Actros 1843',
    tonnage: 18,
    price: 114700,
    condition: 100,
    availability: '3 days',
    specifications: {
      enginePower: 'OM 470 - 315 kW (≈ 428 PS)',
      horsepower: 428,
      fuelConsumptionL100km: 30,
      reliability: 'A',
      durability: 9,
      speedKmH: 87,
      maintenanceGroup: 3,
      fuelTankCapacity: 560
    },
    truckCategory: 'Big',
    gcw: 'B'
  },
  {
    id: 'mercedes-actros-1848ls',
    type: 'truck',
    category: 'new',
    brand: 'Mercedes-Benz',
    model: 'Actros 1848 LS',
    tonnage: 18,
    price: 117600,
    condition: 100,
    availability: '1 day',
    specifications: {
      enginePower: 'OM 471 - 350 kW (≈ 476 PS)',
      horsepower: 476,
      fuelConsumptionL100km: 31,
      reliability: 'A',
      durability: 8,
      speedKmH: 90,
      maintenanceGroup: 3,
      fuelTankCapacity: 560
    },
    truckCategory: 'Big',
    gcw: 'B'
  },
  {
    id: 'mercedes-actros-1853ls',
    type: 'truck',
    category: 'new',
    brand: 'Mercedes-Benz',
    model: 'Actros 1853 LS',
    tonnage: 18,
    price: 119100,
    condition: 100,
    availability: '2 days',
    specifications: {
      enginePower: 'OM 471 - 390 kW (≈ 530 PS)',
      horsepower: 530,
      fuelConsumptionL100km: 29,
      reliability: 'A',
      durability: 8,
      speedKmH: 93,
      maintenanceGroup: 3,
      fuelTankCapacity: 580
    },
    truckCategory: 'Big',
    gcw: 'B'
  },
  {
    id: 'mercedes-actros-2663',
    type: 'truck',
    category: 'new',
    brand: 'Mercedes-Benz',
    model: 'Actros 2663',
    tonnage: 26,
    price: 131300,
    condition: 100,
    availability: '3 days',
    specifications: {
      enginePower: 'OM 470 - 315 kW (≈ 428 PS)',
      horsepower: 428,
      fuelConsumptionL100km: 36,
      reliability: 'A',
      durability: 7,
      speedKmH: 82,
      maintenanceGroup: 3,
      fuelTankCapacity: 780
    },
    truckCategory: 'Big',
    gcw: 'C'
  },
  {
    id: 'mercedes-actros-2651',
    type: 'truck',
    category: 'new',
    brand: 'Mercedes-Benz',
    model: 'Actros 2651',
    tonnage: 26,
    price: 139900,
    condition: 100,
    availability: '2 days',
    specifications: {
      enginePower: 'OM 471 — 12.8 L - 375 kW (≈ 510 PS)',
      horsepower: 510,
      fuelConsumptionL100km: 35,
      reliability: 'A',
      durability: 8,
      speedKmH: 85,
      maintenanceGroup: 3,
      fuelTankCapacity: 740
    },
    truckCategory: 'Big',
    gcw: 'C'
  },

  // ----- Iveco (Ivaco) entries (normalized brand: Iveco) -----
  {
    id: 'iveco-stralis-as-440',
    type: 'truck',
    category: 'new',
    brand: 'Iveco',
    model: 'Stralis AS 440',
    tonnage: 18,
    price: 91300,
    condition: 100,
    availability: '2 days',
    specifications: {
      enginePower: 'Iveco Cursor 11 – 324 kW (≈ 440 PS)',
      horsepower: 440,
      fuelConsumptionL100km: 26,
      reliability: 'B',
      durability: 7,
      speedKmH: 80,
      maintenanceGroup: 3,
      fuelTankCapacity: 450
    },
    truckCategory: 'Big',
    gcw: 'A'
  },
  {
    id: 'iveco-stralis-as-480',
    type: 'truck',
    category: 'new',
    brand: 'Iveco',
    model: 'Stralis AS 480',
    tonnage: 18,
    price: 96300,
    condition: 100,
    availability: '1 day',
    specifications: {
      enginePower: 'Iveco Cursor 11 – 353 kW (≈ 480 PS)',
      horsepower: 480,
      fuelConsumptionL100km: 28,
      reliability: 'B',
      durability: 7,
      speedKmH: 83,
      maintenanceGroup: 3,
      fuelTankCapacity: 460
    },
    truckCategory: 'Big',
    gcw: 'B'
  },
  {
    id: 'iveco-stralis-as-530',
    type: 'truck',
    category: 'new',
    brand: 'Iveco',
    model: 'Stralis AS 530',
    tonnage: 18,
    price: 99000,
    condition: 100,
    availability: '2 days',
    specifications: {
      enginePower: 'Iveco Cursor 11 – 353 kW (≈ 530 PS)',
      horsepower: 530,
      fuelConsumptionL100km: 29,
      reliability: 'B',
      durability: 8,
      speedKmH: 85,
      maintenanceGroup: 3,
      fuelTankCapacity: 530
    },
    truckCategory: 'Big',
    gcw: 'B'
  },
  {
    id: 'iveco-stralis-ad-330',
    type: 'truck',
    category: 'new',
    brand: 'Iveco',
    model: 'Stralis AD 330',
    tonnage: 19,
    price: 90900,
    condition: 100,
    availability: '3 days',
    specifications: {
      enginePower: 'Iveco Cursor 8 – 243 kW (≈ 330 PS)',
      horsepower: 330,
      fuelConsumptionL100km: 25,
      reliability: 'B',
      durability: 7,
      speedKmH: 80,
      maintenanceGroup: 3,
      fuelTankCapacity: 440
    },
    truckCategory: 'Big',
    gcw: 'A'
  },
  {
    id: 'iveco-stralis-ad-400',
    type: 'truck',
    category: 'new',
    brand: 'Iveco',
    model: 'Stralis AD 400',
    tonnage: 19,
    price: 92900,
    condition: 100,
    availability: '1 day',
    specifications: {
      enginePower: 'Iveco Cursor 8 – 294 kW (≈ 400 PS)',
      horsepower: 400,
      fuelConsumptionL100km: 27,
      reliability: 'B',
      durability: 7,
      speedKmH: 83,
      maintenanceGroup: 3,
      fuelTankCapacity: 580
    },
    truckCategory: 'Big',
    gcw: 'A'
  },
  {
    id: 'iveco-stralis-at-480-1',
    type: 'truck',
    category: 'new',
    brand: 'Iveco',
    model: 'Stralis AT 480',
    tonnage: 18,
    price: 99900,
    condition: 100,
    availability: '3 days',
    specifications: {
      enginePower: 'Iveco Cursor 11 – 353 kW (≈ 480 PS)',
      horsepower: 480,
      fuelConsumptionL100km: 28,
      reliability: 'B',
      durability: 7,
      speedKmH: 84,
      maintenanceGroup: 3,
      fuelTankCapacity: 640
    },
    truckCategory: 'Big',
    gcw: 'B'
  },
  {
    id: 'iveco-stralis-hiway-570',
    type: 'truck',
    category: 'new',
    brand: 'Iveco',
    model: 'Stralis Hi-Way 570',
    tonnage: 18,
    price: 122900,
    condition: 100,
    availability: '3 days',
    specifications: {
      enginePower: 'Iveco Cursor 13 – 419 kW (≈ 570 PS)',
      horsepower: 570,
      fuelConsumptionL100km: 36,
      reliability: 'B',
      durability: 8,
      speedKmH: 82,
      maintenanceGroup: 3,
      fuelTankCapacity: 920
    },
    truckCategory: 'Big',
    gcw: 'C'
  },
  {
    id: 'iveco-sway-340-ps-1',
    type: 'truck',
    category: 'new',
    brand: 'Iveco',
    model: 'S-Way 340 PS',
    tonnage: 18,
    price: 92900,
    condition: 100,
    availability: '1 day',
    specifications: {
      enginePower: 'Iveco Cursor 9 – 251 kW (≈ 340 PS)',
      horsepower: 340,
      fuelConsumptionL100km: 23,
      reliability: 'B',
      durability: 6,
      speedKmH: 80,
      maintenanceGroup: 3,
      fuelTankCapacity: 440
    },
    truckCategory: 'Big',
    gcw: 'A'
  },
  {
    id: 'iveco-sway-400-ps',
    type: 'truck',
    category: 'new',
    brand: 'Iveco',
    model: 'S-Way 400 PS',
    tonnage: 18,
    price: 104900,
    condition: 100,
    availability: '2 days',
    specifications: {
      enginePower: 'Iveco Cursor 9 – 294 kW (≈ 400 PS)',
      horsepower: 400,
      fuelConsumptionL100km: 28,
      reliability: 'B',
      durability: 8,
      speedKmH: 85,
      maintenanceGroup: 3,
      fuelTankCapacity: 440
    },
    truckCategory: 'Big',
    gcw: 'B'
  },
  {
    id: 'iveco-sway-460-ps',
    type: 'truck',
    category: 'new',
    brand: 'Iveco',
    model: 'S-Way 460 PS',
    tonnage: 18,
    price: 106900,
    condition: 100,
    availability: '3 days',
    specifications: {
      enginePower: 'Iveco Cursor 9 – 294 kW (≈ 420 PS)',
      horsepower: 420,
      fuelConsumptionL100km: 29,
      reliability: 'B',
      durability: 8,
      speedKmH: 85,
      maintenanceGroup: 3,
      fuelTankCapacity: 540
    },
    truckCategory: 'Big',
    gcw: 'B'
  },
  {
    id: 'iveco-sway-500-ps',
    type: 'truck',
    category: 'new',
    brand: 'Iveco',
    model: 'S-Way 500 PS',
    tonnage: 18,
    price: 111900,
    condition: 100,
    availability: '3 days',
    specifications: {
      enginePower: 'XC13 – 368 kW (≈ 500 PS)',
      horsepower: 500,
      fuelConsumptionL100km: 28,
      reliability: 'B',
      durability: 8,
      speedKmH: 88,
      maintenanceGroup: 3,
      fuelTankCapacity: 710
    },
    truckCategory: 'Big',
    gcw: 'B'
  },
  {
    id: 'iveco-sway-570-ps',
    type: 'truck',
    category: 'new',
    brand: 'Iveco',
    model: 'S-Way 570 PS',
    tonnage: 26,
    price: 126900,
    condition: 100,
    availability: '4 days',
    specifications: {
      enginePower: 'Iveco Cursor 13 – 419 kW (≈ 570 PS)',
      horsepower: 570,
      fuelConsumptionL100km: 36,
      reliability: 'B',
      durability: 7,
      speedKmH: 80,
      maintenanceGroup: 3,
      fuelTankCapacity: 760
    },
    truckCategory: 'Big',
    gcw: 'C'
  },

  // ----- Added Valvo truck entries requested (preserve all existing entries above) -----
  {
    id: 'valvo-fm-400',
    type: 'truck',
    category: 'new',
    brand: 'Valvo',
    model: 'FM 400',
    tonnage: 20,
    price: 95600,
    condition: 100,
    availability: '1 day',
    specifications: {
      enginePower: 'Volvo D13 – 294 kW (≈ 400 PS)',
      horsepower: 400,
      fuelConsumptionL100km: 29,
      reliability: 'B',
      durability: 9,
      speedKmH: 80,
      maintenanceGroup: 3,
      fuelTankCapacity: 460
    },
    truckCategory: 'Big',
    gcw: 'A'
  },
  {
    id: 'valvo-fm-460',
    type: 'truck',
    category: 'new',
    brand: 'Valvo',
    model: 'FM 460',
    tonnage: 20,
    price: 108000,
    condition: 100,
    availability: '2 days',
    specifications: {
      enginePower: 'Volvo D13 – 339 kW (≈ 460 PS)',
      horsepower: 460,
      fuelConsumptionL100km: 30,
      reliability: 'B',
      durability: 8,
      speedKmH: 85,
      maintenanceGroup: 3,
      fuelTankCapacity: 490
    },
    truckCategory: 'Big',
    gcw: 'B'
  },
  {
    id: 'valvo-fm-500',
    type: 'truck',
    category: 'new',
    brand: 'Valvo',
    model: 'FM 500',
    tonnage: 20,
    price: 115200,
    condition: 100,
    availability: '3 days',
    specifications: {
      enginePower: 'Volvo D13 – 368 kW (≈ 500 PS)',
      horsepower: 500,
      fuelConsumptionL100km: 31,
      reliability: 'B',
      durability: 9,
      speedKmH: 88,
      maintenanceGroup: 3,
      fuelTankCapacity: 540
    },
    truckCategory: 'Big',
    gcw: 'B'
  },
  {
    id: 'valvo-fm-540',
    type: 'truck',
    category: 'new',
    brand: 'Valvo',
    model: 'FM 540',
    tonnage: 27,
    price: 134100,
    condition: 100,
    availability: '4 days',
    specifications: {
      enginePower: 'Volvo D13 – 388 kW (≈ 540 PS)',
      horsepower: 540,
      fuelConsumptionL100km: 36,
      reliability: 'B',
      durability: 8,
      speedKmH: 80,
      maintenanceGroup: 3,
      fuelTankCapacity: 740
    },
    truckCategory: 'Big',
    gcw: 'C'
  },
  {
    id: 'valvo-fmx-420',
    type: 'truck',
    category: 'new',
    brand: 'Valvo',
    model: 'FMX 420',
    tonnage: 21,
    price: 128900,
    condition: 100,
    availability: '2 days',
    specifications: {
      enginePower: 'D13K420 – 309 kW (≈ 420 PS)',
      horsepower: 420,
      fuelConsumptionL100km: 32,
      reliability: 'B',
      durability: 7,
      speedKmH: 83,
      maintenanceGroup: 3,
      fuelTankCapacity: 600
    },
    truckCategory: 'Big',
    gcw: 'C'
  },
  {
    id: 'valvo-fm-380',
    type: 'truck',
    category: 'new',
    brand: 'Valvo',
    model: 'FM 380',
    tonnage: 20,
    price: 92300,
    condition: 100,
    availability: '2 days',
    specifications: {
      enginePower: 'D11K380 – 280 kW (≈ 380 PS)',
      horsepower: 380,
      fuelConsumptionL100km: 28,
      reliability: 'B',
      durability: 7,
      speedKmH: 80,
      maintenanceGroup: 3,
      fuelTankCapacity: 400
    },
    truckCategory: 'Big',
    gcw: 'A'
  },
  {
    id: 'valvo-fh16-600',
    type: 'truck',
    category: 'new',
    brand: 'Valvo',
    model: 'FH16 600',
    tonnage: 22,
    price: 120900,
    condition: 100,
    availability: '3 days',
    specifications: {
      enginePower: 'Volvo D17 – 441 kW (≈ 600 PS)',
      horsepower: 600,
      fuelConsumptionL100km: 26,
      reliability: 'A',
      durability: 9,
      speedKmH: 87,
      maintenanceGroup: 3,
      fuelTankCapacity: 660
    },
    truckCategory: 'Big',
    gcw: 'B'
  },
  {
    id: 'valvo-fh16-700',
    type: 'truck',
    category: 'new',
    brand: 'Valvo',
    model: 'FH16 700',
    tonnage: 22,
    price: 124900,
    condition: 100,
    availability: '3 days',
    specifications: {
      enginePower: 'Volvo D17 – 515 kW (≈ 700 PS)',
      horsepower: 700,
      fuelConsumptionL100km: 27,
      reliability: 'A',
      durability: 9,
      speedKmH: 93,
      maintenanceGroup: 3,
      fuelTankCapacity: 680
    },
    truckCategory: 'Big',
    gcw: 'B'
  },
  {
    id: 'valvo-fh16-780',
    type: 'truck',
    category: 'new',
    brand: 'Valvo',
    model: 'FH16 780',
    tonnage: 27,
    price: 139900,
    condition: 100,
    availability: '3 days',
    specifications: {
      enginePower: 'Volvo D17 – 574 kW (≈ 780 PS)',
      horsepower: 780,
      fuelConsumptionL100km: 30,
      reliability: 'A',
      durability: 8,
      speedKmH: 85,
      maintenanceGroup: 3,
      fuelTankCapacity: 880
    },
    truckCategory: 'Big',
    gcw: 'C'
  },

  // ----- New Scenia truck entries requested (added below; existing entries preserved) -----
  {
    id: 'scenia-r-280',
    type: 'truck',
    category: 'new',
    brand: 'Scenia',
    model: 'R 280',
    tonnage: 19,
    price: 98700,
    condition: 100,
    availability: '1 day',
    specifications: {
      capacity: 'Tractor unit 19 t+',
      enginePower: 'DC07– 206kW (≈ 280 PS)',
      horsepower: 280,
      fuelConsumptionL100km: 24,
      reliability: 'B',
      durability: 7,
      speedKmH: 80,
      maintenanceGroup: 3,
      fuelTankCapacity: 440,
      gcw: 'A'
    },
    truckCategory: 'Big',
    gcw: 'A'
  },
  {
    id: 'scenia-r-320',
    type: 'truck',
    category: 'new',
    brand: 'Scenia',
    model: 'R 320',
    tonnage: 19,
    price: 101700,
    condition: 100,
    availability: '2 days',
    specifications: {
      capacity: 'Tractor unit 19 t+',
      enginePower: 'DC09– 239kW (≈ 320 PS)',
      horsepower: 320,
      fuelConsumptionL100km: 25,
      reliability: 'B',
      durability: 8,
      speedKmH: 82,
      maintenanceGroup: 3,
      fuelTankCapacity: 480,
      gcw: 'A'
    },
    truckCategory: 'Big',
    gcw: 'A'
  },
  {
    id: 'scenia-r-370',
    type: 'truck',
    category: 'new',
    brand: 'Scenia',
    model: 'R 370',
    tonnage: 19,
    price: 112200,
    condition: 100,
    availability: '2 days',
    specifications: {
      capacity: 'Tractor unit 19 t+',
      enginePower: 'DC13– 272kW (≈ 370 PS)',
      horsepower: 370,
      fuelConsumptionL100km: 26,
      reliability: 'B',
      durability: 8,
      speedKmH: 85,
      maintenanceGroup: 3,
      fuelTankCapacity: 680,
      gcw: 'B'
    },
    truckCategory: 'Big',
    gcw: 'B'
  },
  {
    id: 'scenia-r-400',
    type: 'truck',
    category: 'new',
    brand: 'Scenia',
    model: 'R 400',
    tonnage: 19,
    price: 113600,
    condition: 100,
    availability: '3 days',
    specifications: {
      capacity: 'Tractor unit 19 t+',
      enginePower: 'DC13– 294kW (≈ 400 PS)',
      horsepower: 400,
      fuelConsumptionL100km: 25,
      reliability: 'B',
      durability: 8,
      speedKmH: 87,
      maintenanceGroup: 3,
      fuelTankCapacity: 700,
      gcw: 'B'
    },
    truckCategory: 'Big',
    gcw: 'B'
  },
  {
    id: 'scenia-r-440',
    type: 'truck',
    category: 'new',
    brand: 'Scenia',
    model: 'R 440',
    tonnage: 19,
    price: 116700,
    condition: 100,
    availability: '3 days',
    specifications: {
      capacity: 'Tractor unit 19 t+',
      enginePower: 'DC13– 324kW (≈ 440 PS)',
      horsepower: 440,
      fuelConsumptionL100km: 25,
      reliability: 'B',
      durability: 8,
      speedKmH: 90,
      maintenanceGroup: 3,
      fuelTankCapacity: 720,
      gcw: 'B'
    },
    truckCategory: 'Big',
    gcw: 'B'
  },
  {
    id: 'scenia-r-500',
    type: 'truck',
    category: 'new',
    brand: 'Scenia',
    model: 'R 500',
    tonnage: 19,
    price: 121200,
    condition: 100,
    availability: '2 days',
    specifications: {
      capacity: 'Tractor unit 19 t+',
      enginePower: 'DC13– 373kW (≈ 500 PS)',
      horsepower: 500,
      fuelConsumptionL100km: 26,
      reliability: 'B',
      durability: 9,
      speedKmH: 92,
      maintenanceGroup: 3,
      fuelTankCapacity: 740,
      gcw: 'B'
    },
    truckCategory: 'Big',
    gcw: 'B'
  },
  {
    id: 'scenia-r-560',
    type: 'truck',
    category: 'new',
    brand: 'Scenia',
    model: 'R 560',
    tonnage: 19,
    price: 123000,
    condition: 100,
    availability: '3 days',
    specifications: {
      capacity: 'Tractor unit 19 t+',
      enginePower: 'DC13– 397kW (≈ 560 PS)',
      horsepower: 560,
      fuelConsumptionL100km: 27,
      reliability: 'B',
      durability: 8,
      speedKmH: 95,
      maintenanceGroup: 3,
      fuelTankCapacity: 760,
      gcw: 'B'
    },
    truckCategory: 'Big',
    gcw: 'B'
  },
  {
    id: 'scenia-r-620-6x2',
    type: 'truck',
    category: 'new',
    brand: 'Scenia',
    model: 'R 620 6x2',
    tonnage: 26,
    price: 139000,
    condition: 100,
    availability: '4 days',
    specifications: {
      capacity: 'Tractor unit heavy 26 t+',
      enginePower: 'DC16– 456kW (≈ 620 PS)',
      horsepower: 620,
      fuelConsumptionL100km: 34,
      reliability: 'B',
      durability: 9,
      speedKmH: 83,
      maintenanceGroup: 3,
      fuelTankCapacity: 880,
      gcw: 'C'
    },
    truckCategory: 'Big',
    gcw: 'C'
  }
];