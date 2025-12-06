/**
 * BuildHubModal.tsx
 *
 * Modal dialog used when the user confirms building a hub.
 *
 * Responsibilities:
 * - Present an estimated price and a selectable completion date within a 45-60 day window
 * - Allow the user to confirm or cancel the build request
 * - Return chosenDays and compute completionGameMs relative to the authoritative game clock
 */

import React from 'react';
import { nowUtcMs } from '../../utils/gameClock';

/**
 * Props
 * @description Props for BuildHubModal
 */
interface Props {
  open: boolean;
  countryCode: string;
  countryName: string;
  city: string;
  onClose: () => void;
  /**
   * onConfirm returns:
   * - estimatedPrice number
   * - chosenDays number
   * - completionGameMs number (utc epoch ms in game time)
   */
  onConfirm: (payload: { estimatedPrice: number; chosenDays: number; completionGameMs: number }) => void;
}

/**
 * computeEstimatedPrice
 * @description Estimate price between 600,000 and 1,800,000 based on country, city and chosen days.
 * - Strategy:
 *   1) Use a market weight (big/medium/other) and a city-length-derived factor to build
 *      a normalized base between MIN and MAX.
 *   2) Apply an "early completion" surcharge: 1% per day earlier than maxDays (configurable),
 *      capped so short schedules do not explode the price.
 *   3) Clamp final result into [MIN, MAX].
 */
function computeEstimatedPrice(countryCode: string, cityName: string, chosenDays: number, maxDays = 60) {
  const MIN_PRICE = 600_000;
  const MAX_PRICE = 1_800_000;

  // Market buckets determine a market weight in [0.45 .. 1.0]
  const bigMarket = new Set(['de', 'fr', 'gb', 'us', 'cn', 'ru', 'it', 'es', 'in', 'tr']);
  const mediumMarket = new Set(['nl', 'be', 'pl', 'se', 'no', 'fi', 'ch', 'at', 'pt', 'cz']);

  let marketWeight = 0.5; // default
  const cc = (countryCode || '').toLowerCase();
  if (bigMarket.has(cc)) marketWeight = 1.0;
  else if (mediumMarket.has(cc)) marketWeight = 0.75;
  else marketWeight = 0.45;

  // City factor: scale slightly by city name length (small, deterministic tweak)
  const rawCityLenFactor = (cityName?.length ?? 6) / 8; // typical range ~0.5 .. 2.0
  const cityFactor = Math.max(0.8, Math.min(1.25, rawCityLenFactor));

  // Normalized base ratio in [0 .. 1] using sensible clamps
  const normMin = 0.35;
  const normMax = 1.05;
  const normalized = Math.max(normMin, Math.min(normMax, marketWeight * cityFactor));
  const ratio = (normalized - normMin) / (normMax - normMin);
  const basePrice = Math.round(MIN_PRICE + (MAX_PRICE - MIN_PRICE) * Math.max(0, Math.min(1, ratio)));

  // Early-completion surcharge: 1% per day earlier, capped at 15%
  const dayDiff = Math.max(0, maxDays - chosenDays);
  const perDayRate = 0.01; // 1% per day earlier
  const cap = 0.15; // maximum 15% surcharge
  const daysMultiplier = 1 + Math.min(cap, dayDiff * perDayRate);

  let final = Math.round(basePrice * daysMultiplier);

  // Final clamp to guarantee global bounds
  final = Math.max(MIN_PRICE, Math.min(MAX_PRICE, final));

  return final;
}

/**
 * BuildHubModal
 * @description Renders a centered modal. The modal is keyboard accessible and traps focus visually.
 */
const BuildHubModal: React.FC<Props> = ({ open, countryCode, countryName, city, onClose, onConfirm }) => {
  const MIN_DAYS = 45;
  const MAX_DAYS = 60;
  const defaultDays = MAX_DAYS;

  const [selectedDays, setSelectedDays] = React.useState<number>(defaultDays);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setSelectedDays(defaultDays);
      setSubmitting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, countryCode, city]);

  if (!open) return null;

  const estimatedPrice = computeEstimatedPrice(countryCode, city, selectedDays, MAX_DAYS);
  const completionGameMs = Math.floor(nowUtcMs() + selectedDays * 24 * 60 * 60 * 1000);

  return (
    <div role="dialog" aria-modal="true" aria-label="Confirm Build Hub" className="fixed inset-0 z-50 flex items-center justify-center">
      {/* overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative max-w-xl w-full mx-4">
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 shadow-xl">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">Confirm Hub Build</h3>
              <p className="text-sm text-slate-400 mt-1">Review estimated cost and completion time</p>
            </div>
            <button type="button" aria-label="Close" onClick={onClose} className="text-slate-400 hover:text-white">
              ✕
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-6 rounded overflow-hidden bg-slate-900 flex items-center justify-center text-sm text-slate-400">
                <span>{countryCode?.toUpperCase?.() ?? '--'}</span>
              </div>
              <div>
                <div className="text-sm text-slate-300 font-medium">{countryName}</div>
                <div className="text-xs text-slate-400">{city || '—'}</div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-700 rounded p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400">Estimated Price</div>
                  <div className="text-xl font-bold text-amber-400">${estimatedPrice.toLocaleString()}</div>
                </div>

                <div className="text-right">
                  <div className="text-xs text-slate-400">Completion Window</div>
                  <div className="text-sm text-slate-200">{MIN_DAYS} — {MAX_DAYS} days</div>
                </div>
              </div>

              <div className="mt-3">
                <label className="block text-sm text-slate-400 mb-2">Choose completion time (days)</label>
                <select
                  value={selectedDays}
                  onChange={(e) => setSelectedDays(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Array.from({ length: MAX_DAYS - MIN_DAYS + 1 }).map((_, i) => {
                    const d = MIN_DAYS + i;
                    return (
                      <option key={d} value={d}>
                        {d} days {d === MAX_DAYS ? '(standard)' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="bg-transparent text-slate-400 hover:text-white border border-slate-600 px-3 py-2 rounded text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setSubmitting(true);
                // onConfirm receives estimatedPrice, chosenDays and completionGameMs
                onConfirm({ estimatedPrice, chosenDays: selectedDays, completionGameMs });
              }}
              disabled={submitting}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : 'Confirm Build'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BuildHubModal;