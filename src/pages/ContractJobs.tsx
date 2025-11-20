/**
 * Contract Jobs page - Professional bidding system with detailed cost analysis
 * Features: Proper cargo-trailer compatibility, profit calculations, cost breakdowns
 */

import React, { useState, useEffect } from 'react';
import { useGame } from '../contexts/GameContext';
import { Search, RefreshCw, Briefcase, DollarSign, Star, Filter, MapPin, Package, Clock, Users, Trophy, AlertCircle, Check, Truck, Calculator, TrendingUp, AlertTriangle } from 'lucide-react';

// Import compatibility system
import { trailerTypes, cargoTypes, isCompatibleCargoTrailer, hasRequiredLicense } from '../utils/cargoTrailerCompatibility';

// Contract type definitions with realistic parameters
export interface ContractJob {
  id: string;
  title: string;
  provider: string;
  providerType: 'state' | 'private';
  contractType: 'infrastructure' | 'reconstruction' | 'urgent-transport' | 'long-term' | 'specialized' | 'medical-supply' | 'food-distribution' | 'industrial-logistics';
  currency: 'USD' | 'EUR';
  value: number;
  budget: number;
  location: string;
  country: string;
  requirements: {
    duration: number;
    trucks: number;
    drivers: number;
    trailerType: string;
    cargoType: string;
    cargoDescription: string;
    frequency: 'daily' | 'weekly' | 'monthly';
    equipmentRequired: {
      trucks: number;
      trailers: number;
      drivers: number;
    };
    licenses: string[];
    insurance: number;
  };
  financial?: {
    totalRevenue: number;
    operatingCosts: {
      fuel: number;
      maintenance: number;
      insurance: number;
      driverSalaries: number;
      trailerDepreciation: number;
      administrative: number;
    };
    totalCosts: number;
    estimatedProfit: number;
    profitMargin: number;
    monthlyRevenue: number;
    monthlyCosts: number;
    dailyRate: number;
    costPerOperation: number;
  };
  description: string;
  competition: {
    participants: number;
    currentBestBid: number | null;
    endTime: string;
    status: 'active' | 'awarded' | 'expired';
  };
  createdAt: string;
  awardedTo?: string;
  bidHistory?: Array<{
    companyId: string;
    companyName: string;
    bidAmount: number;
    bidTime: string;
  }>;
}

// Contract providers
const stateProviders = [
  'State Transport Authority', 'National Infrastructure Ministry', 'Public Works Department',
  'Regional Development Office', 'National Logistics Agency', 'State Construction Corporation',
  'Highway Authority', 'Railway Network Agency', 'Medical Supply Authority',
  'Food Distribution Agency', 'Emergency Services Department'
];

const privateProviders = [
  'Global Logistics Solutions', 'Express Freight International', 'Prime Transport Services',
  'EuroCargo Corporation', 'Continental Shipping', 'Advanced Logistics Group',
  'FastTrack Transport', 'MegaFreight Services', 'ProCargo Logistics',
  'Swift Delivery Systems', 'Reliable Transport Co.', 'International Freight Masters',
  'Medical Supply Chain Co.', 'Food Logistics International'
];

