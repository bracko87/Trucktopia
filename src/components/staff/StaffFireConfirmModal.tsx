/**
 * StaffFireConfirmModal.tsx
 *
 * File-level:
 * Confirmation modal used when releasing/firing staff. This modal explicitly
 * requires the user to confirm paying N months' salary (default 3).
 *
 * Responsibilities:
 * - Render a clear UI showing monthly salary, requested months, total cost and company balance
 * - Block confirm when funds are insufficient
 * - Call onConfirm(months) and await result; on success mark local removal and dispatch events
 * - Keep visual styling consistent with the app (Tailwind classes)
 */

import React from 'react';

/**
 * StaffFireConfirmModalProps
 * @description Props for StaffFireConfirmModal component.
 */
export interface StaffFireConfirmModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Optional staff id - used for optimistic marker and fired event */
  staffId?: string;
  /** Staff display name used in modal and events */
  staffName?: string;
  /** Monthly salary number (for display) */
  monthlySalary?: number;
  /** Company capital used to show cost context where needed */
  companyCapital?: number;
  /**
   * Called when the user confirms the action (canonical persistence).
   * The handler may accept the number of months to pay (recommended).
   */
  onConfirm: (months?: number) => Promise<any> | any;
  /** Called when user cancels/closes the modal */
  onCancel: () => void;
  /** Optional loading state passed from callers */
  loading?: boolean;
  /** Optional result message to display in modal */
  resultMessage?: string | null;
  /**
   * Number of months the modal will request payment for.
   * Default: 3 (three months salary)
   */
  months?: number;
}

/**
 * markRecentlyFired
 * @description Persist a small local marker list so other UI code / sanitizers
 * know this staff was recently fired and can hide the card immediately.
 * @param id staff id
 */
function markRecentlyFired(id?: string) {
  if (!id || typeof window === 'undefined') return;
  try {
    const key = 'tm_recently_fired_staff';
    const raw = localStorage.getItem(key);
    let arr: string[] = [];
    if (raw) {
      try { arr = JSON.parse(raw) || []; } catch { arr = []; }
    }
    if (!arr.includes(id)) arr.push(id);
    localStorage.setItem(key, JSON.stringify(arr));
  } catch {
    // ignore localStorage errors
  }
}

/**
 * dispatchFiredEvent
 * @description Dispatch a CustomEvent('staff:fired') and an app:toast so
 * listeners show feedback and sanitizers run.
 * @param id staff id (optional)
 * @param name staff name (optional)
 */
function dispatchFiredEvent(id?: string, name?: string) {
  try {
    window.dispatchEvent(new CustomEvent('staff:fired', { detail: { staffId: id, staffName: name } }));
  } catch {}
  try {
    window.dispatchEvent(new CustomEvent('app:toast', {
      detail: { title: 'Staff removed', message: `${name ?? 'Staff'} removed.`, variant: 'success', ttl: 3000 }
    }));
  } catch {}
}

/**
 * StaffFireConfirmModal
 * @description Confirmation modal used when releasing/firing staff. This modal
 * explicitly requires the user to confirm paying N months salary (default 3).
 * It performs a blocking call to onConfirm(months) and only upon success marks
 * the staff as removed (local marker + dispatched events).
 */
const StaffFireConfirmModal: React.FC<StaffFireConfirmModalProps> = ({
  open,
  staffId,
  staffName,
  monthlySalary = 0,
  companyCapital = 0,
  onConfirm,
  onCancel,
  loading = false,
  resultMessage = null,
  months = 3,
}) => {
  /** Internal busy state while confirm in progress */
  const [busy, setBusy] = React.useState(false);
  const [localMessage, setLocalMessage] = React.useState<string | null>(resultMessage);

  React.useEffect(() => {
    setLocalMessage(resultMessage || null);
  }, [resultMessage]);

  React.useEffect(() => {
    if (open) setLocalMessage(resultMessage || null);
  }, [open, resultMessage]);

  if (!open) return null;

  const requestedMonths = Math.max(1, Math.floor(months));
  const totalCost = Math.max(0, Math.round((monthlySalary ?? 0) * requestedMonths));
  const canAfford = typeof companyCapital === 'number' ? companyCapital >= totalCost : true;

  /**
   * handleConfirmClick
   * @description Perform the canonical confirm: disable UI, call onConfirm(months),
   * await result, and on success mark local removal and dispatch events. If the
   * confirm handler rejects, show an error message.
   */
  const handleConfirmClick = async () => {
    try {
      setBusy(true);
      setLocalMessage(null);

      const result = await Promise.resolve(onConfirm(requestedMonths));

      // Accept undefined/null as success, or an object with success/ok true, or truthy values
      const ok =
        result === undefined ||
        result === null ||
        (typeof result === 'object' && (result.success === true || result.ok === true)) ||
        Boolean(result);

      if (ok) {
        // mark local and dispatch events so UI sanitizers hide the card and show toasts
        markRecentlyFired(staffId);
        dispatchFiredEvent(staffId, staffName);
        // close modal
        try { onCancel(); } catch {}
        return;
      }

      const msg = typeof result === 'object' && (result?.message) ? String(result.message) : 'Failed to complete removal. Please check funds and try again.';
      setLocalMessage(msg);
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('[StaffFireConfirmModal] onConfirm failed', err);
      const msg = err?.message ? String(err.message) : 'Unexpected error while completing removal.';
      setLocalMessage(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
    >
      <div className="absolute inset-0 bg-black/50" onClick={() => { if (!busy) onCancel(); }} />

      <div className="relative w-full max-w-lg bg-slate-900 rounded-xl border border-slate-700 p-6 shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Confirm Release &amp; Payment</h3>
            <p className="text-sm text-slate-400 mt-1">
              You are about to release <span className="font-medium text-white">{staffName ?? 'this staff member'}</span>.
              To proceed you must confirm payment for <span className="font-medium">{requestedMonths} months</span> of their salary.
            </p>
          </div>
          <button
            onClick={() => { if (!busy) onCancel(); }}
            className="text-slate-400 hover:text-white ml-4"
            aria-label="Close"
            title="Close"
          >
            ✕
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-400">Monthly Salary</div>
            <div className="text-white font-medium">€{(monthlySalary ?? 0).toLocaleString()}</div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-400">Requested Months</div>
            <div className="text-white font-medium">{requestedMonths}</div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-400">Total Cost</div>
            <div className="text-amber-400 font-bold">€{totalCost.toLocaleString()}</div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-400">Company Balance</div>
            <div className="text-white font-medium">€{(companyCapital ?? 0).toLocaleString()}</div>
          </div>

          {!canAfford && (
            <div className="text-sm text-rose-400">
              Insufficient funds to pay the requested amount. Please ensure you have enough capital before releasing.
            </div>
          )}

          {localMessage ? <div className="text-sm text-amber-400">{localMessage}</div> : null}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={() => { if (!busy) onCancel(); }}
            className="flex-1 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white py-2 rounded text-sm"
            disabled={busy}
          >
            Cancel
          </button>

          <button
            onClick={handleConfirmClick}
            disabled={busy || !canAfford}
            className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-2 rounded text-sm"
            aria-disabled={!canAfford || busy}
            title={!canAfford ? 'Insufficient funds' : `Confirm & Pay €${totalCost.toLocaleString()}`}
          >
            {busy ? 'Processing…' : `Confirm & Pay €${totalCost.toLocaleString()}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StaffFireConfirmModal;
