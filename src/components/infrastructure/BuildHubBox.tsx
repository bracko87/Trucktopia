/**
 * BuildHubBox.tsx
 *
 * UI panel used by the Infrastructure page to create / build a new hub.
 *
 * Responsibilities:
 * - Provide a simple, visually clear form to choose a country and city
 * - Allow the user to enter a city and confirm hub creation via a modal
 * - Prevent duplicate hubs in the same city (including pending builds)
 * - Persist a pending build task (using pendingTasks util) containing completionGameMs
 */

import React from 'react';
import CountrySelect from './CountrySelect';
import { CountriesData } from '../../data/cities';
import BuildHubModal from './BuildHubModal';
import { addTask, readTasks } from '../../utils/pendingTasks';
// PendingTasksPanel removed from BuildHubBox — rendered centrally in Infrastructure page
import { useGame } from '../../contexts/GameContext';

/**
 * BuildHubBoxProps
 * @description Props for BuildHubBox
 */
interface BuildHubBoxProps {
  onCreate?: (payload: { countryCode: string; countryName: string; city: string }) => void;
}

/**
 * BuildHubBox
 * @description Small panel with a country selector (PNG flags + full names) and city input.
 */
const BuildHubBox: React.FC<BuildHubBoxProps> = ({ onCreate }) => {
  const game = useGame() as any;
  const [countryCode, setCountryCode] = React.useState<string | null>(CountriesData[0]?.code ?? null);
  const [city, setCity] = React.useState<string>('');
  const [loading, setLoading] = React.useState(false);
  const [modalOpen, setModalOpen] = React.useState(false);

  React.useEffect(() => {
    // keep city list consistent when country changes: clear city if it's not in new country list
    const citiesFor = CountriesData.find((c) => c.code === countryCode)?.cities ?? [];
    if (city && !citiesFor.includes(city)) {
      // leave city (user typed) — but no action required
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryCode]);

  const country = CountriesData.find((c) => c.code === countryCode) ?? null;
  const countryName = country?.name ?? (countryCode ?? '');

  /**
   * hasExistingHubOrPending
   * @description Check if a hub already exists in the chosen city OR there is a pending build for it.
   */
  const hasExistingHubOrPending = (cc: string | null, ct: string) => {
    const gs: any = (game && game.gameState) ? game.gameState : null;
    const company = gs?.company ?? null;
    if (company) {
      // find hub by city (tolerant keys)
      const hubs = Array.isArray(company.hubs) ? company.hubs : (company.hub ? [company.hub] : []);
      if (hubs.some((h: any) => String((h.city ?? h.name ?? h.title ?? '')).toLowerCase() === ct.trim().toLowerCase())) return true;
    }
    // Check pending tasks
    const pending = readTasks();
    if (pending.some((t) => t.type === 'build-hub' && t.city?.toLowerCase() === ct.trim().toLowerCase())) return true;
    return false;
  };

  /**
   * handleOpenConfirm
   * @description Validate inputs and open confirmation modal
   */
  const handleOpenConfirm = () => {
    if (!countryCode) {
      alert('Please select a country.');
      return;
    }
    if (!city.trim()) {
      alert('Please enter a city name.');
      return;
    }
    // Prevent duplicate builds in same city
    if (hasExistingHubOrPending(countryCode, city.trim())) {
      alert('A hub already exists or a construction is pending in this city. Each city can only have one hub.');
      return;
    }
    setModalOpen(true);
  };

  /**
   * handleConfirm
   * @description Called when BuildHubModal confirms the build. Persists a pending task.
   */
  const handleConfirm = (payload: { estimatedPrice: number; chosenDays: number; completionGameMs: number }) => {
    setModalOpen(false);
    setLoading(true);

    // Persist pending build task
    const task = addTask({
      type: 'build-hub',
      countryCode: countryCode ?? 'xx',
      countryName,
      city: city.trim(),
      completionGameMs: payload.completionGameMs,
      estimatedPrice: payload.estimatedPrice,
      metadata: {
        chosenDays: payload.chosenDays,
      },
    });

    // Small UX delay to show action
    setTimeout(() => {
      setLoading(false);
      if (onCreate) onCreate({ countryCode: countryCode ?? 'xx', countryName, city: city.trim() });
      setCity('');
      alert(`Build hub task created and queued (ID: ${task.id}). It will appear in Pending Tasks.`);
      // tm:pendingTasksUpdated event is dispatched by pendingTasks.writeTasks
    }, 400);
  };

  // Determine if current chosen city has a pending build (to gray out UI / disable)
  const chosenHasPending = countryCode ? hasExistingHubOrPending(countryCode, city.trim()) : false;

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 w-full">
      <h3 className="text-lg font-semibold text-white mb-2">Build New Hub</h3>
      <p className="text-sm text-slate-400 mb-4">Choose a country and city to build a new hub.</p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2">Country</label>
          <CountrySelect
            value={countryCode}
            onChange={(code) => setCountryCode(code)}
            placeholder="Choose a country"
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2">City</label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            list={countryCode ? `cities-for-${countryCode}` : undefined}
            placeholder="Enter city name (or choose one)"
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {countryCode && (
            <datalist id={`cities-for-${countryCode}`}>
              {(CountriesData.find((c) => c.code === countryCode)?.cities ?? []).map((ct) => (
                <option key={ct} value={ct} />
              ))}
            </datalist>
          )}
        </div>

        <div className="flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={() => {
              setCity('');
            }}
            className="bg-transparent text-slate-400 hover:text-white border border-slate-600 px-3 py-2 rounded text-sm"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={handleOpenConfirm}
            disabled={loading || !countryCode || !city.trim() || chosenHasPending}
            className={`${
              chosenHasPending ? 'opacity-60 cursor-not-allowed' : ''
            } bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            {loading ? 'Processing...' : chosenHasPending ? 'Already pending' : 'Build Hub'}
          </button>
        </div>
      </div>

      {/* Confirmation modal */}
      <BuildHubModal
        open={modalOpen}
        countryCode={countryCode ?? ''}
        countryName={countryName}
        city={city}
        onClose={() => setModalOpen(false)}
        onConfirm={handleConfirm}
      />

      {/* Pending tasks are now displayed in the Infrastructure page's dedicated area. */}
    </div>
  );
};

export default BuildHubBox;