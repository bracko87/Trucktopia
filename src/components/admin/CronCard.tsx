/**
 * CronCard.tsx
 *
 * Small presentational card for CronJob entries.
 *
 * Responsibilities:
 * - Render cron id, name, schedule, trigger, status and notes.
 */

import React from 'react';
import { Clock, Repeat } from 'lucide-react';
import type { CronJob } from '../../data/game-rules-engines';

/**
 * Props
 * @description Properties expected by CronCard
 */
interface Props {
  cron: CronJob;
}

/**
 * statusColor
 * @description Map cron job status to badge color classes.
 */
const statusColor = (status?: CronJob['status']) => {
  switch (status) {
    case 'active':
      return 'bg-green-600 text-white';
    case 'proposed':
      return 'bg-amber-500 text-white';
    case 'deprecated':
      return 'bg-rose-500 text-white';
    default:
      return 'bg-slate-600 text-white';
  }
};

/**
 * CronCard
 * @description Visual card for CronJob entries.
 */
const CronCard: React.FC<Props> = ({ cron }) => {
  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-1 rounded bg-slate-700/50">
              <Clock className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <div className="text-sm text-slate-400">{cron.id}</div>
              <div className="text-white font-medium">{cron.name}</div>
            </div>
          </div>

          <div className="text-sm text-slate-400 mt-2">{cron.description}</div>

          <div className="flex items-center text-xs text-slate-300 gap-3 mt-3">
            <div className="flex items-center space-x-1">
              <Repeat className="w-3 h-3 text-slate-300" />
              <span>{cron.schedule ?? 'on-demand'}</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="text-slate-400">Trigger:</span>
              <span className="text-white">{cron.trigger ?? '-'}</span>
            </div>
          </div>

          {cron.path && <div className="text-xs text-slate-400 mt-2">Path: {cron.path}</div>}
        </div>

        <div className="flex flex-col items-end space-y-2">
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor(cron.status)}`}>
            {cron.status?.toUpperCase() ?? 'N/A'}
          </div>
          <div className="text-xs text-slate-400">{cron.lastModified ?? '-'}</div>
        </div>
      </div>

      {cron.notes && <div className="text-xs text-slate-300 mt-3">{cron.notes}</div>}
    </div>
  );
};

export default CronCard;