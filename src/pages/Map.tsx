/**
 * src/pages/Map.tsx
 *
 * Fleet Map page
 *
 * Responsibilities:
 * - Render an interactive MapLibre map with live truck markers and routes.
 * - Provide the Truck List in the right column (under Quick Actions area which is hidden by default).
 * - Render Fleet Status as a separate full-width box below the map area.
 *
 * Notes:
 * - Quick Actions box has been hidden per request. The right column now only shows the Truck List.
 * - The component remains split and documented; complex logic is commented.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useGame } from '../contexts/GameContext'
import { Truck, MapPin, Navigation, Car, Zap } from 'lucide-react'
import { cityCoords } from '../utils/distance-scaffold'
import { Company } from '../types/game'
import { truckDrivingEngine } from '../utils/truckDrivingEngine'

/**
 * TruckData
 * @description Minimal display shape for a truck.
 */
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

/**
 * roadNetwork
 * @description Small routing graph to interpolate positions along named city paths.
 */
const roadNetwork: Record<string, Record<string, { distance: number; path: string[] }>> = {
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
}

/**
 * getRoadPath
 * @description Return an ordered path and distance between two cities. Fallbacks to direct route.
 */
const getRoadPath = (from: string, to: string): { path: string[]; distance: number } => {
  if (from === to) return { path: [from], distance: 0 }
  if (roadNetwork[from] && roadNetwork[from][to]) {
    return roadNetwork[from][to]
  }
  if (roadNetwork[to] && roadNetwork[to][from]) {
    const path = roadNetwork[to][from].path
    return { path: [...path].reverse(), distance: roadNetwork[to][from].distance }
  }
  return { path: [from, to], distance: 100 }
}

/**
 * Map
 * @description Main page component rendering the map, truck list and fleet status.
 */
