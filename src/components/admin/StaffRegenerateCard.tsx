/**
 * StaffRegenerateCard component for admin dashboard
 * Allows admin to regenerate staff for specific countries
 */

import React, { useState } from 'react';
import { RefreshCw, Users, Globe, AlertTriangle, CheckCircle } from 'lucide-react';

interface StaffRegenerateCardProps {
  onRegenerate?: (country: string) => void;
  loading?: boolean;
}

const StaffRegenerateCard: React.FC<StaffRegenerateCardProps> = ({
  onRegenerate,
  loading = false
}) => {
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [regenerating, setRegenerating] = useState<boolean>(false);

  // Common countries list
  const countries = [
    { code: 'de', name: 'Germany' },
    { code: 'fr', name: 'France' },
    { code: 'gb', name: 'United Kingdom' },
    { code: 'it', name: 'Italy' },
    { code: 'es', name: 'Spain' },
    { code: 'nl', name: 'Netherlands' },
    { code: 'be', name: 'Belgium' },
    { code: 'at', name: 'Austria' },
    { code: 'pl', name: 'Poland' },
    { code: 'cz', name: 'Czech Republic' }
  ];

  const handleRegenerate = async () => {
    if (!selectedCountry) {
      alert('Please select a country first');
      return;
    }

    setRegenerating(true);
    
    try {
      // Clear staff data for selected country from localStorage
      const storageKey = `tm_staff_${selectedCountry}`;
      localStorage.removeItem(storageKey);
      
      // Call parent callback if provided
      if (onRegenerate) {
        onRegenerate(selectedCountry);
      }
      
      // Show success message
      alert(`Staff data for ${countries.find(c => c.code === selectedCountry)?.name} has been regenerated successfully!`);
      
      setSelectedCountry('');
    } catch (error) {
      console.error('Error regenerating staff:', error);
      alert('Failed to regenerate staff data. Please try again.');
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-3 bg-amber-400/10 rounded-lg">
          <RefreshCw className="w-6 h-6 text-amber-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Regenerate Staff</h3>
          <p className="text-sm text-slate-400">Clear and refresh staff pool for a specific country</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Country Selection */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Select Country
          </label>
          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            disabled={regenerating || loading}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">Choose a country...</option>
            {countries.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </select>
        </div>

        {/* Warning Message */}
        {selectedCountry && (
          <div className="bg-amber-400/10 border border-amber-400/20 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-amber-400 font-medium">Warning</p>
                <p className="text-xs text-amber-300 mt-1">
                  This will permanently remove all existing staff data for {countries.find(c => c.code === selectedCountry)?.name} 
                  and generate a new pool of staff members. This action cannot be undone.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={handleRegenerate}
          disabled={!selectedCountry || regenerating || loading}
          className="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
        >
          {regenerating ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Regenerating...</span>
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              <span>Regenerate Staff</span>
            </>
          )}
        </button>
      </div>

      {/* Info Section */}
      <div className="mt-6 pt-6 border-t border-slate-700">
        <div className="flex items-start space-x-2">
          <Users className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs text-slate-400 font-medium mb-1">What this does:</p>
            <ul className="text-xs text-slate-500 space-y-1">
              <li>• Removes cached staff data for selected country</li>
              <li>• Generates new 55 staff members with realistic names</li>
              <li>• Creates balanced role distribution</li>
              <li>• Applies appropriate salary ranges based on location</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffRegenerateCard;
