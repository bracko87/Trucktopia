/**
 * Freight offer card component with collapsible load section
 * Updated to display a "City" badge for in-city offers (origin === destination or flagged).
 */

import React, { useState } from 'react'
import { Button } from '../ui/button'
import { ChevronDown, ChevronUp, Truck, User, Weight, MapPin, DollarSign, Clock } from 'lucide-react'
import { getCountryCode } from '../../utils/countryMapping'
import { getCountryName } from '../../utils/countryNames'

/**
 * FreightOffer shape for component props
 */
interface FreightOffer {
  id: string
  title: string
  client: string
  value: number
  distance: number
  origin: string
  destination: string
  originCountry: string
  destinationCountry: string
  cargoType: string
  trailerType: string
  weight: number
  experience: number
  jobType: 'local' | 'state' | 'international' | string
  tags: string[]
  deadline: string
  allowPartialLoad: boolean
  remainingWeight: number
  cityJob?: boolean
}

/**
 * Props for FreightOfferCard
 */
interface FreightOfferCardProps {
  offer: FreightOffer
  onAcceptJob: (jobData: any, acceptedWeight: number) => void
}

/**
 * FreightOfferCard
 * Display a single freight offer with details and load selection.
 * Adds a small "City" badge next to title when the offer is an in-city offer.
 */
