/**
 * StaffFiredListener.tsx
 *
 * File-level:
 * - Small global helper that listens for 'staff:fired' events and performs UI cleanup.
 *
 * Purpose:
 * - Some components or legacy UI pieces may keep DOM nodes or local state and not re-render
 *   immediately when the central game state changes. This helper performs best-effort DOM
 *   removal for elements using common staff-id data attributes and emits a user-facing toast.
 *
 * Behavior:
 * - Listens to "staff:fired" CustomEvents with detail { staffId, staffName? }.
 * - Attempts to remove DOM elements matching selectors that may be used by other components:
 *   [data-staff-id="<id>"], [data-staffid="<id>"], #staff-<id>
 * - Emits an 'app:toast' event that the existing Toaster will show (success).
 *
 * Notes:
 * - This helper is non-destructive to state; it is a UI-only convenience to avoid stale cards
 *   lingering when some parts of the app don't re-render immediately.
 */

import React, { useEffect } from 'react';

interface StaffFiredDetail {
  staffId: string;
  staffName?: string;
}

/**
 * StaffFiredListener
 * @description React component mounting a global listener for 'staff:fired' to clean UI and notify user.
 */
const StaffFiredListener: React.FC = () => {
  useEffect(() => {
    /**
     * handleStaffFired
     * @description Remove DOM elements referencing the fired staff and emit a toast.
     */
    const handleStaffFired = (ev: Event) => {
      try {
        const detail = (ev as CustomEvent)?.detail as StaffFiredDetail | undefined;
        const staffId = detail?.staffId ?? null;
        const staffName = detail?.staffName ?? null;

        if (!staffId) return;

        // List of selectors to try removing for stale UI cards
        const selectors = [
          `[data-staff-id="${staffId}"]`,
          `[data-staffid="${staffId}"]`,
          `#staff-${staffId}`,
          `[data-staff-id="${encodeURIComponent(staffId)}"]`
        ];

        selectors.forEach(sel => {
          try {
            const el = document.querySelector(sel) as HTMLElement | null;
            if (el && el.parentElement) {
              // graceful fade/height collapse for UX
              try {
                el.style.transition = 'opacity 220ms ease, height 220ms ease, margin 220ms ease, padding 220ms ease';
                el.style.opacity = '0';
                el.style.height = '0';
                el.style.margin = '0';
                el.style.padding = '0';
                setTimeout(() => {
                  try { if (el.parentElement) el.parentElement.removeChild(el); } catch {}
                }, 260);
              } catch {
                try { if (el.parentElement) el.parentElement.removeChild(el); } catch {}
              }
            }
          } catch { /* ignore selector errors */ }
        });

        // Dispatch an app:toast event that Toaster will pick up
        try {
          const title = 'Staff Released';
          const namePart = staffName ? `: ${staffName}` : '';
          window.dispatchEvent(new CustomEvent('app:toast', { detail: { title, message: `Staff removed${namePart}.`, variant: 'success', ttl: 3500 } }));
        } catch { /* ignore toast errors */ }
      } catch (err) {
        // defensive logging for development
        // eslint-disable-next-line no-console
        console.warn('[StaffFiredListener] handler error', err);
      }
    };

    window.addEventListener('staff:fired', handleStaffFired as EventListener);
    return () => {
      window.removeEventListener('staff:fired', handleStaffFired as EventListener);
    };
  }, []);

  return null;
};

export default StaffFiredListener;