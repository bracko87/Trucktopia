/**
 * ResetFlowDebugger.tsx
 *
 * Temporary developer debug component that triggers the reset-password server function
 * and optionally opens the client reset page so you can inspect token parsing and behavior.
 *
 * Responsibilities:
 * - Prompt for an email (defaults to current session user if left blank)
 * - POST to /.netlify/functions/reset-password
 * - Log full JSON response to console and show an alert summary
 * - Offer to open /reset-password in a new tab for inspection
 */

import React from 'react';

/**
 * ResetFlowDebuggerProps
 * @description Props interface for the ResetFlowDebugger component (none required)
 */
interface ResetFlowDebuggerProps {}

/**
 * ResetFlowDebugger
 * @description Button that triggers the reset-password serverless function for manual testing
 */
const ResetFlowDebugger: React.FC<ResetFlowDebuggerProps> = () => {
  const [loading, setLoading] = React.useState(false);

  /**
   * handleDebug
   * @description Prompt for email, call server function, show result, optionally open reset page
   */
  const handleDebug = async () => {
    if (typeof window === 'undefined') return;

    // Prefer current session user if present
    const sessionUser = sessionStorage.getItem('tm_current_user') || '';
    const emailPrompt = window.prompt('Enter email to test password reset (leave empty to use current session user):', sessionUser || '');
    const email = (emailPrompt || sessionUser || '').trim();

    if (!email) {
      window.alert('No email provided. Aborting.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/.netlify/functions/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      let body: any = null;
      try {
        body = await res.json();
      } catch {
        // fallback to text
        body = await res.text().catch(() => null);
      }

      // Log full diagnostic output for inspection
      // eslint-disable-next-line no-console
      console.group('[ResetFlowDebugger] /.netlify/functions/reset-password response');
      // eslint-disable-next-line no-console
      console.log('status', res.status);
      // eslint-disable-next-line no-console
      console.log('body', body);
      // eslint-disable-next-line no-console
      console.groupEnd();

      // Compose concise alert for quick feedback
      let shortMsg = `Reset request sent for: ${email}\nHTTP: ${res.status}`;
      if (body && typeof body === 'object' && 'usedRedirect' in body) {
        shortMsg += `\nusedRedirect: ${String(body.usedRedirect)}`;
      }
      shortMsg += '\n\nFull response logged to console.';

      window.alert(shortMsg);

      // Ask user if they want to open the reset page to inspect token parsing
      const open = window.confirm('Open /reset-password in a new tab to inspect token parsing? (The email will contain the token; open the link in email to land on that page.)');
      if (open) {
        window.open('/reset-password', '_blank');
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[ResetFlowDebugger] request error', err);
      window.alert('Network or function error. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDebug}
      type="button"
      aria-label="Debug reset flow"
      className={`inline-flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg transition-colors text-sm ${loading ? 'opacity-60 cursor-wait' : ''}`}
    >
      {loading ? 'Sending…' : 'Debug Reset Flow'}
    </button>
  );
};

export default ResetFlowDebugger;
