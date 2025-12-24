/**
 * BuildHubModal.tsx
 */

import React from 'react';
import { nowUtcMs } from '../../utils/gameClock';

interface Props {
  open: boolean;
  countryCode: string;
  countryName: string;
  city: string;
  onClose: () => void;
  onConfirm: (payload: { estimatedPrice: number; chosenDays: number; completionGameMs: number }) => void;
}

/**
 * Deterministic Price Engine
 * Generates unique prices per city (e.g., $545k, $613k)
 */
function getBasePrice(city: string, countryCode: string) {
  let hash = 0;
  const str = city + countryCode;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const variance = Math.abs(hash % 250000); // Up to $250k variance
  return 500000 + variance;
}

const BuildHubModal: React.FC<Props> = ({ open, countryCode, countryName, city, onClose, onConfirm }) => {
  const MIN_DAYS = 40;
  const MAX_DAYS = 60;
  const [selectedDays, setSelectedDays] = React.useState<number>(MAX_DAYS);

  if (!open) return null;

  const basePrice = getBasePrice(city, countryCode);
  const daysSaved = MAX_DAYS - selectedDays;
  const premium = basePrice * (daysSaved * 0.01); // 1% per day saved
  const finalPrice = Math.round(basePrice + premium);
  
  const completionGameMs = Math.floor(nowUtcMs() + selectedDays * 24 * 60 * 60 * 1000);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-slate-700 flex justify-between items-center">
          <h3 className="text-xl font-bold text-white">Construction Proposal</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-center space-x-4 bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
            <div className="w-12 h-8 rounded bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400 border border-slate-700">
              {countryCode.toUpperCase()}
            </div>
            <div>
              <div className="text-white font-bold">{city}</div>
              <div className="text-xs text-slate-500 uppercase tracking-widest">{countryName}</div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-3">Construction Speed</label>
            <input
              type="range"
              min={MIN_DAYS}
              max={MAX_DAYS}
              value={selectedDays}
              onChange={(e) => setSelectedDays(Number(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <div className="flex justify-between text-[10px] font-bold text-slate-500 mt-2 uppercase">
              <span>Fast (40 Days)</span>
              <span className="text-indigo-400">Target: {selectedDays} Days</span>
              <span>Standard (60 Days)</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
              <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Base Price</div>
              <div className="text-white font-mono">${Math.round(basePrice).toLocaleString()}</div>
            </div>
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
              <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Speed Premium (1%/day)</div>
              <div className="text-amber-400 font-mono">+${Math.round(premium).toLocaleString()}</div>
            </div>
          </div>

          <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl">
            <div className="text-[10px] font-bold text-indigo-400 uppercase mb-1">Total Investment</div>
            <div className="text-2xl font-black text-white">${finalPrice.toLocaleString()}</div>
          </div>
        </div>

        <div className="p-6 bg-slate-900/50 flex space-x-3">
          <button onClick={onClose} className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-400 hover:text-white transition-colors">Cancel</button>
          <button
            onClick={() => onConfirm({ estimatedPrice: finalPrice, chosenDays: selectedDays, completionGameMs })}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-3 rounded-xl font-bold shadow-lg shadow-indigo-600/20 transition-all"
          >
            Confirm Build
          </button>
        </div>
      </div>
    </div>
  );
};

export default BuildHubModal;