// Contract templates with proper cargo-trailer combinations
const contractTemplates = {
  'infrastructure': {
    titles: [
      'Highway Construction Materials Transport',
      'Railway Network Supply Chain', 
      'Airport Infrastructure Logistics',
      'Bridge Building Materials Delivery',
      'Road Construction Equipment Transport'
    ],
    cargoTypes: ['heavy-machinery-oversized', 'construction-material'],
    trailerTypes: ['lowboy-trailer', 'flatbed-trailer', 'curtainside-trailer'],
    descriptions: [
      'Transport heavy construction materials for infrastructure projects',
      'Supply logistics for railway and highway construction',
      'Handle equipment and material delivery for infrastructure development'
    ]
  },
  'medical-supply': {
    titles: [
      'Hospital Equipment Distribution',
      'Pharmaceutical Supply Chain',
      'Medical Device Transportation',
      'Emergency Medical Supply Transport'
    ],
    cargoTypes: ['dry-goods', 'frozen-refrigerated'],
    trailerTypes: ['box-trailer', 'reefer-trailer'],
    descriptions: [
      'Transport sensitive medical equipment and pharmaceuticals',
      'Handle temperature-controlled medical supply distribution',
      'Deliver critical medical devices to healthcare facilities'
    ]
  },
  'food-distribution': {
    titles: [
      'Food Bank Distribution Network',
      'Supermarket Chain Supply',
      'Fresh Produce Transportation',
      'Refrigerated Food Distribution'
    ],
    cargoTypes: ['frozen-refrigerated', 'dry-goods', 'agricultural-bulk'],
    trailerTypes: ['reefer-trailer', 'box-trailer', 'hopper-bottom-trailer'],
    descriptions: [
      'Distribute food supplies to various locations',
      'Transport fresh and frozen food products',
      'Handle agricultural bulk food distribution'
    ]
  },
  'industrial-logistics': {
    titles: [
      'Manufacturing Plant Supply Chain',
      'Industrial Equipment Transport',
      'Factory Material Distribution',
      'Production Line Logistics'
    ],
    cargoTypes: ['heavy-machinery-oversized', 'liquid-industrial-chemical', 'dry-goods'],
    trailerTypes: ['flatbed-trailer', 'industrial-tanker', 'box-trailer'],
    descriptions: [
      'Support manufacturing with regular material supply',
      'Transport industrial equipment and materials',
      'Handle factory-to-warehouse distribution'
    ]
  },
  'reconstruction': {
    titles: [
      'Urban Reconstruction Logistics',
      'Historic District Restoration Transport',
      'City Renewal Material Supply',
      'Building Reconstruction Support'
    ],
    cargoTypes: ['construction-material', 'dry-goods'],
    trailerTypes: ['curtainside-trailer', 'box-trailer'],
    descriptions: [
      'Transport materials for urban reconstruction projects',
      'Handle logistics for building renovation and restoration'
    ]
  },
  'urgent-transport': {
    titles: [
      'Emergency Equipment Transport',
      'Critical Infrastructure Parts Delivery',
      'Urgent Relief Supplies Transport',
      'Time-Critical Industrial Components'
    ],
    cargoTypes: ['dry-goods', 'vehicles', 'heavy-machinery-oversized'],
    trailerTypes: ['box-trailer', 'car-carrier', 'flatbed-trailer'],
    descriptions: [
      'Handle urgent time-critical transportation needs',
      'Transport emergency equipment and supplies'
    ]
  },
  'long-term': {
    titles: [
      'Annual Government Supply Contract',
      'Long-term School Materials Transport',
      'Multi-year Hospital Supply Chain',
      'Extended Government Service Contract'
    ],
    cargoTypes: ['dry-goods', 'frozen-refrigerated'],
    trailerTypes: ['box-trailer', 'reefer-trailer'],
    descriptions: [
      'Provide long-term transportation services',
      'Handle extended supply chain contracts'
    ]
  },
  'specialized': {
    titles: [
      'Hazardous Materials Transport',
      'Oversized Load Specialized Services',
      'Temperature-Controlled Supply Chain',
      'Livestock Transportation Services'
    ],
    cargoTypes: ['hazardous-materials', 'heavy-machinery-oversized', 'frozen-refrigerated', 'livestock'],
    trailerTypes: ['industrial-tanker', 'lowboy-trailer', 'reefer-trailer', 'livestock-trailer'],
    descriptions: [
      'Handle specialized transportation requirements',
      'Provide expert services for unique cargo needs'
    ]
  }
};

