/**
 * Login.tsx
 *
 * Login page for Truck Manager.
 *
 * Responsibilities:
 * - Render the login form and handle sign-in flow.
 * - Provide a safe "clear old data" developer action.
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
import { Truck, Mail, Lock, Eye, EyeOff, Trash2 } from 'lucide-react';
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

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}