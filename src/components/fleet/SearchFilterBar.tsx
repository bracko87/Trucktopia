/**
 * SearchFilterBar.tsx
 *
 * Small reusable search + filter bar used on fleet pages (Garage).
 *
 * Responsibilities:
 * - Expose a compact text search, a minimum-condition selector and a source selector (All / Owned / Incoming).
 * - Be presentational and controlled via props so callers keep the state and persistence responsibility.
 */

import React from 'react';
import { Search, Filter } from 'lucide-react';

export type SourceFilter = 'all' | 'owned' | 'incoming';

interface Props {
  id: string;
  query: string;
  minCondition: number | null;
  source: SourceFilter;
  onQueryChange: (q: string) => void;
  onMinConditionChange: (v: number | null) => void;
  onSourceChange: (s: SourceFilter) => void;
}

/**
 * SearchFilterBar
 * @description Presentational bar that allows searching by text, selecting min condition and source.
 */
const SearchFilterBar: React.FC<Props> = ({
  id,
  query,
  minCondition,
  source,
  onQueryChange,
  onMinConditionChange,
  onSourceChange
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
      <div className="flex-1 flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            aria-label={`${id}-search`}
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search brand, model or title..."
            className="w-full pl-10 pr-3 py-2 rounded-md bg-slate-700 border border-slate-600 text-sm text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="hidden sm:flex items-center space-x-2">
          <div className="text-xs text-slate-400">Min condition</div>
          <select
            aria-label={`${id}-min-condition`}
            value={minCondition ?? ''}
            onChange={(e) => {
              const v = e.target.value === '' ? null : Number(e.target.value);
              onMinConditionChange(v);
            }}
            className="text-sm bg-slate-700 border border-slate-600 text-slate-200 rounded-md px-2 py-1"
          >
            <option value="">Any</option>
            <option value="50">≥ 50%</option>
            <option value="70">≥ 70%</option>
            <option value="85">≥ 85%</option>
            <option value="95">≥ 95%</option>
          </select>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <div className="hidden sm:flex items-center text-xs text-slate-400">Source</div>
        <div className="flex items-center space-x-2">
          <select
            aria-label={`${id}-source`}
            value={source}
            onChange={(e) => onSourceChange(e.target.value as SourceFilter)}
            className="text-sm bg-slate-700 border border-slate-600 text-slate-200 rounded-md px-2 py-1"
          >
            <option value="all">All</option>
            <option value="owned">Owned</option>
            <option value="incoming">Incoming</option>
          </select>

          <button
            type="button"
            onClick={() => {
              // quick reset: clear query and minCondition but keep source=all
              onQueryChange('');
              onMinConditionChange(null);
              onSourceChange('all');
            }}
            className="inline-flex items-center space-x-1 bg-slate-700 border border-slate-600 text-slate-200 px-3 py-1 rounded-md text-sm hover:bg-slate-600"
            title="Reset filters"
          >
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SearchFilterBar;