/**
 * src/data/trailers.ts
 *
 * Purpose:
 * - Centralized, well-typed list of trailer listings used by the Vehicle Market page.
 * - Contains trailer entries including used price ranges where provided.
 *
 * Notes:
 * - Trailer classification (trailerClass) uses human-friendly, title-cased labels
 *   such as "Container Chassis" and "Livestock Trailer" to match UI filters.
 */

/**
 * Vehicle
 * @description Type describing trailer data used by the market pages and components.
 */
export interface Vehicle {
  /** Unique id for the vehicle */
  id: string;
  /** Vehicle type: 'trailer' | 'truck' */
  type: "trailer" | "truck";
  /** Listing category: 'new' | 'used' */
  category: "new" | "used";
  /** Manufacturer brand */
  brand: string;
  /** Model name */
  model: string;
  /** Model / production year (optional) */
  year?: number;
  /** Purchase price (USD) */
  price: number;
  /** Optional lease monthly rate */
  leaseRate?: number;
  /** Approximate tonnage / payload */
  tonnage?: number;
  /** Condition percentage (100 === new) */
  condition?: number;
  /** Availability / delivery time string */
  availability?: string;
  /** Specifications (capacity, length, axles, features, usedPriceRange, etc.) */
  specifications?: {
    capacity?: string;
    length?: string;
    axles?: number;
    features?: string[];
    usedPriceRange?: string;
    [key: string]: any;
  };
  /** Image URL (smart placeholder or real URL) */
  image?: string;
  /** Derived classification used by UI (optional) */
  trailerClass?: string;
  [key: string]: any;
}

/**
 * TRAILERS
 * @description Canonical list of trailer listings available in the vehicle market.
 *
 * Important:
 * - trailerClass uses human-readable labels (title-cased and spaced) that match the
 *   Vehicle Market class filter options (for example: "Container Chassis").
 */
