/**
 * src/data/trucks/medium.ts
 *
 * Purpose:
 * - Centralized medium truck dataset (7.5 - 12 t).
 * - Exports a Truck interface and MEDIUM_TRUCKS array used by market pages.
 *
 * Notes:
 * - This file only contains data. UI, layout and components remain unchanged.
 * - Fuel tank capacities were added for specific medium truck entries as requested.
 */

/**
 * TruckSpecifications
 * @description Optional detailed technical specs for a truck.
 */
export interface TruckSpecifications {
  /** Cargo capacity in tonnes or liters (string or number) */
  capacity?: number | string;
  /** Engine displacement and power description */
  enginePower?: string;
  /** Fuel consumption in L/100 km */
  fuelConsumption?: number;
  /** Supported cargo types */
  cargoTypes?: string[];
  /** Additional freeform notes */
  notes?: string;
  /** Horsepower / kW extracted for sorting or engine sim */
  horsepower?: number;
  /** Speed in km/h */
  speedKmH?: number;
  /** Reliability category A|B|C */
  reliability?: 'A' | 'B' | 'C';
  /** Durability numeric score 1-10 */
  durability?: number;
  /** Maintenance group (1|2|3) */
  maintenanceGroup?: 1 | 2 | 3;
  [key: string]: any;
  /** Fuel tank capacity in liters (optional) */
  fuelTankCapacity?: number;
}

/**
 * Truck
 * @description Data shape for a medium truck used in the marketplace UI.
 */
export interface Truck {
  id: string;
  type: 'truck';
  category: 'new' | 'used';
  brand: string;
  model: string;
  tonnage: number;
  /** Price in USD (integer) */
  price: number;
  leaseRate?: number;
  condition?: number;
  availability?: string;
  specifications?: TruckSpecifications;
  image?: string | undefined;
  truckCategory?: 'Small' | 'Medium' | 'Big';
  /** Fuel tank capacity in liters (added where applicable) */
  fuelTankCapacity?: number;
  [key: string]: any;
}

/**
 * MEDIUM_TRUCKS
 * @description Array of medium truck entries (7.5 - 12 t). These are used by marketplace listings.
 */
