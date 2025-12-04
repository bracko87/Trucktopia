/**
 * ModalZIndexFix.tsx
 *
 * Small utility component that ensures application modal dialogs render above
 * other page content. Some legacy or local modals may be rendered in-context
 * and get placed behind other boxes due to stacking context issues.
 *
 * Responsibilities:
 * - Inject a small, focused style that elevates elements that use role="dialog"
 *   (and common modal classes) to a very high z-index and ensure fixed positioning.
 * - Keep the rule scoped and conservative to avoid interfering with layout outside
 *   of dialogs.
 *
 * Notes:
 * - This intentionally does not replace any modal logic or create portals. It
 *   only adjusts stacking so existing modals reliably appear on top.
 */

import React from 'react';

/**
 * ModalZIndexFix
 * @description Render a focused <style> tag that ensures role="dialog" elements
 *              and common modal classes are positioned above other UI.
 */
const ModalZIndexFix: React.FC = () => {
  // The styles are purposefully small and use !important to ensure they win in
  // the common case where inline stacking context was the cause of being hidden.
  // We target [role="dialog"] because accessible modals should use this role.
  return (
    <style
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{
        __html: `
/* Ensure accessible dialog elements appear above other UI boxes */
[role="dialog"], .modal, .modal-root, .modal-backdrop, .dialog-portal {
  position: fixed !important;
  z-index: 99999 !important;
  left: 0 !important;
  top: 0 !important;
}

/* Dialog content itself should maintain its sizing and be centered by existing styles.
   This rule only ensures it is not clipped behind other stacking contexts. */
[role="dialog"] > * {
  z-index: 100000 !important;
}

/* Backdrop fallback: ensure backdrops are behind the dialog content but above page */
[role="dialog"] .backdrop, .modal-backdrop {
  z-index: 99998 !important;
  position: fixed !important;
  inset: 0 !important;
}

/* If a dialog is placed inside a container with transform/opacity, forcing fixed helps it escape stacking */
[role="dialog"], [role="dialog"] * {
  -webkit-transform: none !important;
  transform: none !important;
}
        `,
      }}
    />
  );
};

export default ModalZIndexFix;
