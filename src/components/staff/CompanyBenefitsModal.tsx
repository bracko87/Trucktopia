/**
 * CompanyBenefitsModal.tsx
 *
 * Presentational confirmation modal for company benefits.
 *
 * Responsibilities:
 * - Show per-employee cost, total cost, happiness gain and cooldown information
 * - Display any reason why the benefit cannot be applied (disabledReason)
 * - Provide Confirm and Cancel actions — Confirm is fully controlled (no native dialogs)
 *
 * Notes:
 * - This component is intentionally dumb: it receives computed numbers and decision
 *   context from the parent (Staff page) and only provides the final confirmation UI.
 */

import React from 'react';
import { CheckCircle, X } from 'lucide-react';

 /**
  * CompanyBenefitsModalProps
  * @description Props for the CompanyBenefitsModal component
  */
interface CompanyBenefitsModalProps {
  open: boolean;
  benefitKey: 'staff_bonus' | 'family_day' | '';
  employees: number;
  costPerEmployee: number;
  totalCost: number;
  currencySymbol: string;
  happinessGain: number;
  cooldownText?: string | null;
  disabledReason?: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

/**
 * CompanyBenefitsModal
 * @description Confirmation modal to show benefit details and gather final user confirmation.
 *              It does not perform business logic; it expects parent to provide computed values
 *              and to execute the actual apply action on confirm.
 */
const CompanyBenefitsModal: React.FC<CompanyBenefitsModalProps> = ({
  open,
  benefitKey,
  employees,
  costPerEmployee,
  totalCost,
  currencySymbol,
  happinessGain,
  cooldownText,
  disabledReason,
  onClose,
  onConfirm,
}) => {
  /** Render nothing when closed */
  if (!open) return null;

  const title = benefitKey === 'staff_bonus' ? 'Staff Bonus' : benefitKey === 'family_day' ? 'Staff Family Day' : 'Benefit';
  const description =
    benefitKey === 'staff_bonus'
      ? 'One-time staff bonus that increases happiness across the whole company.'
      : benefitKey === 'family_day'
      ? 'Organize a company family day to boost staff happiness.'
      : 'Benefit details';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal content */}
      <div className="relative max-w-md w-full bg-slate-800 rounded-xl border border-slate-700 p-6 shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <p className="text-sm text-slate-400 mt-1">{description}</p>
          </div>

          <button
            aria-label="Close"
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 text-sm text-slate-300 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-slate-400">Per-employee cost</div>
            <div className="font-medium">
              {currencySymbol}
              {costPerEmployee.toLocaleString()}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-slate-400">Employees affected</div>
            <div className="font-medium">{employees}</div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-slate-400">Total cost</div>
            <div className="font-medium">
              {currencySymbol}
              {totalCost.toLocaleString()}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-slate-400">Happiness increase</div>
            <div className="font-medium">+{happinessGain}% (capped at 100)</div>
          </div>

          {cooldownText && <div className="text-xs text-slate-500 pt-2">{cooldownText}</div>}

          {disabledReason && (
            <div className="mt-2 rounded-md bg-red-900/40 border border-red-700 p-3 text-sm text-red-200">
              {disabledReason}
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className="bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg px-4 py-2 text-sm text-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!!disabledReason}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              disabledReason ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            <span>Confirm</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompanyBenefitsModal;
