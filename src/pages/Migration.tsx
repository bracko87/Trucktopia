/**
 * Migration.tsx
 *
 * Page that provides UI to perform data migrations to external services.
 * Currently supports Appwrite and Supabase migrations via a serverless endpoint.
 *
 * Responsibilities:
 * - Provide tabbed UI to switch between Appwrite and Supabase migration panels
 * - Expose short guidance and safety reminders
 * - Compose smaller migration panels which perform the actual network requests
 */

import React from 'react';
import MigrationTabs from '../components/migration/MigrationTabs';
import AppwriteMigrationPanel from '../components/migration/AppwriteMigrationPanel';
import SupabaseMigrationPanel from '../components/migration/SupabaseMigrationPanel';
import { Database, Server, Database as DBIcon } from 'lucide-react';

/**
 * MigrationPage
 * @description Top-level migration page. Contains tabs and the selected migration panel.
 */
const Migration: React.FC = () => {
  const tabs = [
    { id: 'appwrite', label: 'Appwrite', icon: Server, panel: <AppwriteMigrationPanel /> },
    { id: 'supabase', label: 'Supabase', icon: DBIcon, panel: <SupabaseMigrationPanel /> }
  ];

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Data Migration</h1>
          <p className="text-slate-400">Migrate collections to Appwrite or Supabase using the serverless migration function.</p>
        </div>
      </header>

      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <div className="mb-4">
          <strong className="text-slate-300">Important security note:</strong>
          <p className="text-slate-400 text-sm mt-1">
            The migrate endpoint requires an admin token. Do not paste production secrets in public devices.
            For convenience you may store the token in session storage in this browser.
          </p>
        </div>

        <MigrationTabs tabs={tabs} defaultTab="appwrite" />
      </div>

      <footer className="text-sm text-slate-500">
        Tip: Test with a small sample before migrating full datasets. If you want Firestore support, I can provide a local firebase-admin script (recommended).
      </footer>
    </div>
  );
};

export default Migration;