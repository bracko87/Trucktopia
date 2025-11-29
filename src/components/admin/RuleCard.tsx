/**
 * RuleCard.tsx
 *
 * Small presentational card for a single Game Rule entry.
 *
 * Responsibilities:
 * - Render a compact view of a GameRule with id, name, status and metadata.
 * - Provide structured layout suitable for lists and grids.
 */

import React from 'react';
import { AlertCircle, CheckCircle, Clock, FileText } from 'lucide-react';
import type { GameRule } from '../../data/game-rules-engines';

/**
 * Props
 * @description Properties expected by RuleCard
 */
interface Props {
  rule: GameRule;
}

/**
 * statusColor
 * @description Map rule status to Tailwind color classes for badges.
 * @param status rule status
 */
const statusColor = (status: GameRule['status']) => {
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
 * RuleCard
 * @description Visual card for displaying a GameRule in lists.
 */
const RuleCard: React.FC<Props> = ({ rule }) => {
  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center space-x-3">
            <FileText className="w-5 h-5 text-slate-300" />
            <div>
              <div className="text-sm text-slate-400">{rule.id}</div>
              <div className="text-white font-medium">{rule.name}</div>
            </div>
          </div>
          <div className="text-sm text-slate-400 mt-2">{rule.description}</div>
          {rule.codePaths && rule.codePaths.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {rule.codePaths.map((p, idx) => (
                <div key={idx} className="text-xs text-slate-300 bg-slate-700/40 px-2 py-1 rounded">
                  {p}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col items-end space-y-2">
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor(rule.status)}`}>
            {rule.status.toUpperCase()}
          </div>
          <div className="text-xs text-slate-400">
            <div className="flex items-center space-x-1">
              <CheckCircle className="w-3 h-3 text-slate-400" />
              <span>{rule.version ?? 'v-'}</span>
            </div>
            <div className="flex items-center space-x-1 mt-1">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>{rule.lastModified ?? '—'}</span>
            </div>
          </div>
        </div>
      </div>

      {rule.notes && <div className="text-xs text-slate-300 mt-3">{rule.notes}</div>}
    </div>
  );
};

export default RuleCard;