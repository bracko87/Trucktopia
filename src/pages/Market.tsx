/**
 * Market.tsx
 *
 * Freight Market page showing available jobs with dynamic filtering and pagination.
 *
 * Responsibilities:
 * - Render market search, view toggles and filters
 * - Normalize job offers before rendering so child components receive
 *   consistent load option data (deduplicated / formatted)
 * - Use hub city country as fallback when no countries are selected
 * - Client-side pagination with PAGE_SIZE items per page
 *
 * NOTE: This file focuses on the Market page only. The header counter line that
 * previously displayed "Showing X jobs..." has been removed per request.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Search, RefreshCw, MapPin, Building, ChevronLeft, ChevronRight } from 'lucide-react';
import { useGame } from '../contexts/GameContext';
import { useJobMarket } from '../contexts/JobMarketContext';
import FreightOfferCard from '../components/market/FreightOfferCard';
import MarketFilters from '../components/market/MarketFilters';
import { getDistance } from '../utils/distanceCalculator';
import { getCountryCode } from '../utils/countryMapping';
import { generateJobsForCity } from '../utils/jobGenerator';

/**
 * formatTons
 * @description Format a numeric tons value for display (keeps 1 decimal if needed).
 * @param v number
 * @returns formatted string like "6t" or "4.5t"
 */
function formatTons(v: number) {
  if (Number.isInteger(v)) return `${v}t`;
  return `${v.toFixed(1)}t`;
}

/**
 * parseNumericOption
 * @description Parse a provided load option (number|string) to a numeric ton value.
 * @param opt number|string
 * @returns number
 */
function parseNumericOption(opt: number | string): number {
  if (typeof opt === 'number') return Number.isFinite(opt) ? opt : NaN;
  if (typeof opt !== 'string') return NaN;
  const cleaned = opt.trim().replace(/\s+/g, '');
  const normalized = cleaned.replace(',', '.');
  const m = normalized.match(/-?\d+(\.\d+)?/);
  if (!m) return NaN;
  const n = parseFloat(m[0]);
  return Number.isFinite(n) ? n : NaN;
}

/**
 * normalizeLoadOptions
 * @description Given a raw source that may contain load options in various shapes,
 * normalize into an array suitable for the UI:
 * - parse numeric values out of strings, collapse numeric duplicates (first occurrence kept)
 * - preserve order of first occurrences
 * - if the maximum numeric value appeared more than once in the original raw list,
 *   include the numeric value only once but return a flag via `maxWasDuplicate` so
 *   consumers (LoadInfo) can render "Full Load" if desired.
 *
 * @param raw unknown
 * @returns { values: Array<number|string>, maxWasDuplicate: boolean }
 */
function normalizeLoadOptions(raw: unknown): { values: Array<number | string>; maxWasDuplicate: boolean } {
  let arr: Array<number | string> = [];

  if (Array.isArray(raw)) {
    arr = raw.slice();
  } else if (raw === undefined || raw === null) {
    arr = [];
  } else if (typeof raw === 'string' || typeof raw === 'number') {
    arr = [raw as number | string];
  } else if (typeof raw === 'object') {
    const obj = raw as Record<string, any>;
    const candidates = ['loadOptions', 'loads', 'options', 'availableLoads', 'load'];
    for (const k of candidates) {
      if (Array.isArray(obj[k])) {
        arr = obj[k].slice();
        break;
      } else if (obj[k] !== undefined && (typeof obj[k] === 'string' || typeof obj[k] === 'number')) {
        arr = [obj[k]];
        break;
      }
    }
  }

  const parsedNumbers: number[] = [];
  const counts = new Map<number, number>();
  for (const item of arr) {
    const n = parseNumericOption(item as number | string);
    if (Number.isFinite(n) && n > 0) {
      parsedNumbers.push(n);
      counts.set(n, (counts.get(n) || 0) + 1);
    } else {
      // Non-numeric items preserved as strings
    }
  }

  const seen = new Set<number>();
  const uniqNums: number[] = [];
  for (const n of parsedNumbers) {
    if (!seen.has(n)) {
      seen.add(n);
      uniqNums.push(n);
    }
  }

  const nonNumericItems: string[] = arr
    .filter((it) => {
      const n = parseNumericOption(it as number | string);
      return !Number.isFinite(n);
    })
    .map(String);

  const maxValue = uniqNums.length > 0 ? Math.max(...uniqNums) : 0;
  const maxWasDuplicate = maxValue > 0 ? ((counts.get(maxValue) || 0) > 1) : false;

  const finalValues: Array<number | string> = [...uniqNums, ...nonNumericItems];

  return { values: finalValues, maxWasDuplicate };
}

