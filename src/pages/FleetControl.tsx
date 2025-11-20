/**
 * Fleet Control page for administrators to manage all users' trucks and trailers across the system
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useGame } from '../contexts/GameContext';
import { Truck, Package, Users, Search, Filter, Edit, Trash2, AlertTriangle, CheckCircle, RefreshCw, Wrench, Fuel, MapPin, DollarSign, UserCog, Shield, Download, Upload } from 'lucide-react';

interface SystemTruck {
  id: string;
  brand: string;
  model: string;
  year: number;
  condition: number;
  fuel: number;
  status: 'available' | 'on-job' | 'maintenance';
  location: string;
  maintenanceCost: number;
  mileage?: number;
  userEmail: string;
  companyName: string;
}

interface SystemTrailer {
  id: string;
  type: 'flatbed' | 'refrigerated' | 'tanker' | 'container' | 'lowboy';
  capacity: number;
  condition: number;
  location: string;
  assignedTruck: string | null;
  purchasePrice: number;
  userEmail: string;
  companyName: string;
}

const FleetControl: React.FC = () => {
  const navigate = useNavigate();
  const { gameState } = useGame();
  const [activeTab, setActiveTab] = useState<'trucks' | 'trailers'>('trucks');
  const [systemTrucks, setSystemTrucks] = useState<SystemTruck[]>([]);
  const [systemTrailers, setSystemTrailers] = useState<SystemTrailer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [foundUser, setFoundUser] = useState<any>(null);
  const [showUserDetails, setShowUserDetails] = useState(false);

  // Check if current user is admin
  const isAdmin = gameState?.currentUser === 'bracko87@live.com';

  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard');
      return;
    }
    loadSystemFleetData();
  }, [isAdmin, navigate]);

  /**
   * Load all system trucks and trailers from all users
   */
  const loadSystemFleetData = () => {
    try {
      const users = JSON.parse(localStorage.getItem('tm_users') || '[]');
      const allTrucks: SystemTruck[] = [];
      const allTrailers: SystemTrailer[] = [];

      users.forEach((user: any) => {
        if (user.company) {
          // Process trucks
          if (user.company.trucks) {
            user.company.trucks.forEach((truck: any) => {
              allTrucks.push({
                ...truck,
                userEmail: user.email,
                companyName: user.company?.name || 'Unknown Company'
              });
            });
          }

          // Process trailers
          if (user.company.trailers) {
            user.company.trailers.forEach((trailer: any) => {
              allTrailers.push({
                ...trailer,
                userEmail: user.email,
                companyName: user.company?.name || 'Unknown Company'
              });
            });
          }
        }
      });

      setSystemTrucks(allTrucks);
      setSystemTrailers(allTrailers);
    } catch (error) {
      console.error('Error loading system fleet data:', error);
    }
  };

  /**
   * Get unique companies for filter dropdown
   */
  const getUniqueCompanies = () => {
    const companies = new Set<string>();
    if (activeTab === 'trucks') {
      systemTrucks.forEach(truck => companies.add(truck.companyName));
    } else {
      systemTrailers.forEach(trailer => companies.add(trailer.companyName));
    }
    return Array.from(companies);
  };

  /**
   * Filter data based on search and filters
   */
  const getFilteredData = () => {
    let data = activeTab === 'trucks' ? systemTrucks : systemTrailers;

    // Filter by search query
    if (searchQuery) {
      data = data.filter(item => {
        if (activeTab === 'trucks') {
          const truck = item as SystemTruck;
          return truck.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
                 truck.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
                 truck.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                 truck.userEmail.toLowerCase().includes(searchQuery.toLowerCase());
        } else {
          const trailer = item as SystemTrailer;
          return trailer.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
                 trailer.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                 trailer.userEmail.toLowerCase().includes(searchQuery.toLowerCase());
        }
      });
    }

    // Filter by company
    if (companyFilter !== 'all') {
      data = data.filter(item => item.companyName === companyFilter);
    }

    // Filter by status (trucks only)
    if (activeTab === 'trucks' && statusFilter !== 'all') {
      data = data.filter((truck) => (truck as SystemTruck).status === statusFilter);
    }

    return data;
  };

  /**
   * Handle truck status change
   */
  const updateTruckStatus = (truckId: string, newStatus: string) => {
    if (confirm(`Change truck status to ${newStatus}?`)) {
      setLoading(true);
      try {
        const users = JSON.parse(localStorage.getItem('tm_users') || '[]');
        const updatedUsers = users.map((user: any) => {
          if (user.company && user.company.trucks) {
            const updatedTrucks = user.company.trucks.map((truck: any) => 
              truck.id === truckId ? { ...truck, status: newStatus } : truck
            );
            user.company.trucks = updatedTrucks;
          }
          return user;
        });

        localStorage.setItem('tm_users', JSON.stringify(updatedUsers));
        loadSystemFleetData();
        setLoading(false);
        alert('Truck status updated successfully!');
      } catch (error) {
        console.error('Error updating truck status:', error);
        setLoading(false);
        alert('Error updating truck status. Please try again.');
      }
    }
  };

  /**
   * Handle delete truck
   */
  const deleteTruck = (truckId: string) => {
    if (confirm('Are you sure you want to delete this truck? This action cannot be undone.')) {
      setLoading(true);
      try {
        const users = JSON.parse(localStorage.getItem('tm_users') || '[]');
        const updatedUsers = users.map((user: any) => {
          if (user.company && user.company.trucks) {
            const updatedTrucks = user.company.trucks.filter((truck: any) => truck.id !== truckId);
            user.company.trucks = updatedTrucks;
          }
          return user;
        });

        localStorage.setItem('tm_users', JSON.stringify(updatedUsers));
        loadSystemFleetData();
        setLoading(false);
        alert('Truck deleted successfully!');
      } catch (error) {
        console.error('Error deleting truck:', error);
        setLoading(false);
        alert('Error deleting truck. Please try again.');
      }
    }
  };

  /**
   * Handle delete trailer
   */
  const deleteTrailer = (trailerId: string) => {
    if (confirm('Are you sure you want to delete this trailer? This action cannot be undone.')) {
      setLoading(true);
      try {
        const users = JSON.parse(localStorage.getItem('tm_users') || '[]');
        const updatedUsers = users.map((user: any) => {
          if (user.company && user.company.trailers) {
            const updatedTrailers = user.company.trailers.filter((trailer: any) => trailer.id !== trailerId);
            user.company.trailers = updatedTrailers;
          }
          return user;
        });

        localStorage.setItem('tm_users', JSON.stringify(updatedUsers));
        loadSystemFleetData();
        setLoading(false);
        alert('Trailer deleted successfully!');
      } catch (error) {
        console.error('Error deleting trailer:', error);
        setLoading(false);
        alert('Error deleting trailer. Please try again.');
      }
    }
  };

  /**
   * Handle bulk operations
   */
  const handleBulkMaintenance = () => {
    if (selectedItems.length === 0) {
      alert('Please select items to perform bulk operations.');
      return;
    }
    if (confirm(`Set ${selectedItems.length} trucks to maintenance status?`)) {
      selectedItems.forEach(truckId => updateTruckStatus(truckId, 'maintenance'));
      setSelectedItems([]);
    }
  };

  /**
   * Search for users and companies in database
   */
  const searchUsers = () => {
    if (!userSearchQuery.trim()) {
      setFoundUser(null);
      setShowUserDetails(false);
      return;
    }

    try {
      const users = JSON.parse(localStorage.getItem('tm_users') || '[]');
      const searchTerm = userSearchQuery.toLowerCase().trim();
      
      // Enhanced search: exact email match first, then company name
      let foundUser = null;
      
      // Try exact email match first
      foundUser = users.find((user: any) => 
        user.email.toLowerCase() === searchTerm
      );
      
      // If no exact email match, try partial email or company name match
      if (!foundUser) {
        const foundUsers = users.filter((user: any) => {
          const emailMatch = user.email.toLowerCase().includes(searchTerm);
          const companyNameMatch = user.company?.name?.toLowerCase().includes(searchTerm);
          return emailMatch || companyNameMatch;
        });
        
        if (foundUsers.length > 0) {
          foundUser = foundUsers[0];
        }
      }

      if (foundUser) {
        setFoundUser(foundUser);
        setShowUserDetails(true);
      } else {
        setFoundUser(null);
        setShowUserDetails(false);
        alert('No user or company found with that email or company name.');
      }
    } catch (error) {
      console.error('Error searching users:', error);
      alert('Error searching users. Please try again.');
    }
  };

  /**
   * Add equipment to user
   */
  const addEquipmentToUser = (type: 'truck' | 'trailer') => {
    if (!foundUser) return;

    let equipment: any;
    if (type === 'truck') {
      equipment = {
        id: `truck-${Date.now()}`,
        brand: 'Volvo',
        model: 'FH16',
        year: 2023,
        condition: 100,
        fuel: 100,
        status: 'available',
        location: foundUser.company?.hub?.name || 'Hub',
        maintenanceCost: 500,
        mileage: 0
      };
    } else {
      equipment = {
        id: `trailer-${Date.now()}`,
        type: 'container',
        capacity: 20,
        condition: 100,
        location: foundUser.company?.hub?.name || 'Hub',
        assignedTruck: null,
        purchasePrice: 15000
      };
    }

    try {
      const users = JSON.parse(localStorage.getItem('tm_users') || '[]');
      const userIndex = users.findIndex((u: any) => u.email === foundUser.email);
      
      if (userIndex !== -1) {
        if (!users[userIndex].company) {
          users[userIndex].company = {
            trucks: [],
            trailers: [],
            staff: [],
            contracts: [],
            activeJobs: []
          };
        }

        if (type === 'truck') {
          users[userIndex].company.trucks = [...(users[userIndex].company.trucks || []), equipment];
        } else {
          users[userIndex].company.trailers = [...(users[userIndex].company.trailers || []), equipment];
        }

        localStorage.setItem('tm_users', JSON.stringify(users));
        loadSystemFleetData();
        alert(`${type === 'truck' ? 'Truck' : 'Trailer'} added successfully to ${foundUser.company?.name || foundUser.email}!`);
      }
    } catch (error) {
      console.error('Error adding equipment:', error);
      alert('Error adding equipment. Please try again.');
    }
  };

  /**
   * Remove equipment from user
   */
  const removeEquipmentFromUser = (equipmentId: string, type: 'truck' | 'trailer') => {
    if (!foundUser) return;

    if (!confirm(`Are you sure you want to remove this ${type} from ${foundUser.company?.name || foundUser.email}?`)) {
      return;
    }

    try {
      const users = JSON.parse(localStorage.getItem('tm_users') || '[]');
      const userIndex = users.findIndex((u: any) => u.email === foundUser.email);
      
      if (userIndex !== -1) {
        if (type === 'truck') {
          users[userIndex].company.trucks = users[userIndex].company.trucks.filter((t: any) => t.id !== equipmentId);
        } else {
          users[userIndex].company.trailers = users[userIndex].company.trailers.filter((t: any) => t.id !== equipmentId);
        }

        localStorage.setItem('tm_users', JSON.stringify(users));
        loadSystemFleetData();
        
        // Update foundUser to reflect changes
        const updatedUser = users[userIndex];
        setFoundUser(updatedUser);
        
        alert(`${type === 'truck' ? 'Truck' : 'Trailer'} removed successfully!`);
      }
    } catch (error) {
      console.error('Error removing equipment:', error);
      alert('Error removing equipment. Please try again.');
    }
  };

  /**
   * Export fleet data
   */
  const exportFleetData = () => {
    const data = activeTab === 'trucks' ? systemTrucks : systemTrailers;
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fleet_${activeTab}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  /**
   * Get status color
   */
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'text-green-400 bg-green-400/10';
      case 'on-job': return 'text-blue-400 bg-blue-400/10';
      case 'maintenance': return 'text-orange-400 bg-orange-400/10';
      default: return 'text-slate-400 bg-slate-400/10';
    }
  };

  /**
   * Get trailer type color
   */
  const getTrailerTypeColor = (type: string) => {
    switch (type) {
      case 'flatbed': return 'text-blue-400 bg-blue-400/10';
      case 'refrigerated': return 'text-green-400 bg-green-400/10';
      case 'tanker': return 'text-orange-400 bg-orange-400/10';
      case 'container': return 'text-purple-400 bg-purple-400/10';
      case 'lowboy': return 'text-cyan-400 bg-cyan-400/10';
      default: return 'text-slate-400 bg-slate-400/10';
    }
  };

  const filteredData = getFilteredData();
  const uniqueCompanies = getUniqueCompanies();

  if (!isAdmin) {
    return (
      <div className="min-h-96 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-slate-400">This page is only accessible to system administrators.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center space-x-3">
            <Truck className="w-8 h-8 text-red-400" />
            <span>Fleet Management Control</span>
          </h1>
          <p className="text-slate-400">Admin control panel for managing all users' trucks and trailers across the system</p>
        </div>
        <div className="flex items-center space-x-2 bg-green-500/20 border border-green-500/30 rounded-xl px-4 py-2">
          <Shield className="w-5 h-5 text-green-400" />
          <span className="text-white font-medium">Administrator</span>
        </div>
      </div>

      {/* Fleet Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="flex items-center space-x-2 mb-2">
            <Truck className="w-5 h-5 text-blue-400" />
            <div className="text-sm text-slate-400">Total Trucks</div>
          </div>
          <div className="text-2xl font-bold text-blue-400">{systemTrucks.length}</div>
        </div>
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="flex items-center space-x-2 mb-2">
            <Package className="w-5 h-5 text-green-400" />
            <div className="text-sm text-slate-400">Total Trailers</div>
          </div>
          <div className="text-2xl font-bold text-green-400">{systemTrailers.length}</div>
        </div>
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="flex items-center space-x-2 mb-2">
            <Users className="w-5 h-5 text-purple-400" />
            <div className="text-sm text-slate-400">Total Companies</div>
          </div>
          <div className="text-2xl font-bold text-purple-400">{uniqueCompanies.length}</div>
        </div>
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="flex items-center space-x-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-orange-400" />
            <div className="text-sm text-slate-400">In Maintenance</div>
          </div>
          <div className="text-2xl font-bold text-orange-400">
            {systemTrucks.filter(t => t.status === 'maintenance').length}
          </div>
        </div>
      </div>

      {/* User Search Section */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 mb-6">
        <h3 className="text-lg font-semibold text-white mb-4">User & Company Search</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-slate-400 mb-2">Search All Users by Email or Company Name</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchUsers()}
                placeholder="Enter exact email or company name to search all users..."
                className="w-full bg-slate-700 border border-slate-600 rounded-lg pl-10 pr-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="text-xs text-slate-500 mt-1">Searches through all registered users and their companies</div>
          </div>
          <div className="flex items-end">
            <button
              onClick={searchUsers}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 w-full"
            >
              <Search className="w-4 h-4" />
              <span>Search</span>
            </button>
          </div>
        </div>

        {/* User Details */}
        {showUserDetails && foundUser && (
          <div className="mt-6 p-4 bg-slate-700 rounded-lg border border-slate-600">
            <h4 className="text-lg font-semibold text-white mb-4">User Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="text-sm text-slate-400 mb-1">Email</div>
                <div className="text-white font-medium">{foundUser.email}</div>
                
                <div className="text-sm text-slate-400 mb-1 mt-3">Company Name</div>
                <div className="text-white font-medium">{foundUser.company?.name || 'No Company'}</div>
                
                <div className="text-sm text-slate-400 mb-1 mt-3">Capital</div>
                <div className="text-green-400 font-medium">€{foundUser.company?.capital?.toLocaleString() || 0}</div>
              </div>
              
              <div>
                <div className="text-sm text-slate-400 mb-1">Trucks</div>
                <div className="text-blue-400 font-medium">{foundUser.company?.trucks?.length || 0} trucks</div>
                
                <div className="text-sm text-slate-400 mb-1 mt-3">Trailers</div>
                <div className="text-green-400 font-medium">{foundUser.company?.trailers?.length || 0} trailers</div>
                
                <div className="text-sm text-slate-400 mb-1 mt-3">Hub Location</div>
                <div className="text-white font-medium">{foundUser.company?.hub?.name || 'No Hub'}</div>
              </div>
            </div>
            
            {/* Equipment Actions */}
            <div className="mt-6">
              <h5 className="text-md font-semibold text-white mb-3">Equipment Management</h5>
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-600">
                <div className="text-sm text-slate-400 mb-3">Add Equipment to User</div>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => addEquipmentToUser('truck')}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
                  >
                    <Truck className="w-4 h-4" />
                    <span>Add New Truck</span>
                  </button>
                  <button
                    onClick={() => addEquipmentToUser('trailer')}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
                  >
                    <Package className="w-4 h-4" />
                    <span>Add New Trailer</span>
                  </button>
                </div>
                <div className="text-xs text-slate-500 mt-2">New equipment will be added to the user's fleet immediately</div>
              </div>
            </div>

            {/* Current Equipment List */}
            {(foundUser.company?.trucks?.length > 0 || foundUser.company?.trailers?.length > 0) && (
              <div className="mt-6">
                <h5 className="text-md font-semibold text-white mb-3">User's Current Equipment</h5>
                <div className="text-sm text-slate-400 mb-3">Click the trash icon to remove equipment from this user's account</div>
                
                {/* Trucks */}
                {foundUser.company?.trucks?.length > 0 && (
                  <div className="mb-4">
                    <div className="text-sm text-slate-400 mb-2">Trucks</div>
                    <div className="space-y-2">
                      {foundUser.company.trucks.map((truck: any) => (
                        <div key={truck.id} className="bg-slate-600 rounded-lg p-3 flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Truck className="w-4 h-4 text-blue-400" />
                            <span className="text-white">{truck.brand} {truck.model} ({truck.year})</span>
                            <span className={`px-2 py-1 rounded text-xs ${getStatusColor(truck.status)}`}>
                              {truck.status}
                            </span>
                          </div>
                          <button
                            onClick={() => removeEquipmentFromUser(truck.id, 'truck')}
                            className="text-red-400 hover:text-red-300 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Trailers */}
                {foundUser.company?.trailers?.length > 0 && (
                  <div>
                    <div className="text-sm text-slate-400 mb-2">Trailers</div>
                    <div className="space-y-2">
                      {foundUser.company.trailers.map((trailer: any) => (
                        <div key={trailer.id} className="bg-slate-600 rounded-lg p-3 flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Package className="w-4 h-4 text-green-400" />
                            <span className="text-white">{trailer.type} ({trailer.capacity} tons)</span>
                            <span className={`px-2 py-1 rounded text-xs ${getTrailerTypeColor(trailer.type)}`}>
                              {trailer.type}
                            </span>
                          </div>
                          <button
                            onClick={() => removeEquipmentFromUser(trailer.id, 'trailer')}
                            className="text-red-400 hover:text-red-300 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fleet Filters and Controls */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Filters & Controls</h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={loadSystemFleetData}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh Data</span>
            </button>
            <button
              onClick={exportFleetData}
              className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export Data</span>
            </button>
          </div>
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
                placeholder="Search by brand, model, company, or email..."
                className="w-full bg-slate-700 border border-slate-600 rounded-lg pl-10 pr-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Company</label>
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Companies ({uniqueCompanies.length})</option>
              {uniqueCompanies.map(company => (
                <option key={company} value={company}>{company}</option>
              ))}
            </select>
          </div>

          {activeTab === 'trucks' && (
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="available">Available</option>
                <option value="on-job">On Job</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Bulk Actions</label>
            <button
              onClick={handleBulkMaintenance}
              disabled={selectedItems.length === 0}
              className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
            >
              <Wrench className="w-4 h-4" />
              <span>Set to Maintenance</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-1 grid grid-cols-2 gap-1">
        <button
          onClick={() => setActiveTab('trucks')}
          className={`px-4 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2 ${
            activeTab === 'trucks'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'text-slate-400 hover:text-white hover:bg-slate-700'
          }`}
        >
          <Truck className="w-5 h-5" />
          <span>Trucks ({systemTrucks.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('trailers')}
          className={`px-4 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2 ${
            activeTab === 'trailers'
              ? 'bg-green-600 text-white shadow-lg'
              : 'text-slate-400 hover:text-white hover:bg-slate-700'
          }`}
        >
          <Package className="w-5 h-5" />
          <span>Trailers ({systemTrailers.length})</span>
        </button>
      </div>

      {/* Data Table */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">
            {activeTab === 'trucks' ? 'System Trucks' : 'System Trailers'} ({filteredData.length})
          </h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="text-center py-12">
            {activeTab === 'trucks' ? <Truck className="w-16 h-16 text-slate-400 mx-auto mb-4" /> : <Package className="w-16 h-16 text-slate-400 mx-auto mb-4" />}
            <h3 className="text-xl font-bold text-white mb-2">No {activeTab === 'trucks' ? 'Trucks' : 'Trailers'} Found</h3>
            <p className="text-slate-400">No {activeTab === 'trucks' ? 'trucks' : 'trailers'} match your current filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedItems.length === filteredData.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedItems(filteredData.map((item: any) => item.id));
                        } else {
                          setSelectedItems([]);
                        }
                      }}
                      className="rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    {activeTab === 'trucks' ? 'Vehicle' : 'Type'}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Owner Email
                  </th>
                  {activeTab === 'trucks' && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Status
                    </th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Condition
                  </th>
                  {activeTab === 'trucks' && (
                    <>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                        Fuel
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                        Maintenance Cost
                      </th>
                    </>
                  )}
                  {activeTab === 'trailers' && (
                    <>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                        Capacity
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                        Assigned
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                        Purchase Price
                      </th>
                    </>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {filteredData.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-700/50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedItems([...selectedItems, item.id]);
                          } else {
                            setSelectedItems(selectedItems.filter(id => id !== item.id));
                          }
                        }}
                        className="rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {activeTab === 'trucks' ? (
                        <div className="flex items-center space-x-2">
                          <Truck className="w-4 h-4 text-blue-400" />
                          <span className="text-white font-medium">{item.brand} {item.model}</span>
                          <span className="text-slate-400 text-sm">({item.year})</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <Package className="w-4 h-4 text-green-400" />
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTrailerTypeColor(item.type)}`}>
                            {item.type}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-white">{item.companyName}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-slate-300 text-sm">{item.userEmail}</span>
                    </td>
                    {activeTab === 'trucks' && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                          {item.status}
                        </span>
                      </td>
                    )}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-slate-700 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              item.condition >= 70 ? 'bg-green-500' : 
                              item.condition >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                            }`} 
                            style={{ width: `${item.condition}%` }}
                          ></div>
                        </div>
                        <span className="text-white text-sm">{item.condition}%</span>
                      </div>
                    </td>
                    {activeTab === 'trucks' && (
                      <>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <Fuel className="w-4 h-4 text-amber-400" />
                            <div className="w-16 bg-slate-700 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${
                                  item.fuel >= 60 ? 'bg-green-500' : 
                                  item.fuel >= 30 ? 'bg-yellow-500' : 'bg-red-500'
                                }`} 
                                style={{ width: `${item.fuel}%` }}
                              ></div>
                            </div>
                            <span className="text-white text-sm">{item.fuel}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <MapPin className="w-4 h-4 text-blue-400" />
                            <span className="text-white text-sm">{item.location || 'Hub'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <DollarSign className="w-4 h-4 text-green-400" />
                            <span className="text-white text-sm">${item.maintenanceCost}/mo</span>
                          </div>
                        </td>
                      </>
                    )}
                    {activeTab === 'trailers' && (
                      <>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <Package className="w-4 h-4 text-blue-400" />
                            <span className="text-white text-sm">{item.capacity} tons</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <Truck className="w-4 h-4 text-slate-400" />
                            <span className="text-white text-sm">{item.assignedTruck ? `Truck ${item.assignedTruck.split('-')[1]}` : 'None'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <DollarSign className="w-4 h-4 text-green-400" />
                            <span className="text-white text-sm">${item.purchasePrice.toLocaleString()}</span>
                          </div>
                        </td>
                      </>
                    )}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {activeTab === 'trucks' && (
                          <button
                            onClick={() => updateTruckStatus(item.id, item.status === 'available' ? 'maintenance' : 'available')}
                            className="p-1 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                            title={item.status === 'available' ? 'Set to Maintenance' : 'Set to Available'}
                          >
                            <Wrench className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (activeTab === 'trucks') {
                              deleteTruck(item.id);
                            } else {
                              deleteTrailer(item.id);
                            }
                          }}
                          className="p-1 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Navigation */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Quick Navigation</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => navigate('/admin')}
            className="bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg p-4 text-left transition-colors"
          >
            <Shield className="w-6 h-6 text-green-400 mb-2" />
            <h4 className="font-medium text-white">Admin Dashboard</h4>
            <p className="text-sm text-slate-400 mt-1">Return to admin dashboard</p>
          </button>
          <button
            onClick={() => navigate('/admin/users')}
            className="bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg p-4 text-left transition-colors"
          >
            <Users className="w-6 h-6 text-blue-400 mb-2" />
            <h4 className="font-medium text-white">User Management</h4>
            <p className="text-sm text-slate-400 mt-1">Manage user accounts</p>
          </button>
          <button
            onClick={() => navigate('/admin/job-database')}
            className="bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg p-4 text-left transition-colors"
          >
            <Package className="w-6 h-6 text-purple-400 mb-2" />
            <h4 className="font-medium text-white">Job Database</h4>
            <p className="text-sm text-slate-400 mt-1">Manage freight jobs</p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default FleetControl;