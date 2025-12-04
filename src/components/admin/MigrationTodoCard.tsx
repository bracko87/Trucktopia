/**
 * MigrationTodoCard.tsx
 *
 * Small admin dashboard card providing a shortcut to the Migration Tasks page.
 *
 * Responsibilities:
 * - Display a summary count of pending migration tasks
 * - Navigate to the Migration Tasks page
 * - Provide a quick link to open the full migration list
 */

import React from 'react';
import { List, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router';

/**
 * getTasks
 * @description Read migration tasks from localStorage. Used for the small summary.
 * @returns Array of tasks or empty array
 */
function getTasks() {
  try {
    const raw = localStorage.getItem('tm_migration_tasks');
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('getTasks error', e);
    return [];
  }
}

/**
 * MigrationTodoCard
 * @description Dashboard card component that shows a quick summary of pending migration tasks.
 */
const MigrationTodoCard: React.FC = () => {
  const navigate = useNavigate();
  const tasks = getTasks();
  const pendingCount = tasks.length;

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-3 bg-amber-500/10 rounded-lg">
            <List className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Migration To-Do</h3>
            <p className="text-sm text-slate-400">Pending migration tasks and notes</p>
          </div>
        </div>

        <div className="mt-4">
          <div className="text-sm text-slate-400">Pending Tasks</div>
          <div className="text-2xl font-bold text-white">{pendingCount}</div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={() => navigate('/admin/migrations')}
          className="bg-amber-500 hover:bg-amber-600 text-black py-2 px-4 rounded-lg font-medium transition-colors flex items-center space-x-2"
        >
          <ArrowRight className="w-4 h-4" />
          <span>Open Migrations</span>
        </button>
        <div className="text-sm text-slate-400">Manage tasks</div>
      </div>
    </div>
  );
};

export default MigrationTodoCard;