/**
 * PAGE_SIZE
 * @description Maximum offers shown per page
 */
const PAGE_SIZE = 10;

/**
 * MIN_OFFERS_PER_CITY
 * @description Ensure at least this many local/state offers are available per city.
 */
const MIN_OFFERS_PER_CITY = 28;

/**
 * Market
 * @description Main market component - unchanged visuals, adds load normalization
 *              before passing the offer down to FreightOfferCard so duplicate numeric
 *              load buttons are removed and the UI shows a single numeric button per value.
 */
const Market: React.FC = () => {
  const { gameState, acceptJob: gameAcceptJob } = useGame();
  const { jobMarket, refreshJobs, acceptJob: marketAcceptJob, setSelectedCity } = useJobMarket();
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'hub' | 'all'>('hub');
  const hubCity = gameState.company?.hub?.name || 'Belgrade';
  const hubCountry = gameState.company?.hub?.country || 'Serbia';

  // Get hub country code for default filtering (derived from hubCity)
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

  const [page, setPage] = useState(1);

  /**
   * handleAcceptJob
   * @description When user accepts a job, forward to both market and game contexts.
   * @param jobData any
   * @param acceptedWeight number
   */
  const handleAcceptJob = (jobData: any, acceptedWeight: number) => {
    marketAcceptJob(jobData.id, acceptedWeight);
    gameAcceptJob(jobData, acceptedWeight);
    alert(`Job accepted successfully! You can track it in "My Jobs".`);
  };

  /**
   * handleRefreshJobs
   * @description Trigger job refresh and show loading state briefly.
   */
  const handleRefreshJobs = async () => {
    setIsRefreshing(true);
    await refreshJobs();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  /**
   * getFilteredJobs
   * @description Filter jobs based on the current view mode and filters.
   * - For hub view we intentionally return ALL matching hub jobs (no artificial cap),
   *   but we still paginate the UI to PAGE_SIZE.
   * - If no countries are selected, FALL BACK to hub city country (NOT hardcoded 'de').
   */
  const getFilteredJobs = () => {
    let filteredJobs = jobMarket.jobs;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filteredJobs = filteredJobs.filter(job => {
        const fields = [job.origin, job.destination, job.cargoType, job.client];
        return fields.some((f) => (typeof f === 'string' ? f : '').toLowerCase().includes(query));
      });
    }

    if (viewMode === 'hub') {
      filteredJobs = filteredJobs.filter(job => job.origin === hubCity);
    } else if (viewMode === 'all') {
      if (filters.selectedCountries.length > 0) {
        filteredJobs = filteredJobs.filter(job =>
          filters.selectedCountries.includes(job.originCountry)
        );
      }

      if (filters.maxDistance < 2000) {
        filteredJobs = filteredJobs.filter(job => {
          const distance = getDistance(hubCity, job.origin);
          return distance && distance <= filters.maxDistance;
        });
      }

      if (filters.cargoTypes.length > 0) {
        filteredJobs = filteredJobs.filter(job =>
          filters.cargoTypes.includes(job.cargoType)
        );
      }

      if (filters.jobTypes.length > 0) {
        filteredJobs = filteredJobs.filter(job =>
          filters.jobTypes.includes(job.jobType)
        );
      }

      filteredJobs = filteredJobs.filter(job =>
        job.value >= filters.minValue && job.value <= filters.maxValue
      );

      // Fallback: if no countries are selected, use hub city's country as fallback
      if (filters.selectedCountries.length === 0) {
        if (hubCountryCode) {
          filteredJobs = filteredJobs.filter(job => job.originCountry === hubCountryCode);
        }
      }
    }

    return filteredJobs;
  };

  const filteredJobs = useMemo(getFilteredJobs, [
    jobMarket.jobs,
    searchQuery,
    viewMode,
    filters,
    hubCity,
    hubCountryCode
  ]);

  /**
   * ensureMinimumPerCity
   * @description Given an array of jobs, ensure each origin city has at least MIN_OFFERS_PER_CITY
   *              offers by generating additional offers client-side (deduplicated).
   * @param jobs - baseline filtered jobs
   * @returns augmented jobs array
   */
  const augmentedJobs = useMemo(() => {
    const jobs: any[] = filteredJobs.slice();

    const byOrigin = new Map<string, any[]>();
    for (const j of jobs) {
      const origin = typeof j.origin === 'string' ? j.origin : '';
      if (!byOrigin.has(origin)) byOrigin.set(origin, []);
      byOrigin.get(origin)!.push(j);
    }

    if (viewMode === 'hub' && (!byOrigin.has(hubCity) || (byOrigin.get(hubCity) || []).length === 0)) {
      const candidates = generateJobsForCity(hubCity);
      for (const c of candidates) {
        if (!jobs.find((x) => x.id === c.id)) {
          jobs.push(c);
          if (!byOrigin.has(c.origin)) byOrigin.set(c.origin, []);
          byOrigin.get(c.origin)!.push(c);
        }
      }
    }

    for (const [origin, arr] of Array.from(byOrigin.entries())) {
      if (!origin) continue;
      if (arr.length >= MIN_OFFERS_PER_CITY) continue;

      const candidates = generateJobsForCity(origin);

      for (const c of candidates) {
        if (arr.length >= MIN_OFFERS_PER_CITY) break;
        if (!jobs.find((x) => x.id === c.id)) {
          jobs.push(c);
          arr.push(c);
        }
      }

      if (arr.length < MIN_OFFERS_PER_CITY) {
        const extra = generateJobsForCity(origin);
        for (const c of extra) {
          if (arr.length >= MIN_OFFERS_PER_CITY) break;
          if (!jobs.find((x) => x.id === c.id)) {
            jobs.push(c);
            arr.push(c);
          }
        }
      }
    }

    return jobs;
  }, [filteredJobs, viewMode, hubCity]);

  // Reset page when filters or viewMode change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, viewMode, JSON.stringify(filters)]);

  const totalJobs = augmentedJobs.length;
  const totalPages = Math.max(1, Math.ceil(totalJobs / PAGE_SIZE));

  // Clip current page to valid range
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
    if (page < 1) setPage(1);
  }, [page, totalPages]);

  // Paginated slice for rendering (always max PAGE_SIZE per page)
  const paginatedJobs = augmentedJobs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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

      {/* NOTE: The 'Showing X jobs...' left counter was removed per request.
          Keeping only the page indicator on the right. */}
      <div className="flex items-center justify-end">
        <div className="text-sm text-slate-500">
          Page {page} of {totalPages} (showing up to {PAGE_SIZE} per page)
        </div>
      </div>

      {/* Jobs Grid */}
      {totalJobs === 0 ? (
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
          {paginatedJobs.map((job) => {
            /**
             * Defensive normalization of load options so duplicate numeric loads
             * (like two "6t" variants) are collapsed before passing to the child.
             */
            const rawLoads = job.loadOptions ?? job.loads ?? job.options ?? job.availableLoads ?? job.load ?? null;
            const { values: normalizedLoadValues, maxWasDuplicate } = normalizeLoadOptions(rawLoads);

            const offer = {
              ...job,
              origin: typeof job.origin === 'string' ? job.origin : '',
              destination: typeof job.destination === 'string' ? job.destination : '',
              cargoType: typeof job.cargoType === 'string' ? job.cargoType : 'Unknown',
              jobType: typeof job.jobType === 'string' ? job.jobType : 'Standard',
              client: typeof job.client === 'string' ? job.client : 'Client',
              originCountry: typeof job.originCountry === 'string' ? job.originCountry : '',
              destinationCountry: typeof job.destinationCountry === 'string' ? job.destinationCountry : '',
              loadOptions: normalizedLoadValues,
              loadMaxWasDuplicate: maxWasDuplicate
            };

            return (
              <FreightOfferCard
                key={job.id}
                offer={offer}
                onAcceptJob={handleAcceptJob}
              />
            );
          })}

          {/* Pagination controls */}
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-slate-400">
              Showing {(page - 1) * PAGE_SIZE + 1} - {Math.min(page * PAGE_SIZE, totalJobs)} of {totalJobs}
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="inline-flex items-center space-x-2 bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded-md text-sm transition-colors disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Prev</span>
              </button>

              <div className="text-sm text-slate-300 px-3">
                {page} / {totalPages}
              </div>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="inline-flex items-center space-x-2 bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded-md text-sm transition-colors disabled:opacity-50"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Market;