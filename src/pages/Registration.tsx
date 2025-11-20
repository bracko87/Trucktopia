/**
 * src/pages/Registration.tsx
 *
 * Registration page that uses Supabase Auth for account creation when available.
 * This file replaces the previous local-only registration flow and calls into
 * useSupabaseAuth().signUp so newly created accounts are stored in Supabase Authentication.
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Truck, Mail, Lock, User, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { useGame } from '../contexts/GameContext';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';

/**
 * Registration
 * @description Registration page component. Uses useSupabaseAuth.signUp to create
 * accounts in Supabase Authentication when VITE env vars are present. Falls back to
 * local adapter only if Supabase is not configured (adapter selection is handled by the provider).
 */
export default function Registration() {
  const navigate = useNavigate();
  const { gameState } = useGame(); // kept for other game-related state usage
  const { signUp } = useSupabaseAuth();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * handleSubmit
   * @description Create a new user via Supabase adapter. On success navigate to create-company.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      const result = await signUp(formData.email, formData.password);
      setIsLoading(false);

      if (result.user) {
        // Navigation remains the same as before
        navigate('/create-company');
      } else {
        // Surface Supabase error message if present
        const message = (result as any).error?.message ?? 'Registration failed';
        alert(message);
      }
    } catch (err: any) {
      setIsLoading(false);
      alert(err?.message ?? 'Registration error');
    }
  };

  /**
   * handleChange
   * @description Controlled input update.
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const passwordRequirements = [
    { text: 'At least 6 characters', met: formData.password.length >= 6 },
    { text: 'Contains uppercase letter', met: /[A-Z]/.test(formData.password) },
    { text: 'Contains number', met: /[0-9]/.test(formData.password) }
  ];

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

          <CardTitle className="text-2xl font-bold text-white">Create Your Account</CardTitle>
          <CardDescription className="text-slate-400">Join the elite trucking community</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <User className="h-4 w-4 text-yellow-500" />
                Username
              </label>
              <div className="relative">
                <Input
                  type="text"
                  name="username"
                  placeholder="Enter your username"
                  value={formData.username}
                  onChange={handleChange}
                  className="pl-10 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:border-yellow-500 focus:ring-yellow-500 transition-all duration-200"
                  required
                />
                <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              </div>
            </div>

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
                  placeholder="Create a strong password"
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

              {/* Password Requirements */}
              {formData.password && (
                <div className="space-y-2 mt-3 p-3 bg-slate-700/50 rounded-lg border border-slate-600">
                  <p className="text-xs font-medium text-slate-300">Password Requirements:</p>
                  {passwordRequirements.map((req, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <CheckCircle className={`h-3 w-3 ${req.met ? 'text-green-500' : 'text-slate-500'}`} />
                      <span className={`text-xs ${req.met ? 'text-green-400' : 'text-slate-400'}`}>{req.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Lock className="h-4 w-4 text-yellow-500" />
                Confirm Password
              </label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="pl-10 pr-10 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:border-yellow-500 focus:ring-yellow-500 transition-all duration-200"
                  required
                />
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-yellow-500 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Password Match Indicator */}
              {formData.confirmPassword && (
                <div className="flex items-center gap-2 mt-2">
                  <CheckCircle className={`h-3 w-3 ${formData.password === formData.confirmPassword ? 'text-green-500' : 'text-red-500'}`} />
                  <span className={`text-xs ${formData.password === formData.confirmPassword ? 'text-green-400' : 'text-red-400'}`}>
                    {formData.password === formData.confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                  </span>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white font-bold py-3 text-lg transition-all duration-200 shadow-lg hover:shadow-yellow-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating Account...
                </div>
              ) : (
                'Create Account & Continue'
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-600" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-slate-800 text-slate-400">Already have an account?</span>
            </div>
          </div>

          {/* Login Link */}
          <div className="text-center">
            <Link to="/login" className="inline-flex items-center gap-2 text-yellow-500 hover:text-yellow-400 font-semibold transition-colors group">
              Sign in to existing account
              <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Footer Note */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-slate-400 text-sm">
        <p>Secure registration • Your data is protected</p>
      </div>
    </div>
  );
}