/**
 * BuildHubBox.tsx
 */

import React from 'react';
import CountrySelect from './CountrySelect';
import { CountriesData } from '../../data/cities';
import BuildHubModal from './BuildHubModal';
import { addTask, readTasks } from '../../utils/pendingTasks';
import { useGame } from '../../contexts/GameContext';

const BuildHubBox: React.FC = () => {
  const game = useGame() as any;
  const [countryCode, setCountryCode] = React.useState<string | null>(CountriesData[0]?.code ?? null);
  const [city, setCity] = React.useState<string>('');
  const [loading, setLoading] = React.useState(false);
  const [modalOpen, setModalOpen] = React.useState(false);

  // Get cities for the selected country
  const availableCities = React.useMemo(() => {
    return CountriesData.find((c) => c.code === countryCode)?.cities ?? [];
  }, [countryCode]);

  // Set first city as default when country changes
  React.useEffect(() => {
    if (availableCities.length > 0) setCity(availableCities[0]);
    else setCity('');
  }, [availableCities]);

  const countryName = CountriesData.find((c) => c.code === countryCode)?.name ?? (countryCode ?? '');

  const hasExistingHub = (ct: string) => {
    const hubs = Array.isArray(game?.gameState?.company?.hubs) ? game.gameState.company.hubs : [];
    if (hubs.some((h: any) => String(h.city || '').toLowerCase() === ct.toLowerCase())) return true;
    const pending = readTasks();
    return pending.some((t) => t.type === 'build-hub' && t.city?.toLowerCase() === ct.toLowerCase());
  };

  const handleConfirm = (payload: any) => {
    setModalOpen(false);
    setLoading(true);

    addTask({
      type: 'build-hub',
      countryCode: countryCode ?? 'xx',
      countryName,
      city,
      completionGameMs: payload.completionGameMs,
      estimatedPrice: payload.estimatedPrice,
      metadata: { chosenDays: payload.chosenDays },
    });

    setTimeout(() => {
      setLoading(false);
      setCity(availableCities[0] || '');
    }, 400);
  };

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 w-full">
      <h3 className="text-lg font-semibold text-white mb-2">Expand Your Network</h3>
      <p className="text-sm text-slate-400 mb-4">Select a region to establish a new strategic hub.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Country</label>
          <CountrySelect value={countryCode} onChange={setCountryCode} />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Target City</label>
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="" disabled>Select a city</option>
            {availableCities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => setModalOpen(true)}
          disabled={!city || hasExistingHub(city)}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-bold text-sm transition-all"
        >
          {hasExistingHub(city) ? 'Hub already exists' : 'Review Construction'}
        </button>
      </div>

      <BuildHubModal
        open={modalOpen}
        countryCode={countryCode ?? ''}
        countryName={countryName}
        city={city}
        onClose={() => setModalOpen(false)}
        onConfirm={handleConfirm}
      />
    </div>
  );
};

export default BuildHubBox;