// Realistic cost calculation engine
const calculateContractFinancials = (
  contractValue: number,
  duration: number,
  trucks: number,
  drivers: number,
  trailerType: string,
  frequency: 'daily' | 'weekly' | 'monthly'
) => {
  try {
    // Calculate number of operations
    let operationsPerMonth = 0;
    switch (frequency) {
      case 'daily': operationsPerMonth = 22;
        break;
      case 'weekly': operationsPerMonth = 4;
        break;
      case 'monthly': operationsPerMonth = 1;
        break;
      default: operationsPerMonth = 4;
    }

    const totalOperations = operationsPerMonth * duration;
    
    // Trailer specifications
    const trailer = trailerTypes[trailerType] || { name: 'Standard Trailer' };
    
    // Operating costs (realistic estimates per operation)
    const costs = {
      fuel: 250 * trucks,
      maintenance: 80 * trucks,
      insurance: 150 * trucks,
      driverSalaries: (3500 * drivers) / operationsPerMonth,
      trailerDepreciation: (50000 * trucks) / (12 * 60),
      administrative: 200,
    };

    // Calculate costs per operation
    const costPerOperation = Object.values(costs).reduce((a, b) => a + b, 0);
    
    // Monthly and total costs
    const monthlyCosts = costPerOperation * operationsPerMonth;
    const totalCosts = monthlyCosts * duration;
    
    // Revenue calculations
    const monthlyRevenue = contractValue / duration;
    const dailyRate = monthlyRevenue / operationsPerMonth;
    
    // Profit calculations
    const estimatedProfit = contractValue - totalCosts;
    const profitMargin = (estimatedProfit / contractValue) * 100;

    return {
      totalRevenue: contractValue,
      operatingCosts: costs,
      totalCosts,
      estimatedProfit,
      profitMargin,
      monthlyRevenue,
      monthlyCosts,
      dailyRate,
      costPerOperation
    };
  } catch (error) {
    console.error('Error calculating financials:', error);
    return {
      totalRevenue: contractValue,
      operatingCosts: {
        fuel: 1000,
        maintenance: 500,
        insurance: 300,
        driverSalaries: 2000,
        trailerDepreciation: 500,
        administrative: 200
      },
      totalCosts: contractValue * 0.7,
      estimatedProfit: contractValue * 0.3,
      profitMargin: 30,
      monthlyRevenue: contractValue / 12,
      monthlyCosts: (contractValue * 0.7) / 12,
      dailyRate: contractValue / 300,
      costPerOperation: (contractValue * 0.7) / 300
    };
  }
};

// Generate realistic contract jobs
const generateContractJobsForCountry = (country: string): ContractJob[] => {
  try {
    const contracts: ContractJob[] = [];
    const contractCount = Math.floor(Math.random() * 3) + 2;
    
    for (let i = 0; i < contractCount; i++) {
      const isState = Math.random() < 0.6;
      const providerType = isState ? 'state' : 'private';
      const providers = isState ? stateProviders : privateProviders;
      
      const contractTypeKeys = Object.keys(contractTemplates) as Array<keyof typeof contractTemplates>;
      const contractType = contractTypeKeys[Math.floor(Math.random() * contractTypeKeys.length)];
      
      const template = contractTemplates[contractType];
      if (!template) continue;
      
      const title = template.titles[Math.floor(Math.random() * template.titles.length)];
      const description = template.descriptions[Math.floor(Math.random() * template.descriptions.length)];
      
      // Select compatible cargo and trailer
      const cargoType = template.cargoTypes[Math.floor(Math.random() * template.cargoTypes.length)];
      const compatibleTrailers = template.trailerTypes.filter(trailer => 
        isCompatibleCargoTrailer(cargoType, trailer)
      );
      const trailerType = compatibleTrailers[Math.floor(Math.random() * compatibleTrailers.length)];
      
      // Generate realistic contract parameters
      const durationOptions = [3, 6, 12, 24];
      const duration = durationOptions[Math.floor(Math.random() * durationOptions.length)];
      
      const trucks = Math.floor(Math.random() * 3) + 1;
      const drivers = trucks * Math.floor(Math.random() * 2) + 1;
      
      const frequencyOptions: Array<'daily' | 'weekly' | 'monthly'> = ['daily', 'weekly', 'monthly'];
      const frequency = frequencyOptions[Math.floor(Math.random() * frequencyOptions.length)];
      
      // Calculate realistic contract value based on scope
      let baseValue = 0;
      switch (contractType) {
        case 'medical-supply':
          baseValue = 50000 + Math.random() * 100000;
          break;
        case 'infrastructure':
          baseValue = 80000 + Math.random() * 120000;
          break;
        case 'food-distribution':
          baseValue = 40000 + Math.random() * 80000;
          break;
        case 'industrial-logistics':
          baseValue = 60000 + Math.random() * 90000;
          break;
        case 'hazardous-materials':
          baseValue = 100000 + Math.random() * 100000;
          break;
        case 'urgent-transport':
          baseValue = 30000 + Math.random() * 70000;
          break;
        case 'long-term':
          baseValue = 20000 * duration;
          break;
        default:
          baseValue = 40000 + Math.random() * 60000;
      }
      
      const contractValue = Math.round(baseValue * (duration / 6));
      const budget = Math.round(contractValue * 1.1);
      
      // Calculate financial breakdown
      const financial = calculateContractFinancials(
        contractValue,
        duration,
        trucks,
        drivers,
        trailerType,
        frequency
      );
      
      // Determine license requirements
      const licenses = ['C'];
      const cargo = cargoTypes[cargoType];
      if (cargo?.oversized) licenses.push('CE');
      if (cargo?.hazardous) licenses.push('ADR');
      if (cargo?.liquid) licenses.push('Tanker');
      
      const contract: ContractJob = {
        id: `contract-${country}-${Date.now()}-${i}`,
        title,
        provider: providers[Math.floor(Math.random() * providers.length)],
        providerType,
        contractType,
        currency: 'USD',
        value: contractValue,
        budget,
        location: country,
        country,
        requirements: {
          duration: duration || 6,
          trucks: trucks || 1,
          drivers: drivers || 1,
          trailerType: trailerType || 'box-trailer',
          cargoType: cargoType || 'dry-goods',
          cargoDescription: cargo?.name || 'General cargo',
          frequency: frequency || 'weekly',
          equipmentRequired: {
            trucks: trucks || 1,
            trailers: trucks || 1,
            drivers: drivers || 1
          },
          licenses: licenses || ['C'],
          insurance: 1000000
        },
        financial,
        description,
        competition: {
          participants: Math.floor(Math.random() * 4) + 1,
          currentBestBid: Math.floor(Math.random() * 3) === 0 ? null : Math.round(contractValue * (0.85 + Math.random() * 0.1)),
          endTime: new Date(Date.now() + (Math.random() * 5 + 2) * 24 * 60 * 60 * 1000).toISOString(),
          status: 'active'
        },
        createdAt: new Date().toISOString()
      };
      
      contracts.push(contract);
    }
    
    return contracts;
  } catch (error) {
    console.error('Error generating contracts:', error);
    return [];
  }
};

