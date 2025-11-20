/**
 * Interactive map component showing truck positions and routes
 * Uses MapLibre GL JS for map rendering with live truck movement
 */

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useGame } from '../contexts/GameContext'
import { Truck, MapPin, Navigation, Filter, Car, Zap } from 'lucide-react'
import { GoogleMapsLoader } from '../components/GoogleMapsLoader'
import { cityCoords } from '../utils/distance-scaffold'
import { Company } from '../types/game'
import { truckDrivingEngine } from '../utils/truckDrivingEngine'

interface TruckData {
  id: string
  name: string
  position: {
    lat: number
    lon: number
  }
  destination: string
  origin: string
  status: string
  isHighlighted?: boolean
  isMoving?: boolean
  routeProgress?: number
  currentSpeed?: number
}

// City-to-city road network for realistic routing
const roadNetwork: Record<string, Record<string, { distance: number; path: string[] }>> = {
  // Key European cities with connected road paths
  'Frankfurt': {
    'Hamburg': { distance: 492, path: ['Frankfurt', 'Kassel', 'Hannover', 'Hamburg'] },
    'Munich': { distance: 392, path: ['Frankfurt', 'Nuremberg', 'Munich'] },
    'Berlin': { distance: 555, path: ['Frankfurt', 'Kassel', 'Hannover', 'Berlin'] },
    'Stuttgart': { distance: 204, path: ['Frankfurt', 'Wurzburg', 'Stuttgart'] }
  },
  'Hamburg': {
    'Berlin': { distance: 289, path: ['Hamburg', 'Hannover', 'Berlin'] },
    'Munich': { distance: 774, path: ['Hamburg', 'Hannover', 'Kassel', 'Frankfurt', 'Nuremberg', 'Munich'] },
    'Stuttgart': { distance: 658, path: ['Hamburg', 'Hannover', 'Kassel', 'Frankfurt', 'Wurzburg', 'Stuttgart'] }
  },
  'Berlin': {
    'Munich': { distance: 585, path: ['Berlin', 'Leipzig', 'Nuremberg', 'Munich'] },
    'Stuttgart': { distance: 634, path: ['Berlin', 'Leipzig', 'Nuremberg', 'Wurzburg', 'Stuttgart'] }
  },
  'Munich': {
    'Stuttgart': { distance: 223, path: ['Munich', 'Augsburg', 'Ulm', 'Stuttgart'] }
  },
  'Stuttgart': {
    'Frankfurt': { distance: 204, path: ['Stuttgart', 'Wurzburg', 'Frankfurt'] }
  }
};

// Get road path and waypoints between cities
const getRoadPath = (from: string, to: string): { path: string[]; distance: number } => {
  if (from === to) return { path: [from], distance: 0 };
  if (roadNetwork[from] && roadNetwork[from][to]) {
    return roadNetwork[from][to];
  }
  if (roadNetwork[to] && roadNetwork[to][from]) {
    const path = roadNetwork[to][from].path;
    return { path: [...path].reverse(), distance: roadNetwork[to][from].distance };
  }
  // Fallback direct route
  return { path: [from, to], distance: 100 };
};

