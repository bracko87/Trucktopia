/**
 * MigrationTaskList.tsx
 *
 * List component for showing migration tasks.
 *
 * Responsibilities:
 * - Render tasks as compact rows/cards
 * - Allow opening a details modal and deleting tasks (via callbacks)
 */

import React from 'react';
import { Eye, Trash2 } from 'lucide-react';
import type { MigrationTask } from './MigrationTaskForm';

interface Props {
  tasks: MigrationTask[];
  onView: (task: MigrationTask) => void;
  onDelete: (id: string) => void;
}

/**
 * MigrationTaskList
 * @description Renders a list of migration tasks with view and delete actions.
 */
const MigrationTaskList: React.FC<Props> = ({ tasks, onView, onDelete }) => {
  if (!tasks || tasks.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-sm text-slate-400">No migration tasks yet</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tasks.map((t) => (
        <div key={t.id} className="bg-slate-700 rounded-lg border border-slate-600 p-4 flex items-center justify-between">
          <div>
            <div className="text-white font-medium">{t.id} — {t.name}</div>
            <div className="text-sm text-slate-400">Created: {new Date(t.createdAt).toLocaleString()}</div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onView(t)}
              className="bg-slate-600 hover:bg-slate-500 text-white px-3 py-1 rounded-md flex items-center space-x-2 text-sm"
            >
              <Eye className="w-4 h-4" />
              <span>Details</span>
            </button>

            <button
              onClick={() => {
                if (confirm(`Delete ${t.id} — ${t.name}?`)) onDelete(t.id);
              }}
              className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1 rounded-md flex items-center space-x-2 text-sm"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MigrationTaskList;
