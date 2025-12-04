/**
 * UsedTruckModal.tsx
 *
 * Simple purchase modal for a used truck offer. Designed for the local prototype.
 *
 * Responsibilities:
 * - Render an offer and provide Purchase flow
 * - On purchase: validate funds, persist purchased truck, update company state via useGame()
 * - Remove the purchased offer from local offers storage
 */

import React from 'react';
import { Check, X } from 'lucide-react';
import { UsedTruckOffer, PurchasedTruck, addPurchasedTruck, removeOffer } from '../../utils/usedTrucksStorage';
import { useGame } from '../../contexts/GameContext';

interface Props {
  offer: UsedTruckOffer;
  open: boolean;
  onClose: () => void;
}

/**
 * UsedTruckModal
 * @description Modal to inspect & purchase a used truck offer
 */
const UsedTruckModal: React.FC<Props> = ({ offer, open, onClose }) => {
  const { gameState, createCompany } = useGame();

  if (!open) return null;

  /**
   * handlePurchase
   * @description Validate funds and perform local persistence + company update
   */
  const handlePurchase = () => {
    const company = gameState.company;
    if (!company) {
      alert('No company found. Create a company first.');
      return;
    }

    const price = offer.price;
    if (company.capital < price) {
      alert(`Insufficient funds. Need €${price.toLocaleString()}.`);
      return;
    }

    const now = new Date().toISOString();
    const purchased: PurchasedTruck = {
      id: `p-${offer.id}-${Date.now()}`,
      offerId: offer.id,
      modelId: offer.modelId,
      nickname: offer.title,
      purchasedAt: now,
      purchasePrice: price,
      condition: offer.condition,
      year: offer.year,
      km: offer.km,
      payload: offer.payload,
      specs: offer.specs
    };

    // Persist purchased truck to localStorage map
    addPurchasedTruck(company.id, purchased);

    // Update in-memory company (best-effort). If createCompany is not present,
    // persistence is still available in localStorage for the prototype.
    try {
      const updatedCompany = {
        ...company,
        capital: (company.capital || 0) - price,
        trucks: [...(company.trucks || []), purchased]
      };
      createCompany(updatedCompany);
    } catch (e) {
      console.warn('createCompany update failed (maybe not available)', e);
    }

    // Remove the offer so it can't be bought twice
    removeOffer(offer.id);

    alert(`Purchased ${offer.title} for €${price.toLocaleString()}.`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-xl mx-4 bg-slate-800 rounded-xl border border-slate-700 p-6 z-10">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">{offer.title}</h3>
            <div className="text-sm text-slate-400 mt-1">Model: {offer.modelId || '—'}</div>
          </div>

          <div className="flex items-center space-x-2">
            <button onClick={onClose} className="text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-300">
          <div>
            <div className="text-xs text-slate-400">Year</div>
            <div className="text-white font-medium">{offer.year ?? '—'}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Condition</div>
            <div className="text-white font-medium">{offer.condition ? `${offer.condition}%` : '—'}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Kilometres</div>
            <div className="text-white font-medium">{offer.km?.toLocaleString() ?? '—'}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Payload</div>
            <div className="text-white font-medium">{offer.payload ? `${offer.payload} t` : '—'}</div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <div>
            <div className="text-sm text-slate-400">Price</div>
            <div className="text-2xl font-bold text-amber-400">€{offer.price.toLocaleString()}</div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg"
            >
              Cancel
            </button>

            <button
              onClick={handlePurchase}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg inline-flex items-center space-x-2"
            >
              <Check className="w-4 h-4" />
              <span>Purchase</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsedTruckModal;