export const TRAILERS: Vehicle[] = [
  // --- Acid Tanker (1-3) ---
  {
    id: "alora-acid-tanker-2024",
    type: "trailer",
    category: "new",
    brand: "Alora Trailer",
    model: "Tanker Semi-Trailer",
    year: 2024,
    price: 40000,
    tonnage: 32,
    condition: 100,
    availability: "In stock",
    specifications: {
      capacity: "Acid tanker",
      length: "12.5m",
      axles: 3,
      features: ["corrosion-resistant lining", "pressurized valves", "safety bund"]
    },
    image: "https://pub-cdn.sider.ai/u/U0KAH9N4VLX/web-coder/68fe87c0584c7e7f606af31d/resource/bf5b99c4-65f8-4c0e-aafb-ce7916bf2a37.jpg",
    trailerClass: "Acid Tanker"
  },
  {
    id: "leg-adr-tank-2024",
    type: "trailer",
    category: "new",
    brand: "LEG Trailers",
    model: "ADR Tank Trailer",
    year: 2024,
    price: 35000,
    tonnage: 29,
    condition: 100,
    availability: "2-3 weeks",
    specifications: {
      capacity: "ADR certified acid tanker",
      length: "12.0m",
      axles: 3,
      features: ["ADR certification", "double-sealed lids", "spill containment"]
    },
    image: "https://pub-cdn.sider.ai/u/U0KAH9N4VLX/web-coder/68fe87c0584c7e7f606af31d/resource/bf5b99c4-65f8-4c0e-aafb-ce7916bf2a37.jpg",
    trailerClass: "Acid Tanker"
  },
  {
    id: "borg-30ltr-2024",
    type: "trailer",
    category: "new",
    brand: "Borg",
    model: "30LTR",
    year: 2024,
    price: 38000,
    tonnage: 30,
    condition: 100,
    availability: "In stock",
    specifications: {
      capacity: "30 m3 acid-rated",
      length: "12.3m",
      axles: 3,
      features: ["thermal insulation", "alkali resistant lining", "emergency vent"]
    },
    image: "https://pub-cdn.sider.ai/u/U0KAH9N4VLX/web-coder/68fe87c0584c7e7f606af31d/resource/bf5b99c4-65f8-4c0e-aafb-ce7916bf2a37.jpg",
    trailerClass: "Acid Tanker"
  },

  // --- Gas Tanker (4-7) ---
  {
    id: "mim-mek-lpg-2024",
    type: "trailer",
    category: "new",
    brand: "MIM Mek",
    model: "LPG Transport Tank",
    year: 2024,
    price: 47000,
    tonnage: 30,
    condition: 100,
    availability: "4-6 weeks",
    specifications: {
      capacity: "LPG cylinder / tank",
      length: "12.5m",
      axles: 3,
      features: ["LPG certified", "pressure gauges", "cryogenic fittings"]
    },
    image: "https://pub-cdn.sider.ai/u/U0KAH9N4VLX/web-coder/68fe87c0584c7e7f606af31d/resource/7e0a91ac-a3db-49a2-b2f3-a66ac65140af.jpg",
    trailerClass: "Gas Tanker"
  },
  {
    id: "gurlesentil-lpg-2024",
    type: "trailer",
    category: "new",
    brand: "GurlesenTil",
    model: "LPG Semi Trailer",
    year: 2024,
    price: 40000,
    tonnage: 24,
    condition: 100,
    availability: "In stock",
    specifications: {
      capacity: "LPG semi",
      length: "11.8m",
      axles: 3,
      features: ["pressure relief valves", "insulated piping", "safety decals"]
    },
    image: "https://pub-cdn.sider.ai/u/U0KAH9N4VLX/web-coder/68fe87c0584c7e7f606af31d/resource/7e0a91ac-a3db-49a2-b2f3-a66ac65140af.jpg",
    trailerClass: "Gas Tanker"
  },
  {
    id: "eurotanker-cryo-lng-2024",
    type: "trailer",
    category: "new",
    brand: "Eurotanker GmbH",
    model: "Cryo LNG",
    year: 2024,
    price: 59000,
    tonnage: 37,
    condition: 100,
    availability: "Preorder",
    specifications: {
      capacity: "Cryogenic LNG tank",
      length: "13.6m",
      axles: 4,
      features: ["cryogenic insulation", "vacuum jacket", "pressure monitoring"]
    },
    image: "https://pub-cdn.sider.ai/u/U0KAH9N4VLX/web-coder/68fe87c0584c7e7f606af31d/resource/b0e9c415-4bbc-4dad-b42f-92921bc5fdf6.jpg",
    trailerClass: "Gas Tanker"
  },
  {
    id: "lepesa-ltt52-2024",
    type: "trailer",
    category: "new",
    brand: "Lepesa",
    model: "LTT52",
    year: 2024,
    price: 52000,
    tonnage: 34,
    condition: 100,
    availability: "2-4 weeks",
    specifications: {
      capacity: "Large LPG / gas tanker",
      length: "13.2m",
      axles: 4,
      features: ["reinforced chassis", "pressure safety systems", "remote monitoring"]
    },
    image: "https://pub-cdn.sider.ai/u/U0KAH9N4VLX/web-coder/68fe87c0584c7e7f606af31d/resource/6df8e33a-6f94-478a-9861-2a3fbf6d41a4.jpg",
    trailerClass: "Gas Tanker"
  },

  // --- Step Deck Trailer (8-10) ---
  {
    id: "panton-stepdeck-2024",
    type: "trailer",
    category: "new",
    brand: "Panton",
    model: "Step Deck Trailers",
    year: 2024,
    price: 57000,
    tonnage: 42,
    condition: 100,
    availability: "Made to order (3-6 weeks)",
    specifications: {
      capacity: "Step deck for tall machinery",
      length: "14.6m",
      axles: 4,
      features: ["drop deck", "ramp", "tie-down points"]
    },
    image: "https://pub-cdn.sider.ai/u/U0KAH9N4VLX/web-coder/68fe87c0584c7e7f606af31d/resource/b3c0494d-edaa-4f9c-b65e-b6dda9005f58.jpg",
    trailerClass: "Step Deck Trailer"
  },
  {
    id: "karlberg-s500h-2024",
    type: "trailer",
    category: "new",
    brand: "Karl Berg Trailers",
    model: "S500H",
    year: 2024,
    price: 65000,
    tonnage: 48,
    condition: 100,
    availability: "In stock",
    specifications: {
      capacity: "Heavy step deck",
      length: "15.0m",
      axles: 5,
      features: ["hydraulic ramps", "extendable rear", "heavy tie rails"]
    },
    image: "https://pub-cdn.sider.ai/u/U0KAH9N4VLX/web-coder/68fe87c0584c7e7f606af31d/resource/b3c0494d-edaa-4f9c-b65e-b6dda9005f58.jpg",
    trailerClass: "Step Deck Trailer"
  },
  {
    id: "fericer-stepdeck-2024",
    type: "trailer",
    category: "new",
    brand: "Fericer",
    model: "Step Deck Semi-Trailer",
    year: 2024,
    price: 49000,
    tonnage: 40,
    condition: 100,
    availability: "In stock",
    specifications: {
      capacity: "Standard step deck",
      length: "14.0m",
      axles: 4,
      features: ["folding ramps", "stabilizer legs", "steel reinforced bed"]
    },
    image: "https://pub-cdn.sider.ai/u/U0KAH9N4VLX/web-coder/68fe87c0584c7e7f606af31d/resource/b3c0494d-edaa-4f9c-b65e-b6dda9005f58.jpg",
    trailerClass: "Step Deck Trailer"
  },

  // --- Extendable Flatbed (11-13) ---
  {
    id: "mex-max200-36-2024",
    type: "trailer",
    category: "new",
    brand: "MEX Trailer",
    model: "MAX200",
    year: 2024,
    price: 55000,
    tonnage: 36,
    condition: 100,
    availability: "6 days",
    specifications: {
      capacity: "Extendable flatbed",
      length: "13.8m",
      axles: 4,
      features: ["extendable deck", "hydraulic extension", "heavy duty frame"]
    },
    image: "https://pub-cdn.sider.ai/u/U0KAH9N4VLX/web-coder/68fe87c0584c7e7f606af31d/resource/d9035fab-1683-4b60-9ad5-1da2427a8fab.jpg",
    trailerClass: "Extendable Flatbed"
  },
  {
    id: "alora-saf-2024",
    type: "trailer",
    category: "new",
    brand: "Alora Trailer",
    model: "SAF",
    year: 2024,
    price: 50000,
    tonnage: 33,
    condition: 100,
    availability: "In stock",
    specifications: {
      capacity: "Extendable flatbed SAF",
      length: "13.6m",
      axles: 4,
      features: ["reinforced deck", "aluminium ties", "quick-release pins"]
    },
    image: "https://pub-cdn.sider.ai/u/U0KAH9N4VLX/web-coder/68fe87c0584c7e7f606af31d/resource/d9035fab-1683-4b60-9ad5-1da2427a8fab.jpg",
    trailerClass: "Extendable Flatbed"
  },
  {
    id: "mex-max200-44-2024",
    type: "trailer",
    category: "new",
    brand: "MEX Trailer",
    model: "MAX200-44",
    year: 2024,
    price: 67000,
    tonnage: 44,
    condition: 100,
    availability: "In stock",
    specifications: {
      capacity: "Extendable heavy flatbed",
      length: "extendable up to 18m",
      axles: 5,
      features: ["hydraulic extension", "heavy duty frame", "multiple lashing points"]
    },
    image: "https://pub-cdn.sider.ai/u/U0KAH9N4VLX/web-coder/68fe87c0584c7e7f606af31d/resource/d9035fab-1683-4b60-9ad5-1da2427a8fab.jpg",
    trailerClass: "Extendable Flatbed"
  },

  // --- Dump Trailer (14-15) ---
  {
    id: "welton-dump-2024",
    type: "trailer",
    category: "new",
    brand: "Welton S.A.",
    model: "Dump Trailer",
    year: 2024,
    price: 28000,
    tonnage: 32,
    condition: 100,
    availability: "In stock",
    specifications: {
      capacity: "General purpose dump",
      length: "11.5m",
      axles: 3,
      features: ["hydraulic tip", "reinforced floor", "easy-clean"]
    },
    image: "https://pub-cdn.sider.ai/u/U0KAH9N4VLX/web-coder/68fe87c0584c7e7f606af31d/resource/761a215f-6904-4377-88d8-9a9edfc914bf.jpg",
    trailerClass: "Dump Trailer"
  },
  {
    id: "schmetz-ski-dump-2024",
    type: "trailer",
    category: "new",
    brand: "Schmetz Cargoball AG",
    model: "SKI",
    year: 2024,
    price: 25000,
    tonnage: 30,
    condition: 100,
    availability: "In stock",
    specifications: {
      capacity: "Standard dump trailer",
      length: "11.2m",
      axles: 3,
      features: ["quick-release tailgate", "wear plates", "low-maintenance bearings"]
    },
    image: "https://pub-cdn.sider.ai/u/U0KAH9N4VLX/web-coder/68fe87c0584c7e7f606af31d/resource/761a215f-6904-4377-88d8-9a9edfc914bf.jpg",
    trailerClass: "Dump Trailer"
  },

  // --- Walking Floor Trailer (16-19) ---
  {
    id: "star-farmstar-60-2024",
    type: "trailer",
    category: "new",
    brand: "STAR",
    model: "FarmSTAR 60",
    year: 2024,
    price: 56000,
    tonnage: 29,
    condition: 100,
    availability: "In stock",
    specifications: {
      capacity: "Walking floor for agricultural goods",
      length: "13.0m",
      axles: 3,
      features: ["walking floor", "remote controls", "reinforced slats"]
    },
    image: "https://pub-cdn.sider.ai/u/U0KAH9N4VLX/web-coder/68fe87c0584c7e7f606af31d/resource/f3ac574f-cfb0-449c-9929-9db8f89af832.jpg",
    trailerClass: "Walking Floor Trailer"
  },
  {
    id: "knepen-k100-2024",
    type: "trailer",
    category: "new",
    brand: "Knepen",
    model: "K100",
    year: 2024,
    price: 49000,
    tonnage: 27,
    condition: 100,
    availability: "2-3 weeks",
    specifications: {
      capacity: "General walking floor",
      length: "12.5m",
      axles: 3,
      features: ["durable floor panels", "hydraulic actuators", "side doors"]
    },
    image: "https://pub-cdn.sider.ai/u/U0KAH9N4VLX/web-coder/68fe87c0584c7e7f606af31d/resource/f3ac574f-cfb0-449c-9929-9db8f89af832.jpg",
    trailerClass: "Walking Floor Trailer"
  },
  {
    id: "raisch-r24-2024",
    type: "trailer",
    category: "new",
    brand: "Raisch",
    model: "R24",
    year: 2024,
    price: 43000,
    tonnage: 26,
    condition: 100,
    availability: "In stock",
    specifications: {
      capacity: "Walking floor medium",
      length: "12.3m",
      axles: 3,
      features: ["walking floor", "easy-clean panels", "rear discharge"]
    },
    image: "https://pub-cdn.sider.ai/u/U0KAH9N4VLX/web-coder/68fe87c0584c7e7f606af31d/resource/f3ac574f-cfb0-449c-9929-9db8f89af832.jpg",
    trailerClass: "Walking Floor Trailer"
  },
  {
    id: "raisch-rsbs-35-2024",
    type: "trailer",
    category: "new",
    brand: "Raisch",
    model: "RSBS-35",
    year: 2024,
    price: 40000,
    tonnage: 25,
    condition: 100,
    availability: "2-4 weeks",
    specifications: {
      capacity: "Walking floor (compact)",
      length: "12.0m",
      axles: 3,
      features: ["low deck", "hydraulic walking floor", "side doors"]
    },
    image: "https://pub-cdn.sider.ai/u/U0KAH9N4VLX/web-coder/68fe87c0584c7e7f606af31d/resource/f3ac574f-cfb0-449c-9929-9db8f89af832.jpg",
    trailerClass: "Walking Floor Trailer"
  },

  // --- Pneumatic Tanker (20-22) ---
  {
    id: "lader-ct1-2024",
    type: "trailer",
    category: "new",
    brand: "Lader Trailer",
    model: "CT1",
    year: 2024,
    price: 27000,
    tonnage: 40,
    condition: 100,
    availability: "In stock",
    specifications: {
      capacity: "Pneumatic tanker 40 cbm",
      length: "12.8m",
      axles: 4,
      features: ["pneumatic discharge", "air-operated valves"],
      usedPriceRange: "$18,000 - $23,000"
    },
    image: "https://pub-cdn.sider.ai/u/U0KAH9N4VLX/web-coder/68fe87c0584c7e7f606af31d/resource/1041b325-8269-4625-92f0-88266c5364e1.jpg",
    trailerClass: "Pneumatic Tanker"
  },
  {
    id: "cinc-45cbm-2024",
    type: "trailer",
    category: "new",
    brand: "CINC Vehicles Group",
    model: "45cbm",
    year: 2024,
    price: 23000,
    tonnage: 35,
    condition: 100,
    availability: "2-4 weeks",
    specifications: {
      capacity: "Pneumatic tanker 45 cbm",
      length: "12.6m",
      axles: 4,
      features: ["multi-compartment", "air discharge"],
      usedPriceRange: "$14,000 - $20,000"
    },
    image: "https://pub-cdn.sider.ai/u/U0KAH9N4VLX/web-coder/68fe87c0584c7e7f606af31d/resource/1041b325-8269-4625-92f0-88266c5364e1.jpg",
    trailerClass: "Pneumatic Tanker"
  },
  {
    id: "titan-pneumatic-2024",
    type: "trailer",
    category: "new",
    brand: "Titan",
    model: "Pneumatic Tanker",
    year: 2024,
    price: 21000,
    tonnage: 32,
    condition: 100,
    availability: "In stock",
    specifications: {
      capacity: "Standard pneumatic tanker",
      length: "12.0m",
      axles: 3,
      features: ["pressurized tank", "air discharge system"],
      usedPriceRange: "$13,000 - $19,000"
    },
    image: "https://pub-cdn.sider.ai/u/U0KAH9N4VLX/web-coder/68fe87c0584c7e7f606af31d/resource/1041b325-8269-4625-92f0-88266c5364e1.jpg",
    trailerClass: "Pneumatic Tanker"
  },

  // --- Food-Grade Tanker (newly added entries) ---
  {
    id: "latina-berger-2024",
    type: "trailer",
    category: "new",
    brand: "Latina",
    model: "Berger",
    year: 2024,
    price: 40000,
    tonnage: 31,
    condition: 100,
    availability: "In stock",
    specifications: {
      capacity: "Food-grade stainless tanker",
      length: "12.5m",
      axles: 3,
      features: ["food-grade stainless lining", "sanitary tri-clamp valves", "easy-clean manway"],
      usedPriceRange: "$25,000 - $33,000"
    },
    image: "https://pub-cdn.sider.ai/u/U0KAH9N4VLX/web-coder/68fe87c0584c7e7f606af31d/resource/6256ef27-5462-41b3-993a-d0b13a8cabf6.jpg",
    trailerClass: "Food-Grade Tanker"
  },
  {
    id: "okp-foodstuff-tanker-2024",
    type: "trailer",
    category: "new",
    brand: "OKP Trailer",
    model: "Foodstuff Tanker",
    year: 2024,
    price: 37000,
    tonnage: 28,
    condition: 100,
    availability: "In stock",
    specifications: {
      capacity: "Foodstuff tanker",
      length: "12.0m",
      axles: 3,
      features: ["sanitary pump system", "insulated lining", "CIP-ready"],
      usedPriceRange: "$20,000 - $30,000"
    },
    image: "https://pub-cdn.sider.ai/u/U0KAH9N4VLX/web-coder/68fe87c0584c7e7f606af31d/resource/f7e09339-c5bf-4257-87cf-b81760b375a5.jpg",
    trailerClass: "Food-Grade Tanker"
  },
  {
    id: "megyar-food-tank-2024",
    type: "trailer",
    category: "new",
    brand: "Megyar",
    model: "Food Tank",
    year: 2024,
    price: 33000,
    tonnage: 25,
    condition: 100,
    availability: "2-4 weeks",
    specifications: {
      capacity: "Food transport tanker",
      length: "11.8m",
      axles: 3,
      features: ["polished stainless interior", "temperature control options", "sanitary fittings"],
      usedPriceRange: "$16,000 - $25,000"
    },
    image: "https://pub-cdn.sider.ai/u/U0KAH9N4VLX/web-coder/68fe87c0584c7e7f606af31d/resource/49b3795f-c0cc-4303-8145-09a0cfd9fb90.jpg",
    trailerClass: "Food-Grade Tanker"
  },
  {
    id: "alora-agro-tanker-2024",
    type: "trailer",
    category: "new",
    brand: "Alora Trailers",
    model: "Agro Tanker",
    year: 2024,
    price: 28000,
    tonnage: 22,
    condition: 100,
    availability: "In stock",
    specifications: {
      capacity: "Agro / food-grade tanker",
      length: "11.6m",
      axles: 3,
      features: ["food-safe lining", "drainable baffles", "sanitary valves"],
      usedPriceRange: "$14,000 - $21,000"
    },
    image: "https://pub-cdn.sider.ai/u/U0KAH9N4VLX/web-coder/68fe87c0584c7e7f606af31d/resource/c643e3ba-8609-45d5-b30d-d431e2a04d8d.jpg",
    trailerClass: "Food-Grade Tanker"
  },

  // --- Container Chassis (23-26) - ENSURE CORRECT CLASS 'Container Chassis' ---
  {
    id: "lien-40ft-2024",
    type: "trailer",
    category: "new",
    brand: "Lien",
    model: "40FT",
    year: 2024,
    price: 17000,
    tonnage: 30,
    condition: 100,
    availability: "In stock",
    specifications: {
      capacity: "40FT container chassis",
      length: "13.6m",
      axles: 3,
      features: ["twist locks", "adjustable chassis"],
      usedPriceRange: "$10,000 - $14,000"
    },
    image: "https://pub-cdn.sider.ai/u/U0KAH9N4VLX/web-coder/68fe87c0584c7e7f606af31d/resource/5d247234-399c-4d7e-9db7-b6e2130700c1.jpg",
    trailerClass: "Container Chassis"
  },
  {
    id: "gurlesentil-container-2024",
    type: "trailer",
    category: "new",
    brand: "GurlesenTil",
    model: "Container Semi Trailer",
    year: 2024,
    price: 16000,
    tonnage: 27,
    condition: 100,
    availability: "In stock",
    specifications: {
      capacity: "Container semi trailer",
      length: "13.0m",
      axles: 3,
      features: ["twist locks", "adjustable frame"],
      usedPriceRange: "$8,000 - $13,000"
    },
    image: "https://pub-cdn.sider.ai/u/U0KAH9N4VLX/web-coder/68fe87c0584c7e7f606af31d/resource/5d247234-399c-4d7e-9db7-b6e2130700c1.jpg",
    trailerClass: "Container Chassis"
  },
  {
    id: "schmetz-scf-20-2024",
    type: "trailer",
    category: "new",
    brand: "Schmetz Cargoball AG",
    model: "S.CF ALLROUND 20",
    year: 2024,
    price: 13000,
    tonnage: 22,
    condition: 100,
    availability: "In stock",
    specifications: {
      capacity: "Container chassis 20ft",
      length: "9.6m",
      axles: 2,
      features: ["lightweight", "twist locks"],
      usedPriceRange: "$7,000 - $11,000"
    },
    image: "https://pub-cdn.sider.ai/u/U0KAH9N4VLX/web-coder/68fe87c0584c7e7f606af31d/resource/5d247234-399c-4d7e-9db7-b6e2130700c1.jpg",
    trailerClass: "Container Chassis"
  },
  {
    id: "schmetz-scf-30-2024",
    type: "trailer",
    category: "new",
    brand: "Schmetz Cargoball AG",
    model: "S.CF ALLROUND 30",
    year: 2024,
    price: 22000,
    tonnage: 32,
    condition: 100,
    availability: "In stock",
    specifications: {
      capacity: "Container chassis 30ft",
      length: "12.0m",
      axles: 3,
      features: ["robust frame", "twist locks"],
      usedPriceRange: "$11,000 - $18,000"
    },
    image: "https://pub-cdn.sider.ai/u/U0KAH9N4VLX/web-coder/68fe87c0584c7e7f606af31d/resource/5d247234-399c-4d7e-9db7-b6e2130700c1.jpg",
    trailerClass: "Container Chassis"
  },

  // --- Livestock Trailer (27-30) ---
  {
    id: "okp-livestock-2024",
    type: "trailer",
    category: "new",
    brand: "OKP Trailer",
    model: "Livestock",
    year: 2024,
    price: 21000,
    tonnage: 12,
    condition: 100,
    availability: "In stock",
    specifications: {
      capacity: "Livestock trailer",
      length: "10.0m",
      axles: 2,
      features: ["ventilation", "multi-deck"],
      usedPriceRange: "$11,000 - $16,000"
    },
    image: "https://pub-cdn.sider.ai/autoimage/livestock",
    trailerClass: "Livestock Trailer"
  },
  {
    id: "fike-fk35-2024",
    type: "trailer",
    category: "new",
    brand: "Fike",
    model: "FK35",
    year: 2024,
    price: 22000,
    tonnage: 13,
    condition: 100,
    availability: "In stock",
    specifications: {
      capacity: "Livestock trailer FK35",
      length: "10.5m",
      axles: 2,
      features: ["easy-clean", "ventilation"],
      usedPriceRange: "$10,000 - $15,000"
    },
    image: "https://pub-cdn.sider.ai/autoimage/livestock",
    trailerClass: "Livestock Trailer"
  },
  {
    id: "laci-lt55-2024",
    type: "trailer",
    category: "new",
    brand: "Laci Trailers",
    model: "LT55",
    year: 2024,
    price: 25000,
    tonnage: 15,
    condition: 100,
    availability: "2-3 weeks",
    specifications: {
      capacity: "Livestock trailer LT55",
      length: "11.0m",
      axles: 2,
      features: ["multi-deck", "drainage"],
      usedPriceRange: "$12,000 - $18,000"
    },
    image: "https://pub-cdn.sider.ai/autoimage/livestock",
    trailerClass: "Livestock Trailer"
  },
  {
    id: "shandeng-titan3-2024",
    type: "trailer",
    category: "new",
    brand: "Shandeng",
    model: "Titan 3",
    year: 2024,
    price: 30000,
    tonnage: 22,
    condition: 100,
    availability: "In stock",
    specifications: {
      capacity: "Large livestock trailer",
      length: "12.5m",
      axles: 3,
      features: ["high ventilation", "multi-compartment"],
      usedPriceRange: "$15,000 - $25,000"
    },
    image: "https://pub-cdn.sider.ai/autoimage/livestock",
    trailerClass: "Livestock Trailer"
  },

  // --- Flatbed Trailer additions (40-43) ---
  {
    id: "krune-sdp27-elbx10-sw-2024",
    type: "trailer",
    category: "new",
    brand: "Krune",
    model: "SDP 27 eLBX10-SW",
    year: 2024,
    price: 20000,
    tonnage: 18,
    condition: 100,
    availability: "In stock",
    specifications: {
      capacity: "Flatbed SDP 27",
      length: "12.5m",
      axles: 3,
      features: ["reinforced deck", "side rails"],
      usedPriceRange: "$11,000 - $16,000"
    },
    image: "https://pub-cdn.sider.ai/u/U0KAH9N4VLX/web-coder/68fe87c0584c7e7f606af31d/resource/7cf89531-0abc-4663-8478-538ae6aa0985.jpg",
    trailerClass: "Flatbed Trailer"
  },
  {
    id: "fusan-700mc-2024",
    type: "trailer",
    category: "new",
    brand: "Fusan Trailer",
    model: "700MC",
    year: 2024,
    price: 25000,
    tonnage: 20,
    condition: 100,
    availability: "In stock",
    specifications: {
      capacity: "Flatbed 700MC",
      length: "13.0m",
      axles: 3,
      features: ["steel deck", "multiple lashing points"],
      usedPriceRange: "$12,000 - $19,000"
    },
    image: "https://pub-cdn.sider.ai/u/U0KAH9N4VLX/web-coder/68fe87c0584c7e7f606af31d/resource/7cf89531-0abc-4663-8478-538ae6aa0985.jpg",
    trailerClass: "Flatbed Trailer"
  },
  {
    id: "zv-4axle-60-2024",
    type: "trailer",
    category: "new",
    brand: "ZV Group",
    model: "4 Axle 60",
    year: 2024,
    price: 67000,
    tonnage: 60,
    condition: 100,
    availability: "Made to order",
    specifications: {
      capacity: "Heavy-duty 4 axle flatbed",
      length: "16.0m",
      axles: 4,
      features: ["4-axle heavy frame", "air suspension"],
      usedPriceRange: "$43,000 - $52,000"
    },
    image: "https://pub-cdn.sider.ai/u/U0KAH9N4VLX/web-coder/68fe87c0584c7e7f606af31d/resource/9b6f4c90-ccf2-4427-98f3-1e9a9a8ba89b.jpg",
    trailerClass: "Flatbed Trailer"
  },
  {
    id: "alora-flatbed-used-2024",
    type: "trailer",
    category: "new",
    brand: "Alora Trailers",
    model: "Flatbed",
    year: 2024,
    price: 44000,
    tonnage: 38,
    condition: 100,
    availability: "In stock",
    specifications: {
      capacity: "General cargo flatbed",
      length: "13.6m",
      axles: 4,
      features: ["reinforced deck", "multiple tie-downs"],
      usedPriceRange: "$24,000 - $35,000"
    },
    image: "https://pub-cdn.sider.ai/u/U0KAH9N4VLX/web-coder/68fe87c0584c7e7f606af31d/resource/7cf89531-0abc-4663-8478-538ae6aa0985.jpg",
    trailerClass: "Flatbed Trailer"
  },

  // --- Industrial Tanker (44-47) ---
  {
    id: "alora-40ltr-2024",
    type: "trailer",
    category: "new",
    brand: "Alora Trailers",
    model: "40 LTR",
    year: 2024,
    price: 46000,
    tonnage: 40,
    condition: 100,
    availability: "In stock",
    specifications: {
      capacity: "Industrial tanker 40 LTR",
      length: "13.0m",
      axles: 4,
      features: ["reinforced plating", "safety valves"],
      usedPriceRange: "$26,000 - $38,000"
    },
    image: "https://pub-cdn.sider.ai/u/U0KAH9N4VLX/web-coder/68fe87c0584c7e7f606af31d/resource/ff9d534e-4e66-4f33-b2b2-fc36181467e1.jpg",
    trailerClass: "Industrial Tanker"
  },
  {
    id: "gurlesentil-glt3-2024",
    type: "trailer",
    category: "new",
    brand: "GurlesenTil",
    model: "GLT3",
    year: 2024,
    price: 36000,
    tonnage: 34,
    condition: 100,
    availability: "2-4 weeks",
    specifications: {
      capacity: "Industrial tanker GLT3",
      length: "13.2m",
      axles: 4,
      features: ["pressure monitors", "reinforced frame"],
      usedPriceRange: "$20,000 - $30,000"
    },
    image: "https://pub-cdn.sider.ai/u/U0KAH9N4VLX/web-coder/68fe87c0584c7e7f606af31d/resource/ff9d534e-4e66-4f33-b2b2-fc36181467e1.jpg",
    trailerClass: "Industrial Tanker"
  },
  {
    id: "niva-tanker-2024",
    type: "trailer",
    category: "new",
    brand: "Niva Trailer",
    model: "Tanker",
    year: 2024,
    price: 32000,
    tonnage: 32,
    condition: 100,
    availability: "In stock",
    specifications: {
      capacity: "Standard industrial tanker",
      length: "12.8m",
      axles: 3,
      features: ["spill containment", "pressure relief"],
      usedPriceRange: "$15,000 - $24,000"
    },
    image: "https://pub-cdn.sider.ai/u/U0KAH9N4VLX/web-coder/68fe87c0584c7e7f606af31d/resource/ff9d534e-4e66-4f33-b2b2-fc36181467e1.jpg",
    trailerClass: "Industrial Tanker"
  },
  {
    id: "sunskj-ss9400-2024",
    type: "trailer",
    category: "new",
    brand: "SunSkj",
    model: "SS9400",
    year: 2024,
    price: 29000,
    tonnage: 30,
    condition: 100,
    availability: "In stock",
    specifications: {
      capacity: "Industrial tanker SS9400",
      length: "12.5m",
      axles: 3,
      features: ["thermal insulation", "pressure monitors"],
      usedPriceRange: "$14,000 - $22,000"
    },
    image: "https://pub-cdn.sider.ai/u/U0KAH9N4VLX/web-coder/68fe87c0584c7e7f606af31d/resource/ff9d534e-4e66-4f33-b2b2-fc36181467e1.jpg",
    trailerClass: "Industrial Tanker"
  },

  // --- Curtainside Trailer (48-50) ---
  {
    id: "schmetz-curtainsider-standard-2024",
    type: "trailer",
    category: "new",
    brand: "Schmetz Cargoball AG",
    model: "Curtainsider Standard",
    year: 2024,
    price: 32000,
    tonnage: 30,
    condition: 100,
    availability: "4 days",
    specifications: {
      capacity: "Curtainsider standard",
      length: "13.6m",
      axles: 3,
      features: ["curtainside", "quick load", "secure tie rails"],
      usedPriceRange: "$15,000 - $24,000"
    },
    image: "https://pub-cdn.sider.ai/u/U0KAH9N4VLX/web-coder/68fe87c0584c7e7f606af31d/resource/dc0d5958-6fb5-47e7-b494-e9ae03586d2f.jpg",
    trailerClass: "Curtainside Trailer"
  },
  {
    id: "krune-auflieger-2024",
    type: "trailer",
    category: "new",
    brand: "Krune",
    model: "Auflieger",
    year: 2024,
    price: 37000,
    tonnage: 31,
    condition: 100,
    availability: "In stock",
    specifications: {
      capacity: "Curtainside Auflieger",
      length: "14.0m",
      axles: 4,
      features: ["reinforced curtains", "easy-access doors"],
      usedPriceRange: "$17,000 - $28,000"
    },
    image: "https://pub-cdn.sider.ai/u/U0KAH9N4VLX/web-coder/68fe87c0584c7e7f606af31d/resource/dc0d5958-6fb5-47e7-b494-e9ae03586d2f.jpg",
    trailerClass: "Curtainside Trailer"
  },
  {
    id: "kagel-sn24-2024",
    type: "trailer",
    category: "new",
    brand: "Kagel Trailer GmbH",
    model: "SN24",
    year: 2024,
    price: 32000,
    tonnage: 30,
    condition: 100,
    availability: "2-3 weeks",
    specifications: {
      capacity: "Curtainside SN24",
      length: "13.6m",
      axles: 3,
      features: ["fast loading", "secure tie rails"],
      usedPriceRange: "$15,000 - $24,000"
    },
    image: "https://pub-cdn.sider.ai/u/U0KAH9N4VLX/web-coder/68fe87c0584c7e7f606af31d/resource/dc0d5958-6fb5-47e7-b494-e9ae03586d2f.jpg",
    trailerClass: "Curtainside Trailer"
  }
];