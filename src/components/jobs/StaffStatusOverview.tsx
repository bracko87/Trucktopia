/**
 * StaffStatusOverview.tsx
 *
 * Small presentational component to show which staff members are:
 * - on-job (status === 'on-job')
 * - available (status === 'available')
 *
 * The component intentionally does not alter training / vacation logic.
 */

import React from 'react';
import type { Company } from '../../types/game';
import { Users, CheckCircle, Clock } from 'lucide-react';

export interface StaffStatusOverviewProps {
  /**
   * company - company object (may be null). Component safely handles null.
   */
  company: Company | null;
}

/**
 * formatName
 * @description Format a staff name for display. Safe fallback to id when name missing.
 */
function formatName(staff: any) {
  return (staff && (staff.name || staff.id)) || 'Unknown';
}

/**
 * StaffStatusOverview
 * @description Shows counts and small lists of staff who are currently on-job and available.
 */
const StaffStatusOverview: React.FC<StaffStatusOverviewProps> = ({ company }) => {
  const staff = Array.isArray(company?.staff) ? company!.staff : [];

  // Preserve other statuses (training/on_vacation) by selecting only exact matches
  const onJob = staff.filter((s: any) => String(s.status) === 'on-job');
  const available = staff.filter((s: any) => String(s.status) === 'available');

  return (
    <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* On duty / On-job */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-900/30 text-green-400">
              <CheckCircle className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-medium text-white">On duty</div>
              <div className="text-xs text-slate-400">{onJob.length} staff member(s)</div>
            </div>
          </div>
          <div className="text-xs text-slate-400">Live</div>
        </div>

        <div className="mt-3 space-y-2">
          {onJob.length === 0 ? (
            <div className="text-sm text-slate-400">No one is currently on a job.</div>
          ) : (
            onJob.map((s: any) => (
              <div key={s.id ?? Math.random()} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-medium text-white">
                    {(s.name && s.name.slice(0,2).toUpperCase()) || String(s.id).slice(-2)}
                  </div>
                  <div>
                    <div className="text-sm text-white">{formatName(s)}</div>
                    <div className="text-xs text-slate-400">{s.role ?? '—'}</div>
                  </div>
                </div>
                <div className="text-xs text-slate-400">{s.assignedJobLabel ?? ''}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Available */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-900/20 text-blue-400">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-medium text-white">Available</div>
              <div className="text-xs text-slate-400">{available.length} staff member(s)</div>
            </div>
          </div>
          <div className="text-xs text-slate-400">Ready</div>
        </div>

        <div className="mt-3 space-y-2">
          {available.length === 0 ? (
            <div className="text-sm text-slate-400">No available staff right now.</div>
          ) : (
            available.map((s: any) => (
              <div key={s.id ?? Math.random()} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-medium text-white">
                    {(s.name && s.name.slice(0,2).toUpperCase()) || String(s.id).slice(-2)}
                  </div>
                  <div>
                    <div className="text-sm text-white">{formatName(s)}</div>
                    <div className="text-xs text-slate-400">{s.role ?? '—'}</div>
                  </div>
                </div>
                <div className="text-xs text-slate-400">
                  {s.fit !== undefined ? <span className="inline-flex items-center space-x-1"><Clock className="w-3 h-3" /><span>{Math.round(Number(s.fit) || 0)}%</span></span> : null}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default StaffStatusOverview;