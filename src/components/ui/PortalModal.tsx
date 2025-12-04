/**
 * PortalModal.tsx
 *
 * Small, reusable portal modal that renders children into document.body with a high z-index
 * and an accessible backdrop. Use this to guarantee modals escape stacking contexts and appear
 * above all other page content.
 *
 * Responsibilities:
 * - Render a backdrop and centered dialog at the document root via React portal.
 * - Provide accessible attributes (role="dialog", aria-modal).
 * - Expose an onClose hook invoked when backdrop is clicked (optional).
 */

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface PortalModalProps {
  children: React.ReactNode;
  open: boolean;
  onClose?: () => void;
  /**
   * Optional className for the dialog container itself (inner box)
   * Example: "relative max-w-xl w-full bg-slate-800 rounded-xl ..."
   */
  dialogClassName?: string;
}

/**
 * PortalModal
 * @description Create a modal that always renders above the app by using a portal to document.body.
 */
const PortalModal: React.FC<PortalModalProps> = ({ children, open, onClose, dialogClassName }) => {
  useEffect(() => {
    if (!open) return undefined;
    // Prevent body scroll while modal is open
    const orig = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = orig;
    };
  }, [open]);

  if (typeof document === 'undefined' || !open) return null;

  const modal = (
    <div
      className="fixed inset-0 z-[200000] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop - click closes if onClose provided */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => {
          if (typeof onClose === 'function') onClose();
        }}
        aria-hidden="true"
      />

      {/* Dialog container - placed above backdrop */}
      <div
        className={`${dialogClassName ?? ''} relative z-[200001]`}
      >
        {children}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

export default PortalModal;