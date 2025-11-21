/**
 * MigrationPanel.tsx
 *
 * Admin UI panel to prepare, preview, export and trigger migration of local browser data
 * to an external backend endpoint (e.g. a secure Supabase import endpoint).
 *
 * Responsibilities:
 * - Detect tm_* keys in localStorage and provide a normalized payload
 * - Allow previewing and exporting the normalized JSON
 * - POST selected collections to a configurable migration endpoint
 *
 * Note: The actual backend writes must be performed by a secure server-side endpoint.
 * This component only prepares and sends the payload. Do NOT store service_role keys here.
 */

import React, { useEffect, useState } from 'react';
import MigrationItem from './MigrationItem';
import MigrationModal from './MigrationModal';
import { Cloud, Download, Database, X } from 'lucide-react';
import { useMigration } from '../../hooks/useMigration';

interface MigrateResponse {
  collection: string;
  success: boolean;
  message?: string;
  details?: any;
}

/**
 * MigrationPanel
 * @description Main admin migration UI for scanning local storage and triggering migrations.
 */
const MigrationPanel: React.FC = () => {
  const { collections, normalizedPayload, refreshCollections } = useMigration();
  const [selectedCollections, setSelectedCollections] = useState<Record<string, boolean>>({});
  const [endpoint, setEndpoint] = useState<string>(() => sessionStorage.getItem('migration.endpoint') || '');
  const [adminToken, setAdminToken] = useState<string>(() => sessionStorage.getItem('migration.token') || '');
  const [showPreview, setShowPreview] = useState<{ key: string; data: any } | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [inProgress, setInProgress] = useState(false);
  const [results, setResults] = useState<MigrateResponse[]>([]);

  useEffect(() => {
    // initialize selection: all found collections selected by default
    const initial: Record<string, boolean> = {};
    collections.forEach((c) => (initial[c.key] = true));
    setSelectedCollections(initial);
  }, [collections.length]);

  useEffect(() => {
    sessionStorage.setItem('migration.endpoint', endpoint);
  }, [endpoint]);

  useEffect(() => {
    sessionStorage.setItem('migration.token', adminToken);
  }, [adminToken]);

  /**
   * Toggle selection of an individual collection
   * @param key collection key
   */
  const toggleCollection = (key: string) => {
    setSelectedCollections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  /**
   * Download the normalized payload as a JSON file
   */
  const handleExport = () => {
    const exportData = {
      metadata: { exportedAt: new Date().toISOString(), origin: window.location.origin },
      collections: normalizedPayload
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tm-migration-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  /**
   * Send selected collections to migration endpoint
   */
  const handleMigrate = async () => {
    if (!endpoint) {
      alert('Please configure the Migration Endpoint URL first.');
      return;
    }

    const toMigrate: Record<string, any> = {};
    Object.keys(selectedCollections).forEach((k) => {
      if (selectedCollections[k] && normalizedPayload[k]) {
        toMigrate[k] = normalizedPayload[k];
      }
    });

    if (Object.keys(toMigrate).length === 0) {
      alert('No collections selected for migration.');
      return;
    }

    const payload = {
      metadata: { exportedAt: new Date().toISOString(), origin: window.location.origin },
      collections: toMigrate
    };

    setInProgress(true);
    setLogs((l) => [...l, `[${new Date().toISOString()}] Starting migration of ${Object.keys(toMigrate).length} collections`]);
    setResults([]);

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {})
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({ ok: false, message: 'Invalid JSON response' }));

      if (!res.ok) {
        setLogs((l) => [...l, `[ERROR] ${res.status} ${res.statusText} - ${JSON.stringify(data)}`]);
        alert(`Migration failed: ${res.status} ${res.statusText}`);
      } else {
        // Expecting structured per-collection results
        if (Array.isArray(data.results)) {
          setResults(data.results);
          setLogs((l) => [...l, `[${new Date().toISOString()}] Migration finished, ${data.results.length} collection results`]);
        } else {
          setLogs((l) => [...l, `[${new Date().toISOString()}] Server response: ${JSON.stringify(data)}`]);
          setResults([{ collection: 'unknown', success: true, message: 'Server did not return per-collection results' }]);
        }
      }
    } catch (err: any) {
      setLogs((l) => [...l, `[${new Date().toISOString()}] Network or runtime error: ${String(err)}`]);
      alert('Migration request failed. Check console and endpoint.');
    } finally {
      setInProgress(false);
      refreshCollections(); // re-scan local storage in case UI needs update
    }
  };

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-500/10 rounded"><Database className="w-6 h-6 text-blue-400" /></div>
          <div>
            <h3 className="text-lg font-semibold text-white">Data Migration</h3>
            <p className="text-sm text-slate-400">Prepare and migrate local game data (tm_* keys) to your backend.</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleExport}
            className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-lg transition-colors flex items-center space-x-2"
            title="Export normalized payload"
          >
            <Download className="w-4 h-4" />
            <span className="text-sm">Export</span>
          </button>
          <button
            onClick={refreshCollections}
            className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-lg transition-colors"
            title="Refresh list"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm text-slate-400 mb-2">Migration Endpoint (POST)</label>
          <input
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            placeholder="https://your-backend.example.com/api/migrate"
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none"
          />
          <div className="text-xs text-slate-500 mt-1">This is the server endpoint that performs secured writes to Supabase/Firestore.</div>
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-2">Admin Token (temporary)</label>
          <div className="flex gap-2">
            <input
              value={adminToken}
              onChange={(e) => setAdminToken(e.target.value)}
              placeholder="Optional admin token"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none"
            />
            <button
              onClick={() => { setAdminToken(''); sessionStorage.removeItem('migration.token'); }}
              className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-lg transition-colors"
              title="Clear token"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="text-xs text-slate-500 mt-1">For security keep a short-lived token and rotate it. Do not store service keys here.</div>
        </div>
      </div>

      {/* Collections list */}
      <div className="space-y-3 mb-4">
        {collections.length === 0 ? (
          <div className="text-slate-400 text-sm">No tm_* collections found in localStorage.</div>
        ) : (
          collections.map((c) => (
            <MigrationItem
              key={c.key}
              item={c}
              selected={!!selectedCollections[c.key]}
              onToggle={() => toggleCollection(c.key)}
              onPreview={() => setShowPreview({ key: c.key, data: normalizedPayload[c.key] })}
            />
          ))
        )}
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="text-sm text-slate-400">
          {collections.length} collections detected • {Object.keys(normalizedPayload).reduce((sum, k) => sum + (Array.isArray(normalizedPayload[k]) ? normalizedPayload[k].length : 1), 0)} items total
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleMigrate}
            disabled={inProgress}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Cloud className="w-4 h-4 inline mr-2" />
            {inProgress ? 'Migrating...' : 'Start Migration'}
          </button>
        </div>
      </div>

      {/* Logs */}
      <div className="mt-6">
        <h4 className="text-sm text-slate-300 mb-2">Migration Log</h4>
        <div className="bg-slate-900 rounded-lg p-3 text-xs text-slate-300 font-mono max-h-40 overflow-auto">
          {logs.length === 0 ? <div className="text-slate-500">No logs yet</div> : logs.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm text-slate-300 mb-2">Migration Results</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {results.map((r, i) => (
              <div key={i} className={`p-3 rounded-lg ${r.success ? 'bg-green-900/20 border border-green-700/30' : 'bg-red-900/20 border border-red-700/30'}`}>
                <div className="flex items-center justify-between">
                  <div className="text-white font-medium">{r.collection}</div>
                  <div className="text-xs text-slate-300">{r.success ? 'Success' : 'Failed'}</div>
                </div>
                {r.message && <div className="text-sm text-slate-400 mt-1">{r.message}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <MigrationModal
          title={`Preview: ${showPreview.key}`}
          data={showPreview.data}
          onClose={() => setShowPreview(null)}
        />
      )}
    </div>
  );
};

export default MigrationPanel;