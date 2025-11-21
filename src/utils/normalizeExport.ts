/**
 * normalizeExport.ts
 *
 * Utility to convert localStorage export (string values) into normalized JSON objects or arrays.
 * Handles double-stringified JSON (values stored as strings containing JSON).
 */

/**
 * normalizeExport
 * @param rawRecord Record of key -> string (localStorage snapshot)
 * @returns normalized object of key -> parsed value (arrays/objects/strings)
 */
export const normalizeExport = (rawRecord: Record<string, string>): Record<string, any> => {
  const out: Record<string, any> = {};

  Object.entries(rawRecord).forEach(([key, rawValue]) => {
    let parsed: any = rawValue;

    // Try to parse repeatedly up to 3 times to unwrap nested stringified JSON
    for (let attempt = 0; attempt < 3; attempt++) {
      if (typeof parsed === 'string') {
        try {
          const maybe = JSON.parse(parsed);
          parsed = maybe;
        } catch {
          // not JSON, break
          break;
        }
      } else {
        break;
      }
    }

    // If top-level is object with keys that are stringified items, try to normalize to array
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      // Convert object-of-items to array when values look like objects with ids
      const values = Object.values(parsed);
      if (values.length > 0 && values.every(v => typeof v === 'object')) {
        out[key] = values;
      } else {
        out[key] = parsed;
      }
    } else {
      out[key] = parsed;
    }
  });

  return out;
};