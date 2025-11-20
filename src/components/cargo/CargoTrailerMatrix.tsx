/**
 * Cargo Trailer Compatibility Matrix Component
 * Displays which cargo types can be transported with which trailers
 */

import React, { useState } from 'react';
import { Truck, Package, AlertCircle, Check, X, Filter } from 'lucide-react';
import { 
  trailerTypes, 
  cargoTypes, 
  getCompatibleTrailers, 
  getCompatibleCargoTypes,
  getCargoRequirements,
  getTrailerFeatures,
  isCompatibleCargoTrailer 
} from '../../utils/cargoTrailerCompatibility';

export default function CargoTrailerMatrix() {
  const [selectedCargo, setSelectedCargo] = useState<string>('');
  const [selectedTrailer, setSelectedTrailer] = useState<string>('');
  const [showDetails, setShowDetails] = useState<boolean>(false);

  const trailerArray = Object.values(trailerTypes);
  const cargoArray = Object.values(cargoTypes);

  const filteredTrailers = selectedCargo 
    ? getCompatibleTrailers(selectedCargo)
    : trailerArray;

  const filteredCargo = selectedTrailer
    ? getCompatibleCargoTypes(selectedTrailer)
    : cargoArray;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
          <Truck className="w-6 h-6 text-blue-400" />
          Cargo & Trailer Compatibility Guide
        </h2>
        <p className="text-slate-400">
          Understanding which cargo types can be transported with which trailer types is essential for efficient logistics planning.
        </p>
      </div>

      {/* Filter Controls */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Filter className="w-5 h-5 text-blue-400" />
          Compatibility Filters
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Cargo Type Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Filter by Cargo Type
            </label>
            <select
              value={selectedCargo}
              onChange={(e) => {
                setSelectedCargo(e.target.value);
                setSelectedTrailer('');
              }}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Cargo Types</option>
              {cargoArray.map((cargo) => (
                <option key={cargo.id} value={cargo.id}>
                  {cargo.name}
                </option>
              ))}
            </select>
          </div>

          {/* Trailer Type Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Filter by Trailer Type
            </label>
            <select
              value={selectedTrailer}
              onChange={(e) => {
                setSelectedTrailer(e.target.value);
                setSelectedCargo('');
              }}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Trailer Types</option>
              {trailerArray.map((trailer) => (
                <option key={trailer.id} value={trailer.id}>
                  {trailer.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={() => {
            setSelectedCargo('');
            setSelectedTrailer('');
          }}
          className="mt-4 text-sm text-slate-400 hover:text-white transition-colors"
        >
          Clear Filters
        </button>
      </div>

      {/* Compatibility Matrix */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Compatibility Matrix</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left p-3 text-sm font-medium text-slate-400">Cargo Type</th>
                {filteredTrailers.map((trailer) => (
                  <th key={trailer.id} className="text-center p-3 text-sm font-medium text-slate-400">
                    <div className="flex flex-col items-center">
                      <Package className="w-4 h-4 mb-1" />
                      <span>{trailer.name}</span>
                      <span className="text-xs text-slate-500">{trailer.capacity}t</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredCargo.map((cargo) => (
                <tr key={cargo.id} className="border-b border-slate-700">
                  <td className="p-3">
                    <div className="flex flex-col">
                      <span className="text-white font-medium">{cargo.name}</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {cargo.hazardous && (
                          <span className="text-xs bg-red-500/20 text-red-400 px-1 rounded">Hazardous</span>
                        )}
                        {cargo.temperatureControl && (
                          <span className="text-xs bg-blue-500/20 text-blue-400 px-1 rounded">Temp Ctrl</span>
                        )}
                        {cargo.oversized && (
                          <span className="text-xs bg-orange-500/20 text-orange-400 px-1 rounded">Oversized</span>
                        )}
                        {cargo.liquid && (
                          <span className="text-xs bg-green-500/20 text-green-400 px-1 rounded">Liquid</span>
                        )}
                        {cargo.bulk && (
                          <span className="text-xs bg-purple-500/20 text-purple-400 px-1 rounded">Bulk</span>
                        )}
                      </div>
                    </div>
                  </td>
                  {filteredTrailers.map((trailer) => {
                    const compatible = isCompatibleCargoTrailer(cargo.id, trailer.id);
                    return (
                      <td key={trailer.id} className="text-center p-3">
                        {compatible ? (
                          <div className="flex items-center justify-center">
                            <Check className="w-5 h-5 text-green-400" />
                          </div>
                        ) : (
                          <div className="flex items-center justify-center">
                            <X className="w-5 h-5 text-red-400" />
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Information */}
      {(selectedCargo || selectedTrailer) && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Detailed Information</h3>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              {showDetails ? 'Hide' : 'Show'} Details
            </button>
          </div>

          {selectedCargo && (
            <div className="mb-6 p-4 bg-slate-700 rounded-lg">
              <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-400" />
                {cargoTypes[selectedCargo].name}
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h5 className="text-sm font-medium text-slate-400 mb-2">Requirements:</h5>
                  <ul className="space-y-1">
                    {getCargoRequirements(selectedCargo).map((req, index) => (
                      <li key={index} className="text-sm text-slate-300 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-yellow-400" />
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h5 className="text-sm font-medium text-slate-400 mb-2">Compatible Trailers:</h5>
                  <div className="space-y-1">
                    {getCompatibleTrailers(selectedCargo).map((trailer) => (
                      <div key={trailer.id} className="text-sm text-slate-300">
                        • {trailer.name} (Capacity: {trailer.capacity}t)
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedTrailer && (
            <div className="p-4 bg-slate-700 rounded-lg">
              <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-400" />
                {trailerTypes[selectedTrailer].name}
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h5 className="text-sm font-medium text-slate-400 mb-2">Features:</h5>
                  <ul className="space-y-1">
                    {getTrailerFeatures(selectedTrailer).map((feature, index) => (
                      <li key={index} className="text-sm text-slate-300 flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-400" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h5 className="text-sm font-medium text-slate-400 mb-2">Compatible Cargo Types:</h5>
                  <div className="space-y-1">
                    {getCompatibleCargoTypes(selectedTrailer).map((cargo) => (
                      <div key={cargo.id} className="text-sm text-slate-300">
                        • {cargo.name}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* License Requirements */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">License Requirements</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-700 rounded-lg">
            <h4 className="text-white font-medium mb-2">Category C</h4>
            <p className="text-sm text-slate-400">
              Basic truck license for vehicles over 3,500kg. Required for all cargo types.
            </p>
          </div>
          
          <div className="p-4 bg-slate-700 rounded-lg">
            <h4 className="text-white font-medium mb-2">Category CE</h4>
            <p className="text-sm text-slate-400">
              Required for heavy and oversized loads (flatbed, lowboy trailers).
            </p>
          </div>
          
          <div className="p-4 bg-slate-700 rounded-lg">
            <h4 className="text-white font-medium mb-2">ADR Certificate</h4>
            <p className="text-sm text-slate-400">
              Mandatory for hazardous materials transport.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
