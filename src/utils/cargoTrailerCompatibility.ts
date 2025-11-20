/**
 * Cargo and Trailer Compatibility System
 * Defines which cargo types can be transported with which trailer types
 */

// Define trailer types and their capabilities
export interface TrailerType {
  id: string;
  name: string;
  capacity: number; // Maximum weight in tons
  features: string[];
  suitableFor: string[]; // Cargo types
  models?: TrailerModel[];
}

// Define trailer model specifications
export interface TrailerModel {
  company: string;
  model: string;
  tonnage: number;
  newPrice: number;
  usedPriceRange: [number, number];
  features: string[];
  description: string;
  image: string;
}

// Define cargo types and their requirements
export interface CargoType {
  id: string;
  name: string;
  requiresSpecial: boolean;
  temperatureControl: boolean;
  hazardous: boolean;
  oversized: boolean;
  liquid: boolean;
  bulk: boolean;
  compatibleTrailers: string[]; // Trailer type IDs
}

// Trailer type definitions with models
export const trailerTypes: Record<string, TrailerType> = {
  'box-trailer': {
    id: 'box-trailer',
    name: 'Box Trailer',
    capacity: 24,
    features: ['Enclosed', 'Secure', 'Weatherproof', 'Multi-Temp Options'],
    models: [
      {
        company: 'Schmitz Cargobull AG',
        model: 'Trockenfrachtkoffer Standard',
        tonnage: 27,
        newPrice: 51000,
        usedPriceRange: [24000, 39000],
        features: ['Standard Dry Van', 'Aluminum Construction', 'Easy Loading'],
        description: 'Standard dry goods box trailer for general cargo transport',
        image: 'https://pub-cdn.sider.ai/u/U0KAH9N4VLX/web-coder/68fe87c0584c7e7f606af31d/resource/e48d84f9-d44d-4758-a8bb-7fbdda9531f7.jpg'
      },
      {
        company: 'Telson Trailer AS',
        model: 'TGG TAL 12/18 Mega',
        tonnage: 22,
        newPrice: 44000,
        usedPriceRange: [20000, 32000],
        features: ['Lightweight Design', 'High Capacity', 'Fuel Efficient'],
        description: 'Lightweight mega trailer for maximum volume efficiency',
        image: 'https://pub-cdn.sider.ai/u/U0KAH9N4VLX/web-coder/68fe87c0584c7e7f606af31d/resource/ef03b76a-27c6-4f5e-adfc-5dee7d189cce.jpg'
      },
      {
        company: 'Krune',
        model: 'Dry Liner',
        tonnage: 30,
        newPrice: 57000,
        usedPriceRange: [28000, 46000],
        features: ['Heavy Duty', 'Maximum Payload', 'Durable Construction'],
        description: 'Heavy-duty box trailer for maximum cargo capacity',
        image: 'https://sider.ai/autoimage/box trailer truck transport'
      },
      {
        company: 'Kagel Trailer GmbH',
        model: 'Kagel Box',
        tonnage: 32,
        newPrice: 61000,
        usedPriceRange: [32000, 49000],
        features: ['Premium Build', 'Advanced Security', 'Optimized Aerodynamics'],
        description: 'Premium box trailer with advanced security features',
        image: 'https://pub-cdn.sider.ai/u/U0KAH9N4VLX/web-coder/68fe87c0584c7e7f606af31d/resource/c5ad3de1-ec7c-49ed-863e-0ad4fe0aede1.jpg'
      }
    ],
    suitableFor: [
      'Dry Goods',
      'Electronics',
      'Furniture',
      'Packaged Food',
      'Clothing',
      'Paper Products',
      'Consumer Goods',
      'Appliances',
      'Machinery Parts',
      'Pharmaceuticals'
    ]
  },
  'curtainside-trailer': {
    id: 'curtainside-trailer',
    name: 'Curtainside Trailer',
    capacity: 24,
    features: ['Easy Loading', 'Side Access', 'Flexible'],
    suitableFor: [
      'Dry Goods',
      'Construction Materials',
      'Palletized Cargo',
      'Building Materials',
      'Industrial Goods'
    ]
  },
  'reefer-trailer': {
    id: 'reefer-trailer',
    name: 'Reefer Trailer',
    capacity: 22,
    features: ['Temperature Control', 'Insulated', 'Fresh Air Circulation'],
    suitableFor: [
      'Frozen / Refrigerated',
      'Dairy Products',
      'Fresh Produce',
      'Pharmaceuticals',
      'Temperature Sensitive Goods'
    ]
  },
  'food-grade-tanker': {
    id: 'food-grade-tanker',
    name: 'Food-Grade Tanker',
    capacity: 20,
    features: ['Food Safe', 'Stainless Steel', 'Temperature Control'],
    suitableFor: [
      'Liquid - Clean / Food Grade',
      'Milk',
      'Juice',
      'Water',
      'Edible Oils',
      'Beverages'
    ]
  },
  'industrial-tanker': {
    id: 'industrial-tanker',
    name: 'Industrial Tanker',
    capacity: 20,
    features: ['Chemical Resistant', 'Pressure Rated', 'Safety Valves'],
    suitableFor: [
      'Liquid - Industrial / Chemical',
      'Fuel',
      'Chemicals',
      'Industrial Liquids',
      'Petroleum Products'
    ]
  },
  'flatbed-trailer': {
    id: 'flatbed-trailer',
    name: 'Flatbed Trailer',
    capacity: 25,
    features: ['Open Top', 'Heavy Duty', 'Easy Loading'],
    suitableFor: [
      'Heavy Machinery / Oversized',
      'Construction Materials',
      'Building Equipment',
      'Steel Beams',
      'Large Equipment'
    ]
  },
  'lowboy-trailer': {
    id: 'lowboy-trailer',
    name: 'Lowboy Trailer',
    capacity: 30,
    features: ['Low Profile', 'Extra Heavy Duty', 'Ramp Access'],
    suitableFor: [
      'Heavy Machinery / Oversized',
      'Construction Equipment',
      'Vehicles',
      'Excavators',
      'Bulldozers'
    ]
  },
  'hopper-bottom-trailer': {
    id: 'hopper-bottom-trailer',
    name: 'Hopper Bottom Trailer',
    capacity: 28,
    features: ['Gravity Unload', 'Bulk Storage', 'Weatherproof'],
    suitableFor: [
      'Agricultural Bulk',
      'Grain',
      'Seeds',
      'Fertilizer',
      'Animal Feed'
    ]
  },
  'car-carrier': {
    id: 'car-carrier',
    name: 'Car Carrier',
    capacity: 20,
    features: ['Multi-Level', 'Secured Ramps', 'Weather Protection'],
    suitableFor: [
      'Vehicles',
      'Cars',
      'Trucks',
      'Vans',
      'Motorcycles'
    ]
  },
  'livestock-trailer': {
    id: 'livestock-trailer',
    name: 'Livestock Trailer',
    capacity: 18,
    features: ['Ventilation', 'Non-Slip Floor', 'Watering System'],
    suitableFor: [
      'Livestock',
      'Cattle',
      'Pigs',
      'Sheep',
      'Horses'
    ]
  },
  'container-chassis': {
    id: 'container-chassis',
    name: 'Container Chassis',
    capacity: 25,
    features: ['ISO Compatible', 'Locking Pins', 'Adjustable'],
    suitableFor: [
      'Containerized / Intermodal',
      'Shipping Containers',
      'Freight Containers',
      'Standard Cargo'
    ]
  },
  'pneumatic-tanker': {
    id: 'pneumatic-tanker',
    name: 'Pneumatic Tanker',
    capacity: 22,
    features: ['Air Pressure Unload', 'Powder Storage', 'Dust Control'],
    suitableFor: [
      'Bulk Powder / Cement',
      'Cement',
      'Flour',
      'Plastic Granules',
      'Chemical Powders'
    ]
  },
  'walking-floor-trailer': {
    id: 'walking-floor-trailer',
    name: 'Walking Floor Trailer',
    capacity: 26,
    features: ['Moving Floor System', 'Bulk Loading', 'Efficient Unloading'],
    suitableFor: [
      'Waste & Recycling',
      'Municipal Waste',
      'Recyclable Materials',
      'Wood Chips',
      'Garden Waste'
    ]
  },
  'dump-trailer': {
    id: 'dump-trailer',
    name: 'Dump Trailer',
    capacity: 24,
    features: ['Hydraulic Lift', 'Heavy Duty', 'Quick Unload'],
    suitableFor: [
      'Construction Debris',
      'Excavated Earth',
      'Demolition Waste',
      'Gravel',
      'Sand'
    ]
  },
  'extendable-flatbed': {
    id: 'extendable-flatbed',
    name: 'Extendable Flatbed',
    capacity: 28,
    features: ['Adjustable Length', 'Telescopic Design', 'Heavy Load Support'],
    suitableFor: [
      'Extra Long Loads',
      'Long Steel Beams',
      'Bridge Girders',
      'Wind Turbine Blades',
      'Utility Poles'
    ]
  },
  'step-deck-trailer': {
    id: 'step-deck-trailer',
    name: 'Step Deck Trailer',
    capacity: 26,
    features: ['Two Level Design', 'Low Center of Gravity', 'Versatile Loading'],
    suitableFor: [
      'Heavy Machinery / Oversized',
      'Construction Equipment',
      'Vehicles',
      'Industrial Machinery'
    ]
  },
  'gas-tanker': {
    id: 'gas-tanker',
    name: 'Gas Tanker',
    capacity: 19,
    features: ['Pressure Vessel', 'Safety Valves', 'Multiple Compartments'],
    suitableFor: [
      'Compressed Gases',
      'Propane',
      'Butane',
      'LPG',
      'Natural Gas',
      'Industrial Gases'
    ]
  },
  'acid-tanker': {
    id: 'acid-tanker',
    name: 'Acid Tanker',
    capacity: 18,
    features: ['Corrosion Resistant', 'Special Lining', 'Safety Equipment'],
    suitableFor: [
      'Corrosive Chemicals',
      'Sulfuric Acid',
      'Hydrochloric Acid',
      'Battery Acid',
      'Industrial Acids'
    ]
  },
  'freezer-trailer': {
    id: 'freezer-trailer',
    name: 'Freezer Trailer',
    capacity: 22,
    features: ['Deep Freeze', 'Temperature Control', 'Insulated Walls'],
    suitableFor: [
      'Frozen / Refrigerated',
      'Frozen Foods',
      'Ice Cream',
      'Frozen Meat',
      'Deep Frozen Products'
    ]
  },
  'multi-temp-reefer': {
    id: 'multi-temp-reefer',
    name: 'Multi-Temp Reefer',
    capacity: 22,
    features: ['Multiple Temperature Zones', 'Independent Controls', 'Versatile Loading'],
    suitableFor: [
      'Frozen / Refrigerated',
      'Mixed Temperature Goods',
      'Fresh + Frozen',
      'Pharmaceuticals',
      'Perishable Goods'
    ]
  }
};

