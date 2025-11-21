/**
 * MigrationModal.tsx
 *
 * Modal used to preview JSON data prior to migration.
 */

import React from 'react';
import { X } from 'lucide-react';

/**
 * MigrationModal
 * @description Simple modal that shows formatted JSON and a close button.
 */
const MigrationModal: React.FC<{
  title?: string;
  data: any;
  onClose: () => void;
}> = ({ title = 'Preview', data, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 w-full max-w-4xl max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-slate-900 rounded p-3 overflow-auto max-h-[68vh]">
          <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default MigrationModal;