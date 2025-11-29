/**
 * export-local-to-migration-payload.js
 *
 * Browser snippet to export local app users + per-user state and download a migration payload.
 *
 * Usage:
 * - Open your local app in the browser (the one that has the localStorage data to export).
 * - Open DevTools -> Console.
 * - Paste the code from the "COPY THIS" section below and press Enter.
 *
 * Notes:
 * - The snippet collects tm_users from localStorage (adjust the storage keys if your app uses different names).
 * - It attaches any per-user state found under key pattern tm_user_state_<email>.
 * - The downloaded file is migration-payload-full.json and is safe to move to your project's scripts/ folder.
 */

/**
 * Run this in browser console to download migration-payload-full.json
 */
(function exportLocalAppFull() {
  try {
    const usersRaw = localStorage.getItem('tm_users');
    const users = usersRaw ? JSON.parse(usersRaw) : [];
    const payloadUsers = (Array.isArray(users) ? users : []).map(u => {
      // find a matching user state (adjust key pattern if necessary)
      const stateKey = `tm_user_state_${(u.email || u.username || '').toLowerCase()}`;
      const userStateRaw = localStorage.getItem(stateKey);
      const userState = userStateRaw ? JSON.parse(userStateRaw) : null;
      return {
        id: u.email ? `local-${u.email.replace(/[^a-z0-9_.@-]/gi,'')}` : (u.id || `local-${Math.random().toString(36).slice(2,9)}`),
        email: u.email || u.username || '',
        password: '', // we cannot export plaintext passwords — import will generate temporary ones
        name: u.username || u.name || u.email || '',
        createdAt: u.createdAt || u.created_at || new Date().toISOString(),
        userState
      };
    });

    const payload = {
      metadata: { requestedBy: sessionStorage.getItem('tm_current_user') || 'local-export', exportedAt: new Date().toISOString() },
      collections: { users: payloadUsers }
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'migration-payload-full.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    console.log('Exported', payloadUsers.length, 'user(s). Saved as migration-payload-full.json');
  } catch (err) {
    console.error('Export failed', err);
  }
})();