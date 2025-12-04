/**
 * MigrationTaskDetailsModal.tsx
 *
 * Modal to display full migration task details and allow deletion.
 *
 * Responsibilities:
 * - Show full task details
 * - Allow closing and copying details
 * - Allow deletion via onDelete callback
 */

import React from 'react';
import { X, Trash2, Copy } from 'lucide-react';

import type { MigrationTask } from './MigrationTaskForm';

interface Props {
  task: MigrationTask | null;
  open: boolean;
  onClose: () => void;
  onDelete: (id: string) => void;
}

/**
 * MigrationTaskDetailsModal
 * @description Modal component that displays a migration task's full details.
 */
const MigrationTaskDetailsModal: React.FC<Props> = ({ task, open, onClose, onDelete }) => {
  if (!open || !task) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`${task.id} - ${task.name}\n\n${task.details}`);
      alert('Copied to clipboard');
    } catch {
      alert('Copy failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-2xl mx-4 bg-slate-800 rounded-xl border border-slate-700 p-6 z-10">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">{task.id} — {task.name}</h3>
            <div className="text-sm text-slate-400 mt-1">Created: {new Date(task.createdAt).toLocaleString()}</div>
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={handleCopy} className="text-slate-400 hover:text-white">
              <Copy className="w-5 h-5" />
            </button>
            <button onClick={() => onDelete(task.id)} className="text-rose-400 hover:text-rose-300">
              <Trash2 className="w-5 h-5" />
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="text-sm text-slate-300 whitespace-pre-wrap">{task.details || '—'}</div>

        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default MigrationTaskDetailsModal;
