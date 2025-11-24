/**
 * Login.tsx
 *
 * Login page with added lightweight runtime debug helpers.
 *
 * Purpose:
 * - Provide the original login UI and behavior.
 * - Add a temporary visible diagnostic banner + auto-fetch to /.netlify/functions/supabase-config
 *   so we can confirm whether the client bundle is executing and whether the runtime config endpoint
 *   is reachable from the browser.
 *
 * Notes:
 * - This file is a debug patch only. After diagnosis we can remove the debug helpers.
 */

import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Truck, Mail, Lock, Eye, EyeOff, Trash2 } from 'lucide-react';
import { useGame } from '../contexts/GameContext';

/**
 * Login component
 * @description Renders the login form. Also performs a diagnostic GET to the Netlify function
 *              /.netlify/functions/supabase-config on mount and shows the result in the UI.
 */
export default function Login() {
  const navigate = useNavigate();
  const { login, clearOldData } = useGame();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Debug state for runtime-config fetch
  const [cfgResult, setCfgResult] = useState<{ ok: boolean; status?: number; body?: any; error?: string } | null>(null);
  const [cfgLoading, setCfgLoading] = useState(false);

  /**
   * runConfigCheck
   * @description Fetch runtime Supabase config from Netlify function for diagnostic visibility.
   */
  const runConfigCheck = async () => {
    setCfgLoading(true);
    setCfgResult(null);
    try {
      const res = await fetch('/.netlify/functions/supabase-config', { method: 'GET' });
      const status = res.status;
      let body: any = null;
      try { body = await res.json(); } catch { body = await res.text().catch(() => null); }
      setCfgResult({ ok: res.ok, status, body: typeof body === 'string' ? body : body });
    } catch (err: any) {
      setCfgResult({ ok: false, error: String(err?.message ?? err) });
    } finally {
      setCfgLoading(false);
    }
  };

  /**
   * Auto-run the config check on mount so the network request is visible immediately if JS runs.
   */
  useEffect(() => {
    runConfigCheck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Handle login submission; navigate to Dashboard on success.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const result = await login(formData.email, formData.password);
    setIsLoading(false);

    if (result.success) {
      // Always go to Dashboard after sign-in
      navigate('/dashboard');
    } else {
      alert(result.message);
    }
  };

  /**
   * Controlled input updater.
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  /**
   * Developer reset: clear all local storage data.
   */
  const handleClearStorage = () => {
    if (confirm('This will clear all local data. Continue?')) {
      clearOldData();
      alert('Storage cleared successfully!');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(68,68,68,0.2)_50%,transparent_75%,transparent_100%)] bg-[length:20px_20px]"></div>

      {/* Animated Background Elements */}
      <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-yellow-500/10 rounded-full blur-xl animate-pulse"></div>
      <div className="absolute bottom-1/3 right-1/4 w-24 h-24 bg-yellow-500/10 rounded-full blur-xl animate-pulse delay-1000"></div>

      <Card className="w-full max-w-md bg-slate-800/90 backdrop-blur-sm border-slate-700 shadow-2xl relative z-10">
        <CardHeader className="space-y-1 text-center pb-8">
          {/* Logo Header */}
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center shadow-lg">
              <Truck className="h-7 w-7 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-xl font-bold text-white leading-tight">TRUCK MANAGER</h1>
              <p className="text-yellow-500 text-sm font-medium">SIMULATOR 2024</p>
            </div>
          </div>

          <CardTitle className="text-2xl font-bold text-white">Welcome Back, Manager</CardTitle>
          <CardDescription className="text-slate-400">
            Sign in to continue building your empire
          </CardDescription>

          {/* Diagnostic banner: shows result of calling /netlify/functions/supabase-config */}
          <div className="mt-4">
            <div className={`rounded-md p-2 text-sm ${cfgResult ? (cfgResult.ok ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200') : 'bg-slate-700 text-slate-200'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <strong>Runtime config check</strong>
                  <div className="text-xs mt-1">
                    {cfgLoading && 'Checking /.netlify/functions/supabase-config...'}
                    {!cfgLoading && !cfgResult && 'No check performed yet.'}
                    {!cfgLoading && cfgResult && (
                      <>
                        Status: {cfgResult.status ?? 'n/a'}{' '}
                        {cfgResult.ok ? '(OK)' : '(ERROR)'}
                        <div className="mt-1">
                          {cfgResult.error ? (
                            <span className="font-mono text-xs">{cfgResult.error}</span>
                          ) : (
                            <pre className="text-xs max-h-28 overflow-auto whitespace-pre-wrap">{JSON.stringify(cfgResult.body, null, 2)}</pre>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div>
                  <Button
                    type="button"
                    onClick={runConfigCheck}
                    className="bg-transparent border border-slate-600 text-slate-200 hover:bg-slate-700"
                  >
                    {cfgLoading ? 'Running...' : 'Re-check'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Mail className="h-4 w-4 text-yellow-500" />
                Email Address
              </label>
              <div className="relative">
                <Input
                  type="email"
                  name="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                  className="pl-10 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:border-yellow-500 focus:ring-yellow-500 transition-all duration-200"
                  required
                />
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Lock className="h-4 w-4 text-yellow-500" />
                Password
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  className="pl-10 pr-10 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:border-yellow-500 focus:ring-yellow-500 transition-all duration-200"
                  required
                />
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-yellow-500 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white font-bold py-3 text-lg transition-all duration-200 shadow-lg hover:shadow-yellow-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Signing In...
                </div>
              ) : (
                'Sign In & Continue'
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-slate-800 text-slate-400">New to Truck Manager?</span>
            </div>
          </div>

          {/* Registration Link */}
          <div className="text-center">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 text-yellow-500 hover:text-yellow-400 font-semibold transition-colors group"
            >
              Create new account
              <svg
                className="w-4 h-4 transform group-hover:translate-x-1 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Footer Note */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-slate-400 text-sm text-center">
        <p>Secure authentication • Your data is protected</p>
        <div className="flex items-center justify-center gap-3 mt-2">
          <button
            onClick={handleClearStorage}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-yellow-500 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            Clear Old Data
          </button>
        </div>
      </div>
    </div>
  );
}
