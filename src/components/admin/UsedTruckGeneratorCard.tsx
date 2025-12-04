
/**
 * UsedTruckGeneratorCard.tsx
 *
 * Admin card component to manually regenerate used truck offers and display
 * the last generation timestamp. This component is intentionally small and
 * focused so it can be reused in admin pages.
 */

import React from 'react';
import { RefreshCw, Clock } from 'lucide-react';
import { forceRegenerateUsedOffers, readGenerationTimestamp, readOffersFromStorage } from '../../engines/UsedTruckGenerator';

/**
 * UsedTruckGeneratorCard
 * @description Card UI for administrators to force-regenerate used truck offers.
 */
const UsedTruckGeneratorCard: React.FC = () => {
  const [isRegenerating, setIsRegenerating] = React.useState(false);
  const [lastGenerated, setLastGenerated] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const [count, setCount] = React.useState<number | null>(null);

  /**
   * loadTimestamp
   * @description Load the last generation timestamp and stored offers count.
   */
  const loadTimestamp = React.useCallback(() => {
    try {
      const ts = readGenerationTimestamp();
      setLastGenerated(ts);
      const offers = readOffersFromStorage();
      setCount(Array.isArray(offers) ? offers.length : null);
    } catch {
      setLastGenerated(null);
      setCount(null);
    }
  }, []);

  React.useEffect(() => {
    loadTimestamp();
  }, [loadTimestamp]);

  /**
   * handleRegenerate
   * @description Trigger engine helper to regenerate offers and refresh UI state.
   */
  const handleRegenerate = async () => {
    setIsRegenerating(true);
    setMessage(null);
    try {
      const offers = await Promise.resolve(forceRegenerateUsedOffers()); // engine may be sync; normalize to promise
      const regeneratedCount = Array.isArray(offers) ? offers.length : readOffersFromStorage().length;
      setMessage(`Regenerated ${regeneratedCount} used truck offers`);
      setCount(regeneratedCount);
      // Update timestamp after generation
      const ts = readGenerationTimestamp();
      setLastGenerated(ts);
      // Clear message after a short delay
      window.setTimeout(() => setMessage(null), 5000);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('UsedTruckGeneratorCard.handleRegenerate error', err);
      setMessage('Failed to regenerate offers');
      window.setTimeout(() => setMessage(null), 5000);
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
      <div className="flex items-center space-x-3 mb-4">
        <RefreshCw className="w-6 h-6 text-amber-400" />
        <h2 className="text-lg font-semibold text-white">Used Truck Offers</h2>
      </div>

      <p className="text-slate-400 text-sm mb-4">
        Generate the daily used truck offers pool. Use this to refresh the client-side used market immediately.
      </p>

      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-sm text-slate-400">Last generated</div>
          <div className="text-white font-medium">
            {lastGenerated ? new Date(lastGenerated).toLocaleString() : 'n/a'}
          </div>
          <div className="text-sm text-slate-400 mt-1">Stored offers: <span className="text-white font-semibold">{count ?? 'n/a'}</span></div>
        </div>

        <div className="flex flex-col items-end space-y-2">
          <button
            onClick={handleRegenerate}
            disabled={isRegenerating}
            className={`bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 text-sm ${isRegenerating ? 'opacity-70' : ''}`}
          >
            <RefreshCw className="w-4 h-4" />
            <span>{isRegenerating ? 'Regenerating...' : 'Regenerate'}</span>
          </button>

          <div className="text-sm text-slate-400 flex items-center space-x-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <span className="text-xs">{message ?? 'Manual regeneration available'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsedTruckGeneratorCard;
