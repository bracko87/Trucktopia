/**
 * src/data/trucks/big.ts
 *
 * Purpose:
 * - Sample big truck entries (> 12 t). These are tractor units able to attach trailers.
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
 * BIG_TRUCKS
 * @description Example tractor units and big trucks (over 12 t). Only these can attach trailers.
 */
export const BIG_TRUCKS: Truck[] = [
  {
    id: 'scania-r450-2025',
    type: 'truck',
    category: 'new',
    brand: 'Scania',
    model: 'R450',
    tonnage: 18,
    price: 95000,
    condition: 100,
    availability: '4 days',
    specifications: {
      capacity: 'Tractor unit 18 t+',
      axles: 2,
      features: ['tractor unit', 'air ride', 'sleeper cab']
    },
    image: 'https://pub-cdn.sider.ai/u/U0KAH9N4VLX/web-coder/68fe87c0584c7e7f606af31d/resource/ff5bf728-19d7-4869-af7c-58722b999232.jpg',
    truckCategory: 'Big'
  },
  {
    id: 'daf-xf-480-2025',
    type: 'truck',
    category: 'new',
    brand: 'DAF',
    model: 'XF 480',
    tonnage: 20,
    price: 98000,
    condition: 100,
    availability: '2 days',
    specifications: {
      capacity: 'Tractor unit heavy haul',
      axles: 3,
      features: ['high torque', 'long haul sleeper']
    },
    image: 'https://pub-cdn.sider.ai/u/U0KAH9N4VLX/web-coder/68fe87c0584c7e7f606af31d/resource/e97b9665-3814-4db3-96be-7189ec6241e7.jpg',
    truckCategory: 'Big'
  }
];