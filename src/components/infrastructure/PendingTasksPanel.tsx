/**
 * PendingTasksPanel.tsx
 *
 * Presentational panel showing current pending tasks (builds, maintenance, other queued facility work).
 *
 * Responsibilities:
 * - Read pending tasks from localStorage via pendingTasks helper.
 * - Render a compact list of all pending tasks (not only build-hub).
 * - Listen to the global 'tm:pendingTasksUpdated' event and refresh on changes.
 * - Allow cancelling a pending task within the first 5 game-days after creation.
 *
 * This file contains a single component and a single default export.
 */

import React from 'react';
import { readTasks, removeTask, PendingTask } from '../../utils/pendingTasks';
import { nowUtcMs } from '../../utils/gameClock';

/**
 * formatPrice
 * @description Format a nullable number safely for display.
 * @param v number | undefined | null
 */
function formatPrice(v?: number) {
  if (typeof v !== 'number' || Number.isNaN(v)) return '—';
  return `$${v.toLocaleString()}`;
}

/**
 * formatDoneAt
 * @description Format epoch ms into locale string or '—' when absent.
 * @param ts number | undefined | null
 */
function formatDoneAt(ts?: number | null) {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return '—';
  }
}

/**
 * canCancelTask
 * @description Determine whether a pending task can be cancelled.
 * Cancellation is allowed only within the first `windowDays` (game days) after creation.
 * @param task PendingTask
 * @param windowDays number
 */
function canCancelTask(task: PendingTask, windowDays = 5): boolean {
  try {
    const now = nowUtcMs();

    // Prefer creationGameMs (recorded at creation). Fallback to createdAt ISO parsed as epoch.
    const createdGameMs = typeof task.creationGameMs === 'number' ? task.creationGameMs : Date.parse(task.createdAt || '');

    if (!createdGameMs || Number.isNaN(createdGameMs)) return false;

    const elapsed = now - createdGameMs;
    const allowedMs = windowDays * 24 * 60 * 60 * 1000;
    return elapsed >= 0 && elapsed <= allowedMs && (task.status === 'pending' || task.status === 'in-progress');
  } catch {
    return false;
  }
}

/**
 * PendingTasksPanel
 * @description Generic panel showing pending tasks across facilities (builds, maintenance, etc).
 */
export default function PendingTasksPanel(): JSX.Element {
  const [tasks, setTasks] = React.useState<PendingTask[]>(() => {
    try {
      return readTasks() as PendingTask[];
    } catch {
      return [];
    }
  });
  const [busyIds, setBusyIds] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    const handler = () => {
      try {
        setTasks(readTasks() as PendingTask[]);
      } catch {
        // ignore read errors
      }
    };

    window.addEventListener('tm:pendingTasksUpdated', handler as EventListener);
    // also attempt a refresh on mount in case tasks changed while component was not mounted
    handler();

    return () => {
      window.removeEventListener('tm:pendingTasksUpdated', handler as EventListener);
    };
  }, []);

  /**
   * handleCancel
   * @description Cancel a pending task (removes it from storage) with a confirmation dialog.
   * Cancellation allowed only in the first 5 game-days (checked by canCancelTask).
   * @param t PendingTask
   */
  function handleCancel(t: PendingTask) {
    if (!canCancelTask(t, 5)) {
      alert('This task can no longer be cancelled.');
      return;
    }

    // small double-confirm
    // eslint-disable-next-line no-restricted-globals
    const ok = confirm(`Are you sure you want to cancel "${t.type}" for ${t.city ?? 'Unknown City'}? This action cannot be undone.`);
    if (!ok) return;

    try {
      setBusyIds((s) => ({ ...s, [t.id]: true }));
      removeTask(t.id);
      // readTasks will be emitted by writeTasks; but refresh in case
      setTasks(readTasks() as PendingTask[]);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[PendingTasksPanel] cancel failed', err);
      alert('Failed to cancel the task.');
    } finally {
      setBusyIds((s) => {
        const copy = { ...s };
        delete copy[t.id];
        return copy;
      });
    }
  }

  const pending = tasks.filter((t) => {
    const s = String(t.status ?? 'pending').toLowerCase();
    return s === 'pending' || s === 'in-progress' || s === 'queued';
  });

  return (
    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="text-sm font-semibold text-white">Pending Tasks</h4>
          <div className="text-xs text-slate-400">Ongoing constructions & facility tasks</div>
        </div>
        <div className="text-xs text-slate-400">{pending.length}</div>
      </div>

      {pending.length === 0 ? (
        <div className="text-slate-300 text-sm">No pending tasks.</div>
      ) : (
        <ul className="space-y-3">
          {pending.map((t) => {
            const title =
              t.type === 'build-hub'
                ? `${t.city ?? 'Unknown City'} — ${t.countryName ?? t.countryCode ?? '—'}`
                : typeof t.title === 'string'
                ? t.title
                : t.type.replace(/[-_]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());

            const price = formatPrice(t.estimatedPrice);
            const doneAt = formatDoneAt(t.completionGameMs ?? null);
            const statusLabel = String(t.status ?? 'pending');

            const cancellable = canCancelTask(t, 5);
            const busy = Boolean(busyIds[t.id]);

            return (
              <li key={t.id} className="bg-slate-700 rounded p-3 border border-slate-600">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-white font-medium">{title}</div>
                    <div className="text-xs text-slate-400">
                      {t.type === 'build-hub' ? 'Type: Hub construction' : `Type: ${t.type}`}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-slate-400">Price</div>
                    <div className="text-sm text-slate-200">{price}</div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                  <div>Status: {statusLabel}</div>
                  <div>Done at (game UTC)</div>
                </div>

                <div className="mt-1 text-sm text-slate-200 text-right">{doneAt}</div>

                <div className="mt-3 flex items-center justify-end space-x-2">
                  <button
                    onClick={() => {
                      // show details in a simple alert for now
                      alert(`Task details:\nType: ${t.type}\nCity: ${t.city ?? '—'}\nPrice: ${price}\nETA: ${doneAt}\nStatus: ${statusLabel}`);
                    }}
                    className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1 rounded text-xs border border-slate-600"
                  >
                    Details
                  </button>

                  <button
                    onClick={() => handleCancel(t)}
                    disabled={!cancellable || busy}
                    className={`px-3 py-1 rounded text-xs ${cancellable ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'bg-slate-700 text-slate-400 cursor-not-allowed'} ${busy ? 'opacity-60 cursor-wait' : ''}`}
                    title={cancellable ? 'Cancel task' : 'Cancellation window expired'}
                  >
                    {busy ? 'Cancelling…' : cancellable ? 'Cancel' : 'Cannot cancel'}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}