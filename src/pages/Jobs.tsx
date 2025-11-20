/**
 * My Jobs page showing all active jobs with proper job progression logic
 * Fixed version with truck assignment in preparing phase and read-only driver display
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useGame } from '../contexts/GameContext';
import { FileText, Truck, MapPin, Clock, Calendar, User, Package, CheckCircle, X, AlertTriangle, DollarSign, ChevronDown } from 'lucide-react';

const Jobs: React.FC = () => {
  const { gameState, completeJob, cancelJob, createCompany } = useGame();

  // ONLY show active, non-completed jobs for current user - COMPLETED/CANCELLED ARE COMPLETELY REMOVED
  const company = gameState?.company;
  const currentUser = gameState?.currentUser;
  
  // Filter jobs to ONLY show active jobs (completed and cancelled are COMPLETELY excluded)
  const activeJobs = Array.isArray(company?.activeJobs) 
    ? company.activeJobs.filter(job => 
        job?.id && 
        job.id.includes(`-${currentUser}`) && 
        job.status !== 'completed' && 
        job.status !== 'cancelled'
      )
    : [];
    
  console.log(`📋 Loading ACTIVE jobs for user: ${currentUser}, found: ${activeJobs.length} jobs (completed/cancelled REMOVED)`);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'preparing': return 'text-gray-400 bg-gray-400/10';
      case 'picking-up': return 'text-purple-400 bg-purple-400/10';
      case 'loading': return 'text-yellow-400 bg-yellow-400/10';
      case 'delivering': return 'text-blue-400 bg-blue-400/10';
      case 'unloading': return 'text-orange-400 bg-orange-400/10';
      case 'completed': return 'text-green-400 bg-green-400/10';
      case 'cancelled': return 'text-red-400 bg-red-400/10';
      default: return 'text-slate-400 bg-slate-400/10';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'preparing': return <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" />;
      case 'picking-up': return <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />;
      case 'loading': return <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />;
      case 'delivering': return <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />;
      case 'unloading': return <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />;
      case 'completed': return <CheckCircle className="w-3 h-3 text-green-400" />;
      case 'cancelled': return <X className="w-3 h-3 text-red-400" />;
      default: return <div className="w-2 h-2 bg-slate-400 rounded-full" />;
    }
  };

  // Calculate time for phases based on job parameters
  const calculatePhaseTime = useCallback((job: any, phase: string, currentTime: Date): number => {
    const now = currentTime.getTime();
    
    switch (phase) {
      case 'picking-up': {
        // Check if truck is at same city as freight
        if (job.currentLocation === job.origin) {
          return 15 * 60 * 1000; // 15 minutes in ms
        } else {
          // Calculate driving time at 80km/h
          // For simulation, we'll use distance data if available
          const estimatedDistance = job.distance || 100; // fallback distance
          const drivingHours = estimatedDistance / 80;
          return drivingHours * 60 * 60 * 1000; // convert to ms
        }
      }
      
      case 'loading': {
        // 15-60 minutes based on cargo weight
        const baseTime = 15 * 60 * 1000; // 15 minutes minimum
        const extraTime = Math.min(45 * 60 * 1000, (job.weight - 2) * 2.5 * 60 * 1000); // up to 45 extra minutes
        return baseTime + extraTime;
      }
      
      case 'unloading': {
        // Same time as loading
        return calculatePhaseTime(job, 'loading', currentTime);
      }
      
      default:
        return 0;
    }
  }, []);

  // Update job status based on elapsed time - ALL jobs start in preparing phase
  const updateJobStatus = useCallback((job: any): any => {
    const now = new Date();
    const nowMs = now.getTime();
    
    // Ensure job exists and has required properties
    if (!job) return job;
    
    let updatedJob = { 
      ...job,
      value: job.value || 0,
      distance: job.distance || 0,
      penaltyAmount: job.penaltyAmount || 0,
      cancelPenalty: job.cancelPenalty || 0
    };

    // MANDATORY: ALL jobs without both truck AND driver assigned MUST stay in preparing phase
    if (!job.assignedTruck || !job.assignedDriver || job.assignedTruck === '' || job.assignedDriver === '') {
      updatedJob.status = 'preparing';
      updatedJob.progress = 0;
      return updatedJob;
    }

    // Phase progression logic with assignment checks
    if (job.status === 'preparing') {
      // CRITICAL: Check if truck and driver are assigned before progressing
      if (job.assignedTruck && job.assignedDriver && job.assignedTruck !== '' && job.assignedDriver !== '') {
        updatedJob.status = 'picking-up';
        updatedJob.pickingUpStarted = now;
      }
      // If no truck/driver assigned, stay in preparing phase
    } else if (job.status === 'picking-up' && job.pickingUpStarted) {
      const pickingUpStartedTime = typeof job.pickingUpStarted === 'string' ? new Date(job.pickingUpStarted) : job.pickingUpStarted;
      const timeElapsed = nowMs - pickingUpStartedTime.getTime();
      const pickingUpTime = calculatePhaseTime(job, 'picking-up', pickingUpStartedTime);
      
      if (timeElapsed >= pickingUpTime) {
        updatedJob.status = 'loading';
        updatedJob.loadingStarted = now;
        updatedJob.currentLocation = job.origin;
        updatedJob.progress = 25;
      } else {
        // Update progress
        updatedJob.progress = Math.floor((timeElapsed / pickingUpTime) * 25);
      }
    } else if (job.status === 'loading' && job.loadingStarted) {
      const loadingStartedTime = typeof job.loadingStarted === 'string' ? new Date(job.loadingStarted) : job.loadingStarted;
      const timeElapsed = nowMs - loadingStartedTime.getTime();
      const loadingTime = calculatePhaseTime(job, 'loading', loadingStartedTime);
      
      if (timeElapsed >= loadingTime) {
        updatedJob.status = 'delivering';
        updatedJob.deliveringStarted = now;
        updatedJob.progress = 50;
        // Simulate truck movement to destination
        updatedJob.currentLocation = 'En route to ' + job.destination;
      } else {
        // Update progress
        const loadingProgress = (timeElapsed / loadingTime) * 25;
        updatedJob.progress = 25 + Math.floor(loadingProgress);
      }
    } else if (job.status === 'delivering' && job.deliveringStarted) {
      const deliveringStartedTime = typeof job.deliveringStarted === 'string' ? new Date(job.deliveringStarted) : job.deliveringStarted;
      const timeElapsed = nowMs - deliveringStartedTime.getTime();
      // Estimate delivery time based on distance
      const estimatedDeliveryTime = (job.distance || 100) / 80 * 60 * 60 * 1000; // at 80km/h
      
      if (timeElapsed >= estimatedDeliveryTime) {
        updatedJob.status = 'unloading';
        updatedJob.unloadingStarted = now;
        updatedJob.currentLocation = job.destination;
        updatedJob.progress = 75;
      } else {
        // Update progress
        const deliveryProgress = (timeElapsed / estimatedDeliveryTime) * 25;
        updatedJob.progress = 50 + Math.floor(deliveryProgress);
      }
    } else if (job.status === 'unloading' && job.unloadingStarted) {
      const unloadingStartedTime = typeof job.unloadingStarted === 'string' ? new Date(job.unloadingStarted) : job.unloadingStarted;
      const timeElapsed = nowMs - unloadingStartedTime.getTime();
      const unloadingTime = calculatePhaseTime(job, 'unloading', unloadingStartedTime);
      
      if (timeElapsed >= unloadingTime) {
        updatedJob.status = 'completed';
        updatedJob.completedTime = now;
        updatedJob.progress = 100;
        
        // Check for late delivery penalties
        const deadlineDate = new Date(job.deadline);
        if (now > deadlineDate) {
          const hoursLate = (nowMs - deadlineDate.getTime()) / (1000 * 60 * 60);
          const penaltyPercent = Math.min(0.5, hoursLate * 0.05); // 5% penalty per hour, max 50%
          updatedJob.penaltyApplied = true;
          updatedJob.penaltyAmount = Math.floor(job.value * penaltyPercent);
        }
      } else {
        // Update progress
        const unloadingProgress = (timeElapsed / unloadingTime) * 25;
        updatedJob.progress = 75 + Math.floor(unloadingProgress);
      }
    }

    return updatedJob;
  }, [calculatePhaseTime]);

  // Assign truck to job with driver and trailer from truck
  const assignTruckToJob = (jobId: string, truckId: string) => {
    if (!gameState.company) return;

    const currentJob = gameState.company.activeJobs.find(job => job.id === jobId);
    if (!currentJob) return;

    // Check if job is still in preparing phase (can't change after preparing)
    if (currentJob.status !== 'preparing') {
      alert('Cannot change truck after preparation phase has started!');
      return;
    }

    // Check if truck is already assigned to another job
    if (truckId && truckId !== '') {
      const otherJobsWithTruck = gameState.company.activeJobs.filter(job => 
        job.id !== jobId && 
        job.assignedTruck === truckId && 
        job.status !== 'completed' && 
        job.status !== 'cancelled'
      );
      
      if (otherJobsWithTruck.length > 0) {
        alert('Truck is already assigned to another active job!');
        return;
      }
    }

    // Get the truck object to fetch its assigned driver and trailer
    const assignedTruck = gameState.company.trucks?.find(truck => truck.id === truckId);
    let assignedDriver = '';
    let assignedTrailer = '';

    // If assigning a truck (not unassigning), get its existing driver and trailer
    if (assignedTruck && truckId !== '') {
      assignedDriver = assignedTruck.assignedDriver || '';
      assignedTrailer = assignedTruck.assignedTrailer || '';
    }

    const updatedCompany = {
      ...gameState.company,
      activeJobs: gameState.company.activeJobs.map(job => 
        job.id === jobId ? { 
          ...job, 
          assignedTruck: truckId,
          assignedDriver: assignedDriver,
          assignedTrailer: assignedTrailer
        } : job
      )
    };

    createCompany(updatedCompany);
    if (truckId === '') {
      console.log('Truck (and associated driver/trailer) unassigned successfully!');
    } else {
      console.log(`Truck assigned successfully! Driver: ${assignedDriver || 'None'}, Trailer: ${assignedTrailer || 'None'}`);
    }
  };

  // IMMEDIATE cleanup of completed/cancelled jobs - REMOVE them completely
  useEffect(() => {
    if (!gameState.company) return;

    const cleanupCompletedAndCancelledJobs = () => {
      const allJobs = company?.activeJobs || [];
      // ONLY keep jobs that are NOT completed and NOT cancelled
      const activeOnlyJobs = allJobs.filter(job => 
        job.status !== 'completed' && 
        job.status !== 'cancelled'
      );
      
      // If we removed any completed/cancelled jobs, update company data
      if (activeOnlyJobs.length !== allJobs.length) {
        const updatedCompany = {
          ...gameState.company,
          activeJobs: activeOnlyJobs
        };
        createCompany(updatedCompany);
        console.log(`🧹 CLEANUP: Removed ${allJobs.length - activeOnlyJobs.length} completed/cancelled jobs from display`);
      }
    };

    // Run cleanup immediately and every 3 seconds
    cleanupCompletedAndCancelledJobs();
    const cleanupInterval = setInterval(cleanupCompletedAndCancelledJobs, 3000);

    return () => clearInterval(cleanupInterval);
  }, [gameState.company, createCompany]);

  // Job status engine - runs every second for active jobs only
  useEffect(() => {
    if (!gameState.company || activeJobs.length === 0) return;

    const interval = setInterval(() => {
      const updatedJobs = activeJobs.map(job => updateJobStatus(job));
      
      // Update company with new jobs if changed
      if (JSON.stringify(updatedJobs) !== JSON.stringify(activeJobs)) {
        const updatedCompany = {
          ...gameState.company,
          activeJobs: updatedJobs
        };
        createCompany(updatedCompany);
      }
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, [gameState.company, activeJobs, updateJobStatus, createCompany]);

  const handleCompleteJob = (jobId: string) => {
    const job = activeJobs.find(j => j.id === jobId);
    if (!job) return;
    
    if (job.status !== 'completed') {
      alert('You can only mark jobs as completed when they are in "Completed" status.');
      return;
    }
    
    let finalValue = job.value;
    let message = '';
    
    if (job.penaltyApplied && job.penaltyAmount) {
      finalValue = (job.value || 0) - (job.penaltyAmount || 0);
      message = `Job completed with ${Math.floor((job.penaltyAmount / job.value) * 100)}% penalty for late delivery. You earned €${finalValue.toLocaleString()}.`;
    } else {
      message = `Job completed on time! You earned €${finalValue.toLocaleString()}.`;
    }
    
    // Update company capital
    const updatedCompany = {
      ...gameState.company!,
      capital: gameState.company!.capital + finalValue
    };
    createCompany(updatedCompany);
    
    alert(message);
    completeJob(jobId);
  };

  const handleCancelJob = (jobId: string) => {
    const job = activeJobs.find(j => j.id === jobId);
    if (!job) return;
    
    const now = new Date();
    const jobAcceptanceTime = typeof job.startTime === 'string' ? new Date(job.startTime) : (job.startTime || now);
    const hoursSinceAcceptance = (now.getTime() - jobAcceptanceTime.getTime()) / (1000 * 60 * 60);
    
    let penaltyAmount = 0;
    let message = '';
    
    if (hoursSinceAcceptance <= 1) {
      // No penalty for first hour
      message = 'Job cancelled without penalty.';
    } else {
      // Penalty increases after first hour, max 30%
      const penaltyPercent = Math.min(0.3, (hoursSinceAcceptance - 1) * 0.05);
      penaltyAmount = Math.floor((job.value || 0) * penaltyPercent);
      message = `Job cancelled with ${Math.floor(penaltyPercent * 100)}% penalty. €${penaltyAmount.toLocaleString()} will be deducted.`;
    }
    
    // Update job with cancel info
    const updatedJob = {
      ...job,
      status: 'cancelled' as const,
      cancelTime: now,
      cancelPenalty: penaltyAmount
    };
    
    // Update company with cancelled job and penalty
    const updatedCompany = {
      ...gameState.company!,
      capital: gameState.company!.capital - penaltyAmount,
      activeJobs: gameState.company!.activeJobs.map(j => 
        j.id === jobId ? updatedJob : j
      )
    };
    
    createCompany(updatedCompany);
    
    alert(message);
    
    // Add job back to market after cancellation
    // This would typically call a function to add to job market
    // For now, we'll just update local state
    setTimeout(() => {
      cancelJob(jobId);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">My Jobs</h1>
          <p className="text-slate-400">Monitor and manage your active transportation contracts</p>
        </div>
        <div className="text-slate-300">
          {activeJobs.length} active job(s) {currentUser && `(User: ${currentUser})`}
        </div>
      </div>

      {activeJobs.length === 0 ? (
        <div className="bg-slate-800 rounded-xl p-12 border border-slate-700 text-center">
          <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No Active Jobs</h3>
          <p className="text-slate-400 mb-6">You don't have any active transportation jobs at moment.</p>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors">
            Find Contracts in Market
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {activeJobs.map((job) => {
              const truck = Array.isArray(company?.trucks) ? company.trucks.find(t => t?.id === job.assignedTruck) : null;
              const driver = Array.isArray(company?.staff) ? company.staff.find(s => s?.id === job.assignedDriver) : null;
              
              return (
                <div key={job.id} className="bg-slate-800 rounded-xl p-6 border border-slate-700 hover:border-slate-600 transition-colors">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                        <FileText className="w-6 h-6 text-blue-400" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white">
                          {(() => {
                            const companies = ['Global Logistics', 'EuroTrans', 'FastFreight', 'CargoMaster', 'TransWorld', 'ShipIt', 'QuickMove', 'RoadRunner', 'HeavyLoad', 'ExpressWay'];
                            return companies[Math.floor(Math.random() * companies.length)];
                          })()}
                        </h3>
                        <p className="text-sm text-slate-400">{job.title || 'Transport Contract'}</p>
                      </div>
                    </div>
                    <div className={`flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium capitalize ${getStatusColor(job.status)}`}>
                      {getStatusIcon(job.status)}
                      <span>{job.status?.replace('-', ' ') || 'unknown'}</span>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-slate-400 mb-2">
                      <span>Progress</span>
                      <span>{job.progress || 0}% Complete</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-3">
                      <div 
                        className="bg-blue-500 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${job.progress || 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Current Location</span>
                      <div className="flex items-center space-x-1">
                        <MapPin className="w-4 h-4 text-blue-400" />
                        <span className="text-white font-medium">{job.currentLocation || 'Unknown'}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Job Registration #</span>
                      <div className="flex items-center space-x-1">
                        <span className="text-white font-medium">
                          {(() => {
                            // Extract or generate 6-digit job number
                            const jobIdParts = job.id?.split('-');
                            const timestamp = jobIdParts?.[1] || Date.now().toString();
                            const sixDigitNumber = timestamp.slice(-6);
                            return sixDigitNumber.padStart(6, '0');
                          })()}
                        </span>
                      </div>
                    </div>

                    {/* Truck Assignment with Dropdown */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Assigned Truck</span>
                      <div className="relative">
                        <button
                          onClick={() => {
                            const dropdown = document.getElementById(`truck-dropdown-${job.id}`);
                            if (dropdown) {
                              dropdown.classList.toggle('hidden');
                            }
                          }}
                          className="flex items-center space-x-1 text-white font-medium bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded transition-colors"
                        >
                          <Truck className="w-4 h-4 text-orange-400" />
                          <span>
                            {truck ? `${truck.brand} ${truck.model}` : 'Unassigned'}
                          </span>
                          <ChevronDown className="w-3 h-3" />
                        </button>
                        <div
                          id={`truck-dropdown-${job.id}`}
                          className="hidden absolute bottom-full mb-2 left-0 right-0 bg-slate-700 border border-slate-600 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto min-w-[200px]"
                        >
                          {job.assignedTruck && job.assignedTruck !== '' ? (
                            <button
                              onClick={() => {
                                assignTruckToJob(job.id, '');
                                const dropdown = document.getElementById(`truck-dropdown-${job.id}`);
                                if (dropdown) {
                                  dropdown.classList.add('hidden');
                                }
                              }}
                              className="w-full text-left p-3 hover:bg-slate-600 transition-colors border-b border-slate-600"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="text-sm font-medium text-red-400">
                                    🔴 Unassign Truck
                                  </div>
                                  <div className="text-xs text-slate-400">
                                    Remove truck from this job
                                  </div>
                                </div>
                              </div>
                            </button>
                          ) : null}
                          {gameState.company.trucks?.length === 0 ? (
                            <div className="p-3 text-sm text-slate-400 text-center">
                              No trucks available
                            </div>
                          ) : (
                            gameState.company.trucks?.map((truck) => {
                              // Check if this truck is assigned to another active job
                              const isAssignedToOtherJob = gameState.company.activeJobs.some(otherJob => 
                                otherJob.id !== job.id && 
                                otherJob.assignedTruck === truck.id && 
                                otherJob.status !== 'completed' && 
                                otherJob.status !== 'cancelled'
                              );

                              return (
                                <button
                                  key={truck.id}
                                  onClick={() => {
                                    if (!isAssignedToOtherJob) {
                                      assignTruckToJob(job.id, truck.id);
                                      const dropdown = document.getElementById(`truck-dropdown-${job.id}`);
                                      if (dropdown) {
                                        dropdown.classList.add('hidden');
                                      }
                                    }
                                  }}
                                  disabled={isAssignedToOtherJob}
                                  className={`w-full text-left p-3 transition-colors border-b border-slate-600 last:border-b-0 ${
                                    job.assignedTruck === truck.id ? 'bg-slate-600' : 
                                    isAssignedToOtherJob ? 'bg-slate-800 opacity-50 cursor-not-allowed' :
                                    'hover:bg-slate-600'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <div className={`text-sm font-medium ${
                                        isAssignedToOtherJob ? 'text-slate-500' : 'text-white'
                                      }`}>
                                        {truck.brand} {truck.model}
                                        {job.assignedTruck === truck.id && ' ✓'}
                                      </div>
                                      <div className="text-xs text-slate-400">
                                        {truck.capacity} tons • {truck.condition}% condition • Location: {truck.location}
                                      </div>
                                    </div>
                                    <div className={`text-xs ${
                                      job.assignedTruck === truck.id 
                                        ? 'text-blue-400' : 
                                        isAssignedToOtherJob
                                        ? 'text-red-400'
                                        : 'text-green-400'
                                    }`}>
                                      {job.assignedTruck === truck.id ? 'Assigned' : 
                                       isAssignedToOtherJob ? 'Assigned to Another Job' : 'Available'}
                                    </div>
                                  </div>
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Driver Display (Read-Only) */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Driver</span>
                      <div className="flex items-center space-x-1">
                        <User className="w-4 h-4 text-green-400" />
                        <span className="text-white font-medium">
                          {driver ? driver.name : 'Unassigned'}
                        </span>
                      </div>
                    </div>

                    {/* Job Driver Details (READ-ONLY) */}
                    {driver && (
                      <div className="mt-3 p-3 bg-slate-700/50 rounded-lg border border-slate-600">
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-slate-400">Driver Details</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-slate-500">Experience:</span>
                            <span className="text-white ml-2">{driver.experience}%</span>
                          </div>
                          <div>
                            <span className="text-slate-500">License:</span>
                            <span className="text-white ml-2">
                              {driver.licenses && driver.licenses.length > 0 ? driver.licenses.join(', ') : 'Standard License'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">Salary:</span>
                            <span className="text-white ml-2">€{(driver.salary || 0).toLocaleString()}/month</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Hired:</span>
                            <span className="text-white ml-2">
                              {new Date(driver.hiredDate || Date.now()).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">
                        {job.penaltyApplied || job.cancelPenalty ? 'Final Value' : 'Value'}
                      </span>
                      <div className="flex items-center space-x-1">
                        {job.penaltyApplied || job.cancelPenalty ? (
                          <>
                            <span className="text-slate-400 line-through text-sm">€{(job.value || 0).toLocaleString()}</span>
                            <span className="text-red-400 font-bold">€{(job.value - (job.penaltyAmount || 0) - (job.cancelPenalty || 0)).toLocaleString()}</span>
                          </>
                        ) : (
                          <span className="text-green-400 font-bold">€{(job.value || 0).toLocaleString()}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Route</span>
                      <span className="text-white font-medium">
                        {job.origin || 'Unknown'} → {job.destination || 'Unknown'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Distance</span>
                      <span className="text-white font-medium">
                        {(job.distance || 0)} km
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Deadline</span>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4 text-yellow-400" />
                        <span className="text-white font-medium">
                          {job.deadline || 'No deadline'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Assignment Requirements Warning */}
                  {(!job.assignedTruck || !job.assignedDriver || (job.assignedTruck === '') || (job.assignedDriver === '')) ? (
                    <div className="mb-4 p-3 bg-amber-900/20 border border-amber-500/30 rounded">
                      <div className="flex items-center space-x-2 text-amber-400 text-sm">
                        <AlertTriangle className="w-4 h-4" />
                        <span>
                          {(!job.assignedTruck || job.assignedTruck === '') && (!job.assignedDriver || job.assignedDriver === '') 
                            ? 'Truck and Driver must be assigned to start job progression'
                            : (!job.assignedTruck || job.assignedTruck === '')
                            ? 'Truck must be assigned to start job progression'
                            : 'Driver must be assigned to start job progression'
                          }
                        </span>
                      </div>
                    </div>
                  ) : null}

                  {/* Actions */}
                  <div className="flex space-x-2">
                    {job.status === 'completed' || job.status === 'cancelled' ? (
                      <button 
                        className="flex-1 bg-slate-700 text-slate-400 py-2 px-3 rounded-lg text-sm font-medium cursor-not-allowed"
                        disabled
                      >
                        {job.status === 'completed' ? 'Completed' : 'Cancelled'}
                      </button>
                    ) : (
                      <>
                        <button 
                          onClick={() => handleCompleteJob(job.id)}
                          className={`flex-1 ${
                            job.status === 'completed' 
                              ? 'bg-green-600 hover:bg-green-700' 
                              : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                          } text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors`}
                          disabled={job.status !== 'completed'}
                        >
                          Mark Complete
                        </button>
                        <button 
                          onClick={() => handleCancelJob(job.id)}
                          className={`flex-1 ${
                            job.status === 'cancelled'
                              ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                              : 'bg-red-600 hover:bg-red-700'
                          } text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors`}
                          disabled={job.status === 'cancelled'}
                        >
                          Cancel Job
                        </button>
                      </>
                    )}
                  </div>
                  
                  {/* Penalty Information */}
                  {(job.penaltyApplied || job.cancelPenalty) && (
                    <div className="mt-2 p-2 bg-red-900/20 border border-red-500/30 rounded">
                      <div className="flex items-center space-x-2 text-red-400 text-sm">
                        <AlertTriangle className="w-4 h-4" />
                        <span>
                          {job.penaltyApplied 
                            ? `Late delivery penalty: -€${(job.penaltyAmount || 0).toLocaleString()}`
                            : `Cancellation penalty: -€${(job.cancelPenalty || 0).toLocaleString()}`
                          }
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Job Statistics */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h2 className="text-lg font-bold text-white mb-4">Job Statistics</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-1">{activeJobs.length}</div>
                <div className="text-sm text-slate-400">Total Jobs</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400 mb-1">
                  {activeJobs.filter(j => j.status === 'delivering').length}
                </div>
                <div className="text-sm text-slate-400">In Transit</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400 mb-1">
                  {activeJobs.filter(j => j.status === 'loading' || j.status === 'unloading').length}
                </div>
                <div className="text-sm text-slate-400">Loading/Unloading</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400 mb-1">
                  {activeJobs.filter(j => j.status === 'completed').length}
                </div>
                <div className="text-sm text-slate-400">Completed</div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Jobs;