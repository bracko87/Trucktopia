/**
 * TestDeliveryInjector.tsx
 *
 * Silent test helper that injects a single delivered truck into the current company.
 *
 * Purpose:
 * - For testing and debugging: create a single truck in company.trucks so Garage shows it.
 * - Uses GameContext.createCompany for persistence so it follows the app's normalization/persistence flows.
 *
 * Notes:
 * - This runs only once per browser session per user/company (sessionStorage guard).
 * - The injected truck includes a small `__testInjected` marker to avoid duplicate injections.
 */

import React, { useEffect } from 'react';
import { useGame } from '../../contexts/GameContext';

/**
 * TestDeliveryInjector
 *
 * Adds a single test truck to the current company (if none already injected).
 * This component is invisible (returns null) and safe: it bails out when no company exists
 * or when an injection marker is present.
 */
const TestDeliveryInjector: React.FC = () => {
  const { gameState, createCompany } = useGame();

  useEffect(() => {
    try {
      const company = gameState.company as any;
      const currentUser = gameState.currentUser || 'anonymous';

      // Guard: company must exist and createCompany must be available
      if (!company || typeof createCompany !== 'function') return;

      // Session guard to avoid repeated injections in same session
      const sessionKey = `tm_test_truck_injected_${currentUser}`;
      if (sessionStorage.getItem(sessionKey)) return;

      // If the company already contains an injected test truck, mark session and bail out
      const hasInjected = Array.isArray(company.trucks) && company.trucks.some((t: any) => t && (t.__testInjected === true || (typeof t.id === 'string' && t.id.startsWith('test-inject-'))));
      if (hasInjected) {
        sessionStorage.setItem(sessionKey, '1');
        return;
      }

      // Build a minimal truck object compatible with the app's expected shape.
      // Fields chosen conservatively to avoid breaking normalization.
      const truck = {
        id: `test-inject-${Date.now()}`,
        make: 'Iveco',
        model: 'Stralis AS 440',
        name: 'Iveco Stralis AS 440',
        status: 'available',
        kilometers: 0,
        condition: 100,
        purchasedDate: new Date().toISOString(),
        price: 120000,
        // marker so subsequent runs will ignore this truck
        __testInjected: true
      };

      // Ensure trucks array exists and append the truck
      const updatedCompany = {
        ...company,
        trucks: Array.isArray(company.trucks) ? [...company.trucks, truck] : [truck]
      };

      // Persist via createCompany so the app's normalization and persistence apply
      try {
        createCompany(updatedCompany);
        // mark session so we don't inject again in the same session
        sessionStorage.setItem(sessionKey, '1');
        // A lightweight console notice for debugging
        // (Do not use alert to avoid visual disruption)
        // eslint-disable-next-line no-console
        console.info('[TestDeliveryInjector] injected test truck', truck.id);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[TestDeliveryInjector] createCompany failed', err);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[TestDeliveryInjector] unexpected error', err);
    }
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
};

export default TestDeliveryInjector;