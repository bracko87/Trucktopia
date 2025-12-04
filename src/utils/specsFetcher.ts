/**
 * specsFetcher.ts
 *
 * Utility to load vehicle/trailer technical specifications from data modules.
 *
 * Responsibilities:
 * - Attempt to import known data modules dynamically to avoid hard failures.
 * - Find a matching entry by model id or model name.
 * - Normalize and return a consistent spec shape.
 *
 * The loader is defensive: it tries several likely import paths and returns
 * a default empty spec object when nothing is found.
 */

 /**
  * VehicleSpecs
  * @description Normalized shape returned by the fetcher
  */
 export interface VehicleSpecs {
   modelId?: string;
   title?: string;
   capacity?: string | number; // e.g. "3.5 t" or number in tonnes
   engine?: string;
   reliability?: string | number;
   durability?: string | number;
   fuelConsumption?: string | number; // e.g. "6.5 L/100 km"
   maxSpeed?: string | number;
   maintenanceGroup?: string;
   year?: string | number;
   [key: string]: any;
 }

 /**
  * tryImport
  * @description Helper that attempts to dynamically import a module path and returns the module or null
  * @param path module path
  */
 async function tryImport(path: string) {
   try {
     // dynamic import so bundler keeps it safe
     // eslint-disable-next-line @typescript-eslint/no-var-requires
     const mod = await import(path);
     return mod && (mod.default || mod);
   } catch (e) {
     return null;
   }
 }

 /**
  * findInCollection
  * @description Try locate a matching item in a collection by common keys
  * @param collection array or object map
  * @param modelId modelId we are searching for
  */
 function findInCollection(collection: any, modelId: string | undefined) {
   if (!collection || !modelId) return null;

   // If collection is an object map keyed by id -> entry
   if (!Array.isArray(collection)) {
     if (collection[modelId]) return collection[modelId];
     // maybe keys are uppercase/lowercase
     const lower = modelId.toLowerCase();
     const foundKey = Object.keys(collection).find((k) => k.toLowerCase() === lower);
     if (foundKey) return collection[foundKey];
     // otherwise, try to look through values
     collection = Object.values(collection);
   }

   // If it's an array, search by common fields
   if (Array.isArray(collection)) {
     const lower = (modelId || '').toLowerCase();
     return collection.find((item: any) => {
       if (!item) return false;
       const candidates = [
         item.id,
         item.modelId,
         item.model,
         item.name,
         item.brand,
         item.title
       ].filter(Boolean);
       return candidates.some((c: string) => String(c).toLowerCase() === lower);
     }) || null;
   }

   return null;
 }

 /**
  * normalizeSpecs
  * @description Convert a raw entry into VehicleSpecs shape (best-effort)
  * @param entry raw data entry
  */
 function normalizeSpecs(entry: any): VehicleSpecs {
   if (!entry) return {};
   return {
     modelId: entry.id ?? entry.modelId ?? entry.model ?? entry.name ?? undefined,
     title: entry.title ?? entry.name ?? entry.model ?? undefined,
     capacity: entry.capacity ?? entry.tonnage ?? entry.payload ?? entry.maxPayload ?? undefined,
     engine: entry.engineDescription ?? entry.engine ?? entry['engine spec'] ?? undefined,
     reliability: entry.reliability ?? entry.reliabilityPct ?? undefined,
     durability: entry.durability ?? entry.durabilityPct ?? undefined,
     fuelConsumption: entry.fuelConsumption ?? entry.fuel ?? entry['fuel consumption'] ?? undefined,
     maxSpeed: entry.maxSpeed ?? entry.topSpeed ?? entry['max speed'] ?? undefined,
     maintenanceGroup: entry.maintenanceGroup ?? entry.maintenance ?? entry.maintenanceCategory ?? undefined,
     year: entry.year ?? entry.productionYear ?? undefined,
     ...entry
   };
 }

 /**
  * fetchVehicleSpecs
  * @description Attempt to fetch and return normalized specs for a given modelId.
  * It will try multiple likely data modules so it works across codebases.
  * @param modelId model identifier (e.g. 'xzu720' or 'Heno XZU720')
  * @returns VehicleSpecs
  */
 export async function fetchVehicleSpecs(modelId?: string): Promise<VehicleSpecs> {
   if (!modelId) return {};

   // list of module paths to try; order matters (more specific first)
   const candidatePaths = [
     '../data/trucks',
     '../data/trucks/index',
     '../../data/trucks',
     '../../data/trucks/index',
     '../data/trucks/big',
     '../data/trucks/medium',
     '../data/trucks/small',
     '../../data/trucks/big',
     '../../data/trucks/medium',
     '../../data/trucks/small'
   ];

   for (const p of candidatePaths) {
     // eslint-disable-next-line no-await-in-loop
     const mod = await tryImport(p);
     if (!mod) continue;

     // normalize exported shapes: could export an array, object map, or nested groups
     // search top-level export
     let entry = findInCollection(mod, modelId);
     if (!entry) {
       // if mod has a 'trucks' property or 'default' or 'data' try those
       entry = findInCollection(mod.trucks ?? mod.data ?? mod.items ?? null, modelId);
     }

     if (entry) {
       return normalizeSpecs(entry);
     }

     // Heuristic: if module exported multiple groups like { small: [...], medium: [...] }
     const groupKey = Object.keys(mod).find((k) => Array.isArray(mod[k]));
     if (groupKey) {
       entry = findInCollection(mod[groupKey], modelId);
       if (entry) return normalizeSpecs(entry);
     }
   }

   // Not found — return empty object
   return {};
 }