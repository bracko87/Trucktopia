/**
 * Data Importer Component with File Upload Support
 * Allows importing game data from JSON files
 */

import React, { useState } from 'react';
import { Upload, AlertCircle, Check, File } from 'lucide-react';

interface DataImporterProps {
  onDataImported: (data: any) => void;
  className?: string;
}

const DataImporter: React.FC<DataImporterProps> = ({ onDataImported, className = '' }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const validateData = (data: any): boolean => {
    // Basic validation for game data structure
    if (!data || typeof data !== 'object') {
      return false;
    }

    // Check if it has required properties
    if (!data.timestamp || !data.version || !data.data) {
      return false;
    }

    // Check if data is an object
    if (typeof data.data !== 'object') {
      return false;
    }

    return true;
  };

  const processFile = (file: File) => {
    setIsProcessing(true);
    setImportStatus('idle');
    setErrorMessage('');

    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const jsonData = JSON.parse(content);
        
        if (validateData(jsonData)) {
          setImportStatus('success');
          onDataImported(jsonData);
        } else {
          setImportStatus('error');
          setErrorMessage('Invalid game data file format. Please ensure this is a valid Truck Manager backup file.');
        }
      } catch (error) {
        setImportStatus('error');
        setErrorMessage('Failed to parse JSON file. Please check if the file is corrupted.');
      }
      
      setIsProcessing(false);
    };

    reader.onerror = () => {
      setImportStatus('error');
      setErrorMessage('Failed to read file. Please try again.');
      setIsProcessing(false);
    };

    reader.readAsText(file);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* File Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 transition-all ${
          isDragOver
            ? 'border-blue-400 bg-blue-400/10'
            : 'border-slate-600 bg-slate-700/50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".json,application/json"
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isProcessing}
        />
        
        <div className="text-center">
          {isProcessing ? (
            <div className="flex flex-col items-center space-y-2">
              <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-slate-400">Processing file...</p>
            </div>
          ) : (
            <>
              <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-white font-medium mb-2">Drop JSON file here or click to browse</h3>
              <p className="text-slate-400 text-sm">
                Select a Truck Manager backup file (.json) to import your game data
              </p>
            </>
          )}
        </div>
      </div>

      {/* Status Messages */}
      {importStatus === 'success' && (
        <div className="flex items-center space-x-2 p-3 bg-green-900/20 border border-green-700/50 rounded-lg text-green-400">
          <Check className="w-4 h-4" />
          <span>File imported successfully! Your game data has been restored.</span>
        </div>
      )}

      {importStatus === 'error' && (
        <div className="flex items-start space-x-2 p-3 bg-red-900/20 border border-red-700/50 rounded-lg">
          <AlertCircle className="w-4 h-4 mt-0.5 text-red-400" />
          <div className="flex-1">
            <p className="text-red-400 font-medium">Import failed</p>
            <p className="text-red-300 text-sm">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* File Selection Button */}
      <button
        onClick={() => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '.json,application/json';
          input.onchange = handleFileSelect;
          input.click();
        }}
        className="w-full bg-slate-600 hover:bg-slate-500 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
        disabled={isProcessing}
      >
        <File className="w-4 h-4" />
        <span>Choose JSON File</span>
      </button>
    </div>
  );
};

export default DataImporter;