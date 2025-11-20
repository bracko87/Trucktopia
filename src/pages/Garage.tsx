/**
 * Garage.tsx
 *
 * Truck fleet management page with trailer attachment and driving engine integration.
 *
 * Responsibilities:
 * - Render truck fleet and fleet summary
 * - Provide UI actions (assign driver, attach trailer, drive to hub, schedule service, sell truck)
 * - Safely update company state via createCompany(...) and clean up engine state when items are removed
 *
 * Notes:
 * - This file follows defensive programming to avoid runtime errors caused by undefined nested properties.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useGame } from '../contexts/GameContext';
import { useJobMarket } from '../contexts/JobMarketContext';
import { Truck, Wrench, MapPin, DollarSign, User, ChevronDown, Zap } from 'lucide-react';
import { truckDrivingEngine } from '../utils/truckDrivingEngine';

interface TrailerAttachmentModal {
  isOpen: boolean;
  truckId: string;
  truck: any;
  trailerId: string;
  trailer: any;
  distance: number;
  estimatedTime: number;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Garage
 * @description Main Garage page component that shows trucks and fleet summary.
 */
const Garage: React.FC = () => {
  const navigate = useNavigate();
  const { gameState, createCompany } = useGame();
  const { jobMarket } = useJobMarket();
  const [expandedTruck, setExpandedTruck] = useState<string | null>(null);
  const [attachmentModal, setAttachmentModal] = useState<TrailerAttachmentModal | null>(null);
  const [movingTrucks, setMovingTrucks] = useState<Set<string>>(new Set());

  if (!gameState.company) return null;

  /**
   * safeString
   * @description Return a safe string representation for potentially undefined/null values
   */
  const safeString = (value: any): string => {
    if (value === null || value === undefined) return '';
    return String(value);
  };

  /**
   * safeNumber
   * @description Convert to number or return default
   */
  const safeNumber = (value: any, defaultValue: number = 0): number => {
    if (value === null || value === undefined || isNaN(value)) return defaultValue;
    return Number(value);
  };

  /**
   * getRegistrationNumber
   * @description Compose a registration number using company hub country
   */
  const getRegistrationNumber = (truck: any) => {
    if (!truck) return '';
    if (truck.registration) return truck.registration;
    const company = gameState.company;
    const hubCode = company?.hub?.country?.toUpperCase().slice(0, 2) || 'DE';
    const truckId = String(truck.id || '').slice(-6);
    return `${hubCode}-${truckId}`;
  };

  /**
   * getCurrentJob
   * @description Return active job for truck if present
   */
  const getCurrentJob = (truckId: string) => {
    try {
      if (!gameState.company?.activeJobs) return null;
      return gameState.company.activeJobs.find((job: any) =>
        job.assignedTruck === truckId &&
        job.status !== 'completed' &&
        job.status !== 'cancelled'
      ) || null;
    } catch (error) {
      console.error('Error getting current job:', error);
      return null;
    }
  };

  /**
   * getTruckDrivingState
   * @description Ask engine for truck state and guard any thrown errors
   */
  const getTruckDrivingState = (truckId: string) => {
    try {
      return truckDrivingEngine.getTruckState(truckId);
    } catch (error) {
      console.error('Error getting truck driving state:', error);
      return null;
    }
  };

  /**
   * initializeTruckInEngine
   * @description Ensure truck has an engine state before starting movement
   */
  const initializeTruckInEngine = (truckId: string) => {
    try {
      const currentState = truckDrivingEngine.getTruckState(truckId);
      if (!currentState) {
        const truck = gameState.company.trucks.find((t: any) => t.id === truckId);
        if (truck) {
          truckDrivingEngine.initializeTruck(truckId, {
            capacity: truck.capacity || 15,
            brand: truck.brand || ''
          });
        }
      }
    } catch (error) {
      console.error('Error initializing truck in engine:', error);
    }
  };

  /**
   * sellTrailer
   * @description Remove trailer from company. Also unassign from any truck.
   * @param trailerId string
   */
  const sellTrailer = (trailerId: string) => {
    if (!gameState.company) return;
    const trailer = gameState.company.trailers?.find((t: any) => t.id === trailerId);
    if (!trailer) {
      alert('Trailer not found.');
      return;
    }

    const confirmSell = window.confirm(`Are you sure you want to SELL trailer "${trailer.type || trailer.id}"? This action cannot be undone.`);
    if (!confirmSell) return;

    // Remove trailer and unassign from trucks
    const updatedCompany = {
      ...gameState.company,
      trailers: (gameState.company.trailers || []).filter((t: any) => t.id !== trailerId),
      trucks: (gameState.company.trucks || []).map((t: any) =>
        t.assignedTrailer === trailerId ? { ...t, assignedTrailer: '' } : t
      )
    };

    createCompany(updatedCompany);
    alert('✅ Trailer sold and removed from fleet.');
  };

  /**
   * sellTruck
   * @description Remove truck from company. If it has an assigned trailer offer option to sell trailer as well.
   * @param truckId string
   */
  const sellTruck = (truckId: string) => {
    if (!gameState.company) return;

    const truck = gameState.company.trucks.find((t: any) => t.id === truckId);
    if (!truck) {
      alert('Truck not found.');
      return;
    }

    const truckLabel = `${truck.brand || 'Truck'} ${truck.model || ''}`.trim();
    const confirmSell = window.confirm(`Are you sure you want to SELL "${truckLabel}"? This will remove it from your fleet.`);
    if (!confirmSell) return;

    // If the truck has an attached trailer, ask whether to sell that too
    const assignedTrailerId = truck.assignedTrailer || '';
    let sellAttachedTrailer = false;
    if (assignedTrailerId) {
      sellAttachedTrailer = window.confirm('This truck has an attached trailer. Do you also want to sell the attached trailer? (OK = sell trailer too)');
    }

    // Stop driving engine state and remove from moving set
    try {
      truckDrivingEngine.stopDriving(truckId);
    } catch (err) {
      // ignore if engine doesn't know about this truck
    }
    setMovingTrucks(prev => {
      const newSet = new Set(prev);
      newSet.delete(truckId);
      return newSet;
    });

    // Build updated company
    const updatedTrucks = (gameState.company.trucks || []).filter((t: any) => t.id !== truckId);
    let updatedTrailers = gameState.company.trailers || [];

    if (sellAttachedTrailer && assignedTrailerId) {
      updatedTrailers = updatedTrailers.filter((tr: any) => tr.id !== assignedTrailerId);
      // Also unassign from any other trucks just in case
      const updatedTrucksAfterTrailerRemoval = updatedTrucks.map((t: any) =>
        t.assignedTrailer === assignedTrailerId ? { ...t, assignedTrailer: '' } : t
      );

      const updatedCompany = {
        ...gameState.company,
        trucks: updatedTrucksAfterTrailerRemoval,
        trailers: updatedTrailers
      };
      createCompany(updatedCompany);
      alert('✅ Truck and attached trailer sold.');
      return;
    }

    // If not selling the trailer, simply unassign it from removed truck if needed
    const updatedTrucksFinal = updatedTrucks.map((t: any) => t); // no further changes
    const updatedCompany = {
      ...gameState.company,
      trucks: updatedTrucksFinal,
      trailers: updatedTrailers
    };

    createCompany(updatedCompany);
    alert('✅ Truck sold and removed from fleet.');
  };

  // Wrapper used by UI button to keep naming consistent with earlier code
  const handleSellTruck = (truckId: string) => {
    sellTruck(truckId);
  };

  /**
   * assignDriverToTruck
   * @description Assign a driver id to a truck with defensive checks
   */
  const assignDriverToTruck = (truckId: string, driverId: string) => {
    if (!gameState.company) return;

    const truck = gameState.company.trucks.find((t: any) => t.id === truckId);
    if (!truck) return;

    const currentJob = getCurrentJob(truckId);

    if (currentJob && currentJob.status !== 'loading') {
      alert('Cannot change driver while truck is on active job. Complete or cancel job first.');
      return;
    }

    if (driverId && driverId !== '') {
      const otherJobsWithDriver = (gameState.company.activeJobs || []).filter((job: any) =>
        job.id !== currentJob?.id &&
        job.assignedDriver === driverId &&
        job.status !== 'completed' &&
        job.status !== 'cancelled'
      );

      if (otherJobsWithDriver.length > 0) {
        alert('Driver is already assigned to another active job!');
        return;
      }
    }

    if (driverId && driverId !== '') {
      const driver = gameState.company.staff.find((s: any) => s.id === driverId);
      if (driver && driver.availabilityDate && new Date(driver.availabilityDate) > new Date()) {
        const daysLeft = Math.ceil((new Date(driver.availabilityDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        alert(`${driver.name} is still in their notice period (${daysLeft} days remaining). They will be available on ${new Date(driver.availabilityDate).toLocaleDateString()}`);
        return;
      }
    }

    const updatedCompany = {
      ...gameState.company,
      trucks: (gameState.company.trucks || []).map((t: any) =>
        t.id === truckId ? { ...t, assignedDriver: driverId || '' } : t
      )
    };

    createCompany(updatedCompany);

    if (driverId === '') {
      alert('Driver unassigned successfully!');
    } else {
      const driver = gameState.company.staff.find((s: any) => s.id === driverId);
      alert(`Driver ${driver?.name || 'assigned'} assigned successfully!`);
    }
  };

  // Other UI helpers (kept minimal and defensive)
  const getAvailableDrivers = () => {
    if (!gameState.company?.staff) return [];
    const drivers = gameState.company.staff.filter((s: any) => s.role === 'driver');
    return drivers.filter((driver: any) => {
      const isOnJob = (gameState.company.activeJobs || []).some((job: any) =>
        job.assignedDriver === driver.id && job.status !== 'completed' && job.status !== 'cancelled'
      );
      const isInNoticePeriod = driver.availabilityDate && new Date(driver.availabilityDate) > new Date();
      return !isOnJob && !isInNoticePeriod;
    });
  };

  const filteredTrucks = gameState.company.trucks || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Truck Fleet</h1>
          <p className="text-slate-400">Manage your truck fleet and maintenance</p>
        </div>
        <button
          onClick={() => navigate('/vehicle-market')}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          Purchase New Truck
        </button>
      </div>

      {/* Truck Cards */}
      <div className="space-y-2">
        {filteredTrucks.map((truck: any) => {
          const currentJob = getCurrentJob(truck.id);
          const truckStatus = movingTrucks.has(truck.id) ? 'moving-to-trailer' :
            currentJob ? 'on-job' : truck.status;
          const drivingState = getTruckDrivingState(truck.id);

          return (
            <div key={truck.id} className="bg-slate-800 rounded-lg border border-slate-700 hover:border-slate-600 transition-all duration-200">
              {/* Main Truck Info */}
              <div className="p-3 flex items-center justify-between">
                {/* Left: Truck Info */}
                <div className="flex items-center space-x-4 flex-1">
                  <div className="flex items-center space-x-2">
                    <Truck className="w-5 h-5 text-orange-400" />
                    <span className="font-bold text-white">{truck.brand} {truck.model}</span>
                    <span className="text-sm text-slate-400">({truck.year})</span>
                  </div>

                  <div className="flex items-center space-x-6 text-sm">
                    <div className="flex items-center space-x-1">
                      <MapPin className="w-4 h-4 text-blue-400" />
                      <span className="text-slate-300">
                        {movingTrucks.has(truck.id) && drivingState?.route ?
                          `Moving to ${drivingState.route.to}` :
                          currentJob ? currentJob.currentLocation :
                            truck.location || 'Stuttgart, DE'
                        }
                      </span>
                    </div>

                    <div className="flex items-center space-x-1">
                      <div className="w-3 h-3 bg-slate-600 rounded-full"></div>
                      <span className="text-slate-300">Reg: {getRegistrationNumber(truck)}</span>
                    </div>

                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${truckStatus === 'available' ? 'text-green-400 bg-green-400/10' : truckStatus === 'on-job' ? 'text-blue-400 bg-blue-400/10' : 'text-slate-400 bg-slate-400/10'}`}>
                      <div className="flex items-center space-x-1">
                        <div className={`w-2 h-2 rounded-full ${truckStatus === 'available' ? 'bg-green-400 animate-pulse' : truckStatus === 'on-job' ? 'bg-blue-400 animate-pulse' : 'bg-slate-400'}`} />
                        <span className="capitalize">
                          {truckStatus === 'moving-to-trailer' ? 'Moving to Trailer' : truckStatus}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center space-x-2">
                  {movingTrucks.has(truck.id) && (
                    <div className="flex items-center space-x-1 text-purple-400">
                      <Zap className="w-4 h-4 animate-pulse" />
                      <span className="text-sm">Moving...</span>
                    </div>
                  )}
                  <button
                    onClick={() => setExpandedTruck(expandedTruck === truck.id ? null : truck.id)}
                    className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors"
                  >
                    {expandedTruck === truck.id ? 'Hide' : 'Details'}
                  </button>
                </div>
              </div>

              {/* Expandable Details */}
              {expandedTruck === truck.id && (
                <div className="border-t border-slate-700 p-4 bg-slate-900/50">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Column 1: Technical Specs */}
                    <div>
                      <h4 className="font-semibold text-white mb-3 flex items-center space-x-2">
                        <Wrench className="w-4 h-4 text-orange-400" />
                        <span>Technical Details</span>
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Capacity:</span>
                          <span className="text-white font-medium">
                            {(() => {
                              const hasAttachedTrailer = truck.assignedTrailer && truck.assignedTrailer !== '';
                              const hasBuiltInCargo = truck.hasCargoCompartment || false;

                              if (hasAttachedTrailer) {
                                const trailer = (gameState.company.trailers || []).find((t: any) => t.id === truck.assignedTrailer);
                                return trailer ? `${trailer.capacity} tons` : '0 tons';
                              } else if (hasBuiltInCargo) {
                                return `${truck.capacity} tons`;
                              } else {
                                return '0 tons';
                              }
                            })()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Condition:</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-20 bg-slate-700 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  truck.condition >= 70 ?
                                    'bg-green-500' :
                                    truck.condition >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${safeNumber(truck.condition, 0)}%` }}
                              ></div>
                            </div>
                            <span className="text-white font-medium">{safeNumber(truck.condition, 0)}%</span>
                          </div>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Fuel Level:</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-20 bg-slate-700 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  safeNumber(truck.fuel, 0) >= 60 ? 'bg-green-500' :
                                    safeNumber(truck.fuel, 0) >= 30 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${safeNumber(truck.fuel, 0)}%` }}
                              ></div>
                            </div>
                            <span className="text-white font-medium">{safeNumber(truck.fuel, 0)}%</span>
                          </div>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Mileage:</span>
                          <span className="text-white font-medium">
                            {(safeNumber(truck.mileage, 0)).toLocaleString()} km
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Maintenance Cost:</span>
                          <span className="text-white font-medium">${safeNumber(truck.maintenanceCost, 0)}/mo</span>
                        </div>
                      </div>
                    </div>

                    {/* Column 2: Driver & Assignment */}
                    <div>
                      <h4 className="font-semibold text-white mb-3 flex items-center space-x-2">
                        <User className="w-4 h-4 text-blue-400" />
                        <span>Driver Assignment</span>
                      </h4>
                      <div className="space-y-3 text-sm">
                        {/* Truck Driver Assignment */}
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Truck Driver:</span>
                          <div className="flex items-center space-x-2">
                            <select
                              value={truck.assignedDriver || ''}
                              onChange={(e) => {
                                assignDriverToTruck(truck.id, e.target.value);
                              }}
                              disabled={movingTrucks.has(truck.id)}
                              className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                            >
                              <option value="">Assign Driver...</option>
                              {getAvailableDrivers().map((driver: any) => (
                                <option key={driver.id} value={driver.id}>
                                  {driver.name} ({driver.experience}% exp)
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Current Job Driver */}
                        {currentJob && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Job Driver:</span>
                              <span className="text-white font-medium">
                                {(() => {
                                  const assignedDriver = currentJob.assignedDriver ?
                                    (gameState.company.staff || []).find((staff: any) => staff.id === currentJob.assignedDriver) : null;
                                  return assignedDriver ? assignedDriver.name : 'Unassigned';
                                })()}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Driver Rating:</span>
                              <span className="text-white font-medium">
                                {(() => {
                                  const assignedDriver = currentJob.assignedDriver ?
                                    (gameState.company.staff || []).find((staff: any) => staff.id === currentJob.assignedDriver) : null;
                                  return assignedDriver ? `${assignedDriver.experience}%` : 'N/A';
                                })()}
                              </span>
                            </div>
                          </>
                        )}

                        {/* Trailer Assignment */}
                        <div className="flex justify-between">
                          <span className="text-slate-400">Assigned Trailer:</span>
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const dropdown = document.getElementById(`trailer-dropdown-${truck.id}`);
                                if (dropdown) {
                                  dropdown.classList.toggle('hidden');
                                }
                              }}
                              disabled={movingTrucks.has(truck.id)}
                              className="flex items-center space-x-1 text-white font-medium bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded transition-colors disabled:opacity-50"
                            >
                              <span>
                                {(() => {
                                  const assignedTrailer = truck.assignedTrailer ?
                                    (gameState.company.trailers || []).find((trailer: any) => trailer.id === truck.assignedTrailer) : null;
                                  return assignedTrailer ? `${assignedTrailer.type}${assignedTrailer.plate ? ` (${assignedTrailer.plate})` : ''}` : 'None';
                                })()}
                              </span>
                              <ChevronDown className="w-3 h-3" />
                            </button>
                            <div
                              id={`trailer-dropdown-${truck.id}`}
                              className="hidden absolute bottom-full mb-2 left-0 right-0 bg-slate-700 border border-slate-600 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto min-w-[250px]"
                            >
                              {truck.assignedTrailer && truck.assignedTrailer !== '' ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Unassign trailer
                                    const updatedCompany = {
                                      ...gameState.company,
                                      trucks: (gameState.company.trucks || []).map((t: any) =>
                                        t.id === truck.id ? { ...t, assignedTrailer: '' } : t
                                      )
                                    };
                                    createCompany(updatedCompany);
                                    const dropdown = document.getElementById(`trailer-dropdown-${truck.id}`);
                                    if (dropdown) {
                                      dropdown.classList.add('hidden');
                                    }
                                  }}
                                  className="w-full text-left p-3 hover:bg-slate-600 transition-colors border-b border-slate-600"
                                >
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <div className="text-sm font-medium text-red-400">
                                        🔴 Unassign Trailer
                                      </div>
                                      <div className="text-xs text-slate-400">
                                        Remove trailer from this truck
                                      </div>
                                    </div>
                                  </div>
                                </button>
                              ) : null}
                              {(!gameState.company.trailers || gameState.company.trailers.length === 0) ? (
                                <div className="p-3 text-sm text-slate-400 text-center">
                                  No trailers available
                                </div>
                              ) : (
                                (gameState.company.trailers || []).map((trailer: any) => {
                                  // Check availability
                                  const isAssignedToOtherJob = (gameState.company.activeJobs || []).some((otherJob: any) =>
                                    otherJob.assignedTrailer === trailer.id &&
                                    otherJob.status !== 'completed' &&
                                    otherJob.status !== 'cancelled'
                                  );

                                  const isAnyTruckMovingToThisTrailer = (gameState.company.trucks || []).some((otherTruck: any) =>
                                    (otherTruck.status === 'moving-to-trailer' || movingTrucks.has(otherTruck.id)) &&
                                    otherTruck.assignedTrailer === trailer.id
                                  );

                                  const isThisTruckMovingToThisTrailer = movingTrucks.has(truck.id) &&
                                    (gameState.company.trucks || []).find((t: any) => t.id === truck.id)?.assignedTrailer === trailer.id;

                                  const isUnavailable = isAssignedToOtherJob || (isAnyTruckMovingToThisTrailer && !isThisTruckMovingToThisTrailer);

                                  return (
                                    <button
                                      key={trailer.id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (!isUnavailable) {
                                          // Begin trailer attachment flow
                                          const truckLocation = truck.location || (getCurrentJob(truck.id)?.currentLocation) || 'Unknown';
                                          if (truckLocation === trailer.location) {
                                            // attach immediately
                                            const updatedCompany = {
                                              ...gameState.company,
                                              trucks: (gameState.company.trucks || []).map((t: any) =>
                                                t.id === truck.id ? { ...t, assignedTrailer: trailer.id, location: trailer.location } : t
                                              )
                                            };
                                            createCompany(updatedCompany);
                                          } else {
                                            // If different location, show confirmation modal (simple)
                                            const distance = Math.max(1, Math.round(Math.random() * 400 + 100));
                                            const averageSpeed = 70;
                                            const estimatedTime = Math.max(1, Math.round((distance / averageSpeed) * 60));
                                            setAttachmentModal({
                                              isOpen: true,
                                              truckId: truck.id,
                                              truck,
                                              trailerId: trailer.id,
                                              trailer,
                                              distance,
                                              estimatedTime,
                                              onConfirm: () => {
                                                setAttachmentModal(null);
                                                // For simplicity, mark truck as moving and assign trailer temporarily
                                                setMovingTrucks(prev => new Set([...prev, truck.id]));
                                                const updatedCompany = {
                                                  ...gameState.company,
                                                  trucks: (gameState.company.trucks || []).map((t: any) =>
                                                    t.id === truck.id ? { ...t, assignedTrailer: trailer.id, status: 'moving-to-trailer' } : t
                                                  )
                                                };
                                                createCompany(updatedCompany);
                                                // initialize engine and start a fake drive
                                                try {
                                                  initializeTruckInEngine(truck.id);
                                                  truckDrivingEngine.startDriving(truck.id, truck.assignedDriver || 'temp-driver', null, truckLocation, trailer.location, distance);
                                                } catch (err) {
                                                  console.error('Failed to start driving', err);
                                                }
                                              },
                                              onCancel: () => setAttachmentModal(null)
                                            });
                                          }
                                          const dropdown = document.getElementById(`trailer-dropdown-${truck.id}`);
                                          if (dropdown) dropdown.classList.add('hidden');
                                        }
                                      }}
                                      disabled={isUnavailable || movingTrucks.has(truck.id)}
                                      className={`w-full text-left p-3 transition-colors border-b border-slate-600 last:border-b-0 ${truck.assignedTrailer === trailer.id ? 'bg-slate-600' : isUnavailable ? 'bg-slate-800 opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'} disabled:opacity-50 disabled:cursor-not-allowed`}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <div className={`text-sm font-medium ${isUnavailable ? 'text-slate-500' : 'text-white'}`}>
                                            {trailer.type}
                                            {trailer.plate && ` (${trailer.plate})`}
                                            {truck.assignedTrailer === trailer.id && ' ✓'}
                                            {isThisTruckMovingToThisTrailer && ' 🚚'}
                                          </div>
                                          <div className="text-xs text-slate-400">
                                            {trailer.capacity} tons capacity • {trailer.condition}% condition • Location: {trailer.location}
                                          </div>
                                        </div>
                                        <div className={`text-xs ${truck.assignedTrailer === trailer.id ? 'text-blue-400' : isThisTruckMovingToThisTrailer ? 'text-purple-400' : isAssignedToOtherJob ? 'text-red-400' : isAnyTruckMovingToThisTrailer ? 'text-orange-400' : 'text-green-400'}`}>
                                          {truck.assignedTrailer === trailer.id ? 'Assigned' :
                                            isThisTruckMovingToThisTrailer ? 'Moving to Trailer' :
                                              isAssignedToOtherJob ? 'Assigned to Job' :
                                                isAnyTruckMovingToThisTrailer ? '🚫 Another Truck Moving' :
                                                  'Available'}
                                        </div>
                                      </div>
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Column 3: Financial Info */}
                    <div>
                      <h4 className="font-semibold text-white mb-3 flex items-center space-x-2">
                        <DollarSign className="w-4 h-4 text-green-400" />
                        <span>Financial Information</span>
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Purchase Price:</span>
                          <span className="text-white font-medium">${safeNumber(truck.purchasePrice, 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Monthly Revenue:</span>
                          <span className="text-white font-medium">${(() => {
                            const hasAttachedTrailer = truck.assignedTrailer && truck.assignedTrailer !== '';
                            const hasBuiltInCargo = truck.hasCargoCompartment || false;

                            let actualCapacity = 0;

                            if (hasAttachedTrailer) {
                              const trailer = (gameState.company.trailers || []).find((t: any) => t.id === truck.assignedTrailer);
                              actualCapacity = trailer ? safeNumber(trailer.capacity, 0) : 0;
                            } else if (hasBuiltInCargo) {
                              actualCapacity = safeNumber(truck.capacity, 0);
                            }

                            return (actualCapacity * 150).toLocaleString();
                          })()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Monthly Costs:</span>
                          <span className="text-white font-medium">${(safeNumber(truck.maintenanceCost, 0) + 800).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Net Profit/Month:</span>
                          <span className="text-green-400 font-medium">${((safeNumber(truck.capacity, 0) * 150) - (safeNumber(truck.maintenanceCost, 0) + 800)).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Driving Status */}
                  {drivingState && drivingState.isDriving && (
                    <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-3 mt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-blue-400">
                          <Zap className="w-4 h-4 mr-2" />
                          <span className="text-sm font-medium">Currently Driving</span>
                        </div>
                        <span className="text-sm text-blue-300">
                          {safeNumber(drivingState.currentSpeed, 0)} km/h
                        </span>
                      </div>
                      {drivingState.route && drivingState.route.from && drivingState.route.to && (
                        <div className="text-xs text-blue-300 mt-1">
                          {safeString(drivingState.route.from)} → {safeString(drivingState.route.to)}
                          <span className="ml-2">
                            ({Math.round((safeNumber(drivingState.totalDistance, 0) / safeNumber(drivingState.route.distance, 1)) * 100)}%)
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Additional Actions */}
                  <div className="mt-4 pt-4 border-t border-slate-700 flex justify-end space-x-2 flex-wrap gap-2">
                    <button
                      onClick={() => {
                        // Drive to hub
                        if (!gameState.company) return;
                        const truckLoc = truck.location || 'Unknown';
                        const hubLocation = gameState.company.hub?.name;
                        if (!hubLocation) {
                          alert('Hub not found.');
                          return;
                        }
                        if (truckLoc === hubLocation) {
                          alert(`Truck ${truck.brand} ${truck.model} is already at the hub in ${hubLocation}.`);
                          return;
                        }
                        const updatedCompany = {
                          ...gameState.company,
                          trucks: (gameState.company.trucks || []).map((t: any) =>
                            t.id === truck.id ? { ...t, location: hubLocation } : t
                          )
                        };
                        createCompany(updatedCompany);
                        alert(`Truck ${truck.brand} ${truck.model} has been moved to the hub in ${hubLocation}!`);
                      }}
                      disabled={movingTrucks.has(truck.id)}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      Drive to Hub
                    </button>
                    <button
                      onClick={() => {
                        alert('Schedule Service — not implemented in demo.');
                      }}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
                    >
                      Schedule Service
                    </button>
                    <button
                      onClick={() => handleSellTruck(truck.id)}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
                    >
                      Sell Truck
                    </button>
                    <button
                      onClick={() => {
                        alert('View History — not implemented in demo.');
                      }}
                      className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
                    >
                      View History
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Fleet Summary */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h2 className="text-lg font-bold text-white mb-4">Fleet Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-white mb-1">{(gameState.company.trucks || []).length}</div>
            <div className="text-sm text-slate-400">Total Trucks</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400 mb-1">
              {(gameState.company.trucks || []).filter((t: any) => {
                const currentJob = getCurrentJob(t.id);
                return !currentJob && !movingTrucks.has(t.id);
              }).length}
            </div>
            <div className="text-sm text-slate-400">Available</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400 mb-1">
              {(gameState.company.trucks || []).filter((t: any) => {
                const currentJob = getCurrentJob(t.id);
                return currentJob;
              }).length}
            </div>
            <div className="text-sm text-slate-400">On Job</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400 mb-1">{movingTrucks.size}</div>
            <div className="text-sm text-slate-400">Moving</div>
          </div>
        </div>
      </div>

      {/* Trailer Attachment Modal (simple) */}
      {attachmentModal && attachmentModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-600 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-white mb-4">Confirm Trailer Attachment</h3>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Truck:</span>
                <span className="text-white font-medium">{attachmentModal.truck.brand} {attachmentModal.truck.model}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Trailer:</span>
                <span className="text-white font-medium">{attachmentModal.trailer.type} ({attachmentModal.trailer.capacity} tons)</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Distance to trailer:</span>
                <span className="text-white font-medium">{attachmentModal.distance.toFixed(1)} km</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Estimated travel time:</span>
                <span className="text-white font-medium">{attachmentModal.estimatedTime} minutes</span>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={attachmentModal.onConfirm}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
              >
                Confirm & Start Movement
              </button>
              <button
                onClick={attachmentModal.onCancel}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 px-4 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Garage;