// Cargo type definitions with expanded compatibility
export const cargoTypes: Record<string, CargoType> = {
  'dry-goods': {
    id: 'dry-goods',
    name: 'Dry Goods',
    requiresSpecial: false,
    temperatureControl: false,
    hazardous: false,
    oversized: false,
    liquid: false,
    bulk: false,
    compatibleTrailers: ['box-trailer', 'curtainside-trailer', 'container-chassis', 'box-trailer-schmitz', 'box-trailer-telson', 'box-trailer-krune', 'box-trailer-kagel']
  },
  'frozen-refrigerated': {
    id: 'frozen-refrigerated',
    name: 'Frozen / Refrigerated',
    requiresSpecial: true,
    temperatureControl: true,
    hazardous: false,
    oversized: false,
    liquid: false,
    bulk: false,
    compatibleTrailers: ['reefer-trailer', 'freezer-trailer', 'multi-temp-reefer']
  },
  'liquid-clean-food-grade': {
    id: 'liquid-clean-food-grade',
    name: 'Liquid - Clean / Food Grade',
    requiresSpecial: true,
    temperatureControl: true,
    hazardous: false,
    oversized: false,
    liquid: true,
    bulk: false,
    compatibleTrailers: ['food-grade-tanker']
  },
  'liquid-industrial-chemical': {
    id: 'liquid-industrial-chemical',
    name: 'Liquid - Industrial / Chemical',
    requiresSpecial: true,
    temperatureControl: false,
    hazardous: true,
    oversized: false,
    liquid: true,
    bulk: false,
    compatibleTrailers: ['industrial-tanker', 'gas-tanker', 'acid-tanker']
  },
  'heavy-machinery-oversized': {
    id: 'heavy-machinery-oversized',
    name: 'Heavy Machinery / Oversized',
    requiresSpecial: true,
    temperatureControl: false,
    hazardous: false,
    oversized: true,
    liquid: false,
    bulk: false,
    compatibleTrailers: ['flatbed-trailer', 'lowboy-trailer', 'step-deck-trailer', 'extendable-flatbed']
  },
  'construction-material': {
    id: 'construction-material',
    name: 'Construction Material',
    requiresSpecial: false,
    temperatureControl: false,
    hazardous: false,
    oversized: false,
    liquid: false,
    bulk: false,
    compatibleTrailers: ['curtainside-trailer', 'flatbed-trailer', 'dump-trailer', 'box-trailer']
  },
  'agricultural-bulk': {
    id: 'agricultural-bulk',
    name: 'Agricultural Bulk',
    requiresSpecial: false,
    temperatureControl: false,
    hazardous: false,
    oversized: false,
    liquid: false,
    bulk: true,
    compatibleTrailers: ['hopper-bottom-trailer', 'box-trailer']
  },
  'vehicles': {
    id: 'vehicles',
    name: 'Vehicles',
    requiresSpecial: false,
    temperatureControl: false,
    hazardous: false,
    oversized: false,
    liquid: false,
    bulk: false,
    compatibleTrailers: ['car-carrier', 'flatbed-trailer']
  },
  'hazardous-materials': {
    id: 'hazardous-materials',
    name: 'Hazardous Materials',
    requiresSpecial: true,
    temperatureControl: false,
    hazardous: true,
    oversized: false,
    liquid: false,
    bulk: false,
    compatibleTrailers: ['industrial-tanker', 'acid-tanker', 'box-trailer']
  },
  'livestock': {
    id: 'livestock',
    name: 'Livestock',
    requiresSpecial: true,
    temperatureControl: false,
    hazardous: false,
    oversized: false,
    liquid: false,
    bulk: false,
    compatibleTrailers: ['livestock-trailer']
  },
  'containerized-intermodal': {
    id: 'containerized-intermodal',
    name: 'Containerized / Intermodal',
    requiresSpecial: false,
    temperatureControl: false,
    hazardous: false,
    oversized: false,
    liquid: false,
    bulk: false,
    compatibleTrailers: ['container-chassis']
  },
  'bulk-powder-cement': {
    id: 'bulk-powder-cement',
    name: 'Bulk Powder / Cement',
    requiresSpecial: true,
    temperatureControl: false,
    hazardous: false,
    oversized: false,
    liquid: false,
    bulk: true,
    compatibleTrailers: ['pneumatic-tanker']
  },
  'waste-recycling': {
    id: 'waste-recycling',
    name: 'Waste & Recycling',
    requiresSpecial: true,
    temperatureControl: false,
    hazardous: false,
    oversized: false,
    liquid: false,
    bulk: true,
    compatibleTrailers: ['walking-floor-trailer']
  },
  'construction-debris': {
    id: 'construction-debris',
    name: 'Construction Debris',
    requiresSpecial: false,
    temperatureControl: false,
    hazardous: false,
    oversized: false,
    liquid: false,
    bulk: true,
    compatibleTrailers: ['dump-trailer']
  },
  'extra-long-loads': {
    id: 'extra-long-loads',
    name: 'Extra Long Loads',
    requiresSpecial: true,
    temperatureControl: false,
    hazardous: false,
    oversized: true,
    liquid: false,
    bulk: false,
    compatibleTrailers: ['extendable-flatbed']
  },
  'compressed-gases': {
    id: 'compressed-gases',
    name: 'Compressed Gases',
    requiresSpecial: true,
    temperatureControl: false,
    hazardous: true,
    oversized: false,
    liquid: false,
    bulk: false,
    compatibleTrailers: ['gas-tanker']
  },
  'corrosive-chemicals': {
    id: 'corrosive-chemicals',
    name: 'Corrosive Chemicals',
    requiresSpecial: true,
    temperatureControl: false,
    hazardous: true,
    oversized: false,
    liquid: true,
    bulk: false,
    compatibleTrailers: ['acid-tanker']
  }
};

