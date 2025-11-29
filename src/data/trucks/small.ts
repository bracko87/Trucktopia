/**
 * src/data/trucks/small.ts
 *
 * Purpose:
 * - Small truck entries (3.5 - 7.5 t) used by the Vehicle Market.
 * - Includes extended fields used by driving / maintenance / incident engines:
 *   reliability, durability, speed and maintenanceGroup.
 *
 * Notes:
 * - Availability values set to delivery estimates in days (1 - 4 days).
 */

/**
 * Local Truck shape used in this file.
 * Kept self-contained to avoid circular imports with the aggregator file.
 */
export interface Truck {
  id: string;
  type?: 'truck';
  category: 'new' | 'used';
  brand: string;
  model: string;
  tonnage: number;
  price: number;
  leaseRate?: number;
  condition?: number;
  availability?: string;
  specifications?: {
    capacity?: string;
    axles?: number;
    features?: string[];
    enginePower?: string;
    fuelConsumption?: number;
    cargoTypes?: string[];
    length?: string;
    reliability?:string;
    [key: string]: any;
  };
  image?: string;
  truckCategory?: 'Small' | 'Medium' | 'Big';
  /**
   * Reliability categories:
   * A = very reliable, B = mid reliable, C = not reliable
   */
  reliability?: 'A' | 'B' | 'C';
  /**
   * Durability: 1 (lowest) ... 10 (highest)
   */
  durability?: number;
  /**
   * Speed in km/h; driving engine will use this if present
   */
  speed?: number;
  /**
   * MaintenanceGroup:
   * 1 = low cost, 1 day
   * 2 = mid cost, 1-2 days
   * 3 = expensive, 2-4 days
   */
  maintenanceGroup?: 1 | 2 | 3;
  /**
   * Fuel tank capacity in liters (important for fuel usage engine)
   */
  fuelTankCapacity?: number;
  [key: string]: any;
}

/**
 * SMALL_TRUCKS
 * @description Example new small trucks (3.5 - 7.5 t). Availability set to 1-4 days.
 */
