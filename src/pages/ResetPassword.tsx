/**
 * ResetPassword.tsx
 *
 * Page where users set a new password after following a Supabase recovery link.
 *
 * Responsibilities:
 * - Read access token supplied by Supabase in the URL hash or query (access_token)
 * - Request SUPABASE_URL and SUPABASE_ANON_KEY from the runtime function /.netlify/functions/supabase-config
 * - Send PATCH to SUPABASE_URL/auth/v1/user using Authorization: Bearer & access_token to change the password
 * - Provide clear UI and feedback for success/failure
 *
 * Notes:
 * - This is a client-only page that directly uses the Supabase REST auth endpoints.
 * - The Supabase anon key is public by design; it is safe to use on the client for this flow.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Lock, CheckCircle, AlertCircle } from 'lucide-react';

/**
 * parseParams
 * @description Parse a query string (without leading ? or #) into a key-value map
 * @param str string
 */
function parseParams(str: string) {
  const params = new URLSearchParams(str.replace(/^[#?]/, ''));
  const out: Record<string, string> = {};
  params.forEach((v, k) => {
    out[k] = v;
  });
  return out;
}

/**
 * extractAccessTokenFromLocation
 * @description Try to find an access_token that Supabase typically includes
 *              either in the URL hash (#access_token=...) or query (?access_token=...)
 * @returns token string | null
 */
function extractAccessTokenFromLocation(): string | null {
  try {
    if (typeof window === 'undefined') return null;
    // Check hash first (Supabase often puts tokens in the hash)
    if (window.location.hash) {
      const parsed = parseParams(window.location.hash);
      if (parsed.access_token) return parsed.access_token;
      if (parsed.token) return parsed.token;
    }
    // Check query string
    if (window.location.search) {
      const parsed = parseParams(window.location.search);
      if (parsed.access_token) return parsed.access_token;
      if (parsed.token) return parsed.token;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * PasswordResetFormProps
 */
interface PasswordResetFormProps {
  initialToken?: string | null;
  supabaseUrl?: string | null;
  supabaseAnon?: string | null;
}

/**
 * PasswordResetForm
 * @description Small reusable component that renders the new password form and performs the update.
 */
const PasswordResetForm: React.FC<PasswordResetFormProps> = ({ initialToken, supabaseUrl, supabaseAnon }) => {
  const [token, setToken] = useState<string | null>(initialToken ?? null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    // Keep token up-to-date if initialToken becomes available later
    setToken(initialToken ?? null);
  }, [initialToken]);

  /**
   * handleSubmit
   * @description Perform password update by calling Supabase auth REST endpoint
   */
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setMessage(null);
    setOk(null);

    if (!token) {
      setMessage('No access token found. Request a fresh password reset and follow the email link.');
      setOk(false);
      return;
    }

    if (!supabaseUrl || !supabaseAnon) {
      setMessage('Runtime Supabase configuration is missing. Please contact support.');
      setOk(false);
      return;
    }

    if (!password || !confirm) {
      setMessage('Please fill both password fields.');
      setOk(false);
      return;
    }
    if (password !== confirm) {
      setMessage('Passwords do not match.');
      setOk(false);
      return;
    }
    if (password.length < 6) {
      setMessage('Password must be at least 6 characters long.');
      setOk(false);
      return;
    }

    setIsProcessing(true);

    try {
      // Call Supabase REST endpoint to update the user using the recovery token as Bearer
      const endpoint = supabaseUrl.replace(/\/$/, '') + '/auth/v1/user';
      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          // Authorization must be Bearer <access_token> that arrived in the email link
          Authorization: `Bearer ${token}`,
          // apikey header is required by Supabase auth endpoints
          apikey: supabaseAnon
        },
        body: JSON.stringify({ password })
      });

      let resBody: any = null;
      try {
        resBody = await res.json();
      } catch {
        resBody = null;
      }

      if (res.ok) {
        setMessage('Password updated successfully. You can now sign in with your new password.');
        setOk(true);
        setPassword('');
        setConfirm('');
      } else {
        // Normalize error message
        const errMsg = (resBody && (resBody.error || resBody.message || resBody.msg)) ? (resBody.error || resBody.message || resBody.msg) : `Request failed (status ${res.status})`;
        setMessage(String(errMsg));
        setOk(false);
      }
    } catch (err: any) {
      // Network error
      setMessage('Network error while updating password. Try again later.');
      setOk(false);
      // eslint-disable-next-line no-console
      console.error('Password update error', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto bg-slate-800 rounded-xl border border-slate-700 p-6 space-y-4">
      <div className="flex items-center space-x-3">
        <div className="p-2 rounded bg-blue-600/10 text-blue-400">
          <Lock className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Set a new password</h2>
          <p className="text-sm text-slate-400">Provide a strong password to finish resetting your account.</p>
        </div>
      </div>

      {!token && (
        <div className="bg-rose-900/20 text-rose-300 p-3 rounded">
          No recovery token found in the URL. Make sure you followed the link from the password reset email.
        </div>
      )}

      <div>
        <label className="block text-sm text-slate-300 mb-2">New Password</label>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter new password"
          className="bg-slate-700 border-slate-600 text-white"
        />
      </div>

      <div>
        <label className="block text-sm text-slate-300 mb-2">Confirm Password</label>
        <Input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Confirm new password"
          className="bg-slate-700 border-slate-600 text-white"
        />
      </div>

      {message && (
        <div className={`p-3 rounded text-sm ${ok ? 'bg-green-900/20 text-green-300' : 'bg-rose-900/20 text-rose-300'}`}>
          <div className="flex items-start gap-2">
            {ok ? <CheckCircle className="w-4 h-4 text-green-300" /> : <AlertCircle className="w-4 h-4 text-rose-300" />}
            <div>{message}</div>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={isProcessing} className="bg-blue-600 hover:bg-blue-700">
          {isProcessing ? 'Updating…' : 'Update password'}
        </Button>
      </div>
    </form>
  );
};

/**
 * ResetPasswordPage
 * @description Page wrapper: loads runtime supabase-config and extracts token from URL.
 */
const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [supabaseUrl, setSupabaseUrl] = useState<string | null>(null);
  const [supabaseAnon, setSupabaseAnon] = useState<string | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const token = useMemo(() => extractAccessTokenFromLocation(), [typeof window !== 'undefined' ? window.location.href : '']);

  useEffect(() => {
    let mounted = true;
    setLoadingConfig(true);
    // Request runtime config from our serverless function
    fetch('/.netlify/functions/supabase-config', { method: 'GET' })
      .then(async (res) => {
        if (!mounted) return;
        if (!res.ok) {
          setSupabaseUrl(null);
          setSupabaseAnon(null);
          setLoadingConfig(false);
          return;
        }
        try {
          const cfg = await res.json();
          setSupabaseUrl(typeof cfg.SUPABASE_URL === 'string' ? cfg.SUPABASE_URL : (cfg.SUPABASE_URL || null));
          setSupabaseAnon(typeof cfg.SUPABASE_ANON_KEY === 'string' ? cfg.SUPABASE_ANON_KEY : (cfg.SUPABASE_ANON_KEY || null));
        } catch {
          setSupabaseUrl(null);
          setSupabaseAnon(null);
        } finally {
          setLoadingConfig(false);
        }
      })
      .catch(() => {
        if (!mounted) return;
        setSupabaseUrl(null);
        setSupabaseAnon(null);
        setLoadingConfig(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 flex items-center justify-center">
      <div className="w-full max-w-3xl">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-white">Reset your password</h1>
          <p className="text-slate-400">This page will update your password securely using the token in the email link.</p>
        </div>

        {loadingConfig ? (
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 text-center text-slate-400">Loading configuration…</div>
        ) : (
          <>
            <PasswordResetForm initialToken={token} supabaseUrl={supabaseUrl} supabaseAnon={supabaseAnon} />
            <div className="mt-4 text-center text-sm text-slate-400">
              <button
                className="underline text-slate-300"
                onClick={() => {
                  // Simple navigation helper to sign-in page after reset or if user hits cancel
                  navigate('/login');
                }}
              >
                Back to sign in
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;