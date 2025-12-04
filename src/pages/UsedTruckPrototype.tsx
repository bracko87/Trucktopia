/**
 * UsedTruckPrototype.tsx
 *
 * Simple local prototype page for seeding, listing and purchasing used truck offers.
 * Uses localStorage for persistence (tm_used_truck_offers, tm_purchased_trucks).
 *
 * How to use:
 *  - Open /used-trucks-prototype
 *  - Click "Seed Sample Offers" to create demo offers
 *  - Click "Purchase" to buy an offer (it will be moved to purchased map and removed from offers)
 *  - Inspect localStorage keys to verify persistence
 *
 * This file is intentionally small and self-contained so you can test the flow quickly.
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useGame } from '../contexts/GameContext';
import { Euro, Truck, Download, Trash2 } from 'lucide-react';

interface UsedTruckOffer {
  id: string;
  name: string;
  modelId?: string;
  year?: number;
  condition?: number;
  km?: number;
  price: number;
  payload?: number;
  availableInDays?: number;
  createdAt: string;
}

/**
 * storage helpers
 * - getOffers / setOffers: tm_used_truck_offers
 * - getPurchasedMap / setPurchasedMap: tm_purchased_trucks (record keyed by companyId)
 */
const OFFERS_KEY = 'tm_used_truck_offers';
const PURCHASED_KEY = 'tm_purchased_trucks';

function readOffers(): UsedTruckOffer[] {
  try {
    const raw = localStorage.getItem(OFFERS_KEY);
    return raw ? (JSON.parse(raw) as UsedTruckOffer[]) : [];
  } catch (e) {
    console.warn('readOffers error', e);
    return [];
  }
}

function writeOffers(items: UsedTruckOffer[]) {
  localStorage.setItem(OFFERS_KEY, JSON.stringify(items));
}

function readPurchasedMap(): Record<string, UsedTruckOffer[]> {
  try {
    const raw = localStorage.getItem(PURCHASED_KEY);
    return raw ? (JSON.parse(raw) as Record<string, UsedTruckOffer[]>) : {};
  } catch (e) {
    console.warn('readPurchasedMap error', e);
    return {};
  }
}

function writePurchasedMap(map: Record<string, UsedTruckOffer[]>) {
  localStorage.setItem(PURCHASED_KEY, JSON.stringify(map));
}

/**
 * seedOffers
 * @description Create a few demo offers for testing
 */
function seedOffers(companyCountry = 'de'): UsedTruckOffer[] {
  const now = Date.now();
  const samples: UsedTruckOffer[] = [
    {
      id: `heno-xzu-${now}-1`,
      name: 'Heno XZU720',
      modelId: 'heno-xzu720',
      year: 2017,
      condition: 68,
      km: 272300,
      price: 12600,
      payload: 3.5,
      availableInDays: 1,
      createdAt: new Date().toISOString()
    },
    {
      id: `heno-xzu-${now}-2`,
      name: 'Heno XZU720 (Like New)',
      modelId: 'heno-xzu720-2025',
      year: 2025,
      condition: 100,
      km: 0,
      price: 31500,
      payload: 7.5,
      availableInDays: 0,
      createdAt: new Date().toISOString()
    },
    {
      id: `mega-trk-${now}-1`,
      name: 'MegaTrk M200',
      modelId: 'mega-m200',
      year: 2019,
      condition: 80,
      km: 150000,
      price: 18200,
      payload: 12,
      availableInDays: 3,
      createdAt: new Date().toISOString()
    }
  ];
  writeOffers(samples);
  return samples;
}

/**
 * UsedTruckPrototype
 * @description Prototype UI for local testing of used truck offers and purchase -> persistence flow.
 */
