
/**
 * BuildHubBox.tsx
 *
 * Frontend interface to trigger the server-side START_BUILD flow.
 */

import React, { useState, useMemo } from 'react';
import { useGame } from '../../contexts/GameContext';
import CountrySelect from './CountrySelect';
import { CountriesData, CitiesByCountry } from '../../data/cities';
import BuildHubModal from './BuildHubModal';

const BuildHubBox: React.FC = () => {
  const { gameState } = useGame() as any;
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [city, setCity] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const country = useMemo(() => CountriesData.find(c => c.code === countryCode), [countryCode]);
  
  const availableCities = useMemo(() => {
    if (!countryCode) return [];
    return CitiesByCountry[countryCode] || [];
  }, [countryCode]);

  const handleOpenConfirm = () => {
    if (!countryCode || !city.trim()) {
      alert("Please select a country and city.");
      return;
    }
    setModalOpen(true);
  };

  const handleConfirm = async (payload: { duration: number; estimatedPrice: number }) => {
    setModalOpen(false);
    setIsSubmitting(true);

    try {
      const res = await fetch('/.netlify/functions/hub-manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'START_BUILD',
          email: gameState.currentUser,
          city: city.trim(),
          countryCode: countryCode,
          duration: payload.duration
        })
      });

      const contentType = res.headers.get("content-type");
      const isJson = contentType && contentType.includes("application/json");

      if (res.ok && isJson) {
        alert(`Success! Construction of the ${city} Hub has started.`);
        setCity('');
        setCountryCode(null);
      } else {
        const errorMsg = isJson ? (await res.json()).error : `Server Error: Backend functions are not active in this preview environment (Status ${res.status}).`;
        throw new Error(errorMsg);
      }
    } catch (err: any) {
      alert("Construction Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-900/50 rounded-xl border border-slate-700 p-6 shadow-inner">
      <h3 className="text-lg font-semibold text-white mb-2">Expand Your Network</h3>
      <p className="text-sm text-slate-400 mb-6">
        Select a location from our global database to establish a new Level 1 Hub.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">1. Select Country</label>
          <CountrySelect 
            value={countryCode} 
            onChange={(code) => {
              setCountryCode(code);
              setCity('');
            }} 
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">2. Choose City</label>
          <div className="relative">
            <select
              disabled={!countryCode}
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none appearance-none disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <option value="">{countryCode ? '-- Select a City --' : 'Select a country first'}</option>
              {availableCities.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 text-xs">
              ▼
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-slate-800">
        <button
          onClick={handleOpenConfirm}
          disabled={isSubmitting || !countryCode || !city}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl transition-all disabled:opacity-50 disabled:grayscale shadow-lg shadow-blue-900/20"
        >
          {isSubmitting ? "Processing..." : "Start Construction Project"}
        </button>
      </div>

      <BuildHubModal
        open={modalOpen}
        countryCode={countryCode || ''}
        countryName={country?.name || ''}
        city={city}
        onClose={() => setModalOpen(false)}
        onConfirm={handleConfirm}
      />
    </div>
  );
};

export default BuildHubBox;
