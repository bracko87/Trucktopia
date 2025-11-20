/**
 * src/pages/MigrateUsers.tsx
 *
 * Small admin-facing migration helper page:
 * - Exports localStorage keys that look relevant (tm_local_users, tm_staff_*, etc.)
 * - Copies the JSON to clipboard or downloads it so you can run a server-side import script
 *
 * Note: This page intentionally does not perform server-side import with a service_role key.
 * That operation must be performed on a secure server (see provided migration scripts).
 */

import React, { useState } from 'react';
import { FilePlus, ClipboardCopy, Download } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';

/**
 * MigrateUsersPage
 * @description Provides export functionality for local users and shows instructions for safe server-side import.
 */
const MigrateUsersPage: React.FC = () => {
  const [exportJson, setExportJson] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { usingLocalAdapter } = useSupabaseAuth();

  /**
   * collectLocalData
   * @description Collects a set of localStorage keys that are likely to contain user data.
   */
  const collectLocalData = () => {
    const keys = Object.keys(localStorage).filter((k) =>
      k.startsWith('tm_') || k.includes('user') || k.includes('staff')
    );

    const payload: Record<string, any> = {};
    keys.forEach((k) => {
      try {
        payload[k] = JSON.parse(localStorage.getItem(k) ?? 'null');
      } catch {
        payload[k] = localStorage.getItem(k);
      }
    });

    const json = JSON.stringify(payload, null, 2);
    setExportJson(json);
  };

  /**
   * copyToClipboard
   * @description Copies the JSON export to clipboard for easy paste into a migration script or storage.
   */
  const copyToClipboard = async () => {
    if (!exportJson) return;
    await navigator.clipboard.writeText(exportJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /**
   * downloadExport
   * @description Download a file with the exported JSON.
   */
  const downloadExport = () => {
    if (!exportJson) return;
    const blob = new Blob([exportJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tm_local_export_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Migration Helper</h1>
      </div>

      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <p className="text-slate-300 mb-4">
          This page helps you export local application data (users, staff lists, etc.) so you can import it
          into Supabase using a secure server-side migration script. The page detects local keys that start with
          "tm_" and other common names.
        </p>

        <div className="flex gap-3">
          <button
            onClick={collectLocalData}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <FilePlus className="w-4 h-4" /> Collect Local Data
          </button>

          <button
            onClick={copyToClipboard}
            disabled={!exportJson}
            className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
          >
            <ClipboardCopy className="w-4 h-4" /> {copied ? 'Copied!' : 'Copy JSON'}
          </button>

          <button
            onClick={downloadExport}
            disabled={!exportJson}
            className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> Download JSON
          </button>
        </div>

        <div className="mt-6">
          <label className="block text-sm text-slate-400 mb-2">Export Preview</label>
          <textarea
            readOnly
            value={exportJson ?? ''}
            rows={12}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs text-slate-200 font-mono"
          />
        </div>

        <div className="mt-6 text-sm text-slate-400 space-y-2">
          <p>
            Server-side import notes:
          </p>
          <ul className="list-disc ml-5">
            <li>
              Use Supabase's service_role key on a secure server to create users and profiles programmatically.
            </li>
            <li>
              If you do not have plain-text passwords for local users, create Supabase accounts and send password-reset
              emails rather than trying to import hashed passwords.
            </li>
            <li>
              Example import script and instructions are available in the migration package (I can generate that next).
            </li>
          </ul>
        </div>

        <div className="mt-6 text-xs text-yellow-300">
          <strong>Adapter:</strong> {usingLocalAdapter ? 'LocalStorage (development)' : 'Supabase (configured)'}
        </div>
      </div>
    </div>
  );
};

export default MigrateUsersPage;