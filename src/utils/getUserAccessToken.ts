/**
 * getUserAccessToken.ts
 *
 * Utility to locate a user access token from common client storage locations.
 *
 * Responsibilities:
 * - Try multiple sessionStorage / localStorage keys commonly used to store Supabase / auth tokens
 * - Parse JSON blobs when needed and extract access_token or nested currentSession.access_token
 * - Return null when no token is found
 *
 * Note:
 * - This is a best-effort helper. If your app stores tokens under a custom key, add it to the keys array.
 */

export default function getUserAccessToken(): string | null {
  const keys = [
    'tm_supabase_token',
    'sb_access_token',
    'sb-access-token',
    'supabase.auth.token',
    'access_token',
    'auth_token'
  ];

  for (const key of keys) {
    try {
      const raw = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(key) ?? localStorage.getItem(key) : null;
      if (!raw) continue;

      // Try to parse JSON (some libs store an object)
      try {
        const parsed = JSON.parse(raw);
        if (!parsed) continue;

        // Common shapes
        if (typeof parsed === 'string') {
          const v = parsed.trim();
          if (v.toLowerCase().startsWith('bearer ')) return v.replace(/^Bearer\s+/i, '');
          return v;
        }

        if (parsed.currentSession && parsed.currentSession.access_token) return parsed.currentSession.access_token;
        if (parsed.access_token) return parsed.access_token;
        if (parsed.token) return parsed.token;
      } catch {
        // Not JSON: treat as raw token string
        const v = raw.trim();
        if (v.toLowerCase().startsWith('bearer ')) return v.replace(/^Bearer\s+/i, '');
        return v;
      }
    } catch {
      // ignore storage access errors
    }
  }

  return null;
}