/**
 * Check if a cargo type is compatible with a trailer type
 */
export function isCompatibleCargoTrailer(cargoType: string, trailerType: string): boolean {
  const cargo = cargoTypes[cargoType];
  const trailer = trailerTypes[trailerType];
  
  if (!cargo || !trailer) return false;
  
  return cargo.compatibleTrailers.includes(trailerType);
}

/**
 * Get all compatible trailers for a cargo type
 */
export function getCompatibleTrailers(cargoType: string): TrailerType[] {
  const cargo = cargoTypes[cargoType];
  if (!cargo) return [];
  
  return cargo.compatibleTrailers
    .map(trailerId => trailerTypes[trailerId])
    .filter(Boolean);
}

/**
 * Get all compatible cargo types for a trailer type
 */
export function getCompatibleCargoTypes(trailerType: string): CargoType[] {
  const trailer = trailerTypes[trailerType];
  if (!trailer) return [];
  
  return Object.values(cargoTypes)
    .filter(cargo => cargo.compatibleTrailers.includes(trailerType));
}

/**
 * Check if a driver has the required license for a cargo-trailer combination
 */
export function hasRequiredLicense(driverLicenses: string[], cargoType: string, trailerType: string): boolean {
  const cargo = cargoTypes[cargoType];
  
  // Basic license required for all combinations
  if (!driverLicenses.includes('C')) return false;
  
  // Heavy/Oversized loads require CE license
  if (cargo.oversized && !driverLicenses.includes('CE')) return false;
  
  // Hazardous materials require ADR certificate
  if (cargo.hazardous && !driverLicenses.includes('ADR')) return false;
  
  // Tanker operations require special endorsement
  if (cargo.liquid && !driverLicenses.includes('Tanker')) return false;
  
  return true;
}

