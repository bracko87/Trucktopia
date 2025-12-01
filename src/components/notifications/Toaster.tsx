/**
 * Toaster.tsx
 *
 * File-level:
 * Global lightweight toast / notification system used across the app.
 *
 * Purpose:
 * - Provide an accessible, non-blocking UI for short success/error/info notifications.
 * - Receive notifications via a window CustomEvent ('app:toast') so other non-visual helpers
 *   (or intercepted event handlers) can trigger user-facing messages without calling alert().
 *
 * Usage:
 * - Emit a toast by dispatching:
 *     window.dispatchEvent(new CustomEvent('app:toast', { detail: { title, message, variant } }));
 *
 * Notes:
 * - The component mounts itself visually as a top-right stack and auto-dismisses toasts.
 * - Simple, dependency-free implementation using Tailwind classes already available in the project.
 */

import React, { useEffect, useState } from 'react';

export type ToastVariant = 'info' | 'success' | 'error' | 'neutral';

/**
 * ToastItem
 * @description Single toast data shape
 */
interface ToastItem {
  id: string;
  title?: string;
  message: string;
  variant?: ToastVariant;
  ttl?: number;
}

/**
 * Toaster
 * @description Renders toast notifications triggered via the 'app:toast' CustomEvent.
 */
const Toaster: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    /**
     * handleAppToast
     * @description Add a toast when 'app:toast' event is dispatched on window.
     */
    const handleAppToast = (ev: Event) => {
      try {
        const detail = (ev as CustomEvent)?.detail || {};
        const id = `${Date.now().toString(36)}-${Math.floor(Math.random() * 10000).toString(36)}`;
        const toast: ToastItem = {
          id,
          title: detail.title,
          message: detail.message ?? String(detail || ''),
          variant: detail.variant ?? 'info',
          ttl: typeof detail.ttl === 'number' ? detail.ttl : 4000,
        };
        setToasts((prev) => [...prev, toast]);
        // Auto remove after ttl
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, toast.ttl);
      } catch {
        // ignore
      }
    };

    window.addEventListener('app:toast', handleAppToast as EventListener);
    return () => {
      window.removeEventListener('app:toast', handleAppToast as EventListener);
    };
  }, []);

  /**
   * removeToast
   * @description Allows manual removal on click.
   */
  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div aria-live="polite" className="pointer-events-none fixed top-4 right-4 z-50 flex flex-col gap-3 w-full max-w-xs">
      {toasts.map((t) => {
        const base = 'pointer-events-auto rounded-lg shadow-md p-3 border';
        const color =
          t.variant === 'success'
            ? 'bg-green-600 border-green-500/40 text-white'
            : t.variant === 'error'
            ? 'bg-rose-600 border-rose-500/40 text-white'
            : t.variant === 'neutral'
            ? 'bg-slate-700 border-slate-600 text-white'
            : 'bg-slate-800 border-slate-700 text-white';

        return (
          <div key={t.id} className={`${base} ${color} flex items-start gap-3`} role="status">
            <div className="flex-1">
              {t.title && <div className="font-medium text-sm">{t.title}</div>}
              <div className="text-sm text-slate-100/90 mt-1">{t.message}</div>
            </div>
            <div className="flex-shrink-0">
              <button
                aria-label="Dismiss notification"
                onClick={() => removeToast(t.id)}
                className="text-white/80 hover:text-white p-1 rounded"
                title="Dismiss"
              >
                ×
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Toaster;