const ContractJobs: React.FC = () => {
  const { gameState } = useGame();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'state' | 'private'>('all');
  const [selectedContractType, setSelectedContractType] = useState<'all' | 'infrastructure' | 'reconstruction' | 'urgent-transport' | 'long-term' | 'specialized' | 'medical-supply' | 'food-distribution' | 'industrial-logistics'>('all');
  const [loading, setLoading] = useState(false);
  const [contractJobs, setContractJobs] = useState<ContractJob[]>([]);
  const [userBid, setUserBid] = useState<{ [key: string]: number }>({});
  const [selectedContract, setSelectedContract] = useState<ContractJob | null>(null);

  // Load contract jobs based on user's country
  useEffect(() => {
    if (gameState?.company) {
      loadContractJobs();
    }
  }, [gameState?.company?.hub?.country]);

  const loadContractJobs = () => {
    setLoading(true);
    try {
      const country = gameState?.company?.hub?.country || '';
      
      if (!country) {
        setContractJobs([]);
        return;
      }
      
      // Check if contracts for this country were generated this week
      const now = new Date();
      const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
      const storageKey = `tm_contracts_${country}_${weekStart.toISOString().split('T')[0]}`;
      
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        if (new Date(data.generatedAt).getTime() > weekStart.getTime()) {
          setContractJobs(data.contracts || []);
          return;
        }
      }
      
      // Generate new contracts for this week
      const newContracts = generateContractJobsForCountry(country);
      const storageData = {
        contracts: newContracts,
        generatedAt: now.toISOString()
      };
      
      localStorage.setItem(storageKey, JSON.stringify(storageData));
      setContractJobs(newContracts);
    } catch (error) {
      console.error('Error loading contract jobs:', error);
      setContractJobs([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter contract jobs
  const filteredContracts = contractJobs.filter(job => {
    if (!job) return false;
    
    if (selectedType !== 'all' && job.providerType !== selectedType) return false;
    if (selectedContractType !== 'all' && job.contractType !== selectedContractType) return false;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return (
        job.title?.toLowerCase().includes(query) ||
        job.provider?.toLowerCase().includes(query) ||
        job.location?.toLowerCase().includes(query) ||
        job.description?.toLowerCase().includes(query) ||
        job.requirements?.cargoDescription?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Check if user can participate in contract
  const canParticipate = (job: ContractJob): boolean => {
    if (!gameState?.company || !job?.requirements) return false;
    
    const hasRequiredTrucks = (gameState.company.trucks || []).length >= (job.requirements.trucks || 0);
    const hasRequiredTrailers = (gameState.company.trailers || []).some(t => 
      t.type === job.requirements?.trailerType
    );
    
    return hasRequiredTrucks && hasRequiredTrailers;
  };

  // Check if company has compatible equipment
  const hasCompatibleEquipment = (job: ContractJob): boolean => {
    if (!gameState?.company || !job?.requirements) return false;
    
    // Check driver licenses
    const hasLicensedDrivers = (gameState.company.staff || [])
      .filter(s => s.role === 'driver')
      .some(driver => hasRequiredLicense(
        driver.licenses || [], 
        job.requirements?.cargoType || '', 
        job.requirements?.trailerType || ''
      ));
    
    // Check equipment availability
    const hasTrailers = (gameState.company.trailers || []).some(t => 
      t.type === job.requirements?.trailerType
    );
    
    return hasLicensedDrivers && hasTrailers;
  };

  // Place bid on contract
  const placeBid = (job: ContractJob, bidAmount: number) => {
    if (!gameState?.company) return;
    
    if (job.budget && bidAmount > job.budget) {
      alert('Your bid exceeds the contract budget!');
      return;
    }
    
    if (!hasCompatibleEquipment(job)) {
      alert('You do not have the required equipment or licensed drivers for this contract!');
      return;
    }
    
    try {
      // Update contract with user's bid
      const updatedJobs = contractJobs.map(contract => {
        if (contract.id === job.id) {
          const updatedContract = { ...contract };
          
          // Add to bid history
          const newBid = {
            companyId: gameState.company?.id || '',
            companyName: gameState.company?.name || '',
            bidAmount,
            bidTime: new Date().toISOString()
          };
          
          updatedContract.bidHistory = [
            ...(contract.bidHistory || []),
            newBid
          ];
          
          // Update competition
          updatedContract.competition = {
            ...contract.competition,
            currentBestBid: bidAmount,
            participants: (contract.competition?.participants || 0) + 1
          };
          
          return updatedContract;
        }
        return contract;
      });
      
      setContractJobs(updatedJobs);
      
      // Save to localStorage
      const country = gameState.company?.hub?.country || '';
      const now = new Date();
      const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
      const storageKey = `tm_contracts_${country}_${weekStart.toISOString().split('T')[0]}`;
      
      const storageData = {
        contracts: updatedJobs,
        generatedAt: now.toISOString()
      };
      
      localStorage.setItem(storageKey, JSON.stringify(storageData));
      
      alert(`Your bid of $${bidAmount.toLocaleString()} has been submitted successfully!`);
    } catch (error) {
      console.error('Error placing bid:', error);
      alert('Error placing bid. Please try again.');
    }
  };

  // Get contract type color
  const getContractTypeColor = (type: string): string => {
    const colors = {
      'infrastructure': 'text-blue-400 bg-blue-400/10',
      'reconstruction': 'text-orange-400 bg-orange-400/10',
      'urgent-transport': 'text-red-400 bg-red-400/10',
      'long-term': 'text-green-400 bg-green-400/10',
      'specialized': 'text-purple-400 bg-purple-400/10',
      'medical-supply': 'text-pink-400 bg-pink-400/10',
      'food-distribution': 'text-yellow-400 bg-yellow-400/10',
      'industrial-logistics': 'text-cyan-400 bg-cyan-400/10'
    };
    return colors[type as keyof typeof colors] || 'text-slate-400 bg-slate-400/10';
  };

  // Get profit margin color
  const getProfitColor = (margin: number): string => {
    if (margin >= 20) return 'text-green-400';
    if (margin >= 10) return 'text-yellow-400';
    if (margin >= 5) return 'text-orange-400';
    return 'text-red-400';
  };

  // Calculate time remaining
  const getTimeRemaining = (endTime: string): string => {
    try {
      const now = new Date().getTime();
      const end = new Date(endTime).getTime();
      const diff = end - now;
      
      if (diff <= 0) return 'Expired';
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      if (days > 0) return `${days}d ${hours}h`;
      if (hours > 0) return `${hours}h ${minutes}m`;
      return `${minutes}m`;
    } catch {
      return 'Unknown';
    }
  };

  if (!gameState?.company) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Briefcase className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">No Company Data</h2>
          <p className="text-slate-400">Please create a company first to access contract jobs</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Contract Jobs</h1>
          <p className="text-slate-400">Professional logistics contracts with detailed cost analysis</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-slate-400">Company Balance</div>
          <div className="text-2xl font-bold text-green-400">${gameState.company.capital?.toLocaleString() || 0}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
            <Filter className="w-5 h-5" />
            <span>Filters</span>
          </h3>
          <button
            onClick={loadContractJobs}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search contracts..."
                className="w-full bg-slate-700 border border-slate-600 rounded-lg pl-10 pr-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Provider Type</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as any)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Providers</option>
              <option value="state">State Contracts</option>
              <option value="private">Private Companies</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Contract Type</label>
            <select
              value={selectedContractType}
              onChange={(e) => setSelectedContractType(e.target.value as any)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="infrastructure">Infrastructure</option>
              <option value="medical-supply">Medical Supply</option>
              <option value="food-distribution">Food Distribution</option>
              <option value="industrial-logistics">Industrial Logistics</option>
              <option value="reconstruction">Reconstruction</option>
              <option value="urgent-transport">Urgent Transport</option>
              <option value="long-term">Long-term</option>
              <option value="specialized">Specialized</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Min Contract Value</label>
            <select className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="0">$0+</option>
              <option value="25000">$25,000+</option>
              <option value="50000">$50,000+</option>
              <option value="100000">$100,000+</option>
            </select>
          </div>
        </div>
      </div>

      {/* Contract Jobs Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredContracts.length === 0 ? (
            <div className="text-center py-12">
              <Briefcase className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">No Contracts Found</h3>
              <p className="text-slate-400">No contract offers match your current filters.</p>
            </div>
          ) : (
            filteredContracts.map((job) => {
              const userCanParticipate = canParticipate(job);
              const hasCompatible = hasCompatibleEquipment(job);
              const currentBid = userBid[job.id] || job.competition?.currentBestBid;
              const timeRemaining = getTimeRemaining(job.competition?.endTime || '');
              
              return (
                <div key={job.id} className={`bg-slate-800 rounded-xl border ${userCanParticipate ? 'border-slate-700 hover:border-blue-500/50' : 'border-gray-700 opacity-60'} transition-all duration-200`}>
                  {/* Header */}
                  <div className="p-4 pb-3 border-b border-slate-700">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-bold text-white text-lg">{job.title}</h3>
                        <p className="text-slate-400 text-sm">{job.provider}</p>
                      </div>
                      <div className="flex flex-col items-end space-y-1">
                        <div className="text-xl font-bold text-green-400">${job.budget?.toLocaleString() || 0}</div>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${job.providerType === 'state' ? 'text-purple-400 bg-purple-400/10' : 'text-blue-400 bg-blue-400/10'}`}>
                          {job.providerType === 'state' ? 'State Contract' : 'Private Contract'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className={`px-2 py-1 rounded text-xs font-medium ${getContractTypeColor(job.contractType)}`}>
                        {job.contractType?.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </div>
                      <div className="flex items-center space-x-2">
                        {!hasCompatible && (
                          <div className="flex items-center space-x-1 text-yellow-400">
                            <AlertTriangle className="w-4 h-4" />
                            <span className="text-xs">Equipment Required</span>
                          </div>
                        )}
                        <div className="text-xs text-slate-400">{timeRemaining} left</div>
                      </div>
                    </div>
                  </div>

                  {/* Contract Details */}
                  <div className="p-4">
                    <div className="text-sm text-slate-400 mb-3">{job.description}</div>
                    
                    {/* Requirements Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-4">
                      <div className="flex items-center space-x-2">
                        <Truck className="w-4 h-4 text-blue-400" />
                        <span className="text-slate-300">{job.requirements?.trucks || 0} Trucks</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4 text-green-400" />
                        <span className="text-slate-300">{job.requirements?.drivers || 0} Drivers</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Package className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-300">{job.requirements?.cargoDescription || 'General cargo'}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-yellow-400" />
                        <span className="text-slate-300">{job.requirements?.duration || 0} months</span>
                      </div>
                    </div>

                    {/* Equipment Requirements */}
                    <div className="bg-slate-700 rounded-lg p-3 mb-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                        <div>
                          <span className="text-slate-400">Required Trailer:</span>
                          <div className="text-white font-medium">{job.requirements?.trailerType || 'Standard'}</div>
                        </div>
                        <div>
                          <span className="text-slate-400">Frequency:</span>
                          <div className="text-white font-medium capitalize">{job.requirements?.frequency || 'weekly'}</div>
                        </div>
                        <div>
                          <span className="text-slate-400">Licenses:</span>
                          <div className="text-white font-medium">{job.requirements?.licenses?.join(', ') || 'No licenses required'}</div>
                        </div>
                      </div>
                    </div>

                    {/* Financial Breakdown */}
                    {job.financial && (
                      <div className="bg-slate-700 rounded-lg p-3 mb-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-white flex items-center space-x-1">
                            <Calculator className="w-4 h-4 text-green-400" />
                            <span>Financial Analysis</span>
                          </span>
                          <button
                            onClick={() => setSelectedContract(job)}
                            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            View Details
                          </button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                          <div>
                            <span className="text-slate-400">Contract Value:</span>
                            <div className="text-white font-medium">${(job.financial.totalRevenue || 0).toLocaleString()}</div>
                          </div>
                          <div>
                            <span className="text-slate-400">Monthly Revenue:</span>
                            <div className="text-white font-medium">${Math.round(job.financial.monthlyRevenue || 0).toLocaleString()}</div>
                          </div>
                          <div>
                            <span className="text-slate-400">Estimated Profit:</span>
                            <div className={`font-medium ${getProfitColor(job.financial.profitMargin || 0)}`}>
                              ${Math.round(job.financial.estimatedProfit || 0).toLocaleString()}
                            </div>
                          </div>
                          <div>
                            <span className="text-slate-400">Profit Margin:</span>
                            <div className={`font-medium ${getProfitColor(job.financial.profitMargin || 0)}`}>
                              {(job.financial.profitMargin || 0).toFixed(1)}%
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Competition Section */}
                    <div className="bg-slate-700 rounded-lg p-3 mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-white flex items-center space-x-1">
                          <Trophy className="w-4 h-4 text-yellow-400" />
                          <span>Competition</span>
                        </span>
                        <span className="text-xs text-slate-400">{timeRemaining} left</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="text-slate-300">
                          <strong>Participants:</strong> {job.competition?.participants || 0}
                        </div>
                        <div className="text-slate-300">
                          <strong>Current Best:</strong> {job.competition?.currentBestBid ? `${job.competition.currentBestBid.toLocaleString()}` : 'No bids yet'}
                        </div>
                      </div>
                    </div>

                    {/* Bidding Section */}
                    {hasCompatible ? (
                      <div className="flex items-center justify-between pt-3 border-t border-slate-700">
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            value={userBid[job.id] || ''}
                            onChange={(e) => setUserBid({ ...userBid, [job.id]: Number(e.target.value) })}
                            placeholder="Your bid"
                            className="w-32 bg-slate-600 border border-slate-500 rounded px-2 py-1 text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            max={job.budget || 0}
                          />
                          <span className="text-xs text-slate-400">Max: ${(job.budget || 0).toLocaleString()}</span>
                        </div>
                        <button
                          onClick={() => placeBid(job, currentBid || 0)}
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center space-x-1"
                        >
                          <Check className="w-4 h-4" />
                          <span>Place Bid</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center pt-3 border-t border-slate-700">
                        <span className="text-yellow-400 text-sm">⚠️ Requires {job.requirements?.trailerType} and licensed drivers</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Detailed Financial Modal */}
      {selectedContract && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Contract Financial Analysis</h2>
                <button
                  onClick={() => setSelectedContract(null)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  ×
                </button>
              </div>
              
              {/* Contract Overview */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-2">{selectedContract.title}</h3>
                <p className="text-slate-400 mb-3">{selectedContract.description}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <span className="text-slate-400">Duration:</span>
                    <div className="text-white font-medium">{selectedContract.requirements?.duration || 0} months</div>
                  </div>
                  <div>
                    <span className="text-slate-400">Frequency:</span>
                    <div className="text-white font-medium capitalize">{selectedContract.requirements?.frequency || 'weekly'}</div>
                  </div>
                  <div>
                    <span className="text-slate-400">Total Operations:</span>
                    <div className="text-white font-medium">
                      {selectedContract.requirements?.frequency === 'daily' ? 22 * (selectedContract.requirements?.duration || 0) :
                       selectedContract.requirements?.frequency === 'weekly' ? 4 * (selectedContract.requirements?.duration || 0) :
                       selectedContract.requirements?.duration || 0} operations
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400">Daily Rate:</span>
                    <div className="text-white font-medium">${Math.round(selectedContract.financial?.dailyRate || 0).toLocaleString()}</div>
                  </div>
                </div>
              </div>

              {/* Financial Details */}
              {selectedContract.financial && (
                <>
                  {/* Cost Breakdown */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="bg-slate-700 rounded-lg p-4">
                      <h4 className="text-white font-semibold mb-3 flex items-center space-x-2">
                        <TrendingUp className="w-5 h-5 text-green-400" />
                        <span>Revenue Breakdown</span>
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Total Contract Value:</span>
                          <span className="text-white font-medium">${(selectedContract.financial.totalRevenue || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Monthly Revenue:</span>
                          <span className="text-white font-medium">${Math.round(selectedContract.financial.monthlyRevenue || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Daily Rate:</span>
                          <span className="text-white font-medium">${Math.round(selectedContract.financial.dailyRate || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-700 rounded-lg p-4">
                      <h4 className="text-white font-semibold mb-3 flex items-center space-x-2">
                        <Calculator className="w-5 h-5 text-red-400" />
                        <span>Operating Costs</span>
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Fuel (per operation):</span>
                          <span className="text-white font-medium">${(selectedContract.financial.operatingCosts?.fuel || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Maintenance (per operation):</span>
                          <span className="text-white font-medium">${(selectedContract.financial.operatingCosts?.maintenance || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Driver Salaries (per operation):</span>
                          <span className="text-white font-medium">${Math.round(selectedContract.financial.operatingCosts?.driverSalaries || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Insurance (per month):</span>
                          <span className="text-white font-medium">${(selectedContract.financial.operatingCosts?.insurance || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Other Costs (per operation):</span>
                          <span className="text-white font-medium">${(selectedContract.financial.operatingCosts?.administrative || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between border-t border-slate-600 pt-2 mt-2">
                          <span className="text-slate-400">Total Monthly Costs:</span>
                          <span className="text-white font-medium">${Math.round(selectedContract.financial.monthlyCosts || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Profit Analysis */}
                  <div className="bg-slate-700 rounded-lg p-4 mb-6">
                    <h4 className="text-white font-semibold mb-3">Profit Analysis</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-400">
                          ${Math.round(selectedContract.financial.estimatedProfit || 0).toLocaleString()}
                        </div>
                        <div className="text-sm text-slate-400">Estimated Profit</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-400">
                          {(selectedContract.financial.profitMargin || 0).toFixed(1)}%
                        </div>
                        <div className="text-sm text-slate-400">Profit Margin</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-400">
                          ${Math.round((selectedContract.financial.dailyRate || 0) - (selectedContract.financial.costPerOperation || 0)).toLocaleString()}
                        </div>
                        <div className="text-sm text-slate-400">Daily Profit</div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Equipment Requirements */}
              <div className="bg-slate-700 rounded-lg p-4">
                <h4 className="text-white font-semibold mb-3">Equipment & License Requirements</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-400">Required Equipment:</span>
                    <div className="text-white mt-1">
                      {selectedContract.requirements?.equipmentRequired?.trucks || 0} Trucks,
                      {selectedContract.requirements?.equipmentRequired?.trailers || 0} {selectedContract.requirements?.trailerType || 'Standard'},
                      {selectedContract.requirements?.equipmentRequired?.drivers || 0} Licensed Drivers
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400">Required Licenses:</span>
                    <div className="text-white mt-1">{selectedContract.requirements?.licenses?.join(', ') || 'No licenses required'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContractJobs;