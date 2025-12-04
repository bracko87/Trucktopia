/**
 * MigrationTasks.tsx
 *
 * Admin page that lists and manages migration tasks. Tasks persist in localStorage
 * under the key 'tm_migration_tasks'.
 *
 * Responsibilities:
 * - Provide a full page to add new migration tasks
 * - Show existing tasks with details and deletion
 * - Allow copying and exporting tasks (basic)
 */

import React, { useEffect, useState } from 'react';
import MigrationTaskForm, { MigrationTask } from '../components/admin/MigrationTaskForm';
import MigrationTaskList from '../components/admin/MigrationTaskList';
import MigrationTaskDetailsModal from '../components/admin/MigrationTaskDetailsModal';
import { useNavigate } from 'react-router';
import { ArrowLeft, Download } from 'lucide-react';

/**
 * readTasks
 * @description Utility to read tasks from localStorage
 */
function readTasks(): MigrationTask[] {
  try {
    const raw = localStorage.getItem('tm_migration_tasks');
    if (!raw) return [];
    return JSON.parse(raw) as MigrationTask[];
  } catch (e) {
    console.error('readTasks error', e);
    return [];
  }
}

/**
 * writeTasks
 * @description Utility to write tasks to localStorage
 */
function writeTasks(tasks: MigrationTask[]) {
  localStorage.setItem('tm_migration_tasks', JSON.stringify(tasks));
}

/**
 * MigrationTasks
 * @description Page component for viewing and managing migration tasks.
 */
const MigrationTasks: React.FC = () => {
  const [tasks, setTasks] = useState<MigrationTask[]>([]);
  const [selected, setSelected] = useState<MigrationTask | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setTasks(readTasks());
  }, []);

  const handleCreate = (task: MigrationTask) => {
    const next = [...tasks, task];
    setTasks(next);
    writeTasks(next);
    // open details immediately
    setSelected(task);
    setModalOpen(true);
  };

  const handleDelete = (id: string) => {
    const next = tasks.filter((t) => t.id !== id);
    setTasks(next);
    writeTasks(next);
    setModalOpen(false);
    setSelected(null);
  };

  const handleView = (task: MigrationTask) => {
    setSelected(task);
    setModalOpen(true);
  };

  const handleExport = () => {
    const payload = JSON.stringify(tasks, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'migration-tasks.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Migration Tasks</h1>
          <p className="text-slate-400">Create and track migration steps to be performed on Supabase</p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigate('/admin')}
            className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg"
          >
            <ArrowLeft className="w-4 h-4 inline mr-2" />
            Back
          </button>

          <button
            onClick={handleExport}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg inline-flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-slate-800 rounded-xl border border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-3">Add Migration Task</h3>
          <MigrationTaskForm onCreate={handleCreate} existingCount={tasks.length} />
        </div>

        <div className="lg:col-span-2 bg-slate-800 rounded-xl border border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Tasks</h3>
            <div className="text-sm text-slate-400">Total: {tasks.length}</div>
          </div>

          <MigrationTaskList tasks={tasks} onView={handleView} onDelete={handleDelete} />
        </div>
      </div>

      <MigrationTaskDetailsModal
        task={selected}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onDelete={handleDelete}
      />
    </div>
  );
};

export default MigrationTasks;