export const SMALL_TRUCKS: Truck[] = [
  {
    id: 'mitsobishi-faso-canter-3.5',
    type: 'truck',
    category: 'new',
    brand: 'Mitsubishi',
    model: 'Faso Canter 3.5 t',
    price: 27000,
    condition: 100,
    availability: '2 days',
    tonnage: 3.5,
    leaseRate: 550,
    truckCategory: 'Small',
    image: 'https://i.ibb.co/bMFg23Qk/faso-35-v3.png',
    specifications: {
      capacity: '2 t',
      enginePower: '3.0 L diesel • ~130 PS / 96 kW',
      fuelConsumption: 6.5,
      reliability: 'B',
      cargoTypes: ['Dry Goods', 'Construction Material', 'Construction Debris', 'Agricultural Bulk']
    },
    durability: 7,
    speed: 120,
    maintenanceGroup: 1,
    fuelTankCapacity: 70
  },
  {
    id: 'mitsobishi-faso-canter-6',
    type: 'truck',
    category: 'new',
    brand: 'Mitsubishi',
    model: 'Faso Canter 6 t',
    price: 32000,
    condition: 100,
    availability: '3 days',
    tonnage: 6,
    leaseRate: 770,
    truckCategory: 'Small',
    image: 'https://i.ibb.co/VcP39yhL/fase-center-6t-v3.png',
    specifications: {
      capacity: '3.5 t',
      enginePower: '3.0 L diesel - 150 PS / 96 kW',
      fuelConsumption: 7.5,
      cargoTypes: [
        'Dry Goods',
        'Construction Material',
        'Agricultural Bulk',
        'Bulk Powder / Cement',
        'Waste & Recycling'
      ]
    },
    reliability: 'B',
    durability: 7,
    speed: 110,
    maintenanceGroup: 2,
    fuelTankCapacity: 100
  },
  {
    id: 'mitsobishi-canter-7c15-eco-hybrid',
    type: 'truck',
    category: 'new',
    brand: 'Mitsubishi',
    model: 'Canter 7c15 Eco-Hybrid',
    price: 48000,
    condition: 100,
    availability: '1 day',
    tonnage: 7.5,
    leaseRate: 930,
    truckCategory: 'Small',
    image: 'https://i.ibb.co/0pCDZXx5/image-1763328824019.png',
    specifications: {
      capacity: '4 t',
      enginePower: '3.0L hybrid - 110 PS/129 kW',
      fuelConsumption: 5.5,
      cargoTypes: ['Dry Goods', 'Construction Material']
    },
    reliability: 'B',
    durability: 6,
    speed: 120,
    maintenanceGroup: 1,
    fuelTankCapacity: 100
  },
  {
    id: 'mitsobishi-faso-canter-tf-75',
    type: 'truck',
    category: 'new',
    brand: 'Mitsubishi',
    model: 'Faso Canter TF 7.5',
    price: 41000,
    condition: 100,
    availability: '2 days',
    tonnage: 7.5,
    leaseRate: 1040,
    truckCategory: 'Small',
    image: 'https://i.ibb.co/bgTRP9Qq/image-1763503802788.png',
    specifications: {
      capacity: '4 t',
      enginePower: '3.0l diesel - 110 kW (150 PS)',
      fuelConsumption: 9.5,
      cargoTypes: ['Frozen / Refrigerated']
    },
    reliability: 'B',
    durability: 7,
    speed: 105,
    maintenanceGroup: 2,
    fuelTankCapacity: 100
  },
  {
    id: 'isuzu-npr75',
    type: 'truck',
    category: 'new',
    brand: 'Isuzu',
    model: 'NPR75',
    price: 32300,
    condition: 100,
    availability: '3 days',
    tonnage: 7.5,
    leaseRate: 980,
    truckCategory: 'Small',
    image: 'https://i.ibb.co/cSCW6bzt/image-1763504014318.png',
    specifications: {
      capacity: '3.5 t',
      enginePower: '5.2l diesel - 140 kW (≈ 190 PS)',
      fuelConsumption: 11,
      cargoTypes: [
        'Dry Goods',
        'Construction Material',
        'Agricultural Bulk',
        'Bulk Powder / Cement',
        'Waste & Recycling'
      ]
    },
    reliability: 'C',
    durability: 6,
    speed: 105,
    maintenanceGroup: 2,
    fuelTankCapacity: 100
  },
  {
    id: 'isuzu-npr-6000l',
    type: 'truck',
    category: 'new',
    brand: 'Isuzu',
    model: '4×2 NPR 6000 L',
    price: 48500,
    condition: 100,
    availability: '4 days',
    tonnage: 7,
    leaseRate: 900,
    truckCategory: 'Small',
    image: 'https://i.ibb.co/YT7jJMJP/image-1763328853870.png',
    specifications: {
      capacity: '6000 L',
      enginePower: '4KB1-TCG60 - 140 kW (≈ 190 PS)',
      fuelConsumption: 10,
      cargoTypes: ['Liquid - Industrial / Chemical', 'Hazardous Materials']
    },
    reliability: 'C',
    durability: 5,
    speed: 100,
    maintenanceGroup: 3,
    fuelTankCapacity: 100
  },
  {
    id: 'isuzu-n-series-35-m27',
    type: 'truck',
    category: 'new',
    brand: 'Isuzu',
    model: 'N-Series 3.5 t (M27)',
    price: 26000,
    condition: 100,
    availability: '1 day',
    tonnage: 3.5,
    leaseRate: 640,
    truckCategory: 'Small',
    image: 'https://i.ibb.co/vxjjFH45/image-1763212196433.png',
    specifications: {
      capacity: '2 t',
      enginePower: 'M27 Euro 4 - 110 kW (≈ 150 PS)',
      fuelConsumption: 7,
      cargoTypes: ['Dry Goods']
    },
    reliability: 'C',
    durability: 6,
    speed: 100,
    maintenanceGroup: 1,
    fuelTankCapacity: 75
  },
  {
    id: 'ivaco-daily-70c17',
    type: 'truck',
    category: 'new',
    brand: 'Ivaco',
    model: 'Daily 70C17',
    price: 32000,
    condition: 100,
    availability: '2 days',
    tonnage: 7,
    leaseRate: 980,
    truckCategory: 'Small',
    image: 'https://i.ibb.co/Z16qwSDm/image-1763328924961.png',
    specifications: {
      capacity: '3.5 t',
      enginePower: '3.0l diesel - 125 kW (≈ 170 PS)',
      fuelConsumption: 9,
      cargoTypes: ['Dry Goods']
    },
    reliability: 'B',
    durability: 8,
    speed: 120,
    maintenanceGroup: 2,
    fuelTankCapacity: 90
  },

  /* ------------------ Additional entries (second part) ------------------ */

  {
    id: 'ivaco-daily-72c18-doppelstock-2',
    type: 'truck',
    category: 'new',
    brand: 'Ivaco',
    model: 'Daily 72C18 Doppelstock 2',
    price: 43700,
    condition: 100,
    availability: '2 days',
    tonnage: 7.2,
    leaseRate: 1200,
    truckCategory: 'Small',
    image: 'https://i.ibb.co/NgfkPFbx/image-1763504167012.png',
    specifications: {
      capacity: '4 t',
      enginePower: '3.0l diesel - 132 kW / 180 PS',
      fuelConsumption: 8,
      cargoTypes: ['Vehicles']
    },
    reliability: 'B',
    durability: 8,
    speed: 90,
    maintenanceGroup: 2,
    fuelTankCapacity: 90
  },
  {
    id: 'ivaco-daily-35c14-flatbed',
    type: 'truck',
    category: 'new',
    brand: 'Ivaco',
    model: 'Daily 35C14 Flatbed',
    price: 23000,
    condition: 100,
    availability: '1 day',
    tonnage: 3.5,
    leaseRate: 600,
    truckCategory: 'Small',
    image: 'https://i.ibb.co/LzVD1fW0/image-1763212532563.png',
    specifications: {
      capacity: '1.5 t',
      enginePower: '2.3l diesel - 100 kW (136 PS)',
      fuelConsumption: 6,
      cargoTypes: ['Construction Material', 'Construction Debris']
    },
    reliability: 'B',
    durability: 7,
    speed: 120,
    maintenanceGroup: 1,
    fuelTankCapacity: 75
  },
  {
    id: 'renualt-mater-ll35',
    type: 'truck',
    category: 'new',
    brand: 'Renualt',
    model: 'Mater LL35',
    price: 27500,
    condition: 100,
    availability: '1 day',
    tonnage: 3.5,
    leaseRate: 650,
    truckCategory: 'Small',
    image: 'https://i.ibb.co/SSzR5Xk/image-1763212875447.png',
    specifications: {
      capacity: '2 t',
      enginePower: 'dCi 110 E6 - 100 kW (136 PS)',
      fuelConsumption: 7,
      cargoTypes: ['Construction Material', 'Agricultural Bulk']
    },
    reliability: 'A',
    durability: 8,
    speed: 100,
    maintenanceGroup: 1,
    fuelTankCapacity: 80
  },
  {
    id: 'renualt-mater-145-4x2',
    type: 'truck',
    category: 'new',
    brand: 'Renualt',
    model: 'Mater 145 4x2',
    price: 43000,
    condition: 100,
    availability: '2 days',
    tonnage: 7,
    leaseRate: 1100,
    truckCategory: 'Small',
    image: 'https://i.ibb.co/3Yf9gpMz/image-1763504276593.png',
    specifications: {
      capacity: '4 t',
      enginePower: '2.3l dCi - 107 kW (145 PS)',
      fuelConsumption: 9.5,
      cargoTypes: ['Dry Goods', 'Construction Material']
    },
    reliability: 'A',
    durability: 7,
    speed: 120,
    maintenanceGroup: 2,
    fuelTankCapacity: 80
  },
  {
    id: 'men-tge-3-180-koffer',
    type: 'truck',
    category: 'new',
    brand: 'MEN',
    model: 'TGE 3.180 Koffer',
    price: 22300,
    condition: 100,
    availability: '1 day',
    tonnage: 3.5,
    leaseRate: 520,
    truckCategory: 'Small',
    image: 'https://i.ibb.co/20dqr61t/men-tge-3180-v3.png',
    specifications: {
      capacity: '1.5 t',
      enginePower: '1,968 cm³ (2.0 l) • 130 kW (≈ 177 PS)',
      fuelConsumption: 6.5,
      cargoTypes: ['Dry Goods', 'Construction Material']
    },
    reliability: 'A',
    durability: 8,
    speed: 120,
    maintenanceGroup: 1,
    fuelTankCapacity: 75
  },
  {
    id: 'men-tge-5-180-kipper',
    type: 'truck',
    category: 'new',
    brand: 'MEN',
    model: 'TGE 5.180 Kipper',
    price: 29500,
    condition: 100,
    availability: '3 days',
    tonnage: 5.5,
    leaseRate: 780,
    truckCategory: 'Small',
    image: 'https://i.ibb.co/F4Z2ss9C/image-1763329016003.png',
    specifications: {
      capacity: '3 t',
      enginePower: '2.0 L diesel - 130 kW (≈ 177 PS)',
      fuelConsumption: 10,
      cargoTypes: ['Construction Debris', 'Construction Material', 'Agricultural Bulk', 'Waste & Recycling']
    },
    reliability: 'A',
    durability: 7,
    speed: 110,
    maintenanceGroup: 1,
    fuelTankCapacity: 75
  },
  {
    id: 'marcedes-atego-818',
    type: 'truck',
    category: 'new',
    brand: 'Marcedes Benz',
    model: 'Atego 818',
    price: 44100,
    condition: 100,
    availability: '2 days',
    tonnage: 7.5,
    leaseRate: 1250,
    truckCategory: 'Small',
    image: 'https://i.ibb.co/HDgFvFdw/image-1763591853006.png',
    specifications: {
      capacity: '4 t',
      enginePower: '5.1l Euro 6 - 130 kW (~177 PS)',
      fuelConsumption: 9,
      cargoTypes: ['Dry Goods', 'Construction Material']
    },
    reliability: 'A',
    durability: 9,
    speed: 90,
    maintenanceGroup: 2,
    fuelTankCapacity: 140
  },
  {
    id: 'marcedes-atego-818-tanker',
    type: 'truck',
    category: 'new',
    brand: 'Marcedes Benz',
    model: 'Atego 818 Tanker',
    price: 45300,
    condition: 100,
    availability: '3 days',
    tonnage: 7.5,
    leaseRate: 1320,
    truckCategory: 'Small',
    image: 'https://i.ibb.co/S702NNr7/image-1763329182134.png',
    specifications: {
      capacity: '5000 L',
      enginePower: '130 kW (~177 PS)',
      fuelConsumption: 10,
      cargoTypes: ['Liquid - Industrial / Chemical', 'Hazardous Materials']
    },
    reliability: 'A',
    durability: 8,
    speed: 90,
    maintenanceGroup: 2,
    fuelTankCapacity: 160
  },
  {
    id: 'heno-xzu720',
    type: 'truck',
    category: 'new',
    brand: 'Heno',
    model: 'XZU720',
    price: 31500,
    condition: 100,
    availability: '2 days',
    tonnage: 7.5,
    leaseRate: 920,
    truckCategory: 'Small',
    image: 'https://i.ibb.co/7d764gJJ/image-1763417711119.png',
    specifications: {
      capacity: '3.5 t',
      enginePower: 'N04C - 150 PS (~110 kW)',
      fuelConsumption: 10,
      cargoTypes: ['Dry Goods', 'Construction Material']
    },
    reliability: 'C',
    durability: 5,
    speed: 100,
    maintenanceGroup: 2,
    fuelTankCapacity: 100
  },
  {
    id: 'fow-f914',
    type: 'truck',
    category: 'new',
    brand: 'FOW',
    model: 'F-914',
    price: 41900,
    condition: 100,
    availability: '3 days',
    tonnage: 7,
    leaseRate: 1180,
    truckCategory: 'Small',
    image: 'https://i.ibb.co/hw0sRT3/image-1763503965853.png',
    specifications: {
      capacity: '4 t',
      enginePower: 'CA4DB1 series - 150 PS (~110 kW)',
      fuelConsumption: 12,
      cargoTypes: ['Construction Material', 'Construction Debris', 'Waste & Recycling']
    },
    reliability: 'B',
    durability: 6,
    speed: 100,
    maintenanceGroup: 2,
    fuelTankCapacity: 100
  },
  {
    id: 'heno-300-series-5t',
    type: 'truck',
    category: 'new',
    brand: 'Heno',
    model: '300 Series',
    price: 29000,
    condition: 100,
    availability: '2 days',
    tonnage: 5.5,
    leaseRate: 860,
    truckCategory: 'Small',
    image: 'https://i.ibb.co/tTNRjYDp/image-1763417691681.png',
    specifications: {
      capacity: '3.0 t',
      enginePower: 'N04C-WL • ~150 PS (~110 kW)',
      fuelConsumption: 10,
      cargoTypes: ['Dry Goods', 'Construction Material']
    },
    reliability: 'C',
    durability: 6,
    speed: 105,
    maintenanceGroup: 1,
    fuelTankCapacity: 85
  },
  {
    id: 'renualt-maxity',
    type: 'truck',
    category: 'new',
    brand: 'Renualt',
    model: 'Maxity',
    price: 26400,
    condition: 100,
    availability: '1 day',
    tonnage: 4.5,
    leaseRate: 620,
    truckCategory: 'Small',
    image: 'https://i.ibb.co/0VrzgjrN/image-1763417776207.png',
    specifications: {
      capacity: '2 t',
      enginePower: '2.5 L DXi2.5 • ~110 PS (82 kW)',
      fuelConsumption: 8,
      cargoTypes: ['Dry Goods']
    },
    reliability: 'A',
    durability: 7,
    speed: 95,
    maintenanceGroup: 1,
    fuelTankCapacity: 65
  },
  {
    id: 'marcedes-atego-815',
    type: 'truck',
    category: 'new',
    brand: 'Marcedes Benz',
    model: 'Atego 815',
    price: 36300,
    condition: 100,
    availability: '2 days',
    tonnage: 7.5,
    leaseRate: 980,
    truckCategory: 'Small',
    image: 'https://i.ibb.co/4ZPXdMjM/image-1763503735439.png',
    specifications: {
      capacity: '3.5 t',
      enginePower: '4 cyl diesel - 112 kW (≈150 PS)',
      fuelConsumption: 11,
      cargoTypes: ['Dry Goods', 'Construction Material']
    },
    reliability: 'A',
    durability: 8,
    speed: 90,
    maintenanceGroup: 2,
    fuelTankCapacity: 140
  },
  {
    id: 'marcedes-atego-812',
    type: 'truck',
    category: 'new',
    brand: 'Marcedes Benz',
    model: 'Atego 812',
    price: 31000,
    condition: 100,
    availability: '3 days',
    tonnage: 7.5,
    leaseRate: 920,
    truckCategory: 'Small',
    image: 'https://i.ibb.co/QFVr9Lb3/image-1763417653745.png',
    specifications: {
      capacity: '3.0 t',
      enginePower: 'OM 904 LA - 90 kW (≈122 PS)',
      fuelConsumption: 10.5,
      cargoTypes: ['Construction Debris', 'Construction Material', 'Agricultural Bulk']
    },
    reliability: 'A',
    durability: 9,
    speed: 90,
    maintenanceGroup: 2,
    fuelTankCapacity: 100
  },
  {
    id: 'marcedes-atego-822r',
    type: 'truck',
    category: 'new',
    brand: 'Marcedes Benz',
    model: 'Atego 822R',
    price: 45800,
    condition: 100,
    availability: '4 days',
    tonnage: 7.5,
    leaseRate: 1400,
    truckCategory: 'Small',
    image: 'https://i.ibb.co/Df0gjDqm/image-1763591527784.png',
    specifications: {
      capacity: '3.5 t',
      enginePower: 'OM 924LA - 160 kW (≈218 PS)',
      fuelConsumption: 13,
      cargoTypes: ['Frozen / Refrigerated']
    },
    reliability: 'A',
    durability: 8,
    speed: 90,
    maintenanceGroup: 1,
    fuelTankCapacity: 160
  },
  {
    id: 'renualt-master-frigo',
    type: 'truck',
    category: 'new',
    brand: 'Renualt',
    model: 'Master Frigo',
    price: 28200,
    condition: 100,
    availability: '1 day',
    tonnage: 3.5,
    leaseRate: 580,
    truckCategory: 'Small',
    image: 'https://i.ibb.co/QFVmyjSF/image-1763417736567.png',
    specifications: {
      capacity: '1.5 t',
      enginePower: '2.3 dCi - 145 PS (≈ 107 kW)',
      fuelConsumption: 9,
      cargoTypes: ['Frozen / Refrigerated']
    },
    reliability: 'B',
    durability: 7,
    speed: 100,
    maintenanceGroup: 1,
    fuelTankCapacity: 80
  }
];