/**
 * MigrationItem.tsx
 *
 * Small presentational row for a single localStorage collection discovered by migration scanner.
 */

import React from 'react';
import { Checkbox } from '../../components/ui'; // if you have a shared Checkbox component, otherwise simple input
import { FileText, Eye } from 'lucide-react';

interface CollectionInfo {
  key: string;
  sizeBytes: number;
  count: number;
  sample?: any;
}

/**
 * MigrationItem
 * @description Row showing basic info about a collection and actions like Preview.
 */
const MigrationItem: React.FC<{
  item: CollectionInfo;
  selected: boolean;
  onToggle: () => void;
  onPreview: () => void;
}> = ({ item, selected, onToggle, onPreview }) => {
  return (
    <div className="bg-slate-700 rounded-lg p-3 border border-slate-600 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <input type="checkbox" checked={selected} onChange={onToggle} className="h-4 w-4 text-blue-500 rounded" />
        <div>
          <div className="text-white font-medium">{item.key}</div>
          <div className="text-xs text-slate-400">{item.count} items • {Math.round(item.sizeBytes / 1024)} KB</div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button onClick={onPreview} className="bg-slate-700 hover:bg-slate-600 text-slate-300 px-2 py-1 rounded flex items-center gap-2 text-xs">
          <Eye className="w-4 h-4" />
          Preview
        </button>
      </div>
    </div>
  );
};

export default MigrationItem;