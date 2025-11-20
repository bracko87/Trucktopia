/**
 * Trucks management page showing all trucks in possession with trailer information
 */

import React, { useState } from 'react';
import { useGame } from '../contexts/GameContext';
import { Truck, Wrench, Fuel, MapPin, Calendar, DollarSign, User, Package, Link } from 'lucide-react';

const Trucks: React.FC = () => {
  const { gameState } = useGame();
  const [expandedTruck, setExpandedTruck] = useState<string | null>(null);

  if (!gameState.company) return null;

  // Handle truck actions
  const handleMaintainTruck = (truckId: string) => {
    // Implementation for maintenance
    console.log('Maintain truck:', truckId);
  };

  const handleAssignDriver = (truckId: string) => {
    // Implementation for driver assignment
    console.log('Assign driver to truck:', truckId);
  };

  const handleViewDetails = (truckId: string) => {
    // Implementation for viewing details
    console.log('View truck details:', truckId);
  };

  const handleServiceTruck = (truckId: string) => {
    console.log('Schedule service for truck:', truckId);
  };

  const handleSellTruck = (truckId: string) => {
    console.log('Sell truck:', truckId);
  };

  const handleViewHistory = (truckId: string) => {
    console.log('View truck history:', truckId);
  };

  const handleAssignTrailer = (truckId: string) => {
    console.log('Assign trailer to truck:', truckId);
  };

  const handleDetachTrailer = (truckId: string) => {
    console.log('Detach trailer from truck:', truckId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'text-green-400 bg-green-400/10';
      case 'on-job': return 'text-blue-400 bg-blue-400/10';
      case 'maintenance': return 'text-orange-400 bg-orange-400/10';
      default: return 'text-slate-400 bg-slate-400/10';
    }
  };

  // Generate registration number if not exists
  const getRegistrationNumber = (truck: any) => {
    if (truck.registration) return truck.registration;
    const brandCode = truck.brand.slice(0, 2).toUpperCase();
    const randomNum = Math.floor(Math.random() * 9000) + 1000;
    return `${brandCode}-${randomNum}`;
  };

  // Check if truck has trailer assigned
  const getTruckTrailer = (truck: any) => {
    if (!truck.assignedTrailer || truck.assignedTrailer === '') return null;
    return gameState.company.trailers?.find(t => t.id === truck.assignedTrailer);
  };

  // Get available trailers (not assigned to any truck)
  const getAvailableTrailers = () => {
    if (!gameState.company.trailers) return [];
    return gameState.company.trailers.filter(trailer => {
      return !gameState.company.trucks.some(truck => truck.assignedTrailer === trailer.id);
    });
  };

  const filteredTrucks = gameState.company.trucks;
  const availableTrailers = getAvailableTrailers();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Truck Fleet</h1>
          <p className="text-slate-400">Manage your truck fleet and maintenance</p>
        </div>
        <div className="flex space-x-2">
          <button className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2">
            <Package className="w-4 h-4" />
            <span>View Trailers ({gameState.company.trailers?.length || 0})</span>
          </button>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
            Purchase New Truck
          </button>
        </div>
      </div>

      {/* Fleet Overview with Trucks and Trailers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trucks Section */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <Truck className="w-5 h-5 text-orange-400" />
              <span>Trucks ({filteredTrucks.length})</span>
            </h2>
            <div className="flex items-center space-x-2 text-sm text-slate-400">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span>{filteredTrucks.filter(t => t.status === 'available').length} Available</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span>{filteredTrucks.filter(t => t.status === 'on-job').length} On Job</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {filteredTrucks.map((truck) => {
              const assignedTrailer = getTruckTrailer(truck);
              return (
                <div key={truck.id} className="bg-slate-700 rounded-lg border border-slate-600 p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <Truck className="w-4 h-4 text-orange-400" />
                        <span className="font-medium text-white">{truck.brand} {truck.model}</span>
                        <span className="text-xs text-slate-400">({truck.year})</span>
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(truck.status)}`}>
                        {truck.status}
                      </div>
                    </div>
                    <button 
                      onClick={() => setExpandedTruck(expandedTruck === truck.id ? null : truck.id)}
                      className="text-slate-400 hover:text-white text-sm"
                    >
                      {expandedTruck === truck.id ? 'Hide' : 'Details'}
                    </button>
                  </div>
                  
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-4 text-slate-400">
                      <span>Reg: {getRegistrationNumber(truck)}</span>
                      <span>{truck.location || 'Frankfurt'}</span>
                    </div>
                    {assignedTrailer ? (
                      <div className="flex items-center space-x-1 text-blue-400">
                        <Package className="w-3 h-3" />
                        <span className="text-xs">{assignedTrailer.type} ({assignedTrailer.capacity}t)</span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500">No trailer</span>
                    )}
                  </div>

                  {/* Expanded Details */}
                  {expandedTruck === truck.id && (
                    <div className="mt-3 pt-3 border-t border-slate-600">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-slate-400">Condition:</span>
                          <div className="flex items-center space-x-2 mt-1">
                            <div className="w-16 bg-slate-600 rounded-full h-1">
                              <div 
                                className={`h-1 rounded-full ${truck.condition >= 70 ? 'bg-green-500' : truck.condition >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                style={{ width: `${truck.condition}%` }}
                              ></div>
                            </div>
                            <span className="text-white">{truck.condition}%</span>
                          </div>
                        </div>
                        <div>
                          <span className="text-slate-400">Fuel:</span>
                          <div className="flex items-center space-x-2 mt-1">
                            <div className="w-16 bg-slate-600 rounded-full h-1">
                              <div 
                                className={`h-1 rounded-full ${truck.fuel >= 60 ? 'bg-green-500' : truck.fuel >= 30 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                style={{ width: `${truck.fuel}%` }}
                              ></div>
                            </div>
                            <span className="text-white">{truck.fuel}%</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Trailer Assignment */}
                      <div className="mt-3 pt-3 border-t border-slate-600">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-400">Trailer Assignment</span>
                          {assignedTrailer ? (
                            <button 
                              onClick={() => handleDetachTrailer(truck.id)}
                              className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded transition-colors"
                            >
                              Detach {assignedTrailer.type}
                            </button>
                          ) : (
                            <button 
                              onClick={() => handleAssignTrailer(truck.id)}
                              className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded transition-colors"
                              disabled={availableTrailers.length === 0}
                            >
                              {availableTrailers.length > 0 ? 'Assign Trailer' : 'No Trailers Available'}
                            </button>
                          )}
                        </div>
                        
                        {assignedTrailer && (
                          <div className="mt-2 p-2 bg-slate-800 rounded text-xs">
                            <div className="flex items-center space-x-2 text-slate-300">
                              <Package className="w-3 h-3" />
                              <span>{assignedTrailer.type} - {assignedTrailer.capacity} tons capacity</span>
                            </div>
                            <div className="flex items-center space-x-2 text-slate-400 mt-1">
                              <span>Condition: {assignedTrailer.condition}%</span>
                              <span>•</span>
                              <span>Location: {assignedTrailer.location || 'Hub'}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Trailers Section */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <Package className="w-5 h-5 text-blue-400" />
              <span>Trailers ({gameState.company.trailers?.length || 0})</span>
            </h2>
            <div className="flex items-center space-x-2 text-sm text-slate-400">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span>{availableTrailers.length} Available</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span>{(gameState.company.trailers?.length || 0) - availableTrailers.length} Assigned</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {gameState.company.trailers?.map((trailer) => {
              const isAssigned = gameState.company.trucks.some(truck => truck.assignedTrailer === trailer.id);
              const assignedTruck = isAssigned ? gameState.company.trucks.find(truck => truck.assignedTrailer === trailer.id) : null;
              
              return (
                <div key={trailer.id} className="bg-slate-700 rounded-lg border border-slate-600 p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <Package className="w-4 h-4 text-blue-400" />
                        <span className="font-medium text-white capitalize">{trailer.type}</span>
                        <span className="text-xs text-slate-400">({trailer.capacity}t)</span>
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                        isAssigned ? 'text-blue-400 bg-blue-400/10' : 'text-green-400 bg-green-400/10'
                      }`}>
                        {isAssigned ? `Assigned to ${assignedTruck?.brand}` : 'Available'}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center space-x-2 text-xs text-slate-400">
                        <span>Cond: {trailer.condition}%</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-4 text-slate-400">
                      <span>ID: {trailer.id.slice(-4)}</span>
                      <span>{trailer.location || 'Hub'}</span>
                    </div>
                    {assignedTruck && (
                      <div className="flex items-center space-x-1 text-blue-400">
                        <Truck className="w-3 h-3" />
                        <span className="text-xs">{assignedTruck.brand}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Fleet Summary */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h2 className="text-lg font-bold text-white mb-4">Fleet Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-white mb-1">{gameState.company.trucks.length}</div>
            <div className="text-sm text-slate-400">Total Trucks</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400 mb-1">{gameState.company.trailers?.length || 0}</div>
            <div className="text-sm text-slate-400">Total Trailers</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400 mb-1">{availableTrailers.length}</div>
            <div className="text-sm text-slate-400">Available Trailers</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-400 mb-1">
              {(gameState.company.trailers?.length || 0) - availableTrailers.length}
            </div>
            <div className="text-sm text-slate-400">Assigned Trailers</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Trucks;