export const MEDIUM_TRUCKS: Truck[] = [

  /**
   * Newly added entries (requested)
   */

  {
    id: 'candor-mk11-280',
    type: 'truck',
    category: 'new',
    brand: 'Candor',
    model: 'MK 11 280',
    tonnage: 11,
    price: 60100, // USD
    condition: 100,
    leaseRate: 740,
    availability: '2 days',
    specifications: {
      capacity: '5 t',
      enginePower: 'GH7TB - 260 kW (~280 PS)',
      horsepower: 280,
      fuelConsumption: 18,
      reliability: 'C',
      durability: 6,
      speedKmH: 110,
      maintenanceGroup: 2,
      cargoTypes: ['Vehicles', 'Construction Material'],
      axles: 2
    },
    image: 'https://i.ibb.co/VcN6dfFx/candor-v3.png',
    truckCategory: 'Medium',
    fuelTankCapacity: 160
  },

  {
    id: 'mercedes-atego-1218',
    type: 'truck',
    category: 'new',
    brand: 'Mercedes-Benz',
    model: 'Atego 1218',
    tonnage: 12,
    price: 68900, // USD
    condition: 100,
    leaseRate: 780,
    availability: '1 Day',
    specifications: {
      capacity: '6 t',
      enginePower: 'Euro 4 Diesel MBS - 132 kW (~180 PS)',
      horsepower: 180,
      fuelConsumption: 21,
      reliability: 'A',
      durability: 8,
      speedKmH: 90,
      maintenanceGroup: 2,
      cargoTypes: ['Dry Goods'],
      axles: 2
    },
    image: 'https://i.ibb.co/RMhwpDz/atego-1218-v3.png',
    truckCategory: 'Medium',
    fuelTankCapacity: 180
  },

  {
    id: 'mercedes-atego-1221',
    type: 'truck',
    category: 'new',
    brand: 'Mercedes-Benz',
    model: 'Atego 1221',
    tonnage: 12,
    price: 71700, // USD
    condition: 100,
    leaseRate: 800,
    availability: '3 Days',
    specifications: {
      capacity: '6 t',
      enginePower: 'OM 934 – 155 kW (~210 PS)',
      horsepower: 210,
      fuelConsumption: 22,
      reliability: 'A',
      durability: 8,
      speedKmH: 100,
      maintenanceGroup: 2,
      cargoTypes: ['Frozen / Refrigerated'],
      axles: 2
    },
    image: undefined,
    truckCategory: 'Medium',
    fuelTankCapacity: 200
  },

  {
    id: 'mercedes-atego-1224',
    type: 'truck',
    category: 'new',
    brand: 'Mercedes-Benz',
    model: 'Atego 1224',
    tonnage: 12,
    price: 68900, // USD
    condition: 100,
    leaseRate: 800,
    availability: '3 Days',
    specifications: {
      capacity: '6 t',
      enginePower: 'Euro 6 OM 936 - 175 kW (~238 PS)',
      horsepower: 238,
      fuelConsumption: 21,
      reliability: 'A',
      durability: 9,
      speedKmH: 95,
      maintenanceGroup: 2,
      cargoTypes: ['Dry Goods'],
      axles: 2
    },
    image: 'https://i.ibb.co/svXk3hfM/atego-1224-v3.png',
    truckCategory: 'Medium',
    fuelTankCapacity: 200
  },

  {
    id: 'def-lf-180',
    type: 'truck',
    category: 'new',
    brand: 'DEF',
    model: 'LF 180',
    tonnage: 12,
    price: 69900, // USD
    condition: 100,
    leaseRate: 770,
    availability: '4 Days',
    specifications: {
      capacity: '6 t',
      enginePower: 'Euro 6 PX-5 - 135 kW (~180 PS)',
      horsepower: 180,
      fuelConsumption: 17,
      reliability: 'B',
      durability: 7,
      speedKmH: 100,
      maintenanceGroup: 2,
      cargoTypes: ['Dry Goods'],
      axles: 2
    },
    image: 'https://i.ibb.co/LD62D3Qw/def-lf-180-v3.png',
    truckCategory: 'Medium',
    fuelTankCapacity: 140
  },

  {
    id: 'def-lf-210',
    type: 'truck',
    category: 'new',
    brand: 'DEF',
    model: 'LF 210',
    tonnage: 12,
    price: 63900, // USD
    condition: 100,
    leaseRate: 760,
    availability: '2 Days',
    specifications: {
      capacity: '6 t',
      enginePower: 'Euro 6 - 157 kW (~213 PS)',
      horsepower: 213,
      fuelConsumption: 18,
      reliability: 'B',
      durability: 7,
      speedKmH: 90,
      maintenanceGroup: 2,
      cargoTypes: ['Construction Debris', 'Construction Material'],
      axles: 2
    },
    image: 'https://i.ibb.co/6CBxyB8/def-lf-210-v3.png',
    truckCategory: 'Medium',
    fuelTankCapacity: 120
  },

  {
    id: 'faton-f12',
    type: 'truck',
    category: 'new',
    brand: 'Faton',
    model: 'F12',
    tonnage: 12,
    price: 61900, // USD
    condition: 100,
    leaseRate: 750,
    availability: '1 Day',
    specifications: {
      capacity: '6 t',
      enginePower: 'Cummins 4.5l diesel - 132 kW (~136 PS)',
      horsepower: 136,
      fuelConsumption: 16,
      reliability: 'C',
      durability: 6,
      speedKmH: 100,
      maintenanceGroup: 2,
      cargoTypes: ['Construction Debris', 'Construction Material'],
      axles: 2
    },
    image: 'https://i.ibb.co/xt4SB1qt/faton-f12-v3.png',
    truckCategory: 'Medium',
    fuelTankCapacity: 160
  },

  /**
   * Preserved existing dataset entries (kept for compatibility).
   * If any duplicates exist you can instruct me to remove or deduplicate.
   */

  {
    id: 'ivaco-eurocargo-ml120-usato',
    type: 'truck',
    category: 'new',
    brand: 'Ivaco',
    model: 'EuroCargo ML 120 Usato',
    tonnage: 12,
    price: 68300,
    condition: 100,
    leaseRate: 770,
    availability: '3 Days',
    specifications: {
      capacity: '7 t',
      enginePower: 'Tector7 diesel - 205kW (279 PS)',
      horsepower: 160,
      fuelConsumption: 16,
      reliability: 'B',
      durability: 8,
      speedKmH: 90,
      maintenanceGroup: 2,
      cargoTypes: ['Dry Goods', 'Construction Material'],
      axles: 2
    },
    image: 'https://i.ibb.co/8DGjhT83/ivaco-ml-120-v3.png',
    truckCategory: 'Medium'
  },

  {
    id: 'ivaco-eurocargo-ml120e24',
    type: 'truck',
    category: 'new',
    brand: 'Ivaco',
    model: 'EuroCargo ML 120E24',
    tonnage: 12,
    price: 71100,
    condition: 100,
    leaseRate: 770,
    availability: '1 Day',
    specifications: {
      capacity: '6 t',
      enginePower: 'Tector 7 diesel - 240 hp (176 kW)',
      horsepower: 240,
      fuelConsumption: 18,
      reliability: 'B',
      durability: 7,
      speedKmH: 90,
      maintenanceGroup: 2,
      cargoTypes: ['Frozen / Refrigerated'],
      axles: 2
    },
    image: undefined,
    truckCategory: 'Medium',
    fuelTankCapacity: 190
  },

  {
    id: 'ivaco-eurocargo-ml120e18',
    type: 'truck',
    category: 'new',
    brand: 'Ivaco',
    model: 'EuroCargo ML 120E18',
    tonnage: 12,
    price: 67000,
    condition: 100,
    leaseRate: 770,
    availability: '2 Days',
    specifications: {
      capacity: '7 t',
      enginePower: 'Tector 7 - 180 hp (132 kW)',
      horsepower: 180,
      fuelConsumption: 16,
      reliability: 'B',
      durability: 8,
      speedKmH: 90,
      maintenanceGroup: 2,
      cargoTypes: ['Construction Debris', 'Construction Material', 'Agricultural Bulk', 'Bulk Powder / Cement', 'Waste & Recycling'],
      axles: 2
    },
    image: 'https://i.ibb.co/Lh56QkWG/ivaco-120e18-v3.png',
    truckCategory: 'Medium',
    fuelTankCapacity: 190
  },

  {
    id: 'men-tgm-12-250-kipper',
    type: 'truck',
    category: 'new',
    brand: 'MEN',
    model: 'TGM 12.250 Kipper',
    tonnage: 12,
    price: 64000,
    condition: 100,
    leaseRate: 770,
    availability: '4 Days',
    specifications: {
      capacity: '6 t',
      enginePower: 'D0836 engine - 184 kW (250 PS)',
      horsepower: 250,
      fuelConsumption: 19,
      reliability: 'B',
      durability: 8,
      speedKmH: 90,
      maintenanceGroup: 2,
      cargoTypes: ['Construction Debris', 'Construction Material'],
      axles: 2
    },
    image: 'https://i.ibb.co/d0v00ZzK/men-tgm-12-250-v3.png',
    truckCategory: 'Medium',
    fuelTankCapacity: 200
  },

  {
    id: 'men-tgm-12-290-bl',
    type: 'truck',
    category: 'new',
    brand: 'MEN',
    model: 'TGM 12.290 BL',
    tonnage: 12,
    price: 69900,
    condition: 100,
    leaseRate: 770,
    availability: '2 Days',
    specifications: {
      capacity: '6 t',
      enginePower: 'R6 engine - 213 kW (290 PS)',
      horsepower: 290,
      fuelConsumption: 20,
      reliability: 'B',
      durability: 7,
      speedKmH: 90,
      maintenanceGroup: 3,
      cargoTypes: ['Construction Debris', 'Construction Material'],
      axles: 2
    },
    image: 'https://i.ibb.co/4nPYjsWG/man-12290-bl-v3.png',
    truckCategory: 'Medium',
    fuelTankCapacity: 200
  },

  {
    id: 'men-tgm-12-290-ll',
    type: 'truck',
    category: 'new',
    brand: 'MEN',
    model: 'TGM 12.290 LL',
    tonnage: 12,
    price: 70900,
    condition: 100,
    leaseRate: 770,
    availability: '1 Days',
    specifications: {
      capacity: '7 t',
      enginePower: 'R6 engine - 213 kW (290 PS)',
      horsepower: 290,
      fuelConsumption: 18,
      reliability: 'A',
      durability: 8,
      speedKmH: 95,
      maintenanceGroup: 2,
      cargoTypes: ['Frozen / Refrigerated'],
      axles: 2
    },
    image: 'https://i.ibb.co/QvqP8YNb/man-12290-LL-v3.png',
    truckCategory: 'Medium',
    fuelTankCapacity: 200
  },

  {
    id: 'heno-ranger-500',
    type: 'truck',
    category: 'new',
    brand: 'Heno',
    model: 'Ranger 500',
    tonnage: 11,
    price: 65500,
    condition: 100,
    leaseRate: 770,
    availability: '2 Days',
    specifications: {
      capacity: '6 t',
      enginePower: 'P11C-VU diesel - 240 hp/177 kW',
      horsepower: 240,
      fuelConsumption: 16,
      reliability: 'C',
      durability: 6,
      speedKmH: 95,
      maintenanceGroup: 2,
      cargoTypes: ['Dry Goods', 'Construction Material'],
      axles: 2
    },
    image: 'https://i.ibb.co/KYvrJC7/heno-500-v3.png',
    truckCategory: 'Medium',
    fuelTankCapacity: 200
  },

  {
    id: 'men-tgm-12-190-4x2',
    type: 'truck',
    category: 'new',
    brand: 'MEN',
    model: 'TGM 12.190 (4x2)',
    tonnage: 12,
    price: 62500,
    condition: 100,
    leaseRate: 770,
    availability: '1 Day',
    specifications: {
      capacity: '7 t',
      enginePower: 'Euro 6 D0834s - 141.7kW (190 PS)',
      horsepower: 220,
      fuelConsumption: 19,
      reliability: 'B',
      durability: 7,
      speedKmH: 90,
      maintenanceGroup: 2,
      cargoTypes: ['Construction Debris', 'Construction Material', 'Agricultural Bulk', 'Bulk Powder / Cement'],
      axles: 2
    },
    image: 'https://i.ibb.co/hRdgwS7j/men-tgm-12-190-v3.png',
    truckCategory: 'Medium',
    fuelTankCapacity: 200
  },

  {
    id: 'valvo-fl250-12',
    type: 'truck',
    category: 'new',
    brand: 'Valvo',
    model: 'FL 250.12',
    tonnage: 12,
    price: 70000,
    condition: 100,
    leaseRate: 770,
    availability: '3 Days',
    specifications: {
      capacity: '7 t',
      enginePower: 'D8K250 - 250 hp (~184 kW)',
      horsepower: 250,
      fuelConsumption: 18,
      reliability: 'A',
      durability: 8,
      speedKmH: 90,
      maintenanceGroup: 2,
      cargoTypes: ['Dry Goods'],
      axles: 2
    },
    image: 'https://i.ibb.co/qM3Mg7Ls/volvo-250-12-v3.png',
    truckCategory: 'Medium',
    fuelTankCapacity: 200
  },

  {
    id: 'valvo-fl240-12',
    type: 'truck',
    category: 'new',
    brand: 'Valvo',
    model: 'FL 240.12',
    tonnage: 12,
    price: 72000,
    condition: 100,
    leaseRate: 770,
    availability: '2 Days',
    specifications: {
      capacity: '6 t',
      enginePower: 'D5K 900Nm - 240 hp (177 kW), ',
      horsepower: 240,
      fuelConsumption: 20,
      reliability: 'B',
      durability: 7,
      speedKmH: 90,
      maintenanceGroup: 2,
      cargoTypes: ['Frozen / Refrigerated'],
      axles: 2
    },
    image: undefined,
    truckCategory: 'Medium',
    fuelTankCapacity: 200
  },

  {
    id: 'valvo-fl220-12',
    type: 'truck',
    category: 'new',
    brand: 'Valvo',
    model: 'FL 220.12',
    tonnage: 12,
    price: 65000,
    condition: 100,
    leaseRate: 770,
    availability: '1 Day',
    specifications: {
      capacity: '6 t',
      enginePower: 'D5K240 - 162 kW (220 PS)',
      horsepower: 240,
      fuelConsumption: 17,
      reliability: 'B',
      durability: 7,
      speedKmH: 95,
      maintenanceGroup: 2,
      cargoTypes: ['Dry Goods'],
      axles: 2
    },
    image: 'https://i.ibb.co/3Y1zPQZz/valvo-220-12-v3.png',
    truckCategory: 'Medium',
    fuelTankCapacity: 200
  },

  {
    id: 'valvo-fl280-12',
    type: 'truck',
    category: 'new',
    brand: 'Valvo',
    model: 'FL 280.12',
    tonnage: 12,
    price: 73500,
    condition: 100,
    leaseRate: 770,
    availability: '3 Days',
    specifications: {
      capacity: '6 t',
      enginePower: 'D8K 280 - 280 PS (≈ 206 kW)',
      horsepower: 280,
      fuelConsumption: 16,
      reliability: 'A',
      durability: 9,
      speedKmH: 95,
      maintenanceGroup: 2,
      cargoTypes: ['Vehicles'],
      axles: 2
    },
    image: undefined,
    truckCategory: 'Medium',
    fuelTankCapacity: 200
  },

  {
    id: 'renualt-midlum-220-12',
    type: 'truck',
    category: 'new',
    brand: 'Renualt',
    model: 'Midlum 220.12',
    tonnage: 12,
    price: 66500,
    condition: 100,
    leaseRate: 770,
    availability: '4 Days',
    specifications: {
      capacity: '6 t',
      enginePower: 'DXi5 engine - 161 kW (~220 PS)',
      horsepower: 220,
      fuelConsumption: 19,
      reliability: 'B',
      durability: 7,
      speedKmH: 90,
      maintenanceGroup: 2,
      cargoTypes: ['Dry Goods', 'Construction Material'],
      axles: 2
    },
    image: 'https://i.ibb.co/ymKfZTqC/220-12-v3.png',
    truckCategory: 'Medium',
    fuelTankCapacity: 190
  },

  {
    id: 'renualt-midlum-180-dci',
    type: 'truck',
    category: 'new',
    brand: 'Renualt',
    model: 'Midlum 180 dci',
    tonnage: 10,
    price: 67600,
    condition: 100,
    leaseRate: 770,
    availability: '1 Day',
    specifications: {
      capacity: '6 t',
      enginePower: 'DXi3 engine - 132 kW (~179.5 PS)',
      horsepower: 179,
      fuelConsumption: 15,
      reliability: 'B',
      durability: 7,
      speedKmH: 100,
      maintenanceGroup: 2,
      cargoTypes: ['Dry Goods'],
      axles: 2
    },
    image: 'https://i.ibb.co/whkKDZ7j/midlum-180-v3.png',
    truckCategory: 'Medium',
    fuelTankCapacity: 190
  },

  {
    id: 'renualt-midlum-220-dxi-tanker',
    type: 'truck',
    category: 'new',
    brand: 'Renualt',
    model: 'Midlum 220 dxi (tanker)',
    tonnage: 12,
    price: 72900,
    condition: 100,
    leaseRate: 770,
    availability: '3 Days',
    specifications: {
      capacity: '9000 l',
      enginePower: 'DXi5 engine - 161 kW (~220 PS)',
      horsepower: 220,
      fuelConsumption: 20,
      reliability: 'B',
      durability: 8,
      speedKmH: 90,
      maintenanceGroup: 2,
      cargoTypes: ['Liquid - Industrial / Chemical', 'Hazardous Materials', 'Corrosive Chemicals'],
      axles: 2
    },
    image: undefined,
    truckCategory: 'Medium',
    fuelTankCapacity: 220
  }

];