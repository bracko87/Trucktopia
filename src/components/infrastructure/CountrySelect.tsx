/**
 * CountrySelect.tsx
 *
 * Lightweight searchable country dropdown used by infrastructure screens.
 *
 * Responsibilities:
 * - Render a searchable dropdown list of countries
 * - Display external PNG flags (flagcdn) when available and fall back to emoji flags
 * - Show full country name (not code) alongside the flag in both the button and the list
 *
 * Accessibility / UX:
 * - Minimal listbox semantics (aria-haspopup, aria-expanded, role=listbox)
 * - Close on outside click
 *
 * Note: This component intentionally hides the short country code in the UI and
 * only exposes full human-friendly country names and flags as requested.
 */

import React from 'react';
import { CountriesData, CountryFlagPngs, CountryFlags } from '../../data/cities';

/**
 * CountryOption
 * @description Minimal shape for country option used inside the component
 */
interface CountryOption {
  code: string;
  name: string;
  flagEmoji?: string | null;
  flagPng?: string | null;
}

/**
 * CountrySelectProps
 * @description Props for the CountrySelect component
 */
interface CountrySelectProps {
  /** Currently selected country code (ISO alpha-2 or fallback code used in dataset) */
  value?: string | null;
  /** Called when a country is selected; receives the country code */
  onChange: (code: string) => void;
  /** Optional placeholder shown when no selection is present */
  placeholder?: string;
  /** Optional className for wrapper styling */
  className?: string;
}

/**
 * CountrySelect
 * @description A small searchable country dropdown that shows PNG flags (best-effort).
 *              This variant intentionally hides the two-letter country code and
 *              displays only the full country name and flag.
 *
 * @param props CountrySelectProps
 * @returns React.ReactElement
 */
const CountrySelect: React.FC<CountrySelectProps> = ({
  value = null,
  onChange,
  placeholder = 'Select country...',
  className = ''
}) => {
  // Build options from CountriesData + supplemental maps. We compute flag sources here.
  const allOptions: CountryOption[] = CountriesData.map((c) => ({
    code: c.code,
    name: c.name,
    flagEmoji: CountryFlags[c.code] ?? null,
    flagPng: CountryFlagPngs[c.code] ?? null
  }));

  const [open, setOpen] = React.useState(false);
  const [filter, setFilter] = React.useState('');
  const wrapperRef = React.useRef<HTMLDivElement | null>(null);

  /**
   * Close dropdown on outside click
   * @description Adds/removes a mousedown listener that closes the dropdown when clicking outside.
   */
  React.useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  // Compute currently selected option
  const selected = allOptions.find((o) => o.code === value) ?? null;

  // Filter options by name (code hidden from UI but still searchable by name)
  const filtered = allOptions.filter((o) => {
    const q = filter.trim().toLowerCase();
    if (!q) return true;
    return o.name.toLowerCase().includes(q);
  });

  /**
   * handleSelect
   * @description Select a country and close dropdown
   * @param code country code to select
   */
  const handleSelect = (code: string) => {
    onChange(code);
    setOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((s) => !s)}
        className="w-full flex items-center justify-between bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-left hover:border-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <div className="flex items-center space-x-3">
          {/* Flag (PNG preferred) */}
          <div className="w-6 h-4 rounded overflow-hidden flex items-center justify-center bg-slate-800">
            {selected?.flagPng ? (
              // eslint-disable-next-line jsx-a11y/alt-text
              <img src={selected.flagPng} className="object-cover w-full h-full" />
            ) : selected?.flagEmoji ? (
              <span className="text-sm">{selected.flagEmoji}</span>
            ) : (
              <span className="text-xs uppercase text-slate-400">--</span>
            )}
          </div>

          <div>
            <div className="text-sm text-white">{selected ? selected.name : <span className="text-slate-400">{placeholder}</span>}</div>
          </div>
        </div>

        <div className="text-slate-400 text-sm">{open ? '▲' : '▼'}</div>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute z-40 mt-2 w-full bg-slate-800 border border-slate-700 rounded-lg shadow-lg max-h-72 overflow-auto">
          <div className="p-3 border-b border-slate-700">
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search countries..."
              className="w-full bg-slate-700 px-3 py-2 rounded text-sm text-white focus:outline-none"
            />
          </div>

          <ul role="listbox" aria-label="Country list" className="divide-y divide-slate-700">
            {filtered.map((opt) => (
              <li
                key={opt.code}
                role="option"
                aria-selected={opt.code === value}
                onClick={() => handleSelect(opt.code)}
                className="flex items-center justify-between px-3 py-2 hover:bg-slate-700/50 cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-4 rounded overflow-hidden bg-slate-800 flex items-center justify-center">
                    {opt.flagPng ? (
                      // eslint-disable-next-line jsx-a11y/alt-text
                      <img src={opt.flagPng} className="object-cover w-full h-full" />
                    ) : opt.flagEmoji ? (
                      <span className="text-sm">{opt.flagEmoji}</span>
                    ) : (
                      <span className="text-xs uppercase text-slate-400">--</span>
                    )}
                  </div>
                  <div>
                    <div className="text-sm text-white">{opt.name}</div>
                  </div>
                </div>

                {opt.code === value && <div className="text-xs text-green-400 font-medium">Selected</div>}
              </li>
            ))}

            {filtered.length === 0 && (
              <li className="px-3 py-4 text-sm text-slate-400">No countries found</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CountrySelect;