/**
 * Get cargo type requirements as human-readable text
 */
export function getCargoRequirements(cargoType: string): string[] {
  const cargo = cargoTypes[cargoType];
  if (!cargo) return [];
  
  const requirements: string[] = [];
  
  if (cargo.requiresSpecial) {
    requirements.push('Special handling required');
  }
  
  if (cargo.temperatureControl) {
    requirements.push('Temperature control needed');
  }
  
  if (cargo.hazardous) {
    requirements.push('ADR certification required');
  }
  
  if (cargo.oversized) {
    requirements.push('Oversized load permit required');
  }
  
  if (cargo.liquid) {
    requirements.push('Tanker operation license required');
  }
  
  if (cargo.bulk) {
    requirements.push('Bulk loading equipment required');
  }
  
  return requirements;
}

/**
 * Get trailer type features as human-readable text
 */
export function getTrailerFeatures(trailerType: string): string[] {
  const trailer = trailerTypes[trailerType];
  if (!trailer) return [];
  
  return trailer.features;
}

/**
 * Get box trailer model by company and model
 */
export function getBoxTrailerModel(company: string, model: string): TrailerModel | null {
  const boxTrailer = trailerTypes['box-trailer'];
  if (!boxTrailer.models) return null;
  
  return boxTrailer.models.find(m => 
    m.company === company && m.model === model
  ) || null;
}

/**
 * Get all box trailer models
 */
export function getAllBoxTrailerModels(): TrailerModel[] {
  const boxTrailer = trailerTypes['box-trailer'];
  return boxTrailer.models || [];
}
