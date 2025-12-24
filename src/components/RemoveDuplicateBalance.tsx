/**
 * RemoveDuplicateBalance.tsx
 *
 * Small client-side DOM patcher that removes duplicated big-balance elements rendered
 * elsewhere in the page body when a canonical balance already exists in the header.
 *
 * Rationale:
 * - Some pages render a large green balance block in the page content while the
 *   header already shows the company capital. This component detects and removes
 *   those duplicated blocks at runtime without touching many page files.
 *
 * Notes:
 * - Executes only on the client (uses useEffect).
 * - Conservative: only removes nodes with the exact utility classes used (`text-2xl font-bold text-green-400`)
 *   that are not inside the header and that contain a Euro symbol or '€' character.
 * - Silent and defensive: logs only on internal errors to avoid noisy console output.
 */

import React, { useEffect } from 'react';

/**
 * RemoveDuplicateBalance
 * @description Remove duplicate page-level balance blocks when header already displays balance.
 */
const RemoveDuplicateBalance: React.FC = () => {
  useEffect(() => {
    try {
      // Confirm header contains the canonical balance before removing duplicates
      const header = document.querySelector('header');
      const headerHasBalance = header ? header.textContent?.includes('Capital') || header.textContent?.includes('Company Balance') : false;
      if (!headerHasBalance) return;

      // Select nodes that match the target utility classes (tailwind class order may vary)
      // Use a flexible selector by matching elements that contain all three class tokens.
      const candidates: HTMLElement[] = Array.from(document.querySelectorAll<HTMLElement>('[class*="text-2xl"]'))
        .filter((el) => {
          const cls = el.className || '';
          // Ensure it contains all required tokens
          return cls.includes('text-2xl') && cls.includes('font-bold') && cls.includes('text-green-400');
        });

      candidates.forEach((node) => {
        // Skip nodes that are inside the header (protect header)
        if (node.closest('header')) return;

        // Remove only if it looks like a currency/balance (contains euro symbol or typical format)
        const txt = node.textContent || '';
        if (/\u20AC|€/.test(txt) || /€\s*\d|EUR|€\d|€\d{1,3}(\.\d{3})*/.test(txt)) {
          node.remove();
        }
      });
    } catch (err) {
      // Guarded logging
      // eslint-disable-next-line no-console
      console.warn('[RemoveDuplicateBalance] error removing duplicate balance', err);
    }
  }, []);

  return null;
};

export default RemoveDuplicateBalance;