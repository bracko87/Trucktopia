/**
 * EngineCard.tsx
 *
 * Small presentational card to show engine metadata.
 *
 * Responsibilities:
 * - Render engine id, name, mount status, path and short notes.
 */

import React from 'react';
import { Cpu, PlayCircle, Pause } from 'lucide-react';
import type { EngineEntry } from '../../data/game-rules-engines';

/**
 * Props
 * @description Properties expected by EngineCard
 */
interface Props {
  engine: EngineEntry;
}

/**
 * mountColor
 * @description Return classes for mountStatus badge colors.
 */
const mountColor = (mountStatus?: EngineEntry['mountStatus']) => {
  switch (mountStatus) {
    case 'mounted':
      return 'bg-green-600 text-white';
    case 'not-mounted':
      return 'bg-slate-600 text-white';
    case 'proposed':
      return 'bg-amber-500 text-white';
    default:
      return 'bg-slate-600 text-white';
  }
};

/**
 * EngineCard
 * @description UI card for engine entries in the manifest.
 */
const EngineCard: React.FC<Props> = ({ engine }) => {
  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-1 rounded bg-slate-700/50">
              <Cpu className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="text-sm text-slate-400">{engine.id}</div>
              <div className="text-white font-medium">{engine.name}</div>
            </div>
          </div>

          <div className="text-sm text-slate-400 mt-2">{engine.description}</div>

          {engine.tags && engine.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {engine.tags.map((t, i) => (
                <div key={i} className="text-xs text-slate-300 bg-slate-700/40 px-2 py-1 rounded">
                  {t}
                </div>
              ))}
            </div>
          )}

          {engine.path && <div className="text-xs text-slate-400 mt-2">Path: {engine.path}</div>}
        </div>

        <div className="flex flex-col items-end space-y-2">
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${mountColor(engine.mountStatus)}`}>
            {engine.mountStatus ?? 'unknown'}
          </div>
          <div className="text-xs text-slate-400">
            <div>{engine.version ?? '-'}</div>
            <div className="mt-1">{engine.lastModified ?? '-'}</div>
          </div>
        </div>
      </div>

      {engine.notes && <div className="text-xs text-slate-300 mt-3">{engine.notes}</div>}
    </div>
  );
};

export default EngineCard;