const Map: React.FC = () => {
  const { gameState } = useGame()
  const company = gameState.company as Company
  const mapContainer = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const routeLayersRef = useRef<Record<string, boolean>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [mapError, setMapError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'fleet' | 'routes'>('fleet')
  const [, forceUpdate] = useState({})

  /**
   * triggerUpdate
   * @description Force a re-render (used by interval for live updates).
   */
  const triggerUpdate = useCallback(() => {
    forceUpdate({})
  }, [])

  /**
   * getTruckData
   * @description Derive a TruckData object from raw truck runtime object.
   */
  const getTruckData = useCallback((truck: any): TruckData => {
    const currentJob = company?.activeJobs?.find((j) =>
      j.assignedTruck === truck.id && j.status !== 'completed' && j.status !== 'cancelled'
    )

    const garageMovingTrucks = JSON.parse(localStorage.getItem('garage_moving_trucks') || '[]')
    const isMovingToTrailer = garageMovingTrucks.includes(truck.id)

    let drivingState = null
    let routeProgress = 0
    let currentSpeed = 0
    let isMoving = false

    try {
      drivingState = truckDrivingEngine.getTruckState(truck.id)
    } catch (err) {
      console.error('truckDrivingEngine error', err)
    }

    let truckLocation = truck.location || company?.hub?.city || 'Frankfurt'
    let position = cityCoords[truckLocation] || cityCoords['Frankfurt'] || { lat: 51.5074, lon: -0.1278 }
    let destination = truckLocation
    let origin = truckLocation
    let status = truck.status || 'Available'

    if (drivingState && drivingState.isDriving && drivingState.route) {
      isMoving = true
      status = isMovingToTrailer ? 'Moving to Trailer' : 'Moving'
      routeProgress = Math.min(100, (drivingState.totalDistance / drivingState.route.distance) * 100)
      currentSpeed = drivingState.currentSpeed || 0

      const roadPath = getRoadPath(drivingState.route.from, drivingState.route.to)
      if (roadPath.path.length > 1 && routeProgress < 100) {
        const segmentProgress = (routeProgress / 100) * (roadPath.path.length - 1)
        const segmentIndex = Math.floor(segmentProgress)
        const segmentOffset = segmentProgress - segmentIndex

        const fromCity = roadPath.path[segmentIndex]
        const toCity = roadPath.path[Math.min(segmentIndex + 1, roadPath.path.length - 1)]
        const fromCoords = cityCoords[fromCity]
        const toCoords = cityCoords[toCity]

        if (fromCoords && toCoords) {
          const currentLat = fromCoords.lat + (toCoords.lat - fromCoords.lat) * segmentOffset
          const currentLon = fromCoords.lon + (toCoords.lon - fromCoords.lon) * segmentOffset
          position = { lat: currentLat, lon: currentLon }
        }

        origin = drivingState.route.from
        destination = drivingState.route.to
      }
    } else if (isMovingToTrailer) {
      isMoving = true
      status = 'Moving to Trailer'
    } else if (currentJob && !isMoving) {
      status = 'On Job'
      destination = currentJob.destination || truckLocation
      origin = currentJob.origin || truckLocation
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
    }
  }, [company])

  const trucks: TruckData[] = company?.trucks?.map(getTruckData) || []

  /**
   * initMap
   * @description Dynamically loads MapLibre and creates the map instance.
   */
  useEffect(() => {
    if (!mapContainer.current || mapInstanceRef.current) return

    const initMap = async () => {
      try {
        setIsLoading(true)

        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script')
          script.src = 'https://unpkg.com/maplibre-gl@2.4.0/dist/maplibre-gl.js'
          script.onload = () => resolve()
          script.onerror = reject
          document.head.appendChild(script)
        })

        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/maplibre-gl@2.4.0/dist/maplibre-gl.css'
        document.head.appendChild(link)

        const maplibregl = (window as any).maplibregl
        if (!maplibregl) throw new Error('MapLibre GL failed to load')

        const map = new maplibregl.Map({
          container: mapContainer.current!,
          style: {
            version: 8,
            sources: {
              osm: {
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
          center: [2.3522, 48.8566],
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
      } catch (err) {
        console.error('Map init error', err)
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

  /**
   * updateMarkersAndRoutes
   * @description Remove existing markers/layers and add new ones according to trucks[].
   */
  const updateMarkersAndRoutes = useCallback(() => {
    if (!mapInstanceRef.current) return
    const maplibregl = (window as any).maplibregl

    // remove old markers
    markersRef.current.forEach((m) => m.remove?.())
    markersRef.current = []

    // remove old route layers/sources
    Object.keys(routeLayersRef.current).forEach((id) => {
      if (mapInstanceRef.current.getLayer(id)) mapInstanceRef.current.removeLayer(id)
      if (mapInstanceRef.current.getSource(id)) mapInstanceRef.current.removeSource(id)
    })
    routeLayersRef.current = {}

    // add markers
    trucks.forEach((truck) => {
      const marker = new maplibregl.Marker({
        color: truck.isMoving ? '#f59e0b' : truck.status === 'On Job' ? '#10b981' : '#ef4444',
        scale: truck.isHighlighted ? 1.5 : truck.isMoving ? 1.4 : 1.2
      })
        .setLngLat([truck.position.lon, truck.position.lat])
        .addTo(mapInstanceRef.current)

      const popup = new maplibregl.Popup({ offset: 25, closeButton: false }).setHTML(`
        <div class="p-2">
          <h3 class="font-bold text-sm">${truck.name}</h3>
          <p class="text-xs">Status: <span class="font-medium">${truck.status}</span></p>
          <p class="text-xs">Route: ${truck.origin} → ${truck.destination}</p>
          ${truck.isMoving ? `<p class="text-xs text-amber-400">🚚 Live Position</p>
            <p class="text-xs">Progress: ${truck.routeProgress || 0}%</p>
            <p class="text-xs">Speed: ${truck.currentSpeed || 0} km/h</p>` : ''}
        </div>
      `)

      marker.setPopup(popup)
      markersRef.current.push(marker)
    })

    // add route layers for moving trucks
    trucks.forEach((truck) => {
      if (truck.isMoving && truck.origin !== truck.destination && truck.origin !== 'Current Location' && truck.destination !== 'Current Location') {
        const roadPath = getRoadPath(truck.origin, truck.destination)
        const routeId = `route-${truck.id}`
        if (roadPath.path.length > 1) {
          const pathCoords = roadPath.path.map((city) => {
            const c = cityCoords[city]
            return c ? [c.lon, c.lat] : null
          }).filter(Boolean) as [number, number][]

          if (pathCoords.length >= 2) {
            mapInstanceRef.current.addLayer({
              id: routeId,
              type: 'line',
              source: {
                type: 'geojson',
                data: {
                  type: 'Feature',
                  geometry: {
                    type: 'LineString',
                    coordinates: pathCoords
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
            routeLayersRef.current[routeId] = true
          }
        }
      }
    })
  }, [trucks])

  useEffect(() => {
    updateMarkersAndRoutes()
  }, [updateMarkersAndRoutes])

  useEffect(() => {
    const t = setInterval(() => triggerUpdate(), 1000)
    return () => clearInterval(t)
  }, [triggerUpdate])

  /**
   * highlightTruck
   * @description Mark a truck as highlighted and fly map to it.
   */
  const highlightTruck = (truckId: string) => {
    const updated = trucks.map((t) => ({ ...t, isHighlighted: t.id === truckId }))
    updateMarkersAndRoutes()
    const target = updated.find((t) => t.id === truckId)
    if (target && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo({ center: [target.position.lon, target.position.lat], zoom: 10, essential: true })
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
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-1">
            <button
              onClick={() => setViewMode('fleet')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'fleet' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              <Truck className="w-4 h-4 inline mr-2" />
              Fleet View
            </button>
            <button
              onClick={() => setViewMode('routes')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'routes' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              <Navigation className="w-4 h-4 inline mr-2" />
              Routes View
            </button>
          </div>
        </div>
      </div>

      {/* Map area (left) + right column with Truck List (Quick Actions hidden) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center space-x-2">
                <MapPin className="w-5 h-5" />
                <span>Live Fleet Map</span>
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Real-time tracking of {trucks.length} truck{trucks.length !== 1 ? 's' : ''}
                {trucks.filter((t) => t.isMoving).length > 0 ? ` (${trucks.filter((t) => t.isMoving).length} moving)` : ''}
              </p>
            </div>

            <div className="relative rounded-lg overflow-hidden" style={{ height: '600px' }}>
              {isLoading && (
                <div className="absolute inset-0 bg-slate-900 bg-opacity-75 flex items-center justify-center z-10">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
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

              <div ref={mapContainer} className="w-full h-full rounded-lg" style={{ backgroundColor: '#1e293b' }} />
            </div>
          </div>
        </div>

        {/* Right column: Truck List only (Quick Actions intentionally hidden) */}
        <div className="space-y-6">
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Truck List</h3>

            {trucks.length === 0 ? (
              <div className="text-center py-8">
                <Truck className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-400">No trucks in fleet</p>
                <p className="text-xs text-slate-500 mt-1">Purchase trucks to track them here</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[520px] overflow-y-auto">
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
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          truck.isMoving ? 'bg-amber-500 bg-opacity-20 text-amber-400' :
                          truck.status === 'On Job' ? 'bg-green-500 bg-opacity-20 text-green-400' :
                          'bg-slate-500 bg-opacity-20 text-slate-400'
                        }`}>
                          {truck.isMoving ? (truck.status === 'Moving to Trailer' ? 'Moving to Trailer' : 'Moving') : truck.status}
                        </span>
                        {truck.isHighlighted && <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />}
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

                      <div className="text-xs text-blue-400 mt-1">Click to center on map</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fleet Status - separate full-width box at the bottom */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Fleet Status</h3>

        <div className="space-y-4">
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
            <div className="text-2xl font-bold text-amber-400">{trucks.filter((t) => t.isMoving).length}</div>
          </div>

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
            <div className="text-2xl font-bold text-green-400">{trucks.filter((t) => t.status === 'On Job' && !t.isMoving).length}</div>
          </div>

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
            <div className="text-2xl font-bold text-slate-400">{trucks.filter((t) => !t.isMoving && t.status !== 'On Job').length}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Map