/**
 * MigrationTaskForm.tsx
 *
 * Small form for creating a new migration task.
 *
 * Responsibilities:
 * - Provide inputs for Task Name and Details
 * - Generate a stable task ID (T001, T002, ...)
 * - Persist new task using onCreate callback
 */

import React, { useState } from 'react';
import { Plus } from 'lucide-react';

 /**
  * MigrationTask
  * @description Type shape for a migration task stored in localStorage.
  */
export interface MigrationTask {
  id: string; // e.g. "T001"
  name: string;
  details: string;
  createdAt: string;
}

/**
 * Props
 * @description Props for MigrationTaskForm
 */
interface Props {
  onCreate: (task: MigrationTask) => void;
  existingCount: number;
}

/**
 * generateTaskId
 * @description Generate task id T### based on an index (existingCount).
 * @param index existing number of tasks
 * @returns string id like T001
 */
function generateTaskId(index: number): string {
  const next = index + 1;
  return `T${String(next).padStart(3, '0')}`;
}

/**
 * MigrationTaskForm
 * @description Form component to create new migration tasks.
 */
const MigrationTaskForm: React.FC<Props> = ({ onCreate, existingCount }) => {
  const [name, setName] = useState('');
  const [details, setDetails] = useState('');

  /**
   * handleSubmit
   * @description Validate and emit new task object
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please provide a task name');
      return;
    }
    const id = generateTaskId(existingCount);
    const task = {
      id,
      name: name.trim(),
      details: details.trim(),
      createdAt: new Date().toISOString()
    };
    onCreate(task);
    setName('');
    setDetails('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-slate-400 mb-1">Task Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="T001 - Truck instances migration"
          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-400 mb-1">Details</label>
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          rows={5}
          placeholder="Full explanation of what needs to be done..."
          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none"
        />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          className="inline-flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Create Task</span>
        </button>
      </div>
    </form>
  );
};

export default MigrationTaskForm;
