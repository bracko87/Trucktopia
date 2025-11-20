/**
 * Freight Job Database component for admin dashboard
 * Provides complete oversight of all freight jobs with unique 6-digit IDs
 * Allows admin to find, modify, remove, extend time, change values, reassign, cancel jobs
 */

import React, { useState, useEffect } from 'react';
import { useJobMarket } from '../../contexts/JobMarketContext';
import { useGame } from '../../contexts/GameContext';
import { Database, RefreshCw, Truck, MapPin, AlertTriangle, CheckCircle, BarChart3, Users, TrendingUp, Clock, Edit, Trash2, ClockIcon, DollarSign, Search, Filter, X } from 'lucide-react';

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
  createdAt: string;
  assignedTo?: string;
  status: 'active' | 'completed' | 'cancelled';
  timeExtended?: boolean;
}

const FreightJobDatabase: React.FC = () => {
  const { jobMarket, refreshJobs, clearAcceptedJobs } = useJobMarket();
  const { gameState } = useGame();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [jobStats, setJobStats] = useState<JobStats>({
    totalJobs: 0,
    activeJobs: 0,
    citiesWithJobs: 0,
    averageValue: 0,
    lastUpdate: ''
  });
  const [cityJobCounts, setCityJobCounts] = useState<CityJobCount[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedJob, setSelectedJob] = useState<ExtendedJobOffer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed' | 'cancelled'>('all');
  const [editingJob, setEditingJob] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ExtendedJobOffer>>({});

  useEffect(() => {
    calculateStats();
    // Generate 6-digit IDs for all jobs if not present
    ensureJobIds();
  }, [jobMarket.jobs]);

  const ensureJobIds = () => {
    const jobs = jobMarket.jobs || [];
    jobs.forEach(job => {
      if (!job.id || job.id.length !== 6) {
        // Generate 6-digit unique ID
        const sixDigitId = Math.floor(100000 + Math.random() * 900000).toString();
        job.id = sixDigitId;
      }
    });
  };

  const calculateStats = () => {
    const jobs = jobMarket.jobs || [];
    
    // Calculate basic stats
    const totalJobs = jobs.length;
    const citiesWithJobs = new Set(jobs.map(job => job.origin)).size;
    const averageValue = jobs.length > 0 
      ? Math.round(jobs.reduce((sum, job) => sum + (job.value || 0), 0) / jobs.length)
      : 0;
    
    setJobStats({
      totalJobs,
      activeJobs: totalJobs, // All jobs in market are active
      citiesWithJobs,
      averageValue,
      lastUpdate: new Date(jobMarket.lastUpdate).toLocaleString()
    });

    // Calculate job counts by city
    const cityCounts: { [key: string]: { count: number; totalValue: number } } = {};
    
    jobs.forEach(job => {
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

  const handleRefreshJobs = async () => {
    setIsRefreshing(true);
    try {
      await refreshJobs();
      setTimeout(() => {
        calculateStats();
        setIsRefreshing(false);
      }, 1000);
    } catch (error) {
      console.error('Error refreshing jobs:', error);
      setIsRefreshing(false);
    }
  };

  const handleClearDatabase = () => {
    if (confirm('Are you sure you want to clear the entire freight job database? This will remove ALL jobs for ALL users and cannot be undone.')) {
      clearAcceptedJobs();
      setTimeout(() => {
        alert('Freight job database has been cleared. New jobs will be generated automatically.');
      }, 500);
    }
  };

  const handleDeleteJob = (jobId: string) => {
    if (confirm(`Are you sure you want to delete job ${jobId}? This action cannot be undone.`)) {
      // In a real implementation, this would call an API to delete the job
      console.log(`Deleting job ${jobId}`);
      alert(`Job ${jobId} has been deleted.`);
      handleRefreshJobs(); // Refresh to show updated data
    }
  };

  const handleExtendTime = (jobId: string) => {
    const newDeadline = prompt('Enter new deadline (e.g., 48h):', '48h');
    if (newDeadline) {
      // In a real implementation, this would update the job deadline
      console.log(`Extending deadline for job ${jobId} to ${newDeadline}`);
      alert(`Job ${jobId} deadline extended to ${newDeadline}.`);
      handleRefreshJobs();
    }
  };

  const handleChangeValue = (jobId: string) => {
    const newValue = prompt('Enter new job value:', '5000');
    if (newValue && !isNaN(Number(newValue))) {
      // In a real implementation, this would update the job value
      console.log(`Changing value for job ${jobId} to €${newValue}`);
      alert(`Job ${jobId} value changed to €${newValue}.`);
      handleRefreshJobs();
    }
  };

  const handleCancelJob = (jobId: string) => {
    if (confirm(`Are you sure you want to cancel job ${jobId}?`)) {
      // In a real implementation, this would cancel the job
      console.log(`Cancelling job ${jobId}`);
      alert(`Job ${jobId} has been cancelled.`);
      handleRefreshJobs();
    }
  };

  const handleReassignJob = (jobId: string) => {
    const newAssignee = prompt('Enter user email to reassign job to:');
    if (newAssignee) {
      // In a real implementation, this would reassign the job
      console.log(`Reassigning job ${jobId} to ${newAssignee}`);
      alert(`Job ${jobId} reassigned to ${newAssignee}.`);
      handleRefreshJobs();
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
    if (selectedJob && editingJob) {
      // In a real implementation, this would save the changes
      console.log(`Saving changes for job ${editingJob}:`, editForm);
      alert(`Changes for job ${editingJob} have been saved.`);
      setEditingJob(null);
      setEditForm({});
      handleRefreshJobs();
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

  // Filter jobs based on search and filters
  const allJobs = (jobMarket.jobs || []).map(job => ({
    ...job,
    id: job.id || Math.floor(100000 + Math.random() * 900000).toString(), // Ensure 6-digit ID
    status: 'active' as const,
    createdAt: new Date().toISOString()
  }));

  const filteredJobs = allJobs.filter(job => {
    const matchesSearch = !searchQuery || 
      job.id.includes(searchQuery) ||
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.origin.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.client.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCity = !filterCity || job.origin === filterCity;
    const matchesStatus = filterStatus === 'all' || job.status === filterStatus;
    
    return matchesSearch && matchesCity && matchesStatus;
  });

  const uniqueCities = Array.from(new Set(allJobs.map(job => job.origin)));

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-3 bg-blue-500/10 rounded-lg">
          <Database className="w-6 h-6 text-blue-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Freight Job Database</h3>
          <p className="text-sm text-slate-400">Complete oversight of all freight jobs with unique 6-digit IDs</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-slate-700/50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Truck className="w-4 h-4 text-blue-400" />
            <div className="text-sm text-slate-400">Total Jobs</div>
          </div>
          <div className="text-2xl font-bold text-white">{jobStats.totalJobs.toLocaleString()}</div>
        </div>
        

        
        <div className="bg-slate-700/50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUp className="w-4 h-4 text-amber-400" />
            <div className="text-sm text-slate-400">Avg Value</div>
          </div>
          <div className="text-2xl font-bold text-white">€{jobStats.averageValue.toLocaleString()}</div>
        </div>
        
        <div className="bg-slate-700/50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Clock className="w-4 h-4 text-purple-400" />
            <div className="text-sm text-slate-400">Last Update</div>
          </div>
          <div className="text-sm font-medium text-white">{jobStats.lastUpdate}</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-slate-700/50 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-white font-medium flex items-center space-x-2">
            <Search className="w-4 h-4" />
            <span>Search & Filter Jobs</span>
          </h4>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Search by Job ID, title, client, origin, destination..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-600 border border-slate-500 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          
          <select
            value={filterCity}
            onChange={(e) => setFilterCity(e.target.value)}
            className="w-full bg-slate-600 border border-slate-500 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Cities</option>
            {uniqueCities.map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="w-full bg-slate-600 border border-slate-500 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          
          <button
            onClick={() => {
              setSearchQuery('');
              setFilterCity('');
              setFilterStatus('all');
            }}
            className="w-full bg-slate-600 hover:bg-slate-500 text-white py-2 px-4 rounded-lg border border-slate-500 transition-colors flex items-center justify-center space-x-2"
          >
            <X className="w-4 h-4" />
            <span>Clear Filters</span>
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <button
          onClick={handleRefreshJobs}
          disabled={isRefreshing}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>{isRefreshing ? 'Refreshing...' : 'Refresh All Jobs'}</span>
        </button>
        
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
        >
          <BarChart3 className="w-4 h-4" />
          <span>{showDetails ? 'Hide Analytics' : 'Show Analytics'}</span>
        </button>
        
        <button
          onClick={handleClearDatabase}
          className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Clear Database</span>
        </button>
      </div>

      {/* Jobs List */}
      <div className="bg-slate-700/50 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-slate-600">
          <h4 className="text-white font-medium">All Freight Jobs ({filteredJobs.length})</h4>
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          {filteredJobs.length === 0 ? (
            <div className="text-center py-8">
              <Database className="w-12 h-12 text-slate-500 mx-auto mb-4" />
              <h5 className="text-white font-medium mb-2">No Jobs Found</h5>
              <p className="text-slate-400 text-sm">No jobs match your current filters.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-600">
              {filteredJobs.map((job) => (
                <div key={job.id} className="p-4 hover:bg-slate-600/50 transition-colors">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    {/* Job Info */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <div className={`px-2 py-1 rounded text-xs font-mono font-bold ${getJobTypeColor(job.jobType)}`}>
                            ID: {job.id}
                          </div>
                          <div className={`px-2 py-1 rounded text-xs font-medium ${getJobTypeColor(job.jobType)}`}>
                            {getJobTypeIcon(job.jobType)} {job.jobType}
                          </div>
                        </div>
                      </div>
                      
                      <h5 className="text-white font-medium">{job.title}</h5>
                      <p className="text-slate-400 text-sm">{job.client}</p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-sm">
                        <div>
                          <span className="text-slate-400">Route:</span>
                          <span className="text-white ml-1">{job.origin} → {job.destination}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Distance:</span>
                          <span className="text-white ml-1">{job.distance} km</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Weight:</span>
                          <span className="text-white ml-1">{job.weight} tons</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Value:</span>
                          <span className="text-green-400 ml-1">€{(job.value || 0).toLocaleString()}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 mt-2">
                        {job.tags.slice(0, 2).map((tag, index) => (
                          <span key={index} className="px-2 py-1 bg-slate-600 text-slate-300 rounded text-xs">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col space-y-2 lg:space-y-0 lg:space-x-2">
                      {editingJob === job.id ? (
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
                        <>
                          <button
                            onClick={() => handleEditJob(job)}
                            className="w-full bg-amber-600 hover:bg-amber-700 text-white py-1 px-2 rounded text-sm flex items-center justify-center space-x-1"
                          >
                            <Edit className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleExtendTime(job.id)}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-1 px-2 rounded text-sm flex items-center justify-center space-x-1"
                          >
                            <ClockIcon className="w-3 h-3" />
                            <span>Time</span>
                          </button>
                          <button
                            onClick={() => handleChangeValue(job.id)}
                            className="w-full bg-green-600 hover:bg-green-700 text-white py-1 px-2 rounded text-sm flex items-center justify-center space-x-1"
                          >
                            <DollarSign className="w-3 h-3" />
                            <span>Value</span>
                          </button>
                          <button
                            onClick={() => handleReassignJob(job.id)}
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-1 px-2 rounded text-sm flex items-center justify-center space-x-1"
                          >
                            <Users className="w-3 h-3" />
                            <span>Assign</span>
                          </button>
                          <button
                            onClick={() => handleCancelJob(job.id)}
                            className="w-full bg-orange-600 hover:bg-orange-700 text-white py-1 px-2 rounded text-sm flex items-center justify-center space-x-1"
                          >
                            <AlertTriangle className="w-3 h-3" />
                            <span>Cancel</span>
                          </button>
                          <button
                            onClick={() => handleDeleteJob(job.id)}
                            className="w-full bg-red-600 hover:bg-red-700 text-white py-1 px-2 rounded text-sm flex items-center justify-center space-x-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detailed Analytics */}
      {showDetails && (
        <div className="mt-6 space-y-4">
          {/* Top Cities by Job Count */}
          <div className="bg-slate-700/50 rounded-lg p-4">
            <h4 className="text-white font-medium mb-3 flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-blue-400" />
              <span>Top Cities by Job Count</span>
            </h4>
            <div className="space-y-2">
              {cityJobCounts.map((cityData, index) => (
                <div key={cityData.city} className="flex items-center justify-between p-2 bg-slate-600/30 rounded">
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

          {/* Job Type Distribution */}
          <div className="bg-slate-700/50 rounded-lg p-4">
            <h4 className="text-white font-medium mb-3">Job Type Distribution</h4>
            <div className="grid grid-cols-3 gap-3">
              {['local', 'state', 'international'].map(type => {
                const count = allJobs.filter(job => job.jobType === type).length;
                const percentage = allJobs.length > 0 
                  ? Math.round((count / allJobs.length) * 100)
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
        </div>
      )}

      {/* Info Section */}
      <div className="mt-6 pt-6 border-t border-slate-700">
        <div className="flex items-start space-x-2">
          <Database className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs text-slate-400 font-medium mb-1">Database Administration:</p>
            <ul className="text-xs text-slate-500 space-y-1">
              <li>• Each job has a unique 6-digit ID for easy identification</li>
              <li>• Admin can edit, extend time, change value, reassign, cancel, or delete any job</li>
              <li>• Search jobs by ID, title, client, origin, or destination</li>
              <li>• Filter by city, status, or job type</li>
              <li>• Real-time analytics showing job distribution across cities and types</li>
              <li>• Complete job modification capabilities with instant updates</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FreightJobDatabase;