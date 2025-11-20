/**
 * src/components/admin/AdminRefreshButton.tsx
 *
 * Purpose:
 * - Renders the "Refresh" button UI only when the current user is the admin.
 * - Keeps the same visual layout/styling as the provided snippet.
 *
 * Notes:
 * - Uses useGame() to read currentUser from game state.
 * - Admin identity is determined by email: bracko87@live.com (case-insensitive).
 */

import React from 'react';
import { RefreshCw } from 'lucide-react';
import { useGame } from '../../contexts/GameContext';

interface AdminRefreshButtonProps {
  /** Optional click handler for the refresh action */
  onClick?: () => void;
  /** Optional additional classes to merge into the default classes */
  className?: string;
}

/**
 * AdminRefreshButton
 * @description Show a refresh button only to admin users. For non-admins this component returns null.
 *
 * @param props - AdminRefreshButtonProps
 * @returns JSX.Element | null
 */
const AdminRefreshButton: React.FC<AdminRefreshButtonProps> = ({ onClick, className }) => {
  const { gameState } = useGame();

  // Admin email constant (kept inline so we don't need to change GameContext)
  const ADMIN_EMAIL = 'bracko87@live.com';

  /**
   * @description Determine if current user is admin (case-insensitive).
   */
  const isAdmin = !!(
    gameState &&
    gameState.currentUser &&
    typeof gameState.currentUser === 'string' &&
    gameState.currentUser.toLowerCase() === ADMIN_EMAIL.toLowerCase()
  );

  if (!isAdmin) {
    // Not an admin — render nothing to keep DOM clean and avoid accidental access.
    return null;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Refresh (admin only)"
      className={`flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-700 transition-colors disabled:opacity-50 ${className || ''}`}
      style={{ pointerEvents: 'auto' }}
    >
      <RefreshCw className="w-4 h-4" aria-hidden="true" />
      <span>Refresh</span>
    </button>
  );
};

export default AdminRefreshButton;