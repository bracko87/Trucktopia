/**
 * src/components/ErrorBoundary.tsx
 *
 * Simple React Error Boundary to catch rendering errors and present a safe fallback UI.
 *
 * Responsibilities:
 * - Catch render-time errors in the subtree and show a recoverable fallback UI.
 * - Provide a retry button to reset the boundary state.
 *
 * Notes:
 * - Keep this component small and reusable across pages to avoid full-app crashes.
 */

import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error | null;
}

/**
 * ErrorBoundary
 * @description React class component that catches render errors in its children and displays a fallback UI.
 */
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  /**
   * getDerivedStateFromError
   * @description Update state to display fallback UI when an error is thrown.
   * @param error Error thrown in a child component
   */
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  /**
   * componentDidCatch
   * @description Lifecycle hook for side-effects when an error is caught.
   * @param error Error object
   * @param info error info
   */
  componentDidCatch(error: Error, info: any) {
    // Keep console logging to aid debugging in dev; production could forward to an error tracker.
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary] Caught error', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-slate-800 rounded-xl border border-slate-700 text-center">
          <div className="text-lg font-bold text-white mb-2">Something went wrong</div>
          <div className="text-sm text-slate-400 mb-4">
            An unexpected error occurred while rendering this view. You can retry or open the browser console for details.
          </div>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;