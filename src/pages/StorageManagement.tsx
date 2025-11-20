/**
 * Enhanced Storage Management Page with Import/Export capabilities
 */

import React, { useState, useEffect } from 'react';
import { Trash2, Database, Users, AlertTriangle, CheckCircle, Download, Upload, Eye, RefreshCw } from 'lucide-react';
import DataImporter from '../components/admin/DataImporter';

interface StorageInfo {
  total: number;
  used: number;
  free: number;
  items: Array<{
    key: string;
    size: number;
    data: any;
  }>;
}

const StorageManagement: React.FC = () => {
  const [storageInfo, setStorageInfo] = useState<StorageInfo>({
    total: 0,
    used: 0,
    free: 0,
    items: []
  });
  const [showConfirm, setShowConfirm] = useState(false);
  const [message, setMessage] = useState('');
  const [importData, setImportData] = useState('');
  const [viewingData, setViewingData] = useState<{key: string; data: any} | null>(null);
  const [importMethod, setImportMethod] = useState<'paste' | 'file'>('file');

  const calculateStorageUsage = (): StorageInfo => {
    let totalSize = 0;
    const items = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('tm_') || key.startsWith('tm_admin_'))) {
        const value = localStorage.getItem(key);
        if (value) {
          const size = new Blob([value]).size;
          totalSize += size;
          try {
            const data = JSON.parse(value);
            items.push({
              key,
              size,
              data
            });
          } catch {
            items.push({
              key,
              size,
              data: value
            });
          }
        }
      }
    }

    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && (key.startsWith('tm_') || key.startsWith('tm_admin_'))) {
        const value = sessionStorage.getItem(key);
        if (value) {
          const size = new Blob([value]).size;
          totalSize += size;
          try {
            const data = JSON.parse(value);
            items.push({
              key: `session:${key}`,
              size,
              data
            });
          } catch {
            items.push({
              key: `session:${key}`,
              size,
              data: value
            });
          }
        }
      }
    }

    const totalStorage = 5 * 1024 * 1024; // 5MB typical localStorage limit
    
    return {
      total: totalStorage,
      used: totalSize,
      free: totalStorage - totalSize,
      items: items.sort((a, b) => b.size - a.size)
    };
  };

  const exportGameData = () => {
    try {
      const exportData: any = {
        timestamp: Date.now(),
        version: '1.0',
        data: {}
      };
      
      // Export all TM-related storage items
      const keysToExport = [
        'tm_users',
        'tm_admin_state',
        'tm_game_state',
        'tm_job_market',
        'tm_current_user',
        'tm_last_device_id',
        'tm_device_id'
      ];

      keysToExport.forEach(key => {
        const value = localStorage.getItem(key);
        if (value) {
          exportData.data[key] = value;
        }
      });

      // Export user-specific states
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('tm_user_state_') || key.startsWith('tm_admin_state_'))) {
          const value = localStorage.getItem(key);
          if (value) {
            exportData.data[key] = value;
          }
        }
      }

      // Export session data
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith('tm_')) {
          const value = sessionStorage.getItem(key);
          if (value) {
            exportData.data[`session:${key}`] = value;
          }
        }
      }

      const dataStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `truck_manager_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setMessage('✅ Game data exported successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('❌ Failed to export data: ' + error);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  const importGameData = () => {
    if (!importData.trim()) {
      setMessage('❌ Please paste the backup data first');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    try {
      const importDataObj = JSON.parse(importData);
      
      if (!importData.data) {
        setMessage('❌ Invalid backup data format');
        setTimeout(() => setMessage(''), 3000);
        return;
      }

      // Clear existing TM-related data
      const keysToClear = [];
      
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('tm_') || key.startsWith('tm_admin_'))) {
          keysToClear.push(key);
        }
      }

      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith('tm_')) {
          sessionStorage.removeItem(key);
        }
      }

      keysToClear.forEach(key => localStorage.removeItem(key));

      // Import new data
      Object.entries(importData.data).forEach(([key, value]) => {
        if (key.startsWith('session:')) {
          const sessionKey = key.replace('session:', '');
          sessionStorage.setItem(sessionKey, String(value));
        } else {
          localStorage.setItem(key, String(value));
        }
      });

      setMessage('✅ Game data imported successfully! Refresh to see changes.');
      setTimeout(() => {
        setMessage('');
        window.location.reload();
      }, 2000);
    } catch (error) {
      setMessage('❌ Failed to import data: ' + error);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  const clearAllData = () => {
    try {
      const keysToRemove = [
        'tm_users',
        'tm_admin_state',
        'tm_game_state',
        'tm_job_market',
        'tm_current_user',
        'tm_last_device_id',
        'tm_device_id'
      ];

      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });

      // Clear user-specific states
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('tm_user_state_') || key.startsWith('tm_admin_state_'))) {
          localStorage.removeItem(key);
        }
      }

      // Clear session storage
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith('tm_')) {
          sessionStorage.removeItem(key);
        }
      }

      setMessage('✅ All game data cleared successfully!');
      setShowConfirm(false);
      refreshStorageInfo();
      
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      setMessage('❌ Error clearing data: ' + error);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  const refreshStorageInfo = () => {
    setStorageInfo(calculateStorageUsage());
  };

  useEffect(() => {
    refreshStorageInfo();
  }, []);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getUsagePercentage = (): number => {
    return (storageInfo.used / storageInfo.total) * 100;
  };

  const getUsageColor = (percentage: number): string => {
    if (percentage < 50) return 'bg-green-500';
    if (percentage < 80) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const viewDataItem = (item: {key: string; data: any}) => {
    setViewingData(item);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Storage Management</h1>
          <p className="text-slate-400">Manage and sync your game data across devices</p>
        </div>
        <button
          onClick={refreshStorageInfo}
          className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`fixed bottom-4 right-4 p-4 rounded-lg border flex items-center space-x-2 z-50 ${
          message.includes('✅') 
            ? 'bg-green-900/20 border-green-700/50 text-green-400' 
            : message.includes('❌')
            ? 'bg-red-900/20 border-red-700/50 text-red-400'
            : 'bg-blue-900/20 border-blue-700/50 text-blue-400'
        }`}>
          {message.includes('✅') ? <CheckCircle className="w-5 h-5" /> : 
           message.includes('❌') ? <AlertTriangle className="w-5 h-5" /> : 
           <Database className="w-5 h-5" />}
          <span>{message.replace(/[✅❌]/g, '').trim()}</span>
        </div>
      )}

      {/* Export/Import Section */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Database className="w-6 h-6 text-blue-400" />
          <h2 className="text-lg font-semibold text-white">Data Synchronization</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Export */}
          <div className="space-y-4">
            <div>
              <h3 className="text-white font-medium mb-2">Export Game Data</h3>
              <p className="text-slate-400 text-sm mb-4">
                Download all your game progress, companies, and settings to transfer to another device
              </p>
              <button
                onClick={exportGameData}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Export All Data</span>
              </button>
            </div>
          </div>

          {/* Import */}
          <div className="space-y-4">
            <div>
              <h3 className="text-white font-medium mb-2">Import Game Data</h3>
              <p className="text-slate-400 text-sm mb-4">
                Choose a method to restore your game progress
              </p>
              
              {/* Tab Navigation */}
              <div className="flex space-x-2 mb-4">
                <button
                  onClick={() => setImportMethod('paste')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    importMethod === 'paste'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  📋 Paste JSON
                </button>
                <button
                  onClick={() => setImportMethod('file')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    importMethod === 'file'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  📁 Upload File
                </button>
              </div>

              {/* Paste Method */}
              {importMethod === 'paste' && (
                <div className="space-y-3">
                  <textarea
                    value={importData}
                    onChange={(e) => setImportData(e.target.value)}
                    placeholder="Paste your exported game data here..."
                    className="w-full h-32 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                  <button
                    onClick={importGameData}
                    disabled={!importData.trim()}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Import Data</span>
                  </button>
                </div>
              )}

              {/* File Upload Method */}
              {importMethod === 'file' && (
                <DataImporter
                  onDataImported={(data) => {
                    setImportData(JSON.stringify(data, null, 2));
                    setTimeout(() => {
                      importGameData();
                    }, 100);
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Storage Overview */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Database className="w-6 h-6 text-blue-400" />
          <h2 className="text-lg font-semibold text-white">Storage Overview</h2>
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-sm text-slate-400 mb-2">
            <span>Storage Usage</span>
            <span>{formatBytes(storageInfo.used)} / {formatBytes(storageInfo.total)}</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-3">
            <div
              className={`h-3 rounded-full ${getUsageColor(getUsagePercentage())} transition-all duration-300`}
              style={{ width: `${Math.min(getUsagePercentage(), 100)}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>{getUsagePercentage().toFixed(1)}% used</span>
            <span>{formatBytes(storageInfo.free)} free</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-700/50 rounded-lg p-4">
            <div className="text-sm text-slate-400">Total Items</div>
            <div className="text-xl font-bold text-white">{storageInfo.items.length}</div>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-4">
            <div className="text-sm text-slate-400">Total Used</div>
            <div className="text-xl font-bold text-white">{formatBytes(storageInfo.used)}</div>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-4">
            <div className="text-sm text-slate-400">Available</div>
            <div className="text-xl font-bold text-white">{formatBytes(storageInfo.free)}</div>
          </div>
        </div>
      </div>

      {/* Storage Items */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Users className="w-5 h-5 text-green-400" />
              <div>
                <h2 className="text-lg font-semibold text-white">Storage Items</h2>
                <p className="text-sm text-slate-400">All stored game data in browser storage</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          {storageInfo.items.length === 0 ? (
            <div className="text-center py-8">
              <Database className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No Game Data</h3>
              <p className="text-slate-400">No game data found in browser storage</p>
            </div>
          ) : (
            <div className="space-y-3">
              {storageInfo.items.map((item) => (
                <div key={item.key} className="bg-slate-700 rounded-lg p-4 border border-slate-600">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium text-white">{item.key}</div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-slate-400">
                            Size: {formatBytes(item.size)}
                          </span>
                          <button
                            onClick={() => viewDataItem(item)}
                            className="text-blue-400 hover:text-blue-300 transition-colors"
                            title="View data"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="text-xs text-slate-500 truncate font-mono">
                        {typeof item.data === 'object' 
                          ? JSON.stringify(item.data).substring(0, 100) + '...'
                          : String(item.data).substring(0, 100) + '...'
                        }
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-900/20 rounded-xl border border-red-700/50 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <AlertTriangle className="w-6 h-6 text-red-400" />
          <h2 className="text-lg font-semibold text-white">Danger Zone</h2>
        </div>

        <div className="space-y-4">
          <div className="bg-red-900/30 rounded-lg p-4 border border-red-700/30">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-white">Clear All Game Data</h3>
                <p className="text-sm text-red-300 mt-1">
                  This will permanently delete all game data, companies, and user accounts from this browser.
                </p>
              </div>
              <button
                onClick={() => setShowConfirm(true)}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Clear All Data</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-xl border border-red-700/50 p-6 w-full max-w-md">
            <div className="flex items-center space-x-2 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-400" />
              <h3 className="text-xl font-bold text-white">Confirm Clear All Data</h3>
            </div>

            <div className="space-y-4">
              <div className="bg-red-900/20 border border-red-700/30 rounded-lg p-4">
                <h4 className="font-medium text-red-400 text-sm mb-2">⚠️ This action cannot be undone!</h4>
                <ul className="text-xs text-red-300 space-y-1">
                  <li>• All user accounts will be permanently deleted</li>
                  <li>• All company data will be lost</li>
                  <li>• Game progress will be reset</li>
                  <li>• You will need to register again</li>
                </ul>
              </div>

              <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-3">
                <div className="text-sm text-blue-400 text-center">
                  Current storage usage: <strong>{formatBytes(storageInfo.used)}</strong>
                </div>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg border border-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={clearAllData}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Clear All Data</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Data Viewer Modal */}
      {viewingData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 w-full max-w-4xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">{viewingData.key}</h3>
              <button
                onClick={() => setViewingData(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                ×
              </button>
            </div>
            <div className="bg-slate-900 rounded-lg p-4 overflow-auto max-h-[60vh]">
              <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap">
                {JSON.stringify(viewingData.data, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StorageManagement;