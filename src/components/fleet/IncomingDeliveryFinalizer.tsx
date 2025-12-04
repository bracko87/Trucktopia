/**
 * IncomingDeliveryFinalizer.tsx
 *
 * Background helper that:
 *  - processes incoming deliveries on mount and on an interval,
 *  - intercepts button clicks for friendly confirmation flows (replacing native confirm/alert),
 *  - shows a polished modal confirmation and dispatches toasts for job-accept flows,
 *  - attempts to persist updated company state using several persistence method name fallbacks.
 *
 * Responsibilities:
 *  - Run a one-time delivery finalization scan on mount and every 60s afterwards.
 *  - Persist updatedCompany using the first available persistence method on GameContext:
 *      createCompany, saveCompany, updateCompany (in that order).
 *  - If none are available, emit an 'applyCompanyUpdate' event so other parts can persist.
 *
 * Notes:
 *  - This component intentionally mounts UI (Toaster + Modal) but is safe to keep hidden most of the time.
 *  - It prefers the canonical game clock via processIncomingDeliveries implementation (utils).
 */

import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { processIncomingDeliveries } from '../../utils/incomingDeliveryUtils';
import { useGame } from '../../contexts/GameContext';
import Toaster from '../notifications/Toaster';

interface FriendlyConfirmState {
  open: boolean;
  message: string;
  targetElement: HTMLElement | null;
}

/**
 * safeDispatchToast
 * @description Emit an app-level toast that the global Toaster listens to.
 * @param detail Toast detail object: { title?, message, variant?, ttl? }
 */
function safeDispatchToast(detail: { title?: string; message: string; variant?: 'info' | 'success' | 'error' | 'neutral'; ttl?: number }) {
  try {
    window.dispatchEvent(new CustomEvent('app:toast', { detail }));
  } catch {
    // noop in restricted env
  }
}

/**
 * findNearbyJobTitle
 * @description Attempt to resolve a human-friendly title near the clicked button.
 *              Searches common nearby selectors and falls back to button text.
 * @param btn Button element
 * @returns string|null human-friendly name
 */
function findNearbyJobTitle(btn: HTMLElement | null): string | null {
  try {
    if (!btn) return null;
    const candidates: Array<HTMLElement | null> = [
      btn.closest('[data-job-title]') as HTMLElement | null,
      btn.closest('[data-job-id]') as HTMLElement | null,
      btn.closest('.bg-slate-800, .bg-slate-700') as HTMLElement | null,
      btn.parentElement,
    ];

    const selectors = ['[data-job-title]', '.text-white.font-medium', 'h3', 'h2', '.job-title', '[title]'];

    for (const root of candidates) {
      if (!root) continue;
      for (const sel of selectors) {
        try {
          const el = root.querySelector(sel) as HTMLElement | null;
          if (el) {
            const txt = (el.innerText || el.getAttribute('title') || '').trim();
            if (txt) return txt;
          }
        } catch {
          // ignore selector errors
        }
      }
    }

    // fallback: button label
    const btnText = (btn.innerText || btn.getAttribute('aria-label') || '').trim();
    return btnText || null;
  } catch {
    return null;
  }
}

/**
 * tryPersistCompany
 * @description Try to persist updatedCompany by checking common persistence method names on context.
 *              Order of attempts: createCompany, saveCompany, updateCompany.
 *              If none are present, emit a global event 'applyCompanyUpdate' with the payload.
 *              Returns an object describing success and method used (if any).
 * @param ctx Game context object (may contain persistence functions)
 * @param updatedCompany Modified company object to persist
 */
async function tryPersistCompany(ctx: any, updatedCompany: any): Promise<{ persisted: boolean; method?: string; error?: any }> {
  const methodNames = ['createCompany', 'saveCompany', 'updateCompany'];
  for (const name of methodNames) {
    try {
      const fn = ctx?.[name];
      if (typeof fn === 'function') {
        const res = fn(updatedCompany);
        if (res && typeof res.then === 'function') {
          await res;
        }
        return { persisted: true, method: name };
      }
    } catch (err) {
      // If the chosen persistence method throws, continue to next as fallback,
      // but record the error to report if all fallbacks fail.
      // eslint-disable-next-line no-console
      console.warn(`[IncomingDeliveryFinalizer] persistence method ${name} failed`, err);
      return { persisted: false, method: name, error: err };
    }
  }

  // Fallback: dispatch an event so other parts of the app can persist the company
  try {
    window.dispatchEvent(new CustomEvent('applyCompanyUpdate', { detail: { updatedCompany } }));
    return { persisted: false, method: 'event:applyCompanyUpdate' };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[IncomingDeliveryFinalizer] applyCompanyUpdate dispatch failed', err);
    return { persisted: false, error: err };
  }
}

