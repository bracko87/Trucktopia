/**
 * pendingTasks.ts
 *
 * Local persistence helper for pending tasks used by infrastructure flows.
 *
 * Responsibilities:
 * - Read / write pending tasks to localStorage
 * - Create consistent task objects for build hub actions
 * - Dispatch a window custom event 'tm:pendingTasksUpdated' when tasks change
 *
 * The task shape includes an authoritative completion time in game UTC ms so
 * background engines can finalize using the shared game clock.
 */

/**
 * PendingTask
 * @description Shape for a persisted pending task
 */
export interface PendingTask {
  id: string;
  type: 'build-hub' | string;
  countryCode: string;
  countryName: string;
  city: string;
  /**
   * completionGameMs
   * @description Target in-game UTC epoch ms when the task is considered complete.
   */
  completionGameMs: number;
  estimatedPrice: number;
  createdAt: string; // ISO datetime
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  metadata?: Record<string, any>;
}

/**
 * STORAGE_KEY
 * @description localStorage key used to persist tasks
 */
const STORAGE_KEY = 'tm_pending_tasks_v2';

/**
 * readTasks
 * @description Read tasks from localStorage. Returns empty array when absent / invalid.
 */
export function readTasks(): PendingTask[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as PendingTask[];
  } catch {
    return [];
  }
}

/**
 * writeTasks
 * @description Write tasks to localStorage and dispatch update event
 * @param tasks PendingTask[]
 */
export function writeTasks(tasks: PendingTask[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    // Dispatch global event so other parts of the app can listen and update
    try {
      window.dispatchEvent(new CustomEvent('tm:pendingTasksUpdated', { detail: tasks }));
    } catch {
      // ignore event dispatch errors
    }
  } catch {
    // ignore write errors
  }
}

/**
 * addTask
 * @description Add a task and persist. Returns the added task object.
 * @param payload Partial task values; id/createdAt/status/completionGameMs will be added
 */
export function addTask(payload: {
  type: string;
  countryCode: string;
  countryName: string;
  city: string;
  completionGameMs: number;
  estimatedPrice: number;
  metadata?: Record<string, any>;
}): PendingTask {
  const now = new Date();
  const id = `${payload.type}-${now.getTime()}-${Math.floor(Math.random() * 10000)}`;
  const full: PendingTask = {
    id,
    type: payload.type,
    countryCode: payload.countryCode,
    countryName: payload.countryName,
    city: payload.city,
    completionGameMs: Math.floor(payload.completionGameMs),
    estimatedPrice: Math.round(payload.estimatedPrice),
    createdAt: now.toISOString(),
    status: 'pending',
    metadata: payload.metadata ?? {},
  };

  const tasks = readTasks();
  tasks.push(full);
  writeTasks(tasks);
  return full;
}

/**
 * removeTask
 * @description Remove a task by id and persist
 * @param id string
 */
export function removeTask(id: string) {
  const tasks = readTasks().filter((t) => t.id !== id);
  writeTasks(tasks);
}

/**
 * updateTaskStatus
 * @description Update the status of a task and persist
 * @param id string
 * @param status PendingTask['status']
 */
export function updateTaskStatus(id: string, status: PendingTask['status']) {
  const tasks = readTasks().map((t) => (t.id === id ? { ...t, status } : t));
  writeTasks(tasks);
}