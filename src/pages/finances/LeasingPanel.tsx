/**
 * LeasingPanel.tsx
 *
 * Compact Leasing tab showing only active/recent leases and enhanced navigation controls.
 *
 * Responsibilities:
 * - Display Active & Recent Leases block with preserved styling and layout.
 * - Provide search, status filter and sorting controls so users can find leases quickly.
 * - Keep all visuals consistent with the existing design system (Tailwind classes).
 */

import React from 'react';
import { useFinancials } from '../../contexts/FinancialContext';

/**
 * LeaseRecord
 * @description Minimal shape for leases used in this panel.
 */
interface LeaseRecord {
  id: string;
  assetLabel?: string;
  monthlyPayment?: number;
  remainingMonths?: number;
  status?: 'active' | 'completed' | string;
  [key: string]: any;
}

/**
 * LeasingPanel
 * @description Compact Leasing tab showing only active/recent leases with search/filter/sort.
 */
const LeasingPanel: React.FC = () => {
  const { finances } = useFinancials();

  /**
   * Local UI state
   */
  const [query, setQuery] = React.useState<string>('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [sortBy, setSortBy] = React.useState<string>('newest');

  /**
   * leases
   * @description Source leases array from finances context (defensive default).
   */
  const leases: LeaseRecord[] = Array.isArray(finances?.leases) ? finances.leases : [];

  /**
   * filteredAndSortedLeases
   * @description Compute filtered + sorted leases based on query, status and sort choices.
   */
  const filteredAndSortedLeases = React.useMemo(() => {
    const q = String(query || '').trim().toLowerCase();

    // Filtering
    let result = leases.filter((l) => {
      // Status filter
      if (statusFilter !== 'all') {
        const s = String(l.status || '').toLowerCase();
        if (statusFilter === 'active' && s !== 'active') return false;
        if (statusFilter === 'completed' && s !== 'completed') return false;
      }
      // Search across assetLabel and id
      if (q) {
        const label = String(l.assetLabel || '').toLowerCase();
        const id = String(l.id || '').toLowerCase();
        if (!label.includes(q) && !id.includes(q)) return false;
      }
      return true;
    });

    // Sorting
    result = result.slice(); // shallow copy
    switch (sortBy) {
      case 'monthly_desc':
        result.sort((a, b) => (Number(b.monthlyPayment || 0) - Number(a.monthlyPayment || 0)));
        break;
      case 'monthly_asc':
        result.sort((a, b) => (Number(a.monthlyPayment || 0) - Number(b.monthlyPayment || 0)));
        break;
      case 'remaining_desc':
        result.sort((a, b) => (Number(b.remainingMonths || 0) - Number(a.remainingMonths || 0)));
        break;
      case 'remaining_asc':
        result.sort((a, b) => (Number(a.remainingMonths || 0) - Number(b.remainingMonths || 0)));
        break;
      case 'oldest':
        result.sort((a, b) => (String(a.id).localeCompare(String(b.id))));
        break;
      case 'newest':
      default:
        result.sort((a, b) => (String(b.id).localeCompare(String(a.id))));
        break;
    }

    return result;
  }, [leases, query, statusFilter, sortBy]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Leasing</h2>
        <div className="text-sm text-slate-400">Manage leased assets and obligations</div>
      </div>

      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
        <h3 className="text-white font-semibold mb-3">Active &amp; Recent Leases</h3>

        {/* Controls: Search | Status filter | Sort */}
        <div className="flex flex-col md:flex-row md:items-center md:space-x-3 mb-3">
          <input
            type="search"
            aria-label="Search leases"
            placeholder="Search by asset label or id"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="mb-3 md:mb-0 w-full md:flex-1 bg-slate-700 border border-slate-600 px-3 py-2 rounded text-white placeholder:text-slate-400 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-all"
          />

          <div className="flex items-center space-x-2 mt-0 md:mt-0">
            <label className="text-sm text-slate-300 hidden md:inline">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-700 border border-slate-600 px-3 py-2 rounded text-white outline-none focus:ring-1 focus:ring-yellow-500 transition-all"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>

            <label className="text-sm text-slate-300 hidden md:inline">Sort</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-slate-700 border border-slate-600 px-3 py-2 rounded text-white outline-none focus:ring-1 focus:ring-yellow-500 transition-all"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="monthly_desc">Monthly (High → Low)</option>
              <option value="monthly_asc">Monthly (Low → High)</option>
              <option value="remaining_desc">Remaining Months (High → Low)</option>
              <option value="remaining_asc">Remaining Months (Low → High)</option>
            </select>
          </div>
        </div>

        <div className="space-y-3">
          {filteredAndSortedLeases.length === 0 ? (
            <div className="text-slate-400">No leases</div>
          ) : (
            filteredAndSortedLeases.map((l: LeaseRecord) => (
              <div key={l.id} className="flex items-center justify-between bg-slate-700 p-3 rounded border border-slate-600">
                <div>
                  <div className="text-white font-medium">{l.assetLabel || l.id}</div>
                  <div className="text-xs text-slate-400">
                    Monthly {Number(l.monthlyPayment || 0).toLocaleString()} USD • Remaining {l.remainingMonths ?? 0} months
                  </div>
                </div>
                <div className="text-right text-white font-semibold">{String(l.status) === 'active' ? 'Active' : 'Completed'}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default LeasingPanel;