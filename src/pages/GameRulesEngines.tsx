/**
 * GameRulesEngines.tsx
 *
 * Admin page that presents the canonical manifest of Game Rules, Engines and Cron Jobs.
 *
 * Responsibilities:
 * - Import the manifest from src/data/game-rules-engines.ts and render it read-only.
 * - Provide search and status filters and an option to export the manifest as JSON.
 * - Do not modify any manifest entries or runtime behavior.
 */

import React, { useMemo, useState } from 'react';
import defaultManifest, { GameRule, EngineEntry, CronJob } from '../data/game-rules-engines';

/**
 * Ensure the page reads the canonical default export.
 * Some modules / dev workflows prefer default imports; normalize to `manifest`.
 */
const manifest = defaultManifest as {
  gameRules: GameRule[];
  engines: EngineEntry[];
  cronJobs: CronJob[];
};
import RuleCard from '../components/admin/RuleCard';
import EngineCard from '../components/admin/EngineCard';
import CronCard from '../components/admin/CronCard';
import { Search, DownloadCloud } from 'lucide-react';
import ManifestTotals from '../components/admin/ManifestTotals';

/**
 * status list typing
 */
type StatusFilter = 'all' | 'active' | 'proposed' | 'deprecated';

/**
 * downloadManifest
 * @description Trigger a JSON download of the manifest for offline use or migration.
 * @param obj manifest object
 * @returns void
 */
const downloadManifest = (obj: any) => {
  const dataStr = JSON.stringify(obj, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'game-rules-engines-manifest.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

/**
 * GameRulesEnginesPage
 * @description Main admin page that renders manifest lists and filters.
 */
const GameRulesEnginesPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const rules: GameRule[] = manifest.gameRules || [];
  const engines: EngineEntry[] = manifest.engines || [];
  const crons: CronJob[] = manifest.cronJobs || [];

  /**
   * applyFilters
   * @description Filter and search a generic list by id/name/description and status.
   */
  const applyFilters = <T extends { id?: string; name?: string; description?: string; status?: string }>(
    items: T[]
  ) => {
    return items.filter(item => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        (item.id && item.id.toLowerCase().includes(q)) ||
        (item.name && item.name.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q))
      );
    });
  };

  const filteredRules = useMemo(() => applyFilters(rules), [rules, query, statusFilter]);
  const filteredEngines = useMemo(() => applyFilters(engines), [engines, query, statusFilter]);
  const filteredCrons = useMemo(() => applyFilters(crons), [crons, query, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center space-x-3">
            <span>Game Rules & Engines</span>
          </h1>
          <p className="text-slate-400">Canonical manifest: rules, engines and scheduled jobs (read-only).</p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 space-x-2">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search id, name or description..."
              className="bg-transparent outline-none text-sm text-white placeholder:text-slate-500"
            />
          </div>

          <div className="flex items-center space-x-2">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as StatusFilter)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="proposed">Proposed</option>
              <option value="deprecated">Deprecated</option>
            </select>

            <button
              onClick={() => downloadManifest(manifest)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg flex items-center space-x-2 text-sm"
            >
              <DownloadCloud className="w-4 h-4" />
              <span>Export JSON</span>
            </button>
          </div>
        </div>
      </div>

      {/* Totals (sourced from canonical manifest) */}
      <ManifestTotals />

      {/* Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div>
          <h2 className="text-lg font-semibold text-white mb-3">Game Rules ({filteredRules.length})</h2>
          <div className="space-y-3">
            {filteredRules.length === 0 ? (
              <div className="text-slate-400">No rules match your filters.</div>
            ) : (
              filteredRules.map(r => <RuleCard key={r.id} rule={r} />)
            )}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-3">Engines ({filteredEngines.length})</h2>
          <div className="space-y-3">
            {filteredEngines.length === 0 ? (
              <div className="text-slate-400">No engines match your filters.</div>
            ) : (
              filteredEngines.map(e => <EngineCard key={e.id} engine={e} />)
            )}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-3">Cron Jobs ({filteredCrons.length})</h2>
          <div className="space-y-3">
            {filteredCrons.length === 0 ? (
              <div className="text-slate-400">No cron jobs match your filters.</div>
            ) : (
              filteredCrons.map(c => <CronCard key={c.id} cron={c} />)
            )}
          </div>
        </div>
      </div>

      <div className="text-sm text-slate-500">
        Note: This page is read-only. No changes to rules, engines or cron jobs are performed by this UI.
      </div>
    </div>
  );
};

export default GameRulesEnginesPage;