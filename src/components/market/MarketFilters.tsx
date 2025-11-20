/**
 * Advanced filters component for the freight market
 * Features expandable/collapsible design with country, distance, and cargo type filters
 * Now includes ALL countries and cities from the comprehensive list
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Filter, MapPin } from 'lucide-react';
import { cityMapping } from '../../utils/countryMapping';

interface FilterState {
  selectedCountries: string[];
  selectedCities: string[];
  maxDistance: number;
  cargoTypes: string[];
  jobTypes: string[];
  minValue: number;
  maxValue: number;
}

interface MarketFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  hubCity: string;
}

// Generate country data from cityMapping
const generateCountryData = () => {
  const countries: Record<string, { name: string; flag: string; cities: string[] }> = {};
  
  Object.values(cityMapping).forEach(cityInfo => {
    const { countryCode, countryName } = cityInfo;
    
    if (!countries[countryCode]) {
      countries[countryCode] = {
        name: countryName,
        flag: getCountryFlag(countryCode),
        cities: []
      };
    }
    
    if (!countries[countryCode].cities.includes(cityInfo.name)) {
      countries[countryCode].cities.push(cityInfo.name);
    }
  });
  
  // Sort countries by name
  return Object.entries(countries)
    .sort(([, a], [, b]) => a.name.localeCompare(b.name))
    .reduce((acc, [code, data]) => {
      // Sort cities alphabetically
      data.cities.sort();
      acc[code] = data;
      return acc;
    }, {} as Record<string, { name: string; flag: string; cities: string[] }>);
};

// Get country flag emoji
const getCountryFlag = (countryCode: string): string => {
  const flagMap: Record<string, string> = {
    'al': '🇦🇱', 'am': '🇦🇲', 'at': '🇦🇹', 'az': '🇦🇿', 'ba': '🇧🇦', 'be': '🇧🇪', 'bg': '🇧🇬',
    'by': '🇧🇾', 'ch': '🇨🇭', 'cn': '🇨🇳', 'cz': '🇨🇿', 'de': '🇩🇪', 'dk': '🇩🇰', 'ee': '🇪🇪',
    'es': '🇪🇸', 'fi': '🇫🇮', 'fr': '🇫🇷', 'gb': '🇬🇧', 'ge': '🇬🇪', 'gr': '🇬🇷', 'hr': '🇭🇷',
    'hu': '🇭🇺', 'ie': '🇮🇪', 'il': '🇮🇱', 'in': '🇮🇳', 'iq': '🇮🇶', 'ir': '🇮🇷', 'it': '🇮🇹',
    'jp': '🇯🇵', 'kz': '🇰🇿', 'lt': '🇱🇹', 'lv': '🇱🇻', 'md': '🇲🇩', 'me': '🇲🇪', 'mk': '🇲🇰',
    'nl': '🇳🇱', 'no': '🇳🇴', 'pl': '🇵🇱', 'pt': '🇵🇹', 'ro': '🇷🇴', 'rs': '🇷🇸', 'ru': '🇷🇺',
    'se': '🇸🇪', 'si': '🇸🇮', 'sk': '🇸🇰', 'tr': '🇹🇷', 'ua': '🇺🇦', 'xk': '🇽🇰', 'af': '🇦🇫',
    'bh': '🇧🇭', 'bd': '🇧🇩', 'kh': '🇰🇭', 'jo': '🇯🇴', 'kg': '🇰🇬', 'la': '🇱🇦', 'lb': '🇱🇧',
    'my': '🇲🇾', 'mm': '🇲🇲', 'om': '🇴🇲', 'qa': '🇶🇦', 'sg': '🇸🇬', 'sy': '🇸🇾', 'tj': '🇹🇯',
    'tm': '🇹🇲', 'uz': '🇺🇿', 'ye': '🇾🇪', 'lu': '🇱🇺', 'pk': '🇵🇰', 'ph': '🇵🇭', 'kr': '🇰🇷',
    'kw': '🇰🇼', 'id': '🇮🇩', 'sa': '🇸🇦', 'ae': '🇦🇪', 'vn': '🇻🇳', 'cy': '🇨🇾'
  };
  return flagMap[countryCode] || '🏴';
};

const cargoTypes = [
  'Dry Goods',
  'Frozen / Refrigerated',
  'Liquid - Clean / Food Grade',
  'Liquid - Industrial / Chemical',
  'Heavy Machinery / Oversized',
  'Construction Material',
  'Agricultural Bulk',
  'Vehicles',
  'Hazardous Materials',
  'Livestock',
  'Containerized / Intermodal',
  'Bulk Powder / Cement'
];

const jobTypes = [
  'Express',
  'Standard',
  'Economy',
  'Urgent'
];

const MarketFilters: React.FC<MarketFiltersProps> = ({
  filters,
  onFiltersChange,
  hubCity
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [citySearch, setCitySearch] = useState('');
  
  const countryData = generateCountryData();

  const toggleCountry = (countryCode: string) => {
    const newCountries = filters.selectedCountries.includes(countryCode)
      ? filters.selectedCountries.filter(c => c !== countryCode)
      : [...filters.selectedCountries, countryCode];
    
    onFiltersChange({
      ...filters,
      selectedCountries: newCountries,
      // Clear cities when countries change
      selectedCities: []
    });
  };

  const toggleCity = (city: string) => {
    const newCities = filters.selectedCities.includes(city)
      ? filters.selectedCities.filter(c => c !== city)
      : [...filters.selectedCities, city];
    
    onFiltersChange({
      ...filters,
      selectedCities: newCities
    });
  };

  const toggleCargoType = (cargoType: string) => {
    const newCargoTypes = filters.cargoTypes.includes(cargoType)
      ? filters.cargoTypes.filter(c => c !== cargoType)
      : [...filters.cargoTypes, cargoType];
    
    onFiltersChange({
      ...filters,
      cargoTypes: newCargoTypes
    });
  };

  const toggleJobType = (jobType: string) => {
    const newJobTypes = filters.jobTypes.includes(jobType)
      ? filters.jobTypes.filter(j => j !== jobType)
      : [...filters.jobTypes, jobType];
    
    onFiltersChange({
      ...filters,
      jobTypes: newJobTypes
    });
  };

  const handleDistanceChange = (distance: number) => {
    onFiltersChange({
      ...filters,
      maxDistance: distance
    });
  };

  const handleValueRangeChange = (min: number, max: number) => {
    onFiltersChange({
      ...filters,
      minValue: min,
      maxValue: max
    });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      selectedCountries: [],
      selectedCities: [],
      maxDistance: 2000,
      cargoTypes: [],
      jobTypes: [],
      minValue: 0,
      maxValue: 100000
    });
    setSelectedCountry('');
    setCitySearch('');
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.selectedCountries.length > 0) count++;
    if (filters.selectedCities.length > 0) count++;
    if (filters.maxDistance < 2000) count++;
    if (filters.cargoTypes.length > 0) count++;
    if (filters.jobTypes.length > 0) count++;
    if (filters.minValue > 0 || filters.maxValue < 100000) count++;
    return count;
  };

  const activeFilterCount = getActiveFilterCount();

  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  // Get filtered cities based on search and selected country
  const getFilteredCities = () => {
    let cities: string[] = [];
    
    if (selectedCountry && countryData[selectedCountry]) {
      cities = countryData[selectedCountry].cities;
    } else {
      // Show all cities from selected countries, or all cities if no countries selected
      const sourceCountries = filters.selectedCountries.length > 0 
        ? filters.selectedCountries 
        : Object.keys(countryData);
      
      sourceCountries.forEach(countryCode => {
        if (countryData[countryCode]) {
          cities = [...cities, ...countryData[countryCode].cities];
        }
      });
    }
    
    // Remove duplicates and sort
    cities = [...new Set(cities)].sort();
    
    // Apply search filter
    if (citySearch.trim()) {
      const query = citySearch.toLowerCase();
      cities = cities.filter(city => 
        city.toLowerCase().includes(query)
      );
    }
    
    return cities.slice(0, 50); // Limit to 50 cities for performance
  };

  const filteredCities = getFilteredCities();

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
      {/* Header - Always Visible */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Filter className="w-4 h-4 text-slate-400" />
            <div>
              <h3 className="text-sm font-medium text-slate-300">Advanced Filters</h3>
              <p className="text-xs text-slate-500">
                {isExpanded 
                  ? 'Filter jobs by country, city, distance, and cargo type'
                  : `${activeFilterCount} active filter${activeFilterCount !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {activeFilterCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="text-xs text-slate-400 hover:text-slate-300 px-2 py-1 border border-slate-600 rounded-md transition-colors"
              >
                Clear All
              </button>
            )}
            <button
              onClick={handleToggleExpand}
              className="flex items-center space-x-1 text-slate-400 hover:text-slate-300 transition-colors"
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
              <span className="text-sm">{isExpanded ? 'Collapse' : 'Expand'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Content - Expandable */}
      {isExpanded && (
        <div className="p-4 space-y-6 max-h-96 overflow-y-auto">
          {/* Country Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-3">
              Countries ({Object.keys(countryData).length} total)
            </label>
            <div className="max-h-48 overflow-y-auto bg-slate-700 rounded-lg p-2 border border-slate-600">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {Object.entries(countryData).map(([code, data]) => (
                  <button
                    key={code}
                    onClick={() => toggleCountry(code)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                      filters.selectedCountries.includes(code)
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-base">{data.flag}</span>
                      <span className="truncate">{data.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* City Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-3">
              Cities
            </label>
            <div className="space-y-3">
              {/* City Search and Country Filter */}
              <div className="flex space-x-3">
                <div className="flex-1">
                  <label className="text-xs text-slate-500 block mb-1">Search Cities</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search cities..."
                      value={citySearch}
                      onChange={(e) => setCitySearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 text-sm"
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <label className="text-xs text-slate-500 block mb-1">Filter by Country</label>
                  <select
                    value={selectedCountry}
                    onChange={(e) => setSelectedCountry(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="">All Countries</option>
                    {Object.entries(countryData).map(([code, data]) => (
                      <option key={code} value={code}>
                        {data.flag} {data.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Selected Cities */}
              {filters.selectedCities.length > 0 && (
                <div>
                  <label className="text-xs text-slate-500 block mb-2">Selected Cities ({filters.selectedCities.length})</label>
                  <div className="flex flex-wrap gap-1">
                    {filters.selectedCities.map(city => (
                      <span
                        key={city}
                        className="inline-flex items-center px-2 py-1 bg-blue-600 text-white text-xs rounded-md"
                      >
                        {city}
                        <button
                          onClick={() => toggleCity(city)}
                          className="ml-1 hover:text-blue-200"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* City List */}
              <div className="max-h-32 overflow-y-auto bg-slate-700 rounded-lg p-2 border border-slate-600">
                <div className="space-y-1">
                  {filteredCities.map(city => (
                    <button
                      key={city}
                      onClick={() => toggleCity(city)}
                      className={`w-full px-3 py-2 rounded text-sm text-left transition-colors ${
                        filters.selectedCities.includes(city)
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {city}
                    </button>
                  ))}
                  {filteredCities.length === 0 && (
                    <div className="text-center text-slate-500 text-sm py-4">
                      No cities found matching your criteria
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Distance Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-3">
              Distance from {hubCity}
            </label>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  {filters.maxDistance === 2000 ? 'Any distance' : `Up to ${filters.maxDistance}km`}
                </span>
                <span className="text-xs text-slate-400">
                  {filters.maxDistance === 2000 ? 'Any distance' : `${filters.maxDistance}km`}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="2000"
                step="50"
                value={filters.maxDistance}
                onChange={(e) => handleDistanceChange(Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-slate-500">
                <span>0 km</span>
                <span>500 km</span>
                <span>1000 km</span>
                <span>1500 km</span>
                <span>2000+ km</span>
              </div>
            </div>
          </div>

          {/* Cargo Type Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-3">
              Cargo Types
            </label>
            <div className="max-h-32 overflow-y-auto bg-slate-700 rounded-lg p-2 border border-slate-600">
              <div className="space-y-1">
                {cargoTypes.map((cargoType) => (
                  <button
                    key={cargoType}
                    onClick={() => toggleCargoType(cargoType)}
                    className={`w-full px-3 py-2 rounded text-sm text-left transition-colors ${
                      filters.cargoTypes.includes(cargoType)
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {cargoType}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Job Type Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-3">
              Job Types
            </label>
            <div className="flex flex-wrap gap-2">
              {jobTypes.map((jobType) => (
                <button
                  key={jobType}
                  onClick={() => toggleJobType(jobType)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filters.jobTypes.includes(jobType)
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {jobType}
                </button>
              ))}
            </div>
          </div>

          {/* Value Range Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-3">
              Job Value Range
            </label>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  €{filters.minValue.toLocaleString()} - €{filters.maxValue.toLocaleString()}
                </span>
              </div>
              <div className="flex space-x-4">
                <div className="flex-1">
                  <label className="text-xs text-slate-500 block mb-1">Min</label>
                  <input
                    type="number"
                    value={filters.minValue}
                    onChange={(e) => handleValueRangeChange(Number(e.target.value), filters.maxValue)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-slate-500 block mb-1">Max</label>
                  <input
                    type="number"
                    value={filters.maxValue}
                    onChange={(e) => handleValueRangeChange(filters.minValue, Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketFilters;
