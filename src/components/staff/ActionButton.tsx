/**
 * ActionButton.tsx
 *
 * File-level:
 * Small, reusable action button used in staff panels. Keeps styling consistent.
 */

import React from 'react';
import { Calendar, DollarSign, Star, ArrowUp, Trash2 } from 'lucide-react';

/**
 * ActionButtonProps
 * @description Props for ActionButton
 */
export interface ActionButtonProps {
  /** Text label shown on the button */
  label: string;
  /** Accessible title */
  title?: string;
  /** Button visual variant: default | destructive */
  variant?: 'default' | 'destructive';
  /** Optional click handler */
  onClick?: () => void;
  /** Icon key for convenience */
  icon?: 'salary' | 'vacation' | 'skill' | 'promote' | 'fire';
}

/**
 * ActionButton
 * @description Small button used for staff actions (salary, vacation, etc.).
 */
const ActionButton: React.FC<ActionButtonProps> = ({ label, title, variant = 'default', onClick, icon }) => {
  const base = 'flex-1 py-2 px-3 rounded-md text-sm flex items-center justify-center gap-2';
  const color =
    variant === 'destructive'
      ? 'bg-red-700 hover:bg-red-600 text-white'
      : 'bg-slate-700 hover:bg-slate-600 text-white';

  const Icon = (() => {
    switch (icon) {
      case 'salary':
        return <DollarSign className="w-4 h-4" aria-hidden />;
      case 'vacation':
        return <Calendar className="w-4 h-4" aria-hidden />;
      case 'skill':
        return <Star className="w-4 h-4" aria-hidden />;
      case 'promote':
        return <ArrowUp className="w-4 h-4" aria-hidden />;
      case 'fire':
        return <Trash2 className="w-4 h-4" aria-hidden />;
      default:
        return null;
    }
  })();

  return (
    <button
      type="button"
      className={`${base} ${color}`}
      aria-label={label}
      title={title ?? label}
      onClick={onClick}
    >
      {Icon}
      <span>{label}</span>
    </button>
  );
};

export default ActionButton;