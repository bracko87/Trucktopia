/**
 * TestSupabaseButton.tsx
 *
 * Reusable small button that navigates to the internal /test-supabase route.
 *
 * Responsibilities:
 * - Provide a single, consistent UI element used across pages and the sidebar to open
 *   the Supabase test page using client-side navigation (avoids server-side 404s).
 * - Support a compact mode (icon-only) for tight UI areas like collapsed sidebars.
 */

import React from 'react';
import { useNavigate } from 'react-router';
import { Database } from 'lucide-react';

export interface TestSupabaseButtonProps {
  /**
   * Compact mode renders icon-only (suitable for collapsed sidebars).
   */
  compact?: boolean;
  /**
   * Custom className passthrough.
   */
  className?: string;
}

/**
 * TestSupabaseButton
 * @component Button that navigates to /test-supabase inside the SPA.
 */
const TestSupabaseButton: React.FC<TestSupabaseButtonProps> = ({ compact = false, className = '' }) => {
  const navigate = useNavigate();

  /**
   * openTestPage
   * @description Navigate to the test-supabase route using SPA navigation.
   */
  const openTestPage = () => {
    navigate('/test-supabase');
  };

  if (compact) {
    return (
      <button
        onClick={openTestPage}
        title="Supabase Test"
        aria-label="Open Supabase Test"
        className={`p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors ${className}`}
      >
        <Database className="w-4 h-4" />
      </button>
    );
  }

  return (
    <button
      onClick={openTestPage}
      title="Supabase Test"
      aria-label="Open Supabase Test"
      className={`inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md font-medium transition-colors ${className}`}
    >
      <Database className="w-4 h-4" />
      <span className="text-sm">Supabase Test</span>
    </button>
  );
};

export default TestSupabaseButton;