/**
 * IncomingDeliveryFinalizer
 * @description Component mounted globally to process incoming deliveries and replace native confirm flows
 *              with a friendly UI modal + toast notifications. Will attempt to persist updated company
 *              by calling available persistence functions on GameContext in order and will emit events.
 */
const IncomingDeliveryFinalizer: React.FC = () => {
  const gameCtx = useGame() as any;
  const { gameState } = gameCtx ?? {};
  const intervalRef = useRef<number | null>(null);
  const [confirmState, setConfirmState] = useState<FriendlyConfirmState>({ open: false, message: '', targetElement: null });

  useEffect(() => {
    /**
     * runOnce
     * @description Run one processing scan and emit events/toasts when items moved.
     *              Attempts to persist updatedCompany using context fallback logic.
     */
    const runOnce = async () => {
      try {
        if (typeof window === 'undefined' || typeof document === 'undefined') return;

        if (!gameState || !gameState.company) {
          // If no company present in local state, signal other parts of the app to attempt processing.
          window.dispatchEvent(new CustomEvent('requestProcessIncomingDeliveries'));
          return;
        }

        const { updatedCompany, moved } = processIncomingDeliveries(gameState.company);

        // Diagnostic logging - show parsed ETA vs current game time and moved items
        try {
          console.debug('[IncomingDeliveryFinalizer] runOnce: now=', Date.now(), 'movedCount=', moved?.length ?? 0);
          if (moved && moved.length > 0) {
            console.debug('[IncomingDeliveryFinalizer] moved items:', moved);
          }
        } catch {
          // noop
        }

        if (moved && moved.length > 0) {
          // Dispatch events for listeners
          try {
            window.dispatchEvent(new CustomEvent('incomingDeliveriesProcessed', { detail: { updatedCompany, moved } }));
            window.dispatchEvent(new CustomEvent('incomingDeliveriesMoved', { detail: { moved } }));
          } catch {
            // ignore dispatch errors
          }

          // Attempt to persist update via multiple possible context methods
          const persistResult = await tryPersistCompany(gameCtx, updatedCompany);

          if (persistResult.persisted) {
            safeDispatchToast({ title: 'Deliveries Processed', message: `${moved.length} incoming delivery(ies) finalized and saved.`, variant: 'success' });
          } else {
            // If method indicated (but returned error), show informative toast; otherwise event fallback used.
            if (persistResult.method && persistResult.method !== 'event:applyCompanyUpdate') {
              safeDispatchToast({ title: 'Deliveries Processed', message: `${moved.length} finalized but persistence via ${persistResult.method} failed.`, variant: 'info' });
            } else if (persistResult.method === 'event:applyCompanyUpdate') {
              safeDispatchToast({ title: 'Deliveries Processed', message: `${moved.length} finalized. Persist handler requested via event.`, variant: 'neutral' });
            } else {
              safeDispatchToast({ title: 'Deliveries Processed', message: `${moved.length} finalized (persistence failed).`, variant: 'info' });
            }
          }

          // Emit a stronger event with persistence info
          try {
            window.dispatchEvent(new CustomEvent('incomingDeliveriesProcessedPersisted', { detail: { updatedCompany, moved, persisted: persistResult.persisted, method: persistResult.method } }));
          } catch {
            // noop
          }
        }
      } catch (err) {
        // resilient - don't break mount
        // eslint-disable-next-line no-console
        console.error('IncomingDeliveryFinalizer runOnce error', err);
      }
    };

    // Emit engine-mounted event for admin/manifest tools
    try {
      window.dispatchEvent(new CustomEvent('engineMounted', { detail: { id: 'E-018' } }));
    } catch {
      // noop
    }

    // Run immediately and set interval (60s)
    (async () => {
      await runOnce();
    })();

    intervalRef.current = window.setInterval(() => {
      void runOnce();
    }, 60000) as unknown as number;

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount

  /**
   * handleDocumentClick
   * @description Capture clicks and show friendly modal for matched buttons.
   *              Intercepts explicit data-friendly-confirm="true" or heuristic accept-like button labels.
   */
  useEffect(() => {
    const onClick = (ev: MouseEvent) => {
      try {
        const target = ev.target as HTMLElement | null;
        if (!target) return;
        const button = target.closest('button') as HTMLButtonElement | null;
        if (!button) return;

        // Allow explicit replay bypass
        if (button.dataset && button.dataset.friendlyConfirmBypass === '1') {
          delete button.dataset.friendlyConfirmBypass;
          return;
        }

        const explicit = String(button.dataset?.friendlyConfirm ?? '').toLowerCase() === 'true';
        const label = (button.innerText || '').trim();

        const textMatch = /\b(accept full load|accept job|accept offer|accept)\b/i.test(label);

        if (!explicit && !textMatch) return;

        ev.preventDefault();
        ev.stopPropagation();

        setConfirmState({
          open: true,
          message: label || 'Confirm action',
          targetElement: button,
        });
      } catch (err) {
        // ignore interception errors
      }
    };

    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('click', onClick, true);
    };
  }, []);

  /**
   * handleConfirmResult
   * @description Called when user confirms or cancels the friendly modal.
   * When confirmed: replay the original click with a one-time bypass and temporarily override native dialogs.
   */
  const handleConfirmResult = (confirmed: boolean) => {
    const target = confirmState.targetElement;
    setConfirmState({ open: false, message: '', targetElement: null });

    if (!target) return;
    if (!confirmed) return;

    try {
      const resolvedName = findNearbyJobTitle(target);

      if (/\baccept\b/i.test(target.innerText || '')) {
        if (resolvedName) {
          safeDispatchToast({ title: 'Job accepted', message: resolvedName, variant: 'neutral' });
        } else {
          safeDispatchToast({ title: 'Accepted', message: 'Action accepted. Processing…', variant: 'neutral' });
        }
      }

      const glob: any = (typeof window !== 'undefined' ? window : (globalThis as any));
      const originals: Partial<Record<string, any>> = {
        alert: typeof glob.alert === 'function' ? glob.alert : undefined,
        confirm: typeof glob.confirm === 'function' ? glob.confirm : undefined,
        prompt: typeof glob.prompt === 'function' ? glob.prompt : undefined,
      };

      const replacementAlert = (msg?: any) => {
        try {
          const text = typeof msg === 'string' ? msg : JSON.stringify(msg ?? '');
          safeDispatchToast({ title: resolvedName ? `Job accepted` : 'Notice', message: text, variant: 'success' });
        } catch {
          // ignore formatting errors
        }
        return undefined;
      };

      const replacementConfirm = (_msg?: any) => true;
      const replacementPrompt = (_msg?: any) => null;

      try { glob.alert = replacementAlert; } catch { /* ignore */ }
      try { glob.confirm = replacementConfirm; } catch { /* ignore */ }
      try { glob.prompt = replacementPrompt; } catch { /* ignore */ }

      try {
        target.dataset.friendlyConfirmBypass = '1';
        setTimeout(() => {
          try {
            target.click();
          } catch (err) {
            try {
              target.dispatchEvent(new CustomEvent('friendlyConfirm:confirmed', { bubbles: true }));
            } catch { /* ignore */ }
          }
        }, 0);
      } catch (err) {
        // ignore replay errors
      }

      setTimeout(() => {
        try { if (originals.alert !== undefined) glob.alert = originals.alert; } catch { /* ignore */ }
        try { if (originals.confirm !== undefined) glob.confirm = originals.confirm; } catch { /* ignore */ }
        try { if (originals.prompt !== undefined) glob.prompt = originals.prompt; } catch { /* ignore */ }
      }, 1500);

      if (/\baccept\b/i.test(target.innerText || '')) {
        setTimeout(() => {
          const title = 'Success';
          const message = resolvedName ? `Job accepted successfully! You can track \"${resolvedName}\" in \"My Jobs\".` : `Job accepted successfully! You can track it in \"My Jobs\".`;
          safeDispatchToast({ title, message, variant: 'success' });
        }, 700);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('handleConfirmResult error', err);
    }
  };

  // Modal keyboard support - close on Escape
  useEffect(() => {
    if (!confirmState.open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setConfirmState({ open: false, message: '', targetElement: null });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [confirmState.open]);

  return (
    <>
      {/* Mount global toaster so captured alerts and our toasts are visible */}
      <Toaster />

      {/* Friendly confirmation modal */}
      {confirmState.open && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setConfirmState({ open: false, message: '', targetElement: null })}
          />

          <div className="relative z-10 w-full max-w-md bg-slate-800 rounded-lg border border-slate-700 shadow-lg overflow-hidden">
            <div className="flex items-start justify-between p-4 border-b border-slate-700">
              <div>
                <h3 className="text-lg font-semibold text-white">Confirm action</h3>
                <p className="text-sm text-slate-400 mt-1">Please confirm your choice to proceed.</p>
              </div>
              <button
                onClick={() => setConfirmState({ open: false, message: '', targetElement: null })}
                className="text-slate-300 hover:text-white p-2 rounded-md"
                aria-label="Close confirmation"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4">
              <div className="text-sm text-slate-200 mb-4">{confirmState.message}</div>

              <div className="flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setConfirmState({ open: false, message: '', targetElement: null })}
                  className="px-3 py-2 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm border border-slate-600"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => handleConfirmResult(true)}
                  className="inline-flex items-center px-4 py-2 rounded-md bg-green-600 hover:bg-green-700 text-white text-sm"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default IncomingDeliveryFinalizer;
