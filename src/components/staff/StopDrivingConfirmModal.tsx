/**
 * StopDrivingConfirmModal.tsx
 *
 * File-level:
 * Presentational confirmation modal for the "Stop Driving" action.
 *
 * Purpose:
 * - Replace browser-native confirm() for stopping a staff member from driving with
 *   a game-integrated in-UI modal using the app's visual style.
 * - Keep the modal simple and reusable: accepts confirm/cancel callbacks and a loading state.
 *
 * Visual / UX:
 * - Uses the same visual language as other in-game modals (bg-slate-800, border-slate-700).
 * - Shows the staff name, a short explanation and Confirm / Cancel actions.
 */

import React from 'react';
import { Trash2, X } from 'lucide-react';

export interface StopDrivingConfirmModalProps {
  /** Whether the modal is visible */
  open: boolean;
  /** Staff display name */
  staffName?: string | null;
  /** Called when user confirms */
  onConfirm: () => void;
  /** Called when user cancels / closes */
  onCancel: () => void;
  /** Show processing state */
  loading?: boolean;
  /** Optional result message (success / error) to display inside modal */
  resultMessage?: string | null;
}

/**
 * StopDrivingConfirmModal
 * @description Presentational modal to confirm stopping a staff member from driving.
 */
const StopDrivingConfirmModal: React.FC<StopDrivingConfirmModalProps> = ({
  open,
  staffName = 'Unknown',
  onConfirm,
  onCancel,
  loading = false,
  resultMessage = null,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="alertdialog"
      aria-modal="true"
      aria-label="Confirm Stop Driving"
    >
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} aria-hidden />
      <div className="relative w-full max-w-lg bg-slate-800 rounded-lg border border-slate-700 shadow-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <Trash2 className="w-5 h-5 text-amber-400" />
            <div>
              <div className="text-xs text-slate-400">sider.ai says</div>
              <h3 className="text-sm font-medium text-white">Confirm Stop Driving</h3>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded hover:bg-slate-700 text-slate-300"
            aria-label="Close"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="text-sm text-slate-300">
            Are you sure you want to stop <span className="text-amber-400 font-medium">{staffName}</span> from driving?
          </div>

          <div className="text-xs text-slate-400">
            This will unassign the driver from their current duty and set them to rest. You can reassign them afterwards.
          </div>

          {resultMessage && <div className="text-sm text-slate-300">{resultMessage}</div>}

          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={onConfirm}
              disabled={loading}
              className={`flex-1 ${loading ? 'bg-slate-600 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'} text-white py-2 rounded text-sm`}
            >
              {loading ? 'Processing…' : 'Confirm Stop Driving'}
            </button>
            <button
              onClick={onCancel}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StopDrivingConfirmModal;