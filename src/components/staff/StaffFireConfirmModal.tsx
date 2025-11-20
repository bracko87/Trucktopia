/**
 * StaffFireConfirmModal.tsx
 *
 * File-level:
 * Reusable confirmation modal for firing staff. Styled to match the game's UI template.
 *
 * Purpose:
 * - Show a game-integrated confirmation window when releasing/firing staff.
 * - Display staff salary, required compensation (3× salary), company capital,
 *   and present Confirm & Pay / Cancel actions.
 *
 * Notes:
 * - This component is purely presentational and receives callbacks for confirm/cancel.
 * - Keep styling consistent with app: bg-slate-800, border-slate-700, rounded, subtle shadow.
 */

import React from 'react';
import { UserCog, X } from 'lucide-react';

export interface StaffFireConfirmModalProps {
  /** Whether modal is visible */
  open: boolean;
  /** Staff display name */
  staffName: string;
  /** Monthly salary expressed as number (0 for FREE) */
  monthlySalary: number;
  /** Company capital number */
  companyCapital: number;
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
 * StaffFireConfirmModal
 * @description Presentational modal to confirm releasing a staff member. Designed
 * to visually integrate with the game's layout and style.
 */
const StaffFireConfirmModal: React.FC<StaffFireConfirmModalProps> = ({
  open,
  staffName,
  monthlySalary,
  companyCapital,
  onConfirm,
  onCancel,
  loading = false,
  resultMessage = null,
}) => {
  if (!open) return null;

  const compensation = Math.max(0, Math.round(monthlySalary * 3));
  const canPay = companyCapital >= compensation;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="alertdialog"
      aria-modal="true"
      aria-label="Confirm Fire"
    >
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} aria-hidden />
      <div className="relative w-full max-w-lg bg-slate-800 rounded-lg border border-slate-700 shadow-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <UserCog className="w-5 h-5 text-rose-400" />
            <div>
              <div className="text-xs text-slate-400">sider.ai says</div>
              <h3 className="text-sm font-medium text-white">Confirm Release</h3>
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
            Are you sure you want to fire <span className="text-amber-400 font-medium">{staffName}</span>?
          </div>

          <div className="text-xs text-slate-400">
            This action can be undone only from company management.
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-xs text-slate-400">Staff monthly salary</div>
            <div className="text-white font-medium">€{monthlySalary.toLocaleString()}</div>

            <div className="text-xs text-slate-400">Required compensation</div>
            <div className="text-white font-medium">€{compensation.toLocaleString()}</div>

            <div className="text-xs text-slate-400">Company capital</div>
            <div className={`font-medium ${companyCapital >= compensation ? 'text-green-400' : 'text-rose-400'}`}>
              €{companyCapital.toLocaleString()}
            </div>
          </div>

          {resultMessage && <div className="text-sm text-slate-300">{resultMessage}</div>}

          {!canPay && (
            <div className="text-xs text-rose-400">
              Insufficient funds to pay compensation. Please top up company capital to proceed.
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={onConfirm}
              disabled={loading || !canPay}
              className={`flex-1 ${loading || !canPay ? 'bg-slate-600 cursor-not-allowed' : 'bg-rose-600 hover:bg-rose-700'} text-white py-2 rounded text-sm`}
            >
              {loading ? 'Processing…' : `Confirm & Pay €${compensation.toLocaleString()}`}
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

export default StaffFireConfirmModal;