/**
 * JobSanitizer.tsx
 *
 * Background helper component that ensures newly created or persisted jobs
 * use the canonical status format. It runs silently and persists changes via
 * createCompany when normalization is needed.
 *
 * Responsibilities:
 * - Run normalizeJobsOnLoad on company whenever it changes
 * - If normalization reports changes, persist the sanitized company immediately
 *   using createCompany to prevent newly accepted jobs from showing legacy
 *   statuses like "loading"
 */

import React, { useEffect, useRef } from 'react';
import { useGame } from '../contexts/GameContext';
import { normalizeJobsOnLoad } from '../utils/jobNormalization';

/**
 * JobSanitizer
 * @description Mount this component once in the app to automatically detect
 *              and normalize legacy job statuses (e.g. canonical 'loading')
 *              and persist the fixed company state.
 */
const JobSanitizer: React.FC = () => {
  const { gameState, createCompany } = useGame();
  const company = gameState?.company;
  const lastCompanyRef = useRef<any>(null);

  /**
   * effect: watch company and run normalization when company object identity changes
   * This prevents repeated writes in a tight loop and only persists when actual
   * changes are detected by normalizeJobsOnLoad.
   */
  useEffect(() => {
    try {
      if (!company) return;

      // Guard: avoid reprocessing the same object repeatedly
      if (lastCompanyRef.current === company) return;
      lastCompanyRef.current = company;

      // Run normalization utility: returns { company, changed }
      const result = normalizeJobsOnLoad(company);
      if (result && result.changed) {
        // Persist sanitized company via createCompany to update storage and runtime state
        // We clone to avoid accidental mutation of original reference
        const sanitized = JSON.parse(JSON.stringify(result.company));
        // Persist - createCompany should be the canonical persistence method in GameContext
        createCompany(sanitized);
        // Log for debugging: apps without console hacks will remain silent
        // eslint-disable-next-line no-console
        console.info('[JobSanitizer] Normalized job statuses and persisted company');
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[JobSanitizer] normalization failed', err);
    }
    // Intentionally run whenever company identity changes
  }, [company, createCompany]);

  return null;
};

export default JobSanitizer;
