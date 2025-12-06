/**
 * Login.tsx
 *
 * Login page for Truck Manager.
 *
 * Responsibilities:
 * - Render the login form and handle sign-in flow.
 * - Provide a safe "clear old data" developer action.
 * - Provide "Forgot password?" flow: a modal to request password reset or show instructions.
 *
 * This file renders a visually rich, accessible login card and uses the GameContext
 * login API to authenticate. It includes server-safe developer actions guarded by confirm().
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Truck, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useGame } from '../contexts/GameContext';

/**
 * Login
 *
 * Renders the login form and handles authentication flow.
 *
 * @returns JSX.Element
 */
export default function Login(): JSX.Element {
  const navigate = useNavigate();
  const { login, clearOldData } = useGame();
  // Keep a reference to the full game API in case it exposes a password reset method
  const gameApi = useGame() as any;

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  /**
   * handleSubmit
   * @description Handle login form submission and navigate to dashboard on success.
   * @param e - React.FormEvent
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await login(formData.email, formData.password);
      if (result?.success) {
        navigate('/dashboard');
      } else {
        // Basic client-side error handling
        alert(result?.message || 'Sign in failed. Check credentials and try again.');
      }
    } catch (err) {
      // Unexpected error
      // eslint-disable-next-line no-console
      console.error('Login error', err);
      alert('An unexpected error occurred while signing in.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * handleChange
   * @description Controlled input updater for form fields.
   * @param e - React.ChangeEvent<HTMLInputElement>
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  /**
   * handleClearStorage
   * @description Developer convenience: clear local storage and old data.
   */
  const handleClearStorage = () => {
    // Double-confirm destructive action
    if (confirm('This will clear all local data. Continue?')) {
      try {
        clearOldData();
        alert('Storage cleared successfully!');
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Error clearing storage', err);
        alert('Failed to clear storage. Check console for details.');
      }
    }
  };

  /**
   * handlePasswordReset
   * @description Try to trigger a password reset flow using GameContext if available.
   *              Falls back to showing instructions when no API is present.
   */
  const handlePasswordReset = async () => {
    if (!resetEmail) {
      alert('Please enter your email address to receive a password reset link.');
      return;
    }

    setIsResetting(true);

    try {
      // Try common method names used in different implementations
      if (gameApi && typeof gameApi.sendPasswordReset === 'function') {
        await gameApi.sendPasswordReset(resetEmail);
        alert('If the email exists, a password reset link has been sent.');
        setShowForgotModal(false);
      } else if (gameApi && typeof gameApi.requestPasswordReset === 'function') {
        await gameApi.requestPasswordReset(resetEmail);
        alert('If the email exists, a password reset link has been sent.');
        setShowForgotModal(false);
      } else if (gameApi && typeof gameApi.resetPassword === 'function') {
        await gameApi.resetPassword(resetEmail);
        alert('If the email exists, a password reset link has been sent.');
        setShowForgotModal(false);
      } else {
        // No programmatic reset exposed by GameContext - provide guidance
        alert(
          'Password reset is not currently available in the UI. ' +
            'Please use the Supabase Auth dashboard to trigger a reset for this user or contact support.'
        );
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Password reset error', err);
      alert('Failed to request a password reset. Please try again or contact support.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(68,68,68,0.2)_50%,transparent_75%,transparent_100%)] bg-[length:20px_20px]" />

      {/* Animated Background Elements */}
      <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-yellow-500/10 rounded-full blur-xl animate-pulse" />
      <div className="absolute bottom-1/3 right-1/4 w-24 h-24 bg-yellow-500/10 rounded-full blur-xl animate-pulse delay-1000" />

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
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
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
              className="w-full bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white font-bold py-3 text-lg transition-all duration-200 shadow-lg hover:shadow-yellow-500/25 disabled:opacity-50"
            >
              {isLoading ? 'Signing in…' : 'Sign In'}
            </Button>
          </form>

          {/* Secondary Actions */}
          <div className="flex items-center justify-between text-sm text-slate-400">
            <div>
              <Link to="/register" className="text-yellow-400 hover:underline">
                Create account
              </Link>
            </div>

            {/* Forgot password trigger */}
            <div>
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="text-yellow-400 hover:underline"
              >
                Forgot password?
              </button>
            </div>
          </div>

          {/* Developer Clear Storage (kept intentionally below secondary actions) */}
          <div className="flex items-center justify-between text-xs text-slate-500">
            <button
              onClick={handleClearStorage}
              className="text-slate-400 hover:text-white transition-colors"
            >
              Developer: Clear local data
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Footer Note */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-slate-400 text-sm">
        <p>Secure registration • Your data is protected</p>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-slate-800 rounded-xl border border-slate-700 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Reset Password</h3>
                <p className="text-sm text-slate-400">Enter your email to receive a password reset link.</p>
              </div>
              <button
                onClick={() => setShowForgotModal(false)}
                className="text-slate-400 hover:text-white"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowForgotModal(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePasswordReset}
                  disabled={isResetting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  {isResetting ? 'Requesting…' : 'Send Reset Link'}
                </button>
              </div>

              <div className="text-xs text-slate-400">
                <p>
                  Note: if password reset is not wired into the in-app system, this will provide
                  instructions instead. If you rely on Supabase Auth you can trigger a reset from
                  the Supabase dashboard or create a small server-side endpoint that calls Supabase
                  Admin API.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}