const Map: React.FC = () => {
  const { gameState } = useGame()
  const company = gameState.company as Company
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const routeLayersRef = useRef<Record<string, any>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [mapError, setMapError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'fleet' | 'routes'>('fleet')
  const [, forceUpdate] = useState({})

  // Force update function for live changes
  const triggerUpdate = useCallback(() => {
    forceUpdate({})
  }, [])

  // Get truck live position and route data
  const getTruckData = useCallback((truck: any): TruckData => {
    // Get current job
    const currentJob = company?.activeJobs?.find(job => 
      job.assignedTruck === truck.id && 
      job.status !== 'completed' && 
      job.status !== 'cancelled'
    )

    // Check garage moving trucks
    const garageMovingTrucks = JSON.parse(localStorage.getItem('garage_moving_trucks') || '[]');
    const isMovingToTrailer = garageMovingTrucks.includes(truck.id);

    // Get driving state from engine
    let drivingState = null;
    let routeProgress = 0;
    let currentSpeed = 0;
    let isMoving = false;

    try {
      drivingState = truckDrivingEngine.getTruckState(truck.id);
    } catch (error) {
      console.error('Error getting truck driving state:', error);
    }

    // Start with truck's actual location from company data
    let truckLocation = truck.location || company?.hub?.city || 'Frankfurt';
    let position = cityCoords[truckLocation] || cityCoords['Frankfurt'] || { lat: 51.5074, lon: -0.1278 };
    let destination = truckLocation;
    let origin = truckLocation;
    let status = truck.status || 'Available';

    // Handle live movement from driving engine
    if (drivingState && drivingState.isDriving && drivingState.route) {
      isMoving = true;
      status = isMovingToTrailer ? 'Moving to Trailer' : 'Moving';
      
      // Calculate progress based on actual distance traveled
      routeProgress = Math.min(100, (drivingState.totalDistance / drivingState.route.distance) * 100);
      currentSpeed = drivingState.currentSpeed || 0;
      
      // Get road path for realistic routing
      const roadPath = getRoadPath(drivingState.route.from, drivingState.route.to);
      
      if (roadPath.path.length > 1 && routeProgress < 100) {
        // Interpolate position along the road path
        const segmentProgress = (routeProgress / 100) * (roadPath.path.length - 1);
        const segmentIndex = Math.floor(segmentProgress);
        const segmentOffset = segmentProgress - segmentIndex;
        
        const fromCity = roadPath.path[segmentIndex];
        const toCity = roadPath.path[Math.min(segmentIndex + 1, roadPath.path.length - 1)];
        
        const fromCoords = cityCoords[fromCity];
        const toCoords = cityCoords[toCity];
        
        if (fromCoords && toCoords) {
          // Smooth interpolation along the road segment
          const currentLat = fromCoords.lat + (toCoords.lat - fromCoords.lat) * segmentOffset;
          const currentLon = fromCoords.lon + (toCoords.lon - fromCoords.lon) * segmentOffset;
          position = { lat: currentLat, lon: currentLon };
        }
        
        origin = drivingState.route.from;
        destination = drivingState.route.to;
      }
    } else if (isMovingToTrailer) {
      isMoving = true;
      status = 'Moving to Trailer';
    } else if (currentJob && !isMoving) {
      status = 'On Job';
      destination = currentJob.destination || truckLocation;
      origin = currentJob.origin || truckLocation;
    }

    return {
      id: truck.id,
      name: truck.name || `${truck.brand} ${truck.model}`,
      position,
      destination,
      origin,
      status,
      isMoving,
      routeProgress,
      currentSpeed
    };
  }, [company])

  // Get all trucks with live data
  const trucks: TruckData[] = company?.trucks?.map(getTruckData) || []

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapInstanceRef.current) return;

    const initMap = async () => {
      try {
        setIsLoading(true)

        // Load MapLibre GL JS
        await new Promise((resolve, reject) => {
          const script = document.createElement('script')
          script.src = 'https://unpkg.com/maplibre-gl@2.4.0/dist/maplibre-gl.js'
          script.onload = resolve
          script.onerror = reject
          document.head.appendChild(script)
        })

        // Load CSS
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/maplibre-gl@2.4.0/dist/maplibre-gl.css'
        document.head.appendChild(link)

        const maplibregl = (window as any).maplibregl;
        if (!maplibregl) {
          throw new Error('MapLibre GL failed to load')
        }

        // Initialize map
        const map = new maplibregl.Map({
          container: mapContainer.current!,
          style: {
            version: 8,
            sources: {
              'osm': {
                type: 'raster',
                tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                tileSize: 256,
                attribution: '© OpenStreetMap contributors'
              }
            },
            layers: [
              {
                id: 'osm',
                type: 'raster',
                source: 'osm'
              }
            ]
          },
          center: [2.3522, 48.8566], // Center of Europe
          zoom: 5
        })

        map.addControl(new maplibregl.NavigationControl(), 'top-right')
        map.addControl(new maplibregl.ScaleControl(), 'bottom-left')

        map.on('load', () => {
          setIsLoading(false)
          mapInstanceRef.current = map
          updateMarkersAndRoutes()
        })

        map.on('error', (e: any) => {
          console.error('Map error:', e)
          setMapError('Failed to load map')
          setIsLoading(false)
        })

      } catch (error) {
        console.error('Map initialization error:', error)
        setMapError('Failed to initialize map')
        setIsLoading(false)
      }
    }

    initMap()

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  // Update markers and routes
  const updateMarkersAndRoutes = useCallback(() => {
    if (!mapInstanceRef.current) return;

    const maplibregl = (window as any).maplibregl;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove())
    markersRef.current = []

    // Clear existing route layers
    Object.keys(routeLayersRef.current).forEach(routeId => {
      if (mapInstanceRef.current.getLayer(routeId)) {
        mapInstanceRef.current.removeLayer(routeId)
      }
      if (mapInstanceRef.current.getSource(routeId)) {
        mapInstanceRef.current.removeSource(routeId)
      }
    })
    routeLayersRef.current = {}

    // Add new truck markers
    trucks.forEach(truck => {
      const marker = new maplibregl.Marker({
        color: truck.isMoving ? '#f59e0b' : 
               truck.status === 'On Job' ? '#10b981' : '#ef4444',
        scale: truck.isHighlighted ? 1.5 : (truck.isMoving ? 1.4 : 1.2)
      })
      .setLngLat([truck.position.lon, truck.position.lat])
      .addTo(mapInstanceRef.current)

      // Popup with live information
      const popup = new maplibregl.Popup({
        offset: 25,
        closeButton: false
      }).setHTML(`
        <div class="p-2">
          <h3 class="font-bold text-sm">${truck.name}</h3>
          <p class="text-xs">Status: <span class="font-medium">${truck.status}</span></p>
          <p class="text-xs">Route: ${truck.origin} → ${truck.destination}</p>
          ${truck.isMoving ? `
            <p class="text-xs text-amber-400">🚚 Live Position</p>
            <p class="text-xs">Progress: ${truck.routeProgress || 0}%</p>
            <p class="text-xs">Speed: ${truck.currentSpeed || 0} km/h</p>
          ` : ''}
        </div>
      `)

      marker.setPopup(popup)
      markersRef.current.push(marker)
    })

    // Add routes for moving trucks with realistic road paths
    trucks.forEach(truck => {
      if (truck.isMoving && truck.origin !== truck.destination && 
          truck.origin !== 'Current Location' && truck.destination !== 'Current Location') {
        
        const roadPath = getRoadPath(truck.origin, truck.destination);
        const routeId = `route-${truck.id}`;

        if (roadPath.path.length > 1) {
          // Create coordinates for the road path
          const pathCoordinates = roadPath.path.map(city => {
            const coords = cityCoords[city];
            return coords ? [coords.lon, coords.lat] : null;
          }).filter(Boolean) as [number, number][];

          if (pathCoordinates.length >= 2) {
            mapInstanceRef.current.addLayer({
              id: routeId,
              type: 'line',
              source: {
                type: 'geojson',
                data: {
                  type: 'Feature',
                  geometry: {
                    type: 'LineString',
                    coordinates: pathCoordinates
                  }
                }
              },
              paint: {
                'line-color': '#3b82f6',
                'line-width': truck.isHighlighted ? 4 : 3,
                'line-opacity': truck.isHighlighted ? 1.0 : 0.9,
                'line-dasharray': [2, 1]
              }
            })

            routeLayersRef.current[routeId] = true;
          }
        }
      }
    })
  }, [trucks])

  // Update map with live positions
  useEffect(() => {
    updateMarkersAndRoutes()
  }, [updateMarkersAndRoutes])

  // Set up live updates every 1 second
  useEffect(() => {
    const interval = setInterval(() => {
      triggerUpdate()
    }, 1000) // Update every 1 second

    return () => clearInterval(interval)
  }, [triggerUpdate])

  // Highlight specific truck
  const highlightTruck = (truckId: string) => {
    // Update truck data with highlight
    const updatedTrucks = trucks.map(truck => ({
      ...truck,
      isHighlighted: truck.id === truckId
    }))

    // Update markers and routes with highlighting
    updateMarkersAndRoutes()

    // Center map on truck
    const targetTruck = updatedTrucks.find(t => t.id === truckId)
    if (targetTruck && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo({
        center: [targetTruck.position.lon, targetTruck.position.lat],
        zoom: 10,
        essential: true
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Fleet Map</h1>
          <p className="text-slate-400">Track your trucks and routes in real-time</p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* View Mode Toggle */}
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-1">
            <button
              onClick={() => setViewMode('fleet')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'fleet'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Truck className="w-4 h-4 inline mr-2" />
              Fleet View
            </button>
            <button
              onClick={() => setViewMode('routes')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'routes'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Navigation className="w-4 h-4 inline mr-2" />
              Routes View
            </button>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map */}
        <div className="lg:col-span-2">
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center space-x-2">
                <MapPin className="w-5 h-5" />
                <span>Live Fleet Map</span>
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Real-time tracking of {trucks.length} truck{trucks.length !== 1 ? 's' : ''}
                {trucks.filter(t => t.isMoving).length > 0 && 
                  ` (${trucks.filter(t => t.isMoving).length} moving)`
                }
              </p>
            </div>

            {/* Map */}
            <div className="relative rounded-lg overflow-hidden" style={{ height: '600px' }}>
              {isLoading && (
                <div className="absolute inset-0 bg-slate-900 bg-opacity-75 flex items-center justify-center z-10">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-white">Loading map...</p>
                  </div>
                </div>
              )}

              {mapError && (
                <div className="absolute inset-0 bg-slate-900 bg-opacity-75 flex items-center justify-center z-10">
                  <div className="text-center">
                    <div className="text-red-500 mb-4">
                      <MapPin className="w-16 h-16 mx-auto" />
                    </div>
                    <p className="text-red-400">{mapError}</p>
                  </div>
                </div>
              )}

              <div 
                ref={mapContainer} 
                className="w-full h-full rounded-lg"
                style={{ backgroundColor: '#1e293b' }}
              />
            </div>
          </div>
        </div>

        {/* Fleet Status */}
        <div className="space-y-6">
          {/* Fleet Overview */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Fleet Status</h3>
            
            <div className="space-y-4">
              {/* Total Trucks */}
              <div className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-500 bg-opacity-20 rounded-lg">
                    <Truck className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">Total Trucks</div>
                    <div className="text-xs text-slate-400">In fleet</div>
                  </div>
                </div>
                <div className="text-2xl font-bold text-blue-400">{trucks.length}</div>
              </div>

              {/* Moving Trucks */}
              <div className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-amber-500 bg-opacity-20 rounded-lg">
                    <Zap className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">Moving</div>
                    <div className="text-xs text-slate-400">Currently active</div>
                  </div>
                </div>
                <div className="text-2xl font-bold text-amber-400">
                  {trucks.filter(t => t.isMoving).length}
                </div>
              </div>

              {/* On Job */}
              <div className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-500 bg-opacity-20 rounded-lg">
                    <Navigation className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">On Job</div>
                    <div className="text-xs text-slate-400">Assigned but static</div>
                  </div>
                </div>
                <div className="text-2xl font-bold text-green-400">
                  {trucks.filter(t => t.status === 'On Job' && !t.isMoving).length}
                </div>
              </div>

              {/* Available */}
              <div className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-slate-500 bg-opacity-20 rounded-lg">
                    <Car className="w-5 h-5 text-slate-400" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">Available</div>
                    <div className="text-xs text-slate-400">Ready for jobs</div>
                  </div>
                </div>
                <div className="text-2xl font-bold text-slate-400">
                  {trucks.filter(t => !t.isMoving && t.status !== 'On Job').length}
                </div>
              </div>
            </div>
          </div>

          {/* Truck List */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Truck List</h3>
            
            {trucks.length === 0 ? (
              <div className="text-center py-8">
                <Truck className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-400">No trucks in fleet</p>
                <p className="text-xs text-slate-500 mt-1">Purchase trucks to track them here</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {trucks.map((truck) => (
                  <div
                    key={truck.id}
                    className={`p-3 rounded-lg border transition-all cursor-pointer hover:bg-opacity-80 ${
                      truck.isHighlighted
                        ? 'bg-blue-500 bg-opacity-20 border-blue-500 border-opacity-50 ring-2 ring-blue-400 ring-opacity-50'
                        : truck.isMoving
                        ? 'bg-amber-500 bg-opacity-10 border-amber-500 border-opacity-30'
                        : truck.status === 'On Job'
                        ? 'bg-green-500 bg-opacity-10 border-green-500 border-opacity-30'
                        : 'bg-slate-700 border-slate-600'
                    }`}
                    onClick={() => highlightTruck(truck.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-white text-sm">{truck.name}</h4>
                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            truck.isMoving
                              ? 'bg-amber-500 bg-opacity-20 text-amber-400'
                              : truck.status === 'On Job'
                              ? 'bg-green-500 bg-opacity-20 text-green-400'
                              : 'bg-slate-500 bg-opacity-20 text-slate-400'
                          }`}
                        >
                          {truck.isMoving ? (truck.status === 'Moving to Trailer' ? 'Moving to Trailer' : 'Moving') : truck.status}
                        </span>
                        {truck.isHighlighted && (
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                        )}
                      </div>
                    </div>

                    <div className="text-sm text-slate-400 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <MapPin className="w-3 h-3" />
                          <span>Location: {truck.destination}</span>
                        </div>
                        {truck.isMoving && (
                          <div className="flex items-center space-x-1 text-amber-400">
                            <Zap className="w-3 h-3" />
                            <span className="text-xs">{truck.routeProgress}%</span>
                          </div>
                        )}
                      </div>
                      {truck.isMoving && truck.routeProgress !== undefined && (
                        <div className="text-xs text-amber-400">
                          Route: {truck.origin} → {truck.destination}
                          <span className="ml-2">• {truck.currentSpeed || 0} km/h</span>
                        </div>
                      )}
                      <div className="text-xs text-blue-400 mt-1">
                        Click to center on map
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Map