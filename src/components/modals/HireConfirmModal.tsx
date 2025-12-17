/**
 * HireConfirmModal.tsx
 *
 * File-level:
 * Friendly confirmation modal shown when a user attempts to hire a candidate.
 * Enhanced to display a UI-friendly final summary (notice, availability date,
 * hiring fee, first month salary and total cost) before the final confirmation.
 *
 * Responsibilities:
 * - Present a consistent in-UI confirmation for hiring (replaces native confirm()).
 * - Display a cost breakdown and computed availability information.
 * - Provide a secondary inline summary step inside the modal; the final Confirm
 *   button is the last step and directly calls onConfirm() (no native popups).
 */

import React from 'react';
import { UserPlus, X, Euro } from 'lucide-react';

/**
 * MinimalCandidate
 * @description Local candidate shape used by the modal — matches fields used by the dialog.
 */
export interface MinimalCandidate {
  id: string;
  name: string;
  role?: string;
  expectedSalary?: number;
  availability?: 'immediate' | '1week' | '2weeks' | '3weeks' | string;
  nationality?: string;
}

/**
 * HireConfirmModalProps
 * @description Props for HireConfirmModal component.
 */
interface HireConfirmModalProps {
  /** Whether modal is visible */
  open: boolean;
  /** Candidate to show — null when closed */
  candidate: MinimalCandidate | null;
  /** Current company capital used to display/enforce affordability */
  availableCapital?: number;
  /** Called when the user confirms hiring (modal final Confirm button) */
  onConfirm: () => void;
  /** Called when the user cancels the modal */
  onCancel: () => void;
}

/**
 * getAvailabilityDelay
 * @description Returns delay in days for a candidate based on availability string.
 * Supports: immediate, 1week, 2weeks, 3weeks (fallbacks to 0).
 * @param availability availability token
 */
const getAvailabilityDelay = (availability?: string): number => {
  switch (availability) {
    case 'immediate':
      return 0;
    case '1week':
      return 7;
    case '2weeks':
      return 14;
    case '3weeks':
      return 21;
    default:
      return 0;
  }
};

/**
 * getHiringFeePercent
 * @description Determine hiring fee percent depending on notice period.
 * Rules:
 * - immediate -> 70%
 * - 1week -> 50%
 * - 2weeks -> 35%
 * - 3weeks -> 20%
 * Default fallback: 50%
 * @param availability availability token
 */
const getHiringFeePercent = (availability?: string): number => {
  switch (availability) {
    case 'immediate':
      return 70;
    case '1week':
      return 50;
    case '2weeks':
      return 35;
    case '3weeks':
      return 20;
    default:
      return 50;
  }
};

/**
 * formatCurrency
 * @description Format number as Euro currency without forcing locale-specific grouping
 *              but keep readability. Uses en-GB so € sign appears and thousands sep = comma.
 * @param amount number
 */
const formatCurrency = (amount: number) =>
  amount.toLocaleString('de-DE'); // keep the previously requested format (e.g. 4.992)

/**
 * HireConfirmModal
 * @description Presentational modal used to confirm hiring a candidate. This replaces
 * native browser confirm dialogs with a friendly in-app modal. Clicking the Confirm
 * button opens an inline summary card inside the modal. The final Confirm inside the
 * summary calls onConfirm() directly — no native window.confirm popup is invoked.
 *
 * @param props HireConfirmModalProps
 * @returns React.ReactElement | null
 */
