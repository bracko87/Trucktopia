/**
 * Freight Market page showing available jobs with dynamic filtering
 * Features hub city view and all cities view with proper distance calculations
 */

import React, { useState, useEffect } from 'react';
import { useGame } from '../contexts/GameContext';
import { useJobMarket } from '../contexts/JobMarketContext';
import { Search, RefreshCw, MapPin, Building } from 'lucide-react';
import FreightOfferCard from '../components/market/FreightOfferCard';
import MarketFilters from '../components/market/MarketFilters';
import { getDistance } from '../utils/distanceCalculator';
import { getCountryCode } from '../utils/countryMapping';

const Market: React.FC = () => {
  const { gameState, acceptJob: gameAcceptJob } = useGame();
  const { jobMarket, refreshJobs, acceptJob: marketAcceptJob, setSelectedCity } = useJobMarket();
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'hub' | 'all'>('hub');
    const hubCity = gameState.company?.hub?.name || 'Belgrade';
 const hubCountry = gameState.company?.hub?.country || 'Serbia';

  // Get hub country code for default filtering
  const hubCountryCode = getCountryCode(hubCity);

  const [filters, setFilters] = useState({
    selectedCountries: hubCountryCode ? [hubCountryCode] : [],
    selectedCities: [] as string[],
    maxDistance: 2000,
    cargoTypes: [] as string[],
    jobTypes: [] as string[],
    minValue: 0,
    maxValue: 100000
  });

  // Handle job acceptance
  const handleAcceptJob = (jobData: any, acceptedWeight: number) => {
    marketAcceptJob(jobData.id, acceptedWeight);
    gameAcceptJob(jobData, acceptedWeight);
    alert(`Job accepted successfully! You can track it in "My Jobs".`);
  };

  // Handle refresh jobs
  const handleRefreshJobs = async () => {
    setIsRefreshing(true);
    await refreshJobs();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  // Filter jobs based on current view mode and filters
  const getFilteredJobs = () => {
    let filteredJobs = jobMarket.jobs;

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      // Safely coerce fields to string to avoid calling methods on undefined
      filteredJobs = filteredJobs.filter(job => {
        const fields = [job.origin, job.destination, job.cargoType, job.client];
        return fields.some((f) => (typeof f === 'string' ? f : '').toLowerCase().includes(query));
      });
    }

    // Hub city view - only show jobs from hub city
    if (viewMode === 'hub') {
      filteredJobs = filteredJobs.filter(job => job.origin === hubCity);
    }
    // All cities view - apply advanced filters
    else if (viewMode === 'all') {
      // Country filter
      if (filters.selectedCountries.length > 0) {
        filteredJobs = filteredJobs.filter(job =>
          filters.selectedCountries.includes(job.originCountry)
        );
      }

      // Distance filter - calculate distance from hub to job origin
      if (filters.maxDistance < 2000) {
        filteredJobs = filteredJobs.filter(job => {
          const distance = getDistance(hubCity, job.origin);
          return distance && distance <= filters.maxDistance;
        });
      }

      // Cargo type filter
      if (filters.cargoTypes.length > 0) {
        filteredJobs = filteredJobs.filter(job =>
          filters.cargoTypes.includes(job.cargoType)
        );
      }

      // Job type filter
      if (filters.jobTypes.length > 0) {
        filteredJobs = filteredJobs.filter(job =>
          filters.jobTypes.includes(job.jobType)
        );
      }

      // Value filter
      filteredJobs = filteredJobs.filter(job =>
        job.value >= filters.minValue && job.value <= filters.maxValue
      );

      // Default: show only state jobs (same country as hub)
      if (filters.selectedCountries.length === 0) {
        filteredJobs = filteredJobs.filter(job => job.originCountry === 'de');
      }
    }

    return filteredJobs;
  };

  const filteredJobs = getFilteredJobs();
  const hubCityJobs = jobMarket.jobs.filter(job => job.origin === hubCity);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Freight Market</h1>
          <p className="text-slate-400">
            Find and accept transportation contracts across Europe
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <div className="text-sm text-slate-400">Last Update</div>
            <div className="text-white font-medium">
              {new Date(jobMarket.lastUpdate).toLocaleTimeString()}
            </div>
          </div>
          <button
            onClick={handleRefreshJobs}
            disabled={isRefreshing}
            className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by city, destination, cargo type, or client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>
          
          {/* View Mode Tabs */}
          <div className="flex bg-slate-700 rounded-lg p-1 border border-slate-600">
            <button
              onClick={() => setViewMode('hub')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'hub'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Building className="w-4 h-4" />
                <span>Hub City ({hubCity})</span>
              </div>
            </button>
            <button
              onClick={() => setViewMode('all')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4" />
                <span>All Cities</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Advanced Filters - Only show for All Cities view */}
      {viewMode === 'all' && (
        <MarketFilters
          filters={filters}
          onFiltersChange={setFilters}
          hubCity={hubCity}
        />
      )}

      {/* Jobs Counter */}
      <div className="flex items-center justify-between">
        <div className="text-slate-400">
          {viewMode === 'hub' ? (
            <span>
              Showing {filteredJobs.length} job{filteredJobs.length !== 1 ? 's' : ''} from your hub in {hubCity}
            </span>
          ) : (
            <span>
              Showing {filteredJobs.length} job{filteredJobs.length !== 1 ? 's' : ''} from {filters.selectedCountries.length > 0 ? 'selected countries' : 'Germany'}
            </span>
          )}
        </div>
        {viewMode === 'all' && filters.selectedCountries.length === 0 && (
          <div className="text-sm text-slate-500">
            Showing state jobs by default. Use filters to see international jobs.
          </div>
        )}
      </div>

      {/* Jobs Grid */}
      {filteredJobs.length === 0 ? (
        <div className="bg-slate-800 rounded-xl p-12 border border-slate-700 text-center">
          <MapPin className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">
            {viewMode === 'hub' ? 'No Jobs in Hub City' : 'No Jobs Found'}
          </h3>
          <p className="text-slate-400 mb-6">
            {viewMode === 'hub' 
              ? `No freight jobs are currently available in ${hubCity}. Try refreshing or check the All Cities view.`
              : 'No jobs match your current filters. Try adjusting your search criteria.'}
          </p>
          <button
            onClick={handleRefreshJobs}
            disabled={isRefreshing}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            Refresh Jobs
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredJobs.map((job) => (
            <FreightOfferCard
              key={job.id}
              /* Normalize offer to ensure string fields exist; prevents runtime errors in child components */
              offer={{
                ...job,
                origin: typeof job.origin === 'string' ? job.origin : '',
                destination: typeof job.destination === 'string' ? job.destination : '',
                cargoType: typeof job.cargoType === 'string' ? job.cargoType : 'Unknown',
                jobType: typeof job.jobType === 'string' ? job.jobType : 'Standard',
                client: typeof job.client === 'string' ? job.client : 'Client',
                originCountry: typeof job.originCountry === 'string' ? job.originCountry : '',
                destinationCountry: typeof job.destinationCountry === 'string' ? job.destinationCountry : '',
              }}
              onAcceptJob={handleAcceptJob}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Market;