
/**
 * src/data/trailer-additions.ts
 *
 * Purpose:
 * - Append additional trailer entries into the canonical TRAILERS array at runtime.
 * - Uses in-place mutation so existing imports keep the same array reference.
 *
 * Note:
 * - This file only runs for its side-effects and should be imported early (App.tsx).
 * - Each entry includes explicit trailerClass and used price range fields for UI consumption.
 */

/**
 * Ensure runtime access to the project's TRAILERS array.
 * If TRAILERS cannot be imported, we fail gracefully (no crash).
 */
import { TRAILERS } from './trailers';

(function addTrailerAdditions() {
  try {
    if (!Array.isArray(TRAILERS)) return;

    /**
     * New trailer entries requested by the user.
     * Each object keeps a minimal consistent shape used by VehicleMarket:
     * - id: stable string used by overrides
     * - brand: manufacturer/company
     * - model: model name
     * - tonnage: numeric tonnage
     * - price: new price (number)
     * - type: 'trailer'
     * - category: 'new' (these are new listings)
     * - trailerClass: human-readable class label used by filters
     * - availability: textual availability
     * - specifications: object with optional fields; includes usedPriceRange (string)
     * - usedPriceMin / usedPriceMax numeric for programmatic filtering if needed
     */
    const additions = [
      // Car Carrier
      {
        id: 'aksaylu-yr2-2024',
        brand: 'Aksaylu',
        model: 'YR2',
        tonnage: 21,
        price: 45000,
        type: 'trailer',
        category: 'new',
        trailerClass: 'Car Carrier',
        availability: 'in stock',
        condition: 100,
        specifications: {
          capacity: 'Multi-level Car Carrier',
          features: ['multi-level', 'vehicle ramps', 'telescopic decks'],
          usedPriceRange: '$27,000 - $36,000'
        },
        usedPriceMin: 27000,
        usedPriceMax: 36000
      },
      {
        id: 'kassbahrer-ksok-2024',
        brand: 'Kassbahrer',
        model: 'K.SOK',
        tonnage: 25,
        price: 49000,
        type: 'trailer',
        category: 'new',
        trailerClass: 'Car Carrier',
        availability: 'in stock',
        condition: 100,
        specifications: {
          capacity: 'Standard hydraulic ramp Carier',
          features: ['multi-level', 'hydraulic ramps', 'heavy-duty deck'],
          usedPriceRange: '$30,000 - $41,000'
        },
        usedPriceMin: 30000,
        usedPriceMax: 41000
      },
      {
        id: 'kassbahrer-capitan-2024',
        brand: 'Kassbahrer',
        model: 'Capitan',
        tonnage: 28,
        price: 55000,
        type: 'trailer',
        category: 'new',
        trailerClass: 'Car Carrier',
        availability: 'in stock',
        condition: 100,
        specifications: {
          capacity: 'Closed multi-level carrier',
          features: ['multi-level', 'adjustable decks', 'vehicle restraints'],
          usedPriceRange: '$36,000 - $47,000'
        },
        usedPriceMin: 36000,
        usedPriceMax: 47000
      },

      // Hopper Bottom Trailer
      {
        id: 'hoalong-q345-2024',
        brand: 'Hoalong',
        model: 'Q345',
        tonnage: 26,
        price: 28000,
        type: 'trailer',
        category: 'new',
        trailerClass: 'Hopper Bottom Trailer',
        availability: 'in stock',
        condition: 100,
        specifications: {
          capacity: 'Reinforced hopper26t',
          features: ['quick-release gates', 'reinforced hopper', 'hydraulic discharge'],
          usedPriceRange: '$15,000 - $22,000'
        },
        usedPriceMin: 15000,
        usedPriceMax: 22000
      },
      {
        id: 'hoalong-12r-2024',
        brand: 'Hoalong',
        model: '12R',
        tonnage: 51,
        price: 48000,
        type: 'trailer',
        category: 'new',
        trailerClass: 'Hopper Bottom Trailer',
        availability: 'in stock',
        condition: 100,
        specifications: {
          capacity: 'Reinforced chassis Hopper',
          features: ['high capacity', 'multi-compartment', 'reinforced chassis'],
          usedPriceRange: '$33,000 - $41,000'
        },
        usedPriceMin: 33000,
        usedPriceMax: 41000
      },
      {
        id: 'dimco-780-2024',
        brand: 'Dimco',
        model: '780',
        tonnage: 18,
        price: 20000,
        type: 'trailer',
        category: 'new',
        trailerClass: 'Hopper Bottom Trailer',
        availability: 'in stock',
        condition: 100,
        specifications: {
          capacity: 'Lightweight Hopper',
          features: ['lightweight body', 'hydraulic gate', 'easy unload'],
          usedPriceRange: '$24,000 - $35,000'
        },
        usedPriceMin: 24000,
        usedPriceMax: 35000
      },

      // Lowboy Trailer
      {
        id: 'goldhafer-stz-vl3-2024',
        brand: 'Goldhafer',
        model: 'STZ-VL3',
        tonnage: 42,
        price: 62000,
        type: 'trailer',
        category: 'new',
        trailerClass: 'Lowboy Trailer',
        availability: 'in stock',
        condition: 100,
        specifications: {
          capacity: 'Low profile Lowboy',
          features: ['low profile', 'heavy-duty', 'extendable'],
          usedPriceRange: '$45,000 - $55,000'
        },
        usedPriceMin: 45000,
        usedPriceMax: 55000
      },
      {
        id: 'panton-txc-343-2024',
        brand: 'Panton',
        model: 'TXC-343',
        tonnage: 37,
        price: 51000,
        type: 'trailer',
        category: 'new',
        trailerClass: 'Lowboy Trailer',
        availability: 'in stock',
        condition: 100,
        specifications: {
          capacity: 'Reinforced axles Trailer',
          features: ['extendable ramps', 'reinforced axles', 'low deck'],
          usedPriceRange: '$31,000 - $44,000'
        },
        usedPriceMin: 31000,
        usedPriceMax: 44000
      },
      {
        id: 'cinotruk-80k-2024',
        brand: 'Cinotruk',
        model: '80K',
        tonnage: 80,
        price: 97000,
        type: 'trailer',
        category: 'new',
        trailerClass: 'Lowboy Trailer',
        availability: 'in stock',
        condition: 100,
        specifications: {
          capacity: 'Heavy haul Lowboy',
          features: ['heavy haul', 'multi-axle', 'hydraulic gooseneck'],
          usedPriceRange: '$73,000 - $82,000'
        },
        usedPriceMin: 73000,
        usedPriceMax: 82000
      },

      // Reefer Trailer
      {
        id: 'schmetz-reefer-standard-2024',
        brand: 'Schmetz Cargoball AG',
        model: 'Reefer Standard',
        tonnage: 30,
        price: 44000,
        type: 'trailer',
        category: 'new',
        trailerClass: 'Reefer Trailer',
        availability: 'in stock',
        condition: 100,
        specifications: {
          capacity: 'Reefer Standard',
          features: ['temperature control', 'insulated body', 'stainless interior'],
          usedPriceRange: '$25,000 - $33,000'
        },
        usedPriceMin: 25000,
        usedPriceMax: 33000
      },
      {
        id: 'krune-reefer-standard-2024',
        brand: 'Krune',
        model: 'Reefer Standard',
        tonnage: 29,
        price: 42000,
        type: 'trailer',
        category: 'new',
        trailerClass: 'Reefer Trailer',
        availability: 'in stock',
        condition: 100,
        specifications: {
          capacity: 'Temp control Reefer',
          features: ['temp control', 'air circulation', 'food-grade'],
          usedPriceRange: '$24,000 - $32,000'
        },
        usedPriceMin: 24000,
        usedPriceMax: 32000
      },
      {
        id: 'schmetz-skoe-cool-2024',
        brand: 'Schmetz Cargoball AG',
        model: 'S.KOe COOL',
        tonnage: 28,
        price: 41000,
        type: 'trailer',
        category: 'new',
        trailerClass: 'Reefer Trailer',
        availability: 'in stock',
        condition: 100,
        specifications: {
          capacity: 'S.KOe cooling Reefer',
          features: ['S.KOe cooling', 'thermo-insulation', 'remote monitoring'],
          usedPriceRange: '$26,000 - $34,000'
        },
        usedPriceMin: 26000,
        usedPriceMax: 34000
      },

      // Box Trailers
      {
        id: 'schmetz-trockenfracht-2024',
        brand: 'Schmetz Cargoball AG',
        model: 'Trockenfrachtkoffer Standard',
        tonnage: 27,
        price: 51000,
        type: 'trailer',
        category: 'new',
        trailerClass: 'Box Trailer',
        availability: 'in stock',
        condition: 100,
        specifications: {
          capacity: 'Dry freight Box',
          features: ['dry freight', 'insulated panels'],
          usedPriceRange: '$24,000 - $39,000'
        },
        usedPriceMin: 24000,
        usedPriceMax: 39000
      },
      {
        id: 'telson-tgg-tal-2024',
        brand: 'Telson Trailer AS',
        model: 'TGG TAL 12/18 Mega',
        tonnage: 22,
        price: 44000,
        type: 'trailer',
        category: 'new',
        trailerClass: 'Box Trailer',
        availability: 'in stock',
        condition: 100,
        specifications: {
          capacity: 'Standard Box',
          features: ['mega box', 'high-volume', 'reinforced floor'],
          usedPriceRange: '$20,000 - $32,000'
        },
        usedPriceMin: 20000,
        usedPriceMax: 32000
      },
      {
        id: 'krune-drylinder-2024',
        brand: 'Krune',
        model: 'Dry Liner',
        tonnage: 30,
        price: 57000,
        type: 'trailer',
        category: 'new',
        trailerClass: 'Box Trailer',
        availability: 'in stock',
        condition: 100,
        specifications: {
          capacity: 'Dryliner Box',
          features: ['dryliner', 'multi-door', 'cargo straps'],
          usedPriceRange: '$28,000 - $46,000'
        },
        usedPriceMin: 28000,
        usedPriceMax: 46000
      },
      {
        id: 'kagel-kagelbox-2024',
        brand: 'Kagel Trailer GmbH',
        model: 'Kagel Box',
        tonnage: 32,
        price: 61000,
        type: 'trailer',
        category: 'new',
        trailerClass: 'Box Trailer',
        availability: 'in stock',
        condition: 100,
        specifications: {
          capacity: 'Reinforced box',
          features: ['reinforced box', 'air suspension', 'side doors'],
          usedPriceRange: '$32,000 - $49,000'
        },
        usedPriceMin: 32000,
        usedPriceMax: 49000
      }
    ];

    // Append additions while avoiding id collisions
    for (const item of additions) {
      const exists = TRAILERS.find(t => String(t.id).toLowerCase() === String(item.id).toLowerCase());
      if (!exists) {
        TRAILERS.push(item);
      } else {
        // If an entry exists, update missing fields without overwriting entire object
        const idx = TRAILERS.indexOf(exists);
        TRAILERS[idx] = { ...exists, ...item };
      }
    }
  } catch (err) {
    // Do not throw to avoid breaking app; log in dev for visibility.
    // eslint-disable-next-line no-console
    console.error('trailer-additions: failed to append trailers', err);
  }
})();