const HireConfirmModal: React.FC<HireConfirmModalProps> = ({
  open,
  candidate,
  availableCapital = 0,
  onConfirm,
  onCancel
}) => {
  const [showSummary, setShowSummary] = React.useState(false);

  React.useEffect(() => {
    // Reset summary each time modal opens/closes
    if (!open) setShowSummary(false);
  }, [open]);

  if (!open || !candidate) return null;

  const salary = candidate.expectedSalary ?? 0;
  const feePercent = getHiringFeePercent(candidate.availability);
  const hiringFee = Math.floor(salary * (feePercent / 100));
  const totalCost = salary + hiringFee;
  const noticeDays = getAvailabilityDelay(candidate.availability);
  const availableDate = new Date();
  availableDate.setDate(availableDate.getDate() + noticeDays);

  const canAfford = availableCapital >= totalCost;

  /**
   * handlePrimaryConfirm
   * @description Open the inline summary (secondary confirmation) when user clicks primary Confirm.
   * This keeps the modal as the visual-first step and avoids native popups.
   */
  const handlePrimaryConfirm = () => {
    setShowSummary(true);
  };

  /**
   * handleFinalConfirm
   * @description Final confirmation — directly invoke provided onConfirm() callback.
   * This is intentionally the last step and does not show any native popups.
   */
  const handleFinalConfirm = () => {
    onConfirm();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Confirm Hire Candidate"
    >
      <div className="absolute inset-0 bg-black/50" onClick={() => onCancel()} aria-hidden />

      <div className="relative w-full max-w-md bg-slate-900 rounded-xl border border-slate-700 p-6 shadow-lg">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-emerald-600/10 p-2 text-emerald-400">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Confirm Hire</h3>
              <p className="text-sm text-slate-400 mt-1">
                You are about to hire <span className="font-medium text-white">{candidate.name}</span>
                {candidate.role ? <span className="ml-1 text-slate-300">as {candidate.role}</span> : null}.
              </p>
            </div>
          </div>

          <button
            onClick={() => onCancel()}
            className="text-slate-400 hover:text-white ml-4"
            aria-label="Close"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 space-y-3 text-sm text-slate-300">
          <div className="flex items-center justify-between">
            <div className="text-slate-400">Expected Salary (first month)</div>
            <div className="font-medium text-white">€{formatCurrency(salary)}</div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-slate-400">Hiring Fee ({feePercent}%)</div>
            <div className="font-medium text-white">€{formatCurrency(hiringFee)}</div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-slate-400">Total Cost (due now)</div>
            <div className="font-medium text-amber-400">€{formatCurrency(totalCost)}</div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-slate-400">Availability</div>
            <div className="font-medium text-white">{candidate.availability ?? 'Unknown'}</div>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={() => onCancel()}
            className="flex-1 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white py-2 rounded text-sm"
          >
            Cancel
          </button>

          <button
            onClick={handlePrimaryConfirm}
            disabled={!canAfford}
            className={`flex-1 ${canAfford ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-600 cursor-not-allowed'} text-white py-2 rounded text-sm flex items-center justify-center gap-2`}
            title={canAfford ? `Confirm hiring ${candidate.name}` : 'Insufficient funds'}
          >
            <Euro className="w-4 h-4" />
            <span>Confirm Hire</span>
          </button>
        </div>

        {/* Inline summary confirmation overlay (keeps design language, centered within modal) */}
        {showSummary && (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-slate-800 rounded-xl border border-slate-700 p-5 z-10">
              <div className="mb-3 text-sm text-slate-300">
                {/* Notice / availability message */}
                {noticeDays > 0 ? (
                  <div className="mb-3">
                    <div className="text-slate-400">Notice / Availability</div>
                    <div className="text-white font-medium mt-1">
                      {candidate.name} requires {noticeDays} days notice. They will be available on {availableDate.toLocaleDateString()}.
                    </div>
                  </div>
                ) : (
                  <div className="mb-3">
                    <div className="text-slate-400">Availability</div>
                    <div className="text-white font-medium mt-1">Available Now</div>
                  </div>
                )}

                {/* Cost reservation message */}
                <div>
                  <div className="text-slate-400">Reserved Amount</div>
                  <div className="text-white font-medium mt-1">
                    €{formatCurrency(Math.floor(totalCost))} will be reserved from your capital now.
                  </div>
                </div>
              </div>

              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => setShowSummary(false)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white py-2 rounded text-sm"
                >
                  Back
                </button>

                <button
                  onClick={handleFinalConfirm}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded text-sm flex items-center justify-center gap-2"
                >
                  <Euro className="w-4 h-4" />
                  <span>Confirm Hire</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HireConfirmModal;