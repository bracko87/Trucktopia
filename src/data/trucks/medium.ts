/**
 * src/data/trucks/medium.ts
 *
 * Purpose:
 * - Sample medium truck entries (7.5 - 12 t).
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
  specifications?: { capacity?: string; axles?: number; features?: string[]; [key: string]: any };
  image?: string;
  truckCategory?: 'Small' | 'Medium' | 'Big';
  [key: string]: any;
}

/**
 * MEDIUM_TRUCKS
 * @description Example medium trucks (7.5 - 12 t). These are single unit trucks used for regional work.
 */
export const MEDIUM_TRUCKS: Truck[] = [

  // New entries added per request

  {
    id: 'ivaco-eurocargo-ml120-usato',
    type: 'truck',
    category: 'new',
    brand: 'Ivaco',
    model: 'EuroCargo ML 120 Usato',
    tonnage: 12,
    price: 68300,
    condition: 78,
    leaseRate: 770,
    availability: 'Used - immediate',
    specifications: {
      capacity: '7 t',
      engine: 'Tector 7 – 6-cylinder, 6.7 L diesel (~160 hp)',
      horsepower: 160,
      fuelConsumptionL100km: 16,
      reliability: 'B',
      durability: 8,
      speedKmH: 90,
      maintenanceGroup: 2,
      cargoTypes: ['Dry Goods', 'Construction Material'],
      axles: 2
    },
    image: undefined,
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
    availability: 'In stock',
    specifications: {
      capacity: '6 t',
      engine: 'Tector 7 – 6-cylinder, 6.7 L diesel, 240 hp (176 kW)',
      horsepower: 240,
      fuelConsumptionL100km: 18,
      reliability: 'B',
      durability: 7,
      speedKmH: 90,
      maintenanceGroup: 2,
      cargoTypes: ['Frozen / Refrigerated'],
      axles: 2
    },
    image: undefined,
    truckCategory: 'Medium'
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
    availability: 'In stock',
    specifications: {
      capacity: '7 t',
      engine: 'Tector 7 – 6-cylinder, 6.7 L diesel, 180 hp (132 kW)',
      horsepower: 180,
      fuelConsumptionL100km: 16,
      reliability: 'B',
      durability: 8,
      speedKmH: 90,
      maintenanceGroup: 2,
      cargoTypes: ['Construction Debris', 'Construction Material', 'Agricultural Bulk', 'Bulk Powder / Cement', 'Waste & Recycling'],
      axles: 2
    },
    image: undefined,
    truckCategory: 'Medium'
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
    availability: 'In stock',
    specifications: {
      capacity: '6 t',
      engine: 'D0836 engine (6-cylinder, 6.9 L) 184 kW (250 PS)',
      horsepower: 250,
      fuelConsumptionL100km: 19,
      reliability: 'B',
      durability: 8,
      speedKmH: 90,
      maintenanceGroup: 2,
      cargoTypes: ['Construction Debris', 'Construction Material'],
      axles: 2
    },
    image: undefined,
    truckCategory: 'Medium'
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
    availability: 'In stock',
    specifications: {
      capacity: '6 t',
      engine: '6.9 L R6 engine (290 hp)',
      horsepower: 290,
      fuelConsumptionL100km: 20,
      reliability: 'B',
      durability: 7,
      speedKmH: 90,
      maintenanceGroup: 3,
      cargoTypes: ['Construction Debris', 'Construction Material'],
      axles: 2
    },
    image: undefined,
    truckCategory: 'Medium'
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
    availability: 'In stock',
    specifications: {
      capacity: '7 t',
      engine: '6.9 L R6 engine (290 hp)',
      horsepower: 290,
      fuelConsumptionL100km: 18,
      reliability: 'A',
      durability: 8,
      speedKmH: 95,
      maintenanceGroup: 2,
      cargoTypes: ['Frozen / Refrigerated'],
      axles: 2
    },
    image: undefined,
    truckCategory: 'Medium'
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
    availability: 'In stock',
    specifications: {
      capacity: '6 t',
      engine: 'P11C-VU 10.52 L Euro 3 6-cyl diesel - 240 hp / 177 kW',
      horsepower: 240,
      fuelConsumptionL100km: 16,
      reliability: 'C',
      durability: 6,
      speedKmH: 95,
      maintenanceGroup: 2,
      cargoTypes: ['Dry Goods', 'Construction Material'],
      axles: 2
    },
    image: undefined,
    truckCategory: 'Medium'
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
    availability: 'In stock',
    specifications: {
      capacity: '7 t',
      engine: 'Euro 6 D0834 / D0836 series - 220 PS',
      horsepower: 220,
      fuelConsumptionL100km: 19,
      reliability: 'B',
      durability: 7,
      speedKmH: 90,
      maintenanceGroup: 2,
      cargoTypes: ['Construction Debris', 'Construction Material', 'Agricultural Bulk', 'Bulk Powder / Cement'],
      axles: 2
    },
    image: undefined,
    truckCategory: 'Medium'
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
    availability: 'In stock',
    specifications: {
      capacity: '7 t',
      engine: 'D8K250 - 250 hp (~184 kW)',
      horsepower: 250,
      torqueNm: 950,
      fuelConsumptionL100km: 18,
      reliability: 'A',
      durability: 8,
      speedKmH: 90,
      maintenanceGroup: 2,
      cargoTypes: ['Dry Goods'],
      axles: 2
    },
    image: undefined,
    truckCategory: 'Medium'
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
    availability: 'In stock',
    specifications: {
      capacity: '6 t',
      engine: 'D5K 240 hp (177 kW), 900 Nm torque',
      horsepower: 240,
      torqueNm: 900,
      fuelConsumptionL100km: 20,
      reliability: 'B',
      durability: 7,
      speedKmH: 90,
      maintenanceGroup: 2,
      cargoTypes: ['Frozen / Refrigerated'],
      axles: 2
    },
    image: undefined,
    truckCategory: 'Medium'
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
    availability: 'In stock',
    specifications: {
      capacity: '6 t',
      engine: 'D5K240 = 177 kW / 900 Nm',
      horsepower: 240,
      torqueNm: 900,
      fuelConsumptionL100km: 17,
      reliability: 'B',
      durability: 7,
      speedKmH: 95,
      maintenanceGroup: 2,
      cargoTypes: ['Dry Goods'],
      axles: 2
    },
    image: undefined,
    truckCategory: 'Medium'
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
    availability: 'In stock',
    specifications: {
      capacity: '6 t',
      engine: 'D8K 280 - 280 PS (≈ 206 kW)',
      horsepower: 280,
      fuelConsumptionL100km: 16,
      reliability: 'A',
      durability: 9,
      speedKmH: 95,
      maintenanceGroup: 2,
      cargoTypes: ['Vehicles'],
      axles: 2
    },
    image: undefined,
    truckCategory: 'Medium'
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
    availability: 'In stock',
    specifications: {
      capacity: '6 t',
      engine: 'DXi5 engine - 161 kW (~220 PS)',
      horsepower: 220,
      fuelConsumptionL100km: 19,
      reliability: 'B',
      durability: 7,
      speedKmH: 90,
      maintenanceGroup: 2,
      cargoTypes: ['Dry Goods', 'Construction Material'],
      axles: 2
    },
    image: undefined,
    truckCategory: 'Medium'
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
    availability: 'In stock',
    specifications: {
      capacity: '6 t',
      engine: 'DXi3 engine - 132 kW (~179.5 PS)',
      horsepower: 179,
      fuelConsumptionL100km: 15,
      reliability: 'B',
      durability: 7,
      speedKmH: 100,
      maintenanceGroup: 2,
      cargoTypes: ['Dry Goods'],
      axles: 2
    },
    image: undefined,
    truckCategory: 'Medium'
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
    availability: 'In stock',
    specifications: {
      capacity: '9000 l',
      engine: 'DXi5 engine - 161 kW (~220 PS)',
      horsepower: 220,
      fuelConsumptionL100km: 20,
      reliability: 'B',
      durability: 8,
      speedKmH: 90,
      maintenanceGroup: 2,
      cargoTypes: ['Liquid - Industrial / Chemical', 'Hazardous Materials', 'Corrosive Chemicals'],
      axles: 2
    },
    image: undefined,
    truckCategory: 'Medium'
  }
];