export default function FreightOfferCard({ offer, onAcceptJob }: FreightOfferCardProps) {
  const [selectedWeight, setSelectedWeight] = useState<number>(offer.remainingWeight)
  const [showLoadSection, setShowLoadSection] = useState(false)

  /**
   * calculatePrice
   * Calculate price for given weight using the same model the generator uses.
   */
  const calculatePrice = (weight: number) => {
    const baseRatePerKm = 2.5 // Base rate per km for trucking

    // Weight multipliers (economies of scale)
    let weightMultiplier = 1.0
    if (weight <= 8) weightMultiplier = 1.4  // Premium for small loads
    else if (weight <= 16) weightMultiplier = 1.0 // Standard
    else weightMultiplier = 0.8 // Economy for large loads

    // Job type multipliers (complexity and time)
    let jobMultiplier = 1.0
    if (offer.jobType === 'state') jobMultiplier = 1.6
    else if (offer.jobType === 'international') jobMultiplier = 2.2

    // Cargo type bonuses (special handling requirements)
    let cargoBonus = 1.0
    if ((offer.cargoType || '').includes('Frozen') || (offer.cargoType || '').includes('Refrigerated')) cargoBonus = 1.25
    if ((offer.cargoType || '').includes('Hazardous')) cargoBonus = 1.35
    if ((offer.cargoType || '').includes('Bulk')) cargoBonus = 1.1
    if ((offer.cargoType || '').includes('Construction')) cargoBonus = 1.15
    if ((offer.cargoType || '').includes('Heavy')) cargoBonus = 1.3

    // Calculate base price
    const basePrice = (offer.distance * baseRatePerKm) * weightMultiplier * jobMultiplier * cargoBonus

    // Add weight component (per ton)
    const weightComponent = weight * 15

    return Math.round(basePrice + weightComponent)
  }

  const handleWeightChange = (weight: number) => {
    setSelectedWeight(weight)
  }

  const handleAcceptJob = () => {
    if (selectedWeight > offer.remainingWeight) {
      alert('Cannot accept more weight than available')
      return
    }

    const calculatedValue = calculatePrice(selectedWeight)
    onAcceptJob({
      ...offer,
      calculatedValue
    }, selectedWeight)
  }

  const getExperienceColor = (exp: number) => {
    if (exp === 0) return 'text-green-400'
    if (exp <= 40) return 'text-orange-400'
    return 'text-purple-400'
  }

  const getJobTypeColor = (type: string) => {
    switch (type) {
      case 'local': return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'state': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'international': return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
    }
  }

  const getDeadlineColor = (deadline: string) => {
    if (deadline.includes('16h') || deadline.includes('22h') || deadline.includes('24h'))
      return 'text-red-400'
    if (deadline.includes('36h') || deadline.includes('48h'))
      return 'text-orange-400'
    return 'text-green-400'
  }

  const getAvailableWeightText = () => {
    if (offer.remainingWeight === offer.weight) {
      return `${offer.weight} tons available`
    }
    return `${offer.remainingWeight}/${offer.weight} tons available`
  }

  /**
   * getFlagUrl
   * Build a flag URL by country code. Defensive in case code is missing.
   */
  const getFlagUrl = (cityName: string) => {
    const countryCode = getCountryCode(cityName) || ''
    // If no country code, return a blank 1x1 to avoid broken image
    return countryCode ? `https://flagcdn.com/w40/${countryCode}.png` : 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='
  }

  /**
   * isCityOffer
   * Determine if this offer is an in-city job. Use multiple checks for robustness.
   */
  const isCityOffer = (): boolean => {
    if (offer.cityJob === true) return true
    if (Array.isArray(offer.tags) && offer.tags.includes('City')) return true
    if (typeof offer.origin === 'string' && typeof offer.destination === 'string' && offer.origin === offer.destination) return true
    return false
  }

  const isCity = isCityOffer()

  return (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 hover:border-slate-600 transition-all duration-200">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-xl font-bold text-white truncate">
              {offer.title}
              {/* City badge - small, unobtrusive pill */}
              {isCity && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-400 text-black">
                  City
                </span>
              )}
            </h3>
            {/* Deadline display */}
            <div className={`flex items-center gap-1 ${getDeadlineColor(offer.deadline)}`}>
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">{offer.deadline}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <User className="w-4 h-4" />
            <span className="text-sm">{offer.client}</span>
            <span className="text-xs text-slate-500">•</span>
            <span className="text-sm text-slate-500">{getAvailableWeightText()}</span>
          </div>
        </div>
        <div className="mt-2 lg:mt-0 lg:ml-4">
          <div className="text-2xl font-bold text-green-400 text-right">
            ${calculatePrice(selectedWeight).toLocaleString()}
          </div>
          <div className="text-sm text-slate-400 text-right">{offer.distance} km</div>
        </div>
      </div>

      {/* Locations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Origin */}
        <div className="flex items-center space-x-3 p-3 bg-slate-700/50 rounded-lg">
          <div className="flex-shrink-0">
            <MapPin className="w-5 h-5 text-green-400" />
          </div>
          <div className="flex items-center space-x-2 min-w-0 flex-1">
            <img
              src={getFlagUrl(offer.origin)}
              alt={getCountryCode(offer.origin)}
              className="w-6 h-4 object-cover rounded-sm flex-shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="text-white font-medium truncate">{offer.origin}</div>
              <div className="text-slate-400 text-sm truncate">{getCountryName(offer.origin)}</div>
            </div>
          </div>
        </div>

        {/* Destination */}
        <div className="flex items-center space-x-3 p-3 bg-slate-700/50 rounded-lg">
          <div className="flex-shrink-0">
            <MapPin className="w-5 h-5 text-red-400" />
          </div>
          <div className="flex items-center space-x-2 min-w-0 flex-1">
            <img
              src={getFlagUrl(offer.destination)}
              alt={getCountryCode(offer.destination)}
              className="w-6 h-4 object-cover rounded-sm flex-shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="text-white font-medium truncate">{offer.destination}</div>
              <div className="text-slate-400 text-sm truncate">{getCountryName(offer.destination)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {/* Cargo Type */}
        <div className="flex items-center space-x-2 p-2 bg-slate-700/30 rounded">
          <Truck className="w-4 h-4 text-blue-400" />
          <div className="min-w-0">
            <div className="text-slate-400 text-xs">Cargo</div>
            <div className="text-white text-sm font-medium truncate">{offer.cargoType}</div>
          </div>
        </div>

        {/* Trailer Type */}
        <div className="flex items-center space-x-2 p-2 bg-slate-700/30 rounded">
          <div className="w-4 h-4 flex items-center justify-center">
            <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
          </div>
          <div className="min-w-0">
            <div className="text-slate-400 text-xs">Trailer</div>
            <div className="text-white text-sm font-medium truncate">{offer.trailerType}</div>
          </div>
        </div>

        {/* Experience */}
        <div className="flex items-center space-x-2 p-2 bg-slate-700/30 rounded">
          <User className={`w-4 h-4 ${getExperienceColor(offer.experience)}`} />
          <div>
            <div className="text-slate-400 text-xs">Experience</div>
            <div className="text-white text-sm font-medium flex items-center gap-1">
              {offer.experience}+
              <div
                className="text-slate-500 cursor-help"
                title="Minimum driver experience level required (0-100 scale). Higher experience means better job completion and fewer accidents."
              >
                ⓘ
              </div>
            </div>
          </div>
        </div>

        {/* Weight - Clickable to expand/collapse */}
        <div
          className="flex items-center space-x-2 p-2 bg-slate-700/30 rounded cursor-pointer hover:bg-slate-700/50 transition-colors"
          onClick={() => offer.allowPartialLoad && setShowLoadSection(!showLoadSection)}
        >
          <Weight className="w-4 h-4 text-yellow-400" />
          <div className="flex-1">
            <div className="text-slate-400 text-xs">Available Weight</div>
            <div className="text-white text-sm font-medium flex items-center justify-between">
              <span>{offer.remainingWeight} tons</span>
              {offer.allowPartialLoad ? (
                showLoadSection ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )
              ) : (
                <div className="text-xs text-red-400">Full Load Only</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Collapsible Load Section - Only show for partial load allowed cargo */}
      {showLoadSection && offer.allowPartialLoad && (
        <div className="mb-4 p-4 bg-slate-700/30 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="text-slate-300 font-medium">Load Selection</div>
            <div className="text-green-400 font-bold">
              ${calculatePrice(selectedWeight).toLocaleString()}
            </div>
          </div>

          <div className="space-y-3">
            {/* Weight Slider */}
            <div>
              <div className="flex justify-between text-sm text-slate-400 mb-2">
                <span>Select weight to transport:</span>
                <span>{selectedWeight} / {offer.remainingWeight} tons</span>
              </div>
              <input
                type="range"
                min="2"
                max={offer.remainingWeight}
                step="2"
                value={selectedWeight}
                onChange={(e) => handleWeightChange(Number(e.target.value))}
                className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>2t</span>
                <span>{offer.remainingWeight}t</span>
              </div>
            </div>

            {/* Quick Select Buttons */}
            <div className="flex flex-wrap gap-2">
              {[2, 4, 6, 8, 10, 12, 14, 16, 18, 20, offer.remainingWeight]
                .filter(w => w <= offer.remainingWeight)
                .map((weight) => (
                  <Button
                    key={weight}
                    variant={selectedWeight === weight ? "default" : "outline"}
                    onClick={() => handleWeightChange(weight)}
                    className={`h-9 px-3 text-xs bg-transparent ${
                      selectedWeight === weight ? 'bg-blue-600 text-white' : ''
                    }`}
                  >
                    {weight}t
                  </Button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          <div className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold ${getJobTypeColor(offer.jobType)}`}>
            {offer.jobType.charAt(0).toUpperCase() + offer.jobType.slice(1)}
          </div>
          {offer.tags.map((tag, index) => (
            <div
              key={index}
              className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold bg-slate-500/20 text-slate-400 border-slate-500/30"
            >
              {tag}
            </div>
          ))}
        </div>

        {/* Action Button */}
        <Button
          onClick={handleAcceptJob}
          className="h-10 px-4 py-2 bg-green-600 hover:bg-green-700 text-white border-green-500/30"
        >
          <DollarSign className="w-4 h-4 mr-2" />
          {selectedWeight === offer.remainingWeight ? 'Accept Full Load' : `Accept ${selectedWeight}t Load`}
        </Button>
      </div>
    </div>
  )
}