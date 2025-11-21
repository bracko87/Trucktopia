/**
 * AdminMigration.tsx
 *
 * Page wrapper for the Firestore migration UI so it can be opened directly
 * from the Admin sidebar or via a direct /admin/migration route.
 *
 * Responsibilities:
 * - Check admin access
 * - Render the FirestoreMigrator admin tool
 * - Provide a compact, focused page for migrations (for quick access)
 */

import React from 'react';
import { useNavigate } from 'react-router';
import { Shield } from 'lucide-react';
import FirestoreMigrator from '../components/admin/FirestoreMigrator';
import { useGame } from '../contexts/GameContext';

/**
 * AdminMigration
 *
 * Page wrapper component which renders the Firestore Migrator UI.
 * Only accessible to administrators.
 */
const AdminMigration: React.FC = () => {
  const navigate = useNavigate();
  const { gameState } = useGame();

  // Determine admin (same check used across admin UI)
  const isAdmin = gameState.currentUser === 'bracko87@live.com' || gameState.company?.id === 'admin-company';

  if (!isAdmin) {
    return (
      <div className="min-h-96 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-slate-400">This page is only accessible to system administrators.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center space-x-3">
            <Shield className="w-8 h-8 text-green-400" />
            <span>Data Migration</span>
          </h1>
          <p className="text-slate-400">Migrate localStorage collections into Firestore (admin only).</p>
        </div>
        <div className="flex items-center space-x-2 bg-green-500/20 border border-green-500/30 rounded-xl px-4 py-2">
          <Shield className="w-5 h-5 text-green-400" />
          <span className="text-white font-medium">Administrator</span>
        </div>
      </div>

      {/* The migrator itself */}
      <div id="firestore-migrator">
        <FirestoreMigrator />
      </div>
    </div>
  );
};

export default AdminMigration;