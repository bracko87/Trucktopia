/**
 * JobMarketContext
 * Provides the dynamic freight job market: generation, persistence and actions.
 *
 * Notes:
 * - On mount this provider regenerates the job market to avoid stale cached jobs.
 * - Jobs are saved to localStorage/sessionStorage for persistence.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { generateJobsForCity, getAvailableCities } from '../utils/jobGenerator';

/**
 * FreightOffer
 * Minimal shape used by the job market and UI. Kept broad to avoid runtime errors.
 */
export interface FreightOffer {
  id: string;
  title: string;
  client: string;
  value: number;
  distance: number;
  origin: string;
  destination: string;
  originCountry: string;
  destinationCountry: string;
  cargoType: string;
  trailerType: string;
  weight: number;
  experience: number;
  jobType: 'local' | 'state' | 'international' | string;
  tags: string[];
  deadline: string;
  allowPartialLoad: boolean;
  remainingWeight: number;
  cityJob?: boolean; // optional flag to mark explicit in-city offers
}

/**
 * JobMarketState
 * Container state saved in localStorage/sessionStorage.
 */
interface JobMarketState {
  jobs: FreightOffer[];
  lastUpdate: number;
  selectedCity: string;
  version?: number;
}

/**
 * JobMarketContextType
 * Public API of the job market context.
 */
interface JobMarketContextType {
  jobMarket: JobMarketState;
  refreshJobs: () => void;
  acceptJob: (jobId: string, acceptedWeight: number) => void;
  setSelectedCity: (city: string) => void;
  searchJobs: (query: string) => FreightOffer[];
  getHubCityJobs: (hubCity: string) => FreightOffer[];
  clearAcceptedJobs: () => void;
}

const JobMarketContext = createContext<JobMarketContextType | undefined>(undefined);

/**
 * JOB_MARKET_VERSION
 * Bump this to force regeneration when generator logic changes.
 */
const JOB_MARKET_VERSION = 1;

interface JobMarketProviderProps {
  children: ReactNode;
}

/**
 * JobMarketProvider
 * Generates and stores freight jobs. On mount it regenerates the market to avoid stale data.
 */
export const JobMarketProvider: React.FC<JobMarketProviderProps> = ({ children }) => {
  const [jobMarket, setJobMarket] = useState<JobMarketState>({
    jobs: [],
    lastUpdate: 0,
    selectedCity: 'All Cities',
    version: JOB_MARKET_VERSION
  });

  /**
   * generateAllJobs
   * Create jobs for all available cities by calling the job generator.
   * Persist results to localStorage (fallback to sessionStorage).
   */
  const generateAllJobs = () => {
    const cities = getAvailableCities();
    const allJobs: FreightOffer[] = [];

    cities.forEach(city => {
      try {
        const cityJobs = generateJobsForCity(city) as FreightOffer[];
        if (Array.isArray(cityJobs)) {
          allJobs.push(...cityJobs);
        }
      } catch (err) {
        console.warn('generateJobsForCity failed for', city, err);
      }
    });

    const newState: JobMarketState = {
      jobs: allJobs,
      lastUpdate: Date.now(),
      selectedCity: jobMarket.selectedCity || 'All Cities',
      version: JOB_MARKET_VERSION
    };

    setJobMarket(newState);

    try {
      localStorage.setItem('tm_job_market', JSON.stringify(newState));
    } catch (error) {
      try {
        sessionStorage.setItem('tm_job_market', JSON.stringify(newState));
      } catch (sessionError) {
        console.log('Storage failed for job market persistence', sessionError);
      }
    }
  };

  /**
   * initializeJobMarket
   * We intentionally regenerate the market on mount to guarantee the UI sees fresh offers.
   * This avoids stale caches and ensures any generator changes are immediately reflected.
   */
  useEffect(() => {
    generateAllJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * refreshJobs
   * Public method to regenerate jobs on demand.
   */
  const refreshJobs = () => {
    generateAllJobs();
  };

  /**
   * acceptJob
   * Update market when a job is accepted (partial or full).
   *
   * @param jobId - ID of the job being accepted
   * @param acceptedWeight - accepted weight in tons
   */
  const acceptJob = (jobId: string, acceptedWeight: number) => {
    setJobMarket(prev => {
      const jobToAccept = prev.jobs.find(job => job.id === jobId);
      if (!jobToAccept) {
        console.warn('Job not found:', jobId);
        return prev;
      }

      let updatedJobs: FreightOffer[];

      if (acceptedWeight >= jobToAccept.remainingWeight) {
        updatedJobs = prev.jobs.filter(job => job.id !== jobId);
      } else {
        updatedJobs = prev.jobs.map(job => {
          if (job.id === jobId) {
            return {
              ...job,
              remainingWeight: job.remainingWeight - acceptedWeight,
              // approximate new value proportional to remaining weight to keep UI sensible
              value: Math.round(job.value * ((job.remainingWeight - acceptedWeight) / job.weight))
            };
          }
          return job;
        });
      }

      const newState: JobMarketState = {
        ...prev,
        jobs: updatedJobs,
        lastUpdate: Date.now(),
        version: JOB_MARKET_VERSION
      };

      try {
        localStorage.setItem('tm_job_market', JSON.stringify(newState));
        console.log('✅ Job market updated - job removed/updated:', jobId);
      } catch (error) {
        try {
          sessionStorage.setItem('tm_job_market', JSON.stringify(newState));
          console.log('✅ Job market saved to session storage');
        } catch (sessionError) {
          console.log('⚠️ Storage failed for job update');
        }
      }

      return newState;
    });
  };

  /**
   * setSelectedCity
   * Update UI selection (not persisted beyond storage).
   */
  const setSelectedCity = (city: string) => {
    setJobMarket(prev => ({
      ...prev,
      selectedCity: city
    }));
  };

  /**
   * searchJobs
   * Search by origin, destination, cargoType or client (case-insensitive).
   */
  const searchJobs = (query: string): FreightOffer[] => {
    if (!query.trim()) return jobMarket.jobs;
    const lowerQuery = query.toLowerCase();
    return jobMarket.jobs.filter(job =>
      (typeof job.origin === 'string' ? job.origin.toLowerCase() : '').includes(lowerQuery) ||
      (typeof job.destination === 'string' ? job.destination.toLowerCase() : '').includes(lowerQuery) ||
      (typeof job.cargoType === 'string' ? job.cargoType.toLowerCase() : '').includes(lowerQuery) ||
      (typeof job.client === 'string' ? job.client.toLowerCase() : '').includes(lowerQuery)
    );
  };

  /**
   * getHubCityJobs
   * Get all jobs originating from a particular hub city.
   */
  const getHubCityJobs = (hubCity: string): FreightOffer[] => {
    return jobMarket.jobs.filter(job => job.origin === hubCity);
  };

  /**
   * clearAcceptedJobs
   * Regenerate market (useful for testing or resetting).
   */
  const clearAcceptedJobs = () => {
    generateAllJobs();
  };

  return (
    <JobMarketContext.Provider value={{
      jobMarket,
      refreshJobs,
      acceptJob,
      setSelectedCity,
      searchJobs,
      getHubCityJobs,
      clearAcceptedJobs
    }}>
      {children}
    </JobMarketContext.Provider>
  );
};

/**
 * useJobMarket
 * Hook to access job market context; throws if used outside provider.
 */
export const useJobMarket = (): JobMarketContextType => {
  const context = useContext(JobMarketContext);
  if (context === undefined) {
    throw new Error('useJobMarket must be used within a JobMarketProvider');
  }
  return context;
};