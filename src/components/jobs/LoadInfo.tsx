/**
 * LoadInfo.tsx
 *
 * File-level:
 * Robust Load options renderer that normalizes, deduplicates and displays load buttons.
 *
 * Purpose:
 * - Parse incoming load option values (numbers or strings like "6t", "6.0", "6,0")
 * - Remove duplicates based on numeric equivalence (so 6, "6t", "6.0" are treated as the same)
 * - Preserve first-occurrence order when rendering options
 * - If the maximum numeric value appeared more than once in the original raw list,
 *   rename its button to "Full Load" (customizable via maxLabel)
 * - Expose selection callback and keep visual layout identical to existing UI (Tailwind)
 *
 * Notes:
 * - This implementation is defensive to handle varied input formats coming from legacy data.
 * - All functions and the component include concise jsdoc comments as required.
 */

import React, { useMemo } from 'react';

 /**
  * LoadInfoProps
  * @description Props accepted by LoadInfo component.
  */
 export interface LoadInfoProps {
   /** Total load of the job in tons (canonical) */
   totalTons: number;
   /** Truck capacity (tons). Use 0 when unknown. */
   truckTons?: number;
   /** Remaining tons still to be loaded (computed by caller) */
   remainingTons?: number;
   /** Optional explicit load option values (tons). If not provided a sane default is used. */
   loadOptions?: Array<number | string>;
   /** Optional callback when a load option is selected. */
   onSelectLoad?: (tons: number) => void;
   /** Currently selected load (tons) */
   selectedLoad?: number | null;
   /** Label used for the maximum duplicate value, defaults to "Full Load" */
   maxLabel?: string;
 }

 /**
  * formatTons
  * @description Format a numeric tons value for display (keeps 1 decimal if needed).
  * @param v number
  * @returns formatted string like "6t" or "4.5t"
  */
 function formatTons(v: number) {
   if (Number.isInteger(v)) return `${v}t`;
   return `${v.toFixed(1)}t`;
 }

 /**
  * parseNumericOption
  * @description Parse a provided load option (number|string) to a numeric ton value.
  * - Accepts numbers or strings like "6", "6t", "6.0", "6,0", " 6 t "
  * - Returns NaN for unparseable values.
  * @param opt number|string
  * @returns number
  */
 function parseNumericOption(opt: number | string): number {
   if (typeof opt === 'number') return Number.isFinite(opt) ? opt : NaN;
   if (typeof opt !== 'string') return NaN;
   // Extract first numeric-like token (allow comma decimal separators)
   const cleaned = opt.trim().replace(/\s+/g, '');
   // Replace comma decimal with dot (e.g. "6,5" => "6.5")
   const normalized = cleaned.replace(',', '.');
   // Match number (integer or decimal)
   const m = normalized.match(/-?\d+(\.\d+)?/);
   if (!m) return NaN;
   const n = parseFloat(m[0]);
   return Number.isFinite(n) ? n : NaN;
 }

 /**
  * LoadInfo
  * @description Presentational component that lists load options and shows totals.
  */
 const LoadInfo: React.FC<LoadInfoProps> = ({
   totalTons,
   truckTons = 0,
   remainingTons = 0,
   loadOptions,
   onSelectLoad,
   selectedLoad = null,
   maxLabel = 'Full Load',
 }) => {
   /**
    * computeOptions
    * @description Build the final option list while preserving first-occurrence order.
    * - Normalizes values to numeric tons, ignores non-finite values
    * - Removes duplicates by numeric equality (first occurrence kept)
    * - Keeps counts of original occurrences to decide when to apply maxLabel
    */
   const { uniqueValues, countsMap, maxValue } = useMemo(() => {
     // Determine raw input array
     const raw: Array<number | string> =
       Array.isArray(loadOptions) && loadOptions.length > 0
         ? loadOptions.slice()
         : (() => {
             const defaults: number[] = [1, 2, 4];
             if (truckTons && !defaults.includes(truckTons)) defaults.push(truckTons);
             return defaults;
           })();

     // Parse each raw item to numeric value (NaN filtered later)
     const parsed: number[] = raw.map((r) => parseNumericOption(r)).filter((n) => Number.isFinite(n) && n > 0);

     // Build counts for parsed numeric values (counts consider numeric equality)
     const counts = new Map<number, number>();
     for (const v of parsed) {
       counts.set(v, (counts.get(v) || 0) + 1);
     }

     // Build ordered unique array preserving first occurrence by numeric value
     const seen = new Set<number>();
     const uniq: number[] = [];
     for (const v of parsed) {
       if (!seen.has(v)) {
         seen.add(v);
         uniq.push(v);
       }
     }

     const max = uniq.length > 0 ? Math.max(...uniq) : 0;

     return { uniqueValues: uniq, countsMap: counts, maxValue: max };
   }, [loadOptions, truckTons]);

   /**
    * handleClick
    * @description Forward selection to parent callback.
    * @param v number
    */
   const handleClick = (v: number) => {
     try {
       if (typeof onSelectLoad === 'function') onSelectLoad(v);
     } catch {
       // swallow errors - presentational component
     }
   };

   return (
     <div>
       {/* Header summary */}
       <div className="flex items-center justify-between">
         <div>
           <div className="text-slate-400 text-xs">Load</div>
           <div className="text-white font-medium">{totalTons ? `${totalTons} t` : '—'}</div>
         </div>

         <div className="text-right">
           <div className="text-slate-400 text-xs">Remaining</div>
           <div className="text-white font-medium">{remainingTons ? `${remainingTons} t` : '0 t'}</div>
         </div>
       </div>

       {/* Options */}
       <div className="mt-3 flex flex-wrap gap-2">
         {uniqueValues.length === 0 ? (
           <div className="text-slate-400 text-sm">No load options</div>
         ) : (
           uniqueValues.map((v) => {
             // If this value is the maximum and there were duplicates for it in the original raw list,
             // show the friendly "Full Load" label instead of repeated numeric text.
             const wasDuplicate = (countsMap.get(v) || 0) > 1;
             const isMax = v === maxValue && maxValue > 0;
             const label = isMax && wasDuplicate ? maxLabel : formatTons(v);

             const isSelected = selectedLoad !== null && Number(selectedLoad) === v;

             return (
               <button
                 key={`load-${v}`}
                 onClick={() => handleClick(v)}
                 type="button"
                 className={`text-sm rounded-md px-3 py-1 ${
                   isSelected
                     ? 'bg-amber-500 text-black border border-amber-400'
                     : 'bg-slate-700 text-white border border-slate-600 hover:bg-slate-600'
                 }`}
                 aria-pressed={isSelected}
                 title={isMax && isSelected ? `${label} — selected` : label}
               >
                 {label}
               </button>
             );
           })
         )}
       </div>
     </div>
   );
 };

 export default LoadInfo;