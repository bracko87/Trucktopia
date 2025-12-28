/**
 * money.ts
 *
 * Utilities for canonical money representation (cents-first) used across the frontend.
 *
 * Responsibilities:
 * - Convert between float amount (USD) and integer cents
 * - Ensure Company objects contain canonical cents fields (capital_cents / balance_cents)
 * - Provide lightweight migration helpers to make the frontend tolerant of mixed shapes
 */

/**
 * toCents
 * @description Convert a decimal currency value (e.g. 123.45) into integer cents (12345)
 * @param value number (dollars)
 */
export function toCents(value: number | null | undefined): number {
  const n = Number(value || 0);
  // Guard NaN
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

/**
 * fromCents
 * @description Convert integer cents into decimal form for display (e.g. 12345 -> 123.45)
 * @param cents number
 */
export function fromCents(cents: number | null | undefined): number {
  const n = Number(cents ?? 0);
  if (!Number.isFinite(n)) return 0;
  return n / 100;
}

/**
 * ensureCompanyCents
 * @description Ensure a company object has canonical cents fields. Mutates the passed object (intentional).
 *
 * Behavior:
 * - If company.capital_cents exists -> set company.capital = company.capital_cents / 100
 * - Else if company.capital exists -> set company.capital_cents = round(capital * 100)
 * - Same for balance_cents / balance
 *
 * This function is safe to call repeatedly (idempotent).
 *
 * @param company any (company-like object, mutated)
 */
export function ensureCompanyCents(company: any) {
  if (!company || typeof company !== 'object') return company;

  try {
    // Capital
    if (typeof company.capital_cents === 'number') {
      company.capital = fromCents(company.capital_cents);
    } else {
      // Accept capital as number or string
      const cap = typeof company.capital === 'number' ? company.capital : Number(company.capital ?? 0);
      company.capital_cents = toCents(cap);
      company.capital = fromCents(company.capital_cents);
    }

    // Balance (some backends use balance vs capital)
    if (typeof company.balance_cents === 'number') {
      company.balance = fromCents(company.balance_cents);
    } else {
      const bal = typeof company.balance === 'number' ? company.balance : Number(company.balance ?? company.capital ?? 0);
      company.balance_cents = toCents(bal);
      company.balance = fromCents(company.balance_cents);
    }
  } catch {
    // noop - keep original company if anything goes wrong
  }

  return company;
}

/**
 * migrateLocalSnapshotCents
 * @description Given a saved persisted snapshot (as object), ensure cents fields exist.
 * Useful when migrating localStorage snapshots that only had decimal fields.
 *
 * @param snapshot any
 * @returns mutated snapshot
 */
export function migrateLocalSnapshotCents(snapshot: any) {
  if (!snapshot || typeof snapshot !== 'object') return snapshot;
  try {
    if (snapshot.company) {
      ensureCompanyCents(snapshot.company);
    }
  } catch {
    // ignore
  }
  return snapshot;
}