const UsedTruckPrototype: React.FC = () => {
  const navigate = useNavigate();
  const { gameState, createCompany } = useGame();
  const [offers, setOffers] = useState<UsedTruckOffer[]>([]);
  const [purchasedMap, setPurchasedMap] = useState<Record<string, UsedTruckOffer[]>>(readPurchasedMap());

  useEffect(() => {
    setOffers(readOffers());
  }, []);

  const handleSeed = () => {
    const s = seedOffers();
    setOffers(s);
    alert('Sample offers seeded to localStorage.');
  };

  const handleClearOffers = () => {
    writeOffers([]);
    setOffers([]);
  };

  const handleClearPurchased = () => {
    writePurchasedMap({});
    setPurchasedMap({});
  };

  const handlePurchase = (offer: UsedTruckOffer) => {
    if (!gameState.company) {
      alert('No company found in GameContext. Create a company first or mock one.');
      return;
    }

    const company = gameState.company;
    // simple check: require capital >= price
    if ((company.capital ?? 0) < offer.price) {
      alert(`Insufficient funds. Company balance: €${(company.capital ?? 0).toLocaleString()}`);
      return;
    }

    // Deduct price and add truck to company.trucks (best-effort)
    const newCapital = (company.capital ?? 0) - offer.price;
    const newTruck = {
      id: `purchased-${offer.id}`,
      modelId: offer.modelId,
      name: offer.name,
      year: offer.year,
      condition: offer.condition,
      km: offer.km,
      payload: offer.payload,
      purchasedAt: new Date().toISOString(),
      purchasePrice: offer.price
    };

    const updatedCompany = {
      ...company,
      capital: newCapital,
      // append to company.trucks if exists otherwise create simple array field
      trucks: [...(company.trucks || []), newTruck]
    };

    // Persist with createCompany if available
    if (createCompany) {
      createCompany(updatedCompany);
    } else {
      console.warn('createCompany() not available in GameContext. Change context updater to persist changes in-app.');
    }

    // Update purchased map in localStorage
    const map = readPurchasedMap();
    const companyId = company.id ?? 'local';
    map[companyId] = map[companyId] || [];
    map[companyId].push(offer);
    writePurchasedMap(map);
    setPurchasedMap(map);

    // Remove offer from offers list
    const remaining = offers.filter((o) => o.id !== offer.id);
    writeOffers(remaining);
    setOffers(remaining);

    alert(`Purchased ${offer.name} for €${offer.price.toLocaleString()}. Company capital updated.`);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Used Trucks Prototype</h1>
          <p className="text-slate-400">Local test page: seed offers, purchase and check localStorage.</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-slate-400">Company Balance</div>
          <div className="text-2xl font-bold text-green-400">€{(gameState.company?.capital ?? 0).toLocaleString()}</div>
        </div>
      </div>

      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
        <div className="flex items-center space-x-2 mb-3">
          <button onClick={handleSeed} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg inline-flex items-center space-x-2">
            <Download className="w-4 h-4" />
            <span>Seed Sample Offers</span>
          </button>
          <button onClick={() => { navigator.clipboard.writeText(JSON.stringify(readOffers(), null, 2)); alert('Offers copied to clipboard'); }} className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-lg">
            Copy Offers
          </button>
          <button onClick={handleClearOffers} className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-2 rounded-lg">Clear Offers</button>
          <button onClick={handleClearPurchased} className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-2 rounded-lg">Clear Purchased</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {offers.length === 0 ? (
            <div className="p-6 bg-slate-700 rounded-lg text-slate-300">No offers available. Click "Seed Sample Offers" to populate.</div>
          ) : (
            offers.map((o) => (
              <div key={o.id} className="bg-slate-700 rounded-lg p-4 border border-slate-600 flex items-start justify-between">
                <div>
                  <div className="text-white font-medium">{o.name}</div>
                  <div className="text-sm text-slate-400">{o.year ?? '—'} • {o.condition ?? '—'}% • {o.km?.toLocaleString() ?? '—'} km</div>
                  <div className="text-sm text-slate-300 mt-2">Payload: {o.payload ?? '—'}t</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-amber-400">€{o.price.toLocaleString()}</div>
                  <div className="text-xs text-slate-400 mb-2">Available in: {o.availableInDays ?? 0}d</div>
                  <div className="flex flex-col gap-2">
                    <button onClick={() => handlePurchase(o)} className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg inline-flex items-center justify-center">
                      <Truck className="w-4 h-4 mr-2" />
                      Purchase
                    </button>
                    <button onClick={() => { const remaining = offers.filter(x => x.id !== o.id); writeOffers(remaining); setOffers(remaining); }} className="bg-slate-600 hover:bg-slate-500 text-white px-3 py-2 rounded-lg inline-flex items-center justify-center">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-2">Purchased Trucks (localStorage)</h3>
        <pre className="text-xs text-slate-300 max-h-64 overflow-auto bg-slate-700 p-3 rounded">{JSON.stringify(purchasedMap, null, 2)}</pre>
      </div>

      <div className="text-sm text-slate-400">
        Quick checks:
        <ul className="list-disc ml-5 mt-2">
          <li>localStorage keys: <code>{OFFERS_KEY}</code> and <code>{PURCHASED_KEY}</code></li>
          <li>Company updates call createCompany(updatedCompany) if your GameContext supports it</li>
        </ul>
      </div>
    </div>
  );
};

export default UsedTruckPrototype;