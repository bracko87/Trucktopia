/**
 * Freight Job Database page for admin dashboard
 * Provides complete oversight of all freight jobs with unique 6-digit IDs
 * Allows admin to find, modify, remove, extend time, change values, reassign, cancel jobs
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Database, RefreshCw, Truck, MapPin, Edit, Trash2, ClockIcon, DollarSign, Search, Filter, X, TrendingUp, CheckCircle, Users, AlertTriangle, ArrowLeft } from 'lucide-react';

interface JobStats {
  totalJobs: number;
  activeJobs: number;
  citiesWithJobs: number;
  averageValue: number;
  lastUpdate: string;
}

interface CityJobCount {
  city: string;
  jobCount: number;
  averageValue: number;
}

interface ExtendedJobOffer {
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
  jobType: 'local' | 'state' | 'international';
  tags: string[];
  deadline: string;
  allowPartialLoad: boolean;
  remainingWeight: number;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: string;
  assignedTo?: string;
}

const FreightJobDatabase: React.FC = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<ExtendedJobOffer[]>([]);
  const [jobStats, setJobStats] = useState<JobStats>({
    totalJobs: 0,
    activeJobs: 0,
    citiesWithJobs: 0,
    averageValue: 0,
    lastUpdate: ''
  });
  const [cityJobCounts, setCityJobCounts] = useState<CityJobCount[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [jobSearchId, setJobSearchId] = useState('');
  const [searchedJob, setSearchedJob] = useState<ExtendedJobOffer | null>(null);
  const [editingJob, setEditingJob] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ExtendedJobOffer>>({});
  
  // Debug state to see what's happening
  const [debugMode, setDebugMode] = useState(false);

  // Comprehensive storage scanner
  const scanAllStorage = () => {
    const allJobs: ExtendedJobOffer[] = [];
    const storageInfo: any = {};

    // 1. Scan Job Market
    const jobMarketStored = localStorage.getItem('tm_job_market');
    if (jobMarketStored) {
      try {
        const data = JSON.parse(jobMarketStored);
        if (data.jobs && Array.isArray(data.jobs)) {
          const marketJobs = data.jobs.map((job: any) => ({
            id: job.id || Math.floor(100000 + Math.random() * 900000).toString(),
            title: job.title || 'Freight Contract',
            client: job.client || 'Market Client',
            value: job.value || 0,
            distance: job.distance || 0,
            origin: job.origin || 'Unknown',
            destination: job.destination || 'Unknown',
            originCountry: job.originCountry || '',
            destinationCountry: job.destinationCountry || '',
            cargoType: job.cargoType || 'General Cargo',
            trailerType: job.trailerType || 'Standard',
            weight: job.weight || 0,
            experience: job.experience || 50,
            jobType: job.jobType || 'local',
            tags: job.tags || [],
            deadline: job.deadline || 'Unknown',
            allowPartialLoad: job.allowPartialLoad || false,
            remainingWeight: job.remainingWeight || job.weight || 0,
            status: 'active' as const,
            createdAt: job.createdAt || new Date().toISOString(),
            assignedTo: 'Job Market'
          }));
          allJobs.push(...marketJobs);
          storageInfo.jobMarket = marketJobs.length;
        }
      } catch (error) {
        console.error('Error parsing tm_job_market:', error);
      }
    }

    // 2. Scan ALL user-specific storage keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      let userData = null;

      // Check user-specific state storage
      if (key.startsWith('tm_user_state_')) {
        try {
          userData = JSON.parse(localStorage.getItem(key) || '{}');
          if (userData.company && userData.company.activeJobs) {
            const userEmail = key.replace('tm_user_state_', '');
            const userJobs = userData.company.activeJobs.filter((job: any) => 
              job.id && job.status !== 'completed' && job.status !== 'cancelled'
            ).map((activeJob: any) => ({
              id: activeJob.id,
              title: activeJob.title || 'User Transport Contract',
              client: activeJob.client || 'User Client',
              value: activeJob.value || 0,
              distance: activeJob.distance || 0,
              origin: activeJob.origin || 'Unknown',
              destination: activeJob.destination || 'Unknown',
              originCountry: activeJob.originCountry || '',
              destinationCountry: activeJob.destinationCountry || '',
              cargoType: activeJob.cargoType || 'General Cargo',
              trailerType: activeJob.trailerType || 'Standard',
              weight: activeJob.weight || 0,
              experience: activeJob.experience || 50,
              jobType: activeJob.jobType || 'local',
              tags: activeJob.tags || [],
              deadline: activeJob.deadline || 'Unknown',
              allowPartialLoad: activeJob.allowPartialLoad || false,
              remainingWeight: activeJob.remainingWeight || activeJob.weight || 0,
              status: 'active' as const,
              createdAt: activeJob.startTime || new Date().toISOString(),
              assignedTo: userEmail
            }));
            allJobs.push(...userJobs);
            storageInfo[userEmail] = userJobs.length;
          }
        } catch (error) {
          console.error(`Error parsing ${key}:`, error);
        }
      }
    }

    // 3. Scan tm_users (registration data)
    const usersStored = localStorage.getItem('tm_users');
    if (usersStored) {
      try {
        const users = JSON.parse(usersStored);
        if (Array.isArray(users)) {
          users.forEach((user: any) => {
            if (user.company && user.company.activeJobs) {
              const userJobs = user.company.activeJobs.filter((job: any) => 
                job.id && job.status !== 'completed' && job.status !== 'cancelled'
              ).map((activeJob: any) => ({
                id: activeJob.id,
                title: activeJob.title || 'User Transport Contract',
                client: activeJob.client || 'User Client',
                value: activeJob.value || 0,
                distance: activeJob.distance || 0,
                origin: activeJob.origin || 'Unknown',
                destination: activeJob.destination || 'Unknown',
                originCountry: activeJob.originCountry || '',
                destinationCountry: activeJob.destinationCountry || '',
                cargoType: activeJob.cargoType || 'General Cargo',
                trailerType: activeJob.trailerType || 'Standard',
                weight: activeJob.weight || 0,
                experience: activeJob.experience || 50,
                jobType: activeJob.jobType || 'local',
                tags: activeJob.tags || [],
                deadline: activeJob.deadline || 'Unknown',
                allowPartialLoad: activeJob.allowPartialLoad || false,
                remainingWeight: activeJob.remainingWeight || activeJob.weight || 0,
                status: 'active' as const,
                createdAt: activeJob.startTime || new Date().toISOString(),
                assignedTo: user.email || 'Unknown User'
              }));
              allJobs.push(...userJobs);
              if (!storageInfo[user.email]) {
                storageInfo[user.email] = 0;
              }
              storageInfo[user.email] += userJobs.length;
            }
          });
        }
      } catch (error) {
        console.error('Error parsing tm_users:', error);
      }
    }

    // 4. Scan admin state
    const adminState = localStorage.getItem('tm_admin_state');
    if (adminState) {
      try {
        const adminData = JSON.parse(adminState);
        if (adminData.company && adminData.company.activeJobs) {
          const adminJobs = adminData.company.activeJobs.filter((job: any) => 
            job.id && job.status !== 'completed' && job.status !== 'cancelled'
          ).map((activeJob: any) => ({
            id: activeJob.id,
            title: activeJob.title || 'Admin Transport Contract',
            client: activeJob.client || 'Admin Client',
            value: activeJob.value || 0,
            distance: activeJob.distance || 0,
            origin: activeJob.origin || 'Unknown',
            destination: activeJob.destination || 'Unknown',
            originCountry: activeJob.originCountry || '',
            destinationCountry: activeJob.destinationCountry || '',
            cargoType: activeJob.cargoType || 'General Cargo',
            trailerType: activeJob.trailerType || 'Standard',
            weight: activeJob.weight || 0,
            experience: activeJob.experience || 50,
            jobType: activeJob.jobType || 'local',
            tags: activeJob.tags || [],
            deadline: activeJob.deadline || 'Unknown',
            allowPartialLoad: activeJob.allowPartialLoad || false,
            remainingWeight: activeJob.remainingWeight || activeJob.weight || 0,
            status: 'active' as const,
            createdAt: activeJob.startTime || new Date().toISOString(),
            assignedTo: 'Admin'
          }));
          allJobs.push(...adminJobs);
          storageInfo.admin = adminJobs.length;
        }
      } catch (error) {
        console.error('Error parsing tm_admin_state:', error);
      }
    }

    console.log('Storage Scan Results:', storageInfo);
    console.log('Total Jobs Found:', allJobs.length);
    console.log('Sample Job IDs:', allJobs.slice(0, 5).map(j => j.id));

    return { jobs: allJobs, storageInfo };
  };

  // Load job market data on component mount
  useEffect(() => {
    const { jobs: allJobs, storageInfo } = scanAllStorage();
    setJobs(allJobs);
    calculateJobStats(allJobs);
  }, []);

  const calculateJobStats = (allJobs: ExtendedJobOffer[]) => {
    const totalJobs = allJobs.length;
    const citiesWithJobs = new Set(allJobs.map(job => job.origin)).size;
    const averageValue = totalJobs > 0 
      ? Math.round(allJobs.reduce((sum, job) => sum + (job.value || 0), 0) / totalJobs)
      : 0;
    
    setJobStats({
      totalJobs,
      activeJobs: totalJobs,
      citiesWithJobs,
      averageValue,
      lastUpdate: new Date().toLocaleString()
    });

    // Calculate job counts by city
    const cityCounts: { [key: string]: { count: number; totalValue: number } } = {};
    
    allJobs.forEach(job => {
      if (!cityCounts[job.origin]) {
        cityCounts[job.origin] = { count: 0, totalValue: 0 };
      }
      cityCounts[job.origin].count++;
      cityCounts[job.origin].totalValue += job.value || 0;
    });

    const cityJobCountsArray: CityJobCount[] = Object.entries(cityCounts).map(([city, data]) => ({
      city,
      jobCount: data.count,
      averageValue: Math.round(data.totalValue / data.count)
    })).sort((a, b) => b.jobCount - a.jobCount).slice(0, 10);

    setCityJobCounts(cityJobCountsArray);
  };

  const handleRefreshJobs = () => {
    const { jobs: allJobs, storageInfo } = scanAllStorage();
    setJobs(allJobs);
    calculateJobStats(allJobs);
    alert(`Job database refreshed!\n\nStorage Info:\n${JSON.stringify(storageInfo, null, 2)}`);
  };

  const handleDeleteJob = (jobId: string) => {
    if (confirm(`Are you sure you want to delete job ${jobId}? This action cannot be undone.`)) {
      try {
        const stored = localStorage.getItem('tm_job_market');
        if (stored) {
          const data = JSON.parse(stored);
          const updatedJobs = data.jobs.filter((job: any) => job.id !== jobId);
          const updatedData = { ...data, jobs: updatedJobs, lastUpdate: Date.now() };
          localStorage.setItem('tm_job_market', JSON.stringify(updatedData));
          const { jobs: allJobs } = scanAllStorage();
          setJobs(allJobs);
          calculateJobStats(allJobs);
          alert(`Job ${jobId} has been deleted.`);
        }
      } catch (error) {
        console.error('Error deleting job:', error);
        alert('Error deleting job. Please try again.');
      }
    }
  };

  const handleExtendTime = (jobId: string) => {
    const newDeadline = prompt('Enter new deadline (e.g., 48h):', '48h');
    if (newDeadline) {
      try {
        const stored = localStorage.getItem('tm_job_market');
        if (stored) {
          const data = JSON.parse(stored);
          const updatedJobs = data.jobs.map((job: any) => 
            job.id === jobId ? { ...job, deadline: newDeadline } : job
          );
          const updatedData = { ...data, jobs: updatedJobs, lastUpdate: Date.now() };
          localStorage.setItem('tm_job_market', JSON.stringify(updatedData));
          const { jobs: allJobs } = scanAllStorage();
          setJobs(allJobs);
          calculateJobStats(allJobs);
          alert(`Job ${jobId} deadline extended to ${newDeadline}.`);
        }
      } catch (error) {
        console.error('Error extending deadline:', error);
        alert('Error extending deadline. Please try again.');
      }
    }
  };

  const handleChangeValue = (jobId: string) => {
    const newValue = prompt('Enter new job value:', '5000');
    if (newValue && !isNaN(Number(newValue))) {
      try {
        const stored = localStorage.getItem('tm_job_market');
        if (stored) {
          const data = JSON.parse(stored);
          const updatedJobs = data.jobs.map((job: any) => 
            job.id === jobId ? { ...job, value: Number(newValue) } : job
          );
          const updatedData = { ...data, jobs: updatedJobs, lastUpdate: Date.now() };
          localStorage.setItem('tm_job_market', JSON.stringify(updatedData));
          const { jobs: allJobs } = scanAllStorage();
          setJobs(allJobs);
          calculateJobStats(allJobs);
          alert(`Job ${jobId} value changed to €${newValue}.`);
        }
      } catch (error) {
        console.error('Error changing value:', error);
        alert('Error changing job value. Please try again.');
      }
    }
  };

  const handleCancelJob = (jobId: string) => {
    if (confirm(`Are you sure you want to cancel job ${jobId}?`)) {
      try {
        const stored = localStorage.getItem('tm_job_market');
        if (stored) {
          const data = JSON.parse(stored);
          const updatedJobs = data.jobs.map((job: any) => 
            job.id === jobId ? { ...job, status: 'cancelled' } : job
          );
          const updatedData = { ...data, jobs: updatedJobs, lastUpdate: Date.now() };
          localStorage.setItem('tm_job_market', JSON.stringify(updatedData));
          const { jobs: allJobs } = scanAllStorage();
          setJobs(allJobs);
          calculateJobStats(allJobs);
          alert(`Job ${jobId} has been cancelled.`);
        }
      } catch (error) {
        console.error('Error cancelling job:', error);
        alert('Error cancelling job. Please try again.');
      }
    }
  };

  const handleReassignJob = (jobId: string) => {
    const newAssignee = prompt('Enter user email to reassign job to:');
    if (newAssignee) {
      try {
        const stored = localStorage.getItem('tm_job_market');
        if (stored) {
          const data = JSON.parse(stored);
          const updatedJobs = data.jobs.map((job: any) => 
            job.id === jobId ? { ...job, assignedTo: newAssignee } : job
          );
          const updatedData = { ...data, jobs: updatedJobs, lastUpdate: Date.now() };
          localStorage.setItem('tm_job_market', JSON.stringify(updatedData));
          const { jobs: allJobs } = scanAllStorage();
          setJobs(allJobs);
          calculateJobStats(allJobs);
          alert(`Job ${jobId} reassigned to ${newAssignee}.`);
        }
      } catch (error) {
        console.error('Error reassigning job:', error);
        alert('Error reassigning job. Please try again.');
      }
    }
  };

  const handleEditJob = (job: ExtendedJobOffer) => {
    setEditingJob(job.id);
    setEditForm({
      value: job.value,
      weight: job.weight,
      deadline: job.deadline,
      experience: job.experience
    });
  };

  const handleSaveEdit = () => {
    if (editingJob && searchedJob) {
      try {
        const stored = localStorage.getItem('tm_job_market');
        if (stored) {
          const data = JSON.parse(stored);
          const updatedJobs = data.jobs.map((job: any) => 
            job.id === editingJob ? { ...job, ...editForm } : job
          );
          const updatedData = { ...data, jobs: updatedJobs, lastUpdate: Date.now() };
          localStorage.setItem('tm_job_market', JSON.stringify(updatedData));
          const { jobs: allJobs } = scanAllStorage();
          setJobs(allJobs);
          calculateJobStats(allJobs);
          
          // Update the searched job with new values
          const updatedJob = { ...searchedJob, ...editForm };
          setSearchedJob(updatedJob);
          
          alert(`Changes for job ${editingJob} have been saved.`);
          setEditingJob(null);
          setEditForm({});
        }
      } catch (error) {
        console.error('Error saving job changes:', error);
        alert('Error saving changes. Please try again.');
      }
    }
  };

  const handleCancelEdit = () => {
    setEditingJob(null);
    setEditForm({});
  };

  const getJobTypeColor = (type: string) => {
    switch (type) {
      case 'local': return 'text-green-400 bg-green-400/10';
      case 'state': return 'text-blue-400 bg-blue-400/10';
      case 'international': return 'text-purple-400 bg-purple-400/10';
      default: return 'text-slate-400 bg-slate-400/10';
    }
  };

  const getJobTypeIcon = (type: string) => {
    switch (type) {
      case 'local': return '🏙️';
      case 'state': return '🚛';
      case 'international': return '🌍';
      default: return '📦';
    }
  };

  // Enhanced search function that handles ALL job ID formats
  const searchJobById = () => {
    if (!jobSearchId.trim()) {
      alert('Please enter a valid Job ID');
      return;
    }
    
    const foundJob = jobs.find(job => {
      const jobId = job.id.toString();
      const searchId = jobSearchId.trim();
      
      console.log(`Checking: "${jobId}" against search: "${searchId}"`);
      
      // 1. Exact match
      if (jobId === searchId) {
        console.log('✓ Exact match found');
        return true;
      }
      
      // 2. My Jobs format: job-######-user -> extract 6-digit
      if (jobId.startsWith('job-') && jobId.includes('-')) {
        const parts = jobId.split('-');
        if (parts.length >= 2) {
          const sixDigitNumber = parts[1];
          if (sixDigitNumber === searchId) {
            console.log(`✓ My Jobs format match: ${sixDigitNumber}`);
            return true;
          }
        }
      }
      
      // 3. Pure 6-digit match for job market jobs
      if (jobId.length === 6 && jobId === searchId) {
        console.log('✓ Pure 6-digit match');
        return true;
      }
      
      // 4. Last 6 digits match
      if (jobId.length > 6) {
        const lastSix = jobId.slice(-6);
        if (lastSix === searchId) {
          console.log(`✓ Last 6 digits match: ${lastSix}`);
          return true;
        }
      }
      
      // 5. First 6 digits match
      if (jobId.length >= 6) {
        const firstSix = jobId.slice(0, 6);
        if (firstSix === searchId) {
          console.log(`✓ First 6 digits match: ${firstSix}`);
          return true;
        }
      }
      
      return false;
    });
    
    if (foundJob) {
      setSearchedJob(foundJob);
      console.log(`SUCCESS: Found job ${jobSearchId}`);
    } else {
      console.log(`FAILED: Job ${jobSearchId} not found`);
      console.log('All available job IDs:', jobs.slice(0, 10).map(j => j.id));
      
      alert(`Job with ID ${jobSearchId} not found.\n\nDebug Info:\n- Total jobs available: ${jobs.length}\n- Sample job IDs: ${jobs.slice(0, 5).map(j => j.id).join(', ')}\n- Check console for detailed search logs.`);
      setSearchedJob(null);
    }
  };

  const handleJobIdSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    searchJobById();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate('/admin')}
            className="mb-4 flex items-center space-x-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Admin Dashboard</span>
          </button>
          <h1 className="text-2xl font-bold text-white flex items-center space-x-3">
            <Database className="w-8 h-8 text-blue-400" />
            <span>Freight Job Database</span>
          </h1>
          <p className="text-slate-400">Complete oversight and management of all freight jobs</p>
        </div>
        <div className="flex items-center space-x-2 bg-green-500/20 border border-green-500/30 rounded-xl px-4 py-2">
          <Database className="w-5 h-5 text-green-400" />
          <span className="text-white font-medium">Admin Control</span>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="flex items-center space-x-2 mb-2">
            <Truck className="w-5 h-5 text-blue-400" />
            <div className="text-sm text-slate-400">Total Jobs</div>
          </div>
          <div className="text-2xl font-bold text-white">{jobStats.totalJobs.toLocaleString()}</div>
        </div>
        
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUp className="w-5 h-5 text-amber-400" />
            <div className="text-sm text-slate-400">Avg Value</div>
          </div>
          <div className="text-2xl font-bold text-white">€{jobStats.averageValue.toLocaleString()}</div>
        </div>
        
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="flex items-center space-x-2 mb-2">
            <ClockIcon className="w-5 h-5 text-purple-400" />
            <div className="text-sm text-slate-400">Last Update</div>
          </div>
          <div className="text-sm font-medium text-white">{jobStats.lastUpdate}</div>
        </div>
      </div>

      {/* Job Search by ID */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-white font-medium flex items-center space-x-2">
            <Search className="w-4 h-4" />
            <span>Find Job by Unique ID</span>
          </h4>
        </div>
        
        <form onSubmit={handleJobIdSubmit} className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              placeholder="Enter Job ID (e.g., 910690, 625776, job-123456-user)"
              value={jobSearchId}
              onChange={(e) => setJobSearchId(e.target.value)}
              className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={50}
            />
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
            >
              <Search className="w-4 h-4" />
              <span>Find Job</span>
            </button>
          </div>
        </form>
        
        {debugMode && (
          <div className="mt-4 p-3 bg-slate-700 rounded text-xs text-slate-300">
            <div className="font-bold mb-2">Debug Info:</div>
            <div>Total Jobs Loaded: {jobs.length}</div>
            <div>Sample Job IDs: {jobs.slice(0, 5).map(j => j.id).join(', ')}</div>
            <div>Searching For: {jobSearchId}</div>
            <div className="mt-2 font-bold">Storage Keys Found:</div>
            {(() => {
              const keys = [];
              for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.startsWith('tm_') || key.startsWith('job'))) {
                  keys.push(key);
                }
              }
              return keys.map(key => <div key={key}>- {key}</div>);
            })()}
          </div>
        )}
        
        <button
          onClick={() => setDebugMode(!debugMode)}
          className="mt-2 text-xs text-slate-400 hover:text-white"
        >
          {debugMode ? 'Hide Debug' : 'Show Debug'}
        </button>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleRefreshJobs}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh All Jobs</span>
        </button>
        
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
        >
          <TrendingUp className="w-4 h-4" />
          <span>{showDetails ? 'Hide Analytics' : 'Show Analytics'}</span>
        </button>
      </div>

      {/* Analytics Section */}
      {showDetails && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <h4 className="text-white font-medium mb-4 flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-blue-400" />
            <span>Top Cities by Job Count</span>
          </h4>
          <div className="space-y-2">
            {cityJobCounts.map((cityData, index) => (
              <div key={cityData.city} className="flex items-center justify-between p-3 bg-slate-700/30 rounded">
                <div className="flex items-center space-x-2">
                  <span className="text-slate-400 text-sm w-6">#{index + 1}</span>
                  <span className="text-white font-medium">{cityData.city}</span>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-blue-400 font-bold">{cityData.jobCount}</span>
                  <span className="text-slate-400 text-sm">jobs</span>
                  <span className="text-green-400 font-medium">€{cityData.averageValue.toLocaleString()}</span>
                  <span className="text-slate-400 text-sm">avg</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search Result */}
      {searchedJob && (
        <div className="bg-slate-800 rounded-xl border border-slate-700">
          <div className="p-6 border-b border-slate-700">
            <h2 className="text-lg font-semibold text-white flex items-center space-x-2">
              <Database className="w-5 h-5 text-blue-400" />
              <span>Job Found: {searchedJob.id}</span>
            </h2>
          </div>
          
          <div className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
              {/* Job Info */}
              <div className="flex-1">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`px-3 py-1 rounded text-xs font-mono font-bold ${getJobTypeColor(searchedJob.jobType)}`}>
                      ID: {searchedJob.id}
                    </div>
                    <div className={`px-2 py-1 rounded text-xs font-medium ${getJobTypeColor(searchedJob.jobType)}`}>
                      {getJobTypeIcon(searchedJob.jobType)} {searchedJob.jobType}
                    </div>
                  </div>
                </div>
                
                <h3 className="text-white font-medium text-lg mb-1">{searchedJob.title}</h3>
                <p className="text-slate-400 text-sm mb-3">{searchedJob.client}</p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3 text-sm">
                  <div>
                    <span className="text-slate-400">Route:</span>
                    <span className="text-white ml-1">{searchedJob.origin} → {searchedJob.destination}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Distance:</span>
                    <span className="text-white ml-1">{searchedJob.distance} km</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Weight:</span>
                    <span className="text-white ml-1">{searchedJob.weight} tons</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Value:</span>
                    <span className="text-green-400 ml-1">€{(searchedJob.value || 0).toLocaleString()}</span>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {searchedJob.tags.slice(0, 3).map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-slate-600 text-slate-300 rounded text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col space-y-2 lg:space-y-0 lg:space-x-2">
                {editingJob === searchedJob.id ? (
                  <div className="flex flex-col space-y-2">
                    <input
                      type="number"
                      placeholder="Value"
                      value={editForm.value || ''}
                      onChange={(e) => setEditForm({...editForm, value: Number(e.target.value)})}
                      className="w-full bg-slate-600 border border-slate-500 rounded px-2 py-1 text-white text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Weight"
                      value={editForm.weight || ''}
                      onChange={(e) => setEditForm({...editForm, weight: Number(e.target.value)})}
                      className="w-full bg-slate-600 border border-slate-500 rounded px-2 py-1 text-white text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Deadline"
                      value={editForm.deadline || ''}
                      onChange={(e) => setEditForm({...editForm, deadline: e.target.value})}
                      className="w-full bg-slate-600 border border-slate-500 rounded px-2 py-1 text-white text-sm"
                    />
                    <div className="flex space-x-2">
                      <button
                        onClick={handleSaveEdit}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white py-1 px-2 rounded text-sm"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="flex-1 bg-slate-600 hover:bg-slate-500 text-white py-1 px-2 rounded text-sm"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                    <button
                      onClick={() => handleEditJob(searchedJob)}
                      className="w-full bg-amber-600 hover:bg-amber-700 text-white py-1 px-2 rounded text-sm flex items-center justify-center space-x-1"
                    >
                      <Edit className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleExtendTime(searchedJob.id)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-1 px-2 rounded text-sm flex items-center justify-center space-x-1"
                    >
                      <ClockIcon className="w-3 h-3" />
                      <span>Time</span>
                    </button>
                    <button
                      onClick={() => handleChangeValue(searchedJob.id)}
                      className="w-full bg-green-600 hover:bg-green-700 text-white py-1 px-2 rounded text-sm flex items-center justify-center space-x-1"
                    >
                      <DollarSign className="w-3 h-3" />
                      <span>Value</span>
                    </button>
                    <button
                      onClick={() => handleReassignJob(searchedJob)}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white py-1 px-2 rounded text-sm flex items-center justify-center space-x-1"
                    >
                      <Users className="w-3 h-3" />
                      <span>Assign</span>
                    </button>
                    <button
                      onClick={() => handleCancelJob(searchedJob.id)}
                      className="w-full bg-orange-600 hover:bg-orange-700 text-white py-1 px-2 rounded text-sm flex items-center justify-center space-x-1"
                    >
                      <AlertTriangle className="w-3 h-3" />
                      <span>Cancel</span>
                    </button>
                    <button
                      onClick={() => handleDeleteJob(searchedJob.id)}
                      className="w-full bg-red-600 hover:bg-red-700 text-white py-1 px-2 rounded text-sm flex items-center justify-center space-x-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Job Type Distribution */}
      {showDetails && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <h4 className="text-white font-medium mb-3">Job Type Distribution</h4>
          <div className="grid grid-cols-3 gap-3">
            {['local', 'state', 'international'].map(type => {
              const count = jobs.filter(job => job.jobType === type).length;
              const percentage = jobs.length > 0 
                ? Math.round((count / jobs.length) * 100)
                : 0;
              
              return (
                <div key={type} className={`text-center p-3 rounded-lg border ${getJobTypeColor(type)}`}>
                  <div className="text-2xl mb-1">{getJobTypeIcon(type)}</div>
                  <div className="text-sm font-medium capitalize">{type}</div>
                  <div className="text-lg font-bold">{count}</div>
                  <div className="text-xs opacity-75">{percentage}%</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default FreightJobDatabase;
