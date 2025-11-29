/**
 * src/components/market/PurchaseButton.tsx
 *
 * Small, reusable purchase button used by market listing cards.
 *
 * Responsibilities:
 * - Provide a single place to handle purchase events so purchased items are normalized
 *   and added to company.trucks or company.trailers correctly.
 * - Persist company changes using GameContext.createCompany when available.
 *
 * Usage:
 * - Replace inline purchase handlers with this component or call assignPurchasedToCompany(...)
 *   from your purchase flow.
 *
 * Note:
 * - This component is intentionally simple and does not perform actual payment logic.
 *   It assumes the purchase succeeded (or the caller supplies a confirmPurchase function).
 */

import React, { useState } from 'react';
import { useGame } from '../../contexts/GameContext';
import { assignPurchasedToCompany } from '../../utils/vehiclePurchaseUtils';
import type { VehicleKind } from '../../utils/vehiclePurchaseUtils';

interface Props {
  /** The raw listing / vehicle object returned by the market */
  item: any;
  /** Optional label for the button */
  label?: string;
  /** Optional callback invoked after successful createCompany(updatedCompany) */
  onDone?: (updatedCompany: any, item: any) => void;
  /** Optional confirm function that performs the actual purchase (e.g. call to API).
   * If provided it should return a Promise that resolves when purchase is complete.
   * If omitted, the button will only run local normalization & persistence. */
  confirmPurchase?: (item: any) => Promise<any> | any;
  /** Optional: desired vehicleKind override (rare). Use 'truck'|'trailer' to force placement. */
  forceKind?: VehicleKind | undefined;
}

/**
 * PurchaseButton
 * @description Reusable purchase button that normalizes purchased items and persists them
 *              into the company using GameContext.createCompany.
 */
const PurchaseButton: React.FC<Props> = ({ item, label = 'Purchase', onDone, confirmPurchase, forceKind }) => {
  const { gameState, createCompany } = useGame();
  const [loading, setLoading] = useState(false);
  const company = gameState?.company ?? null;

  /**
   * handleClick
   * @description Perform optional confirmPurchase then normalize & assign the purchased item
   *              into the company via assignPurchasedToCompany and persist with createCompany.
   */
  const handleClick = async () => {
    setLoading(true);
    try {
      // If the caller supplied a confirmPurchase hook (e.g. API call), run it first
      if (typeof confirmPurchase === 'function') {
        await confirmPurchase(item);
      }

      // If forceKind is provided, ensure item has vehicleKind set before assigning
      const itemToAssign = forceKind ? { ...item, vehicleKind: forceKind } : item;

      const updated = assignPurchasedToCompany(company, itemToAssign);

      if (typeof createCompany === 'function') {
        // Persist via createCompany. Some contexts might return the updated company; ignore for now.
        createCompany(updated);
      } else {
        // eslint-disable-next-line no-console
        console.warn('PurchaseButton: createCompany not available; normalization applied locally only.');
      }

      if (typeof onDone === 'function') {
        onDone(updated, itemToAssign);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('PurchaseButton: purchase failed', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="inline-flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md text-sm transition-colors disabled:opacity-60"
    >
      <span>{loading ? 'Processing...' : label}</span>
    </button>
  );
};

export default PurchaseButton;