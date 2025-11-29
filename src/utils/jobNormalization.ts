/**
 * jobNormalization.ts
 *
 * Utilities to normalize persisted job data on company load.
 *
 * Responsibilities:
 * - Convert legacy canonical job statuses ('loading') to the new canonical state 'preparing'
 * - Ensure canonical jobs (no parentJobId) always have deliveredTons (number) initialized
 *
 * This file provides a small migration helper that can be run once when a company is
 * restored from localStorage and will return whether any changes were made so the
 * caller may persist the sanitized company back to storage.
 */

/**
 * normalizeJobsOnLoad
 * @description Normalize company.activeJobs for older persisted data.
 *              - For canonical jobs (no parentJobId): convert status 'loading' -> 'preparing'
 *              - Ensure canonical jobs have deliveredTons initialized to a number (0 if missing)
 * @param company - company object possibly containing activeJobs
 * @returns object with normalized company and a boolean changed flag
 */
export function normalizeJobsOnLoad(company: any): { company: any; changed: boolean } {
  if (!company || !Array.isArray(company.activeJobs)) return { company, changed: false };

  let changed = false;
  const updatedJobs = company.activeJobs.map((j: any) => {
    if (!j || typeof j !== 'object') return j;
    const isCanonical = !j.parentJobId;
    if (!isCanonical) {
      // For clones we do not change status here. Leave clones intact.
      return j;
    }

    // Canonical job: ensure deliveredTons exists and is a number
    const deliveredPresent = typeof j.deliveredTons === 'number';
    const needsDelivered = !deliveredPresent;

    // Legacy status conversion: loading -> preparing
    const needsStatus = j.status === 'loading';

    if (needsDelivered || needsStatus) {
      changed = true;
      return {
        ...j,
        status: needsStatus ? 'preparing' : j.status,
        deliveredTons: needsDelivered ? 0 : j.deliveredTons
      };
    }

    return j;
  });

  if (changed) {
    const normalized = { ...company, activeJobs: updatedJobs };
    return { company: normalized, changed: true };
  }

  return { company, changed: false };
}
