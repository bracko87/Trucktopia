/**
 * Game Rules & Engines Admin Page
 * Comprehensive system configuration and monitoring interface
 */

import React, { useState } from 'react';
import { Settings, Play, Pause, RefreshCw, Edit, X, Clock, Zap, BookOpen } from 'lucide-react';

interface GameRule {
  id: string;
  name: string;
  description: string;
  category: string;
  status: 'active' | 'inactive' | 'maintenance';
  version: string;
  lastModified: string;
  author: string;
}

interface GameEngine {
  id: string;
  name: string;
  description: string;
  type: string;
  status: 'running' | 'stopped' | 'error';
  version: string;
  lastExecuted: string;
  executionInterval: string;
}

interface CronJob {
  id: string;
  name: string;
  description: string;
  schedule: string;
  status: 'active' | 'paused' | 'error';
  lastRun: string;
  nextRun: string;
  executionTime: string;
}

const GameRulesEngines: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'rules' | 'engines' | 'cron'>('rules');
  const [selectedItem, setSelectedItem] = useState<GameRule | GameEngine | CronJob | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Sample data for demonstration
  const gameRules: GameRule[] = [
    {
      id: 'GR-001',
      name: 'Distance Calculation',
      description: 'Real-time distance calculation between cities using Haversine formula',
      category: 'Core',
      status: 'active',
      version: '2.1.0',
      lastModified: '2024-01-30',
      author: 'System'
    },
    {
      id: 'GR-008',
      name: 'Truck Driving Engine',
      description: 'Advanced truck movement simulation with real-time tracking, driver hours management, fuel consumption, condition degradation, and mileage tracking',
      category: 'Vehicles',
      status: 'active',
      version: '1.0.0',
      lastModified: '2024-01-30',
      author: 'System'
    },
    {
      id: 'GR-002',
      name: 'Job Generation',
      description: 'Dynamic job creation based on market demand and player level',
      category: 'Economic',
      status: 'active',
      version: '1.5.2',
      lastModified: '2024-01-29',
      author: 'System'
    },
    {
      id: 'GR-003',
      name: 'Vehicle Maintenance',
      description: 'Vehicle wear and tear simulation with maintenance costs',
      category: 'Vehicles',
      status: 'active',
      version: '1.3.1',
      lastModified: '2024-01-28',
      author: 'System'
    },
    {
      id: 'GR-004',
      name: 'Staff Management',
      description: 'Staff hiring, training, and performance tracking system',
      category: 'Staff',
      status: 'active',
      version: '1.4.0',
      lastModified: '2024-01-27',
      author: 'System'
    },
    {
      id: 'GR-005',
      name: 'Market Price Fluctuation',
      description: 'Dynamic pricing system for vehicles, trailers, and market goods',
      category: 'Economic',
      status: 'active',
      version: '1.2.1',
      lastModified: '2024-01-18',
      author: 'System'
    },
    {
      id: 'GR-006',
      name: 'Staff Regeneration System',
      description: '55 candidates generated using name generator with 80% native, 20% foreign, 90% male/10% female distribution, ASCII names only',
      category: 'Staff',
      status: 'active',
      version: '1.0.0',
      lastModified: '2024-01-30',
      author: 'System'
    },
    {
      id: 'GR-007',
      name: '48-Hour Persistence System',
      description: 'Complete documentation with technical implementation, storage key format, timestamp validation, auto-regeneration ready for daily 00:03 AM',
      category: 'System',
      status: 'active',
      version: '1.0.0',
      lastModified: '2024-01-30',
      author: 'System'
    }
  ];

  const gameEngines: GameEngine[] = [
    {
      id: 'GE-001',
      name: 'Distance Calculator',
      description: 'Calculates real distances between cities using coordinate data',
      type: 'core',
      status: 'running',
      version: '2.1.0',
      lastExecuted: '2024-01-30 14:30:00',
      executionInterval: 'real-time'
    },
    {
      id: 'GE-006',
      name: 'Truck Driving Engine',
      description: 'Real-time truck movement engine with driver management, fuel consumption tracking, condition monitoring, and mileage accumulation',
      type: 'vehicles',
      status: 'running',
      version: '1.0.0',
      lastExecuted: '2024-01-30 14:30:00',
      executionInterval: '1 second'
    },
    {
      id: 'GE-002',
      name: 'Job Market Engine',
      description: 'Generates and manages freight contracts and job opportunities',
      type: 'economic',
      status: 'running',
      version: '1.5.2',
      lastExecuted: '2024-01-30 14:25:00',
      executionInterval: '5 minutes'
    },
    {
      id: 'GE-003',
      name: 'Vehicle Simulation',
      description: 'Simulates vehicle performance, fuel consumption, and maintenance',
      type: 'vehicles',
      status: 'running',
      version: '1.3.1',
      lastExecuted: '2024-01-30 14:20:00',
      executionInterval: '1 minute'
    },
    {
      id: 'GE-004',
      name: 'Player Progression System',
      description: 'Manages player level progression, unlocks, and achievement tracking',
      type: 'core',
      status: 'running',
      version: '1.3.0',
      lastExecuted: '2024-01-30 14:15:00',
      executionInterval: '1 minute'
    },
    {
      id: 'GE-005',
      name: 'Staff Regeneration Engine',
      description: 'Generates 55 new candidates with name generator, 80% native/20% foreign, 90% male/10% female, ASCII names without duplicates',
      type: 'staff',
      status: 'running',
      version: '1.0.0',
      lastExecuted: '2024-01-30 14:25:00',
      executionInterval: '48 hours'
    }
  ];

  const cronJobs: CronJob[] = [
    {
      id: 'CJ-001',
      name: 'Daily Market Refresh',
      description: 'Updates market prices and generates new job opportunities',
      schedule: '0 3 * * *',
      status: 'active',
      lastRun: '2024-01-30 03:00:00',
      nextRun: '2024-01-31 03:00:00',
      executionTime: '45s'
    },
    {
      id: 'CJ-002',
      name: 'Staff Data Regeneration',
      description: 'Regenerates staff hiring pool every 48 hours',
      schedule: '3 0 * * *',
      status: 'active',
      lastRun: '2024-01-30 00:03:00',
      nextRun: '2024-02-01 00:03:00',
      executionTime: '12s'
    },
    {
      id: 'CJ-003',
      name: 'System Backup',
      description: 'Creates automatic system backups and cleans old data',
      schedule: '0 2 * * *',
      status: 'active',
      lastRun: '2024-01-30 02:00:00',
      nextRun: '2024-01-31 02:00:00',
      executionTime: '2m 15s'
    }
  ];

  const handleEditClick = (item: GameRule | GameEngine | CronJob) => {
    setSelectedItem(item);
    setShowModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'running':
        return 'text-green-400 bg-green-400/10';
      case 'inactive':
      case 'stopped':
      case 'paused':
        return 'text-yellow-400 bg-yellow-400/10';
      case 'maintenance':
      case 'error':
        return 'text-red-400 bg-red-400/10';
      default:
        return 'text-slate-400 bg-slate-400/10';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
      case 'running':
        return <Play className="w-4 h-4" />;
      case 'inactive':
      case 'stopped':
      case 'paused':
        return <Pause className="w-4 h-4" />;
      case 'maintenance':
      case 'error':
        return <RefreshCw className="w-4 h-4" />;
      default:
        return <Settings className="w-4 h-4" />;
    }
  };

  const renderModalContent = () => {
    if (!selectedItem) return null;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-white">{selectedItem.name}</h3>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedItem.status)}`}>
            {selectedItem.status.toUpperCase()}
          </span>
        </div>

        <div>
          <h4 className="text-sm font-medium text-slate-400 mb-2">Description</h4>
          <p className="text-white">{selectedItem.description}</p>
        </div>

        {'category' in selectedItem && (
          <div>
            <h4 className="text-sm font-medium text-slate-400 mb-2">Category</h4>
            <p className="text-white">{selectedItem.category}</p>
          </div>
        )}

        {'type' in selectedItem && (
          <div>
            <h4 className="text-sm font-medium text-slate-400 mb-2">Type</h4>
            <p className="text-white">{selectedItem.type}</p>
          </div>
        )}

        {'schedule' in selectedItem && (
          <div>
            <h4 className="text-sm font-medium text-slate-400 mb-2">Schedule</h4>
            <p className="text-white font-mono">{selectedItem.schedule}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium text-slate-400 mb-2">Version</h4>
            <p className="text-white">{selectedItem.version}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-slate-400 mb-2">ID</h4>
            <p className="text-white font-mono">{selectedItem.id}</p>
          </div>
        </div>

        {'lastModified' in selectedItem && (
          <div>
            <h4 className="text-sm font-medium text-slate-400 mb-2">Last Modified</h4>
            <p className="text-white">{selectedItem.lastModified}</p>
          </div>
        )}

        {'lastExecuted' in selectedItem && (
          <div>
            <h4 className="text-sm font-medium text-slate-400 mb-2">Last Executed</h4>
            <p className="text-white">{selectedItem.lastExecuted}</p>
          </div>
        )}

        {'lastRun' in selectedItem && (
          <div>
            <h4 className="text-sm font-medium text-slate-400 mb-2">Last Run</h4>
            <p className="text-white">{selectedItem.lastRun}</p>
          </div>
        )}

        {'executionInterval' in selectedItem && (
          <div>
            <h4 className="text-sm font-medium text-slate-400 mb-2">Execution Interval</h4>
            <p className="text-white">{selectedItem.executionInterval}</p>
          </div>
        )}

        {'nextRun' in selectedItem && (
          <div>
            <h4 className="text-sm font-medium text-slate-400 mb-2">Next Run</h4>
            <p className="text-white">{selectedItem.nextRun}</p>
          </div>
        )}

        {'executionTime' in selectedItem && (
          <div>
            <h4 className="text-sm font-medium text-slate-400 mb-2">Average Execution Time</h4>
            <p className="text-white">{selectedItem.executionTime}</p>
          </div>
        )}

        {'author' in selectedItem && (
          <div>
            <h4 className="text-sm font-medium text-slate-400 mb-2">Author</h4>
            <p className="text-white">{selectedItem.author}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Game Rules & Engines</h1>
          <p className="text-slate-400">System configuration and monitoring dashboard</p>
        </div>
        <div className="flex items-center space-x-4">
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2">
            <RefreshCw className="w-4 h-4" />
            <span>Refresh All</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-1">
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveTab('rules')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 ${
              activeTab === 'rules'
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Game Rules ({gameRules.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('engines')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 ${
              activeTab === 'engines'
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>Engines ({gameEngines.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('cron')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 ${
              activeTab === 'cron'
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Cron Jobs ({cronJobs.length})</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        {activeTab === 'rules' && (
          <div className="p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Game Rules</h2>
            <div className="space-y-4">
              {gameRules.map((rule) => (
                <div
                  key={rule.id}
                  className="bg-slate-700 rounded-lg p-4 border border-slate-600"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-medium text-white">{rule.name}</h3>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(rule.status)}`}>
                          {rule.status}
                        </span>
                        <span className="text-xs text-slate-400 bg-slate-600 px-2 py-1 rounded">
                          v{rule.version}
                        </span>
                      </div>
                      <p className="text-slate-300 text-sm mb-2">{rule.description}</p>
                      <div className="flex items-center space-x-4 text-xs text-slate-400">
                        <span>Category: {rule.category}</span>
                        <span>Last Modified: {rule.lastModified}</span>
                        <span>Author: {rule.author}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleEditClick(rule)}
                      className="ml-4 p-2 text-slate-400 hover:text-white hover:bg-slate-600 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'engines' && (
          <div className="p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Game Engines</h2>
            <div className="space-y-4">
              {gameEngines.map((engine) => (
                <div
                  key={engine.id}
                  className="bg-slate-700 rounded-lg p-4 border border-slate-600"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className={`p-1 rounded ${getStatusColor(engine.status)}`}>
                          {getStatusIcon(engine.status)}
                        </div>
                        <h3 className="font-medium text-white">{engine.name}</h3>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(engine.status)}`}>
                          {engine.status}
                        </span>
                        <span className="text-xs text-slate-400 bg-slate-600 px-2 py-1 rounded">
                          v{engine.version}
                        </span>
                      </div>
                      <p className="text-slate-300 text-sm mb-2">{engine.description}</p>
                      <div className="flex items-center space-x-4 text-xs text-slate-400">
                        <span>Type: {engine.type}</span>
                        <span>Interval: {engine.executionInterval}</span>
                        <span>Last Executed: {engine.lastExecuted}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleEditClick(engine)}
                      className="ml-4 p-2 text-slate-400 hover:text-white hover:bg-slate-600 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'cron' && (
          <div className="p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Cron Jobs</h2>
            <div className="space-y-4">
              {cronJobs.map((job) => (
                <div
                  key={job.id}
                  className="bg-slate-700 rounded-lg p-4 border border-slate-600"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className={`p-1 rounded ${getStatusColor(job.status)}`}>
                          {getStatusIcon(job.status)}
                        </div>
                        <h3 className="font-medium text-white">{job.name}</h3>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(job.status)}`}>
                          {job.status}
                        </span>
                      </div>
                      <p className="text-slate-300 text-sm mb-2">{job.description}</p>
                      <div className="flex items-center space-x-4 text-xs text-slate-400">
                        <span>Schedule: {job.schedule}</span>
                        <span>Last Run: {job.lastRun}</span>
                        <span>Next Run: {job.nextRun}</span>
                        <span>Avg Time: {job.executionTime}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleEditClick(job)}
                      className="ml-4 p-2 text-slate-400 hover:text-white hover:bg-slate-600 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* REAL-TIME ACTIVITY LOG - ALWAYS VISIBLE */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white flex items-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-clipboard-list w-5 h-5">
              <rect width="8" height="4" x="8" y="2" rx="1" ry="1"/>
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
              <path d="M12 11h4"/>
              <path d="M12 16h4"/>
              <path d="M8 11h.01"/>
              <path d="M8 16h.01"/>
            </svg>
            <span>Real-Time Activity Log</span>
          </h2>
          <p className="text-slate-400 text-sm">Live monitoring of system executions and cron jobs</p>
        </div>

        <div className="p-6">
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {/* Recent Log Entries */}
            <div className="flex items-center justify-between p-3 bg-slate-700 rounded-lg border border-slate-600">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <div>
                  <div className="text-white font-medium">Staff Regeneration Engine</div>
                  <div className="text-slate-400 text-sm">Generated 55 candidates (80% native, 20% foreign)</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-white text-sm">2024-01-30 14:25:00</div>
                <div className="text-green-400 text-sm">Completed</div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-700 rounded-lg border border-slate-600">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <div>
                  <div className="text-white font-medium">Job Market Engine</div>
                  <div className="text-slate-400 text-sm">Created 247 new freight contracts</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-white text-sm">2024-01-30 14:25:00</div>
                <div className="text-green-400 text-sm">Completed</div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-700 rounded-lg border border-slate-600">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <div>
                  <div className="text-white font-medium">Daily Market Refresh</div>
                  <div className="text-slate-400 text-sm">Updating prices and market data</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-white text-sm">2024-01-30 14:24:30</div>
                <div className="text-blue-400 text-sm">Running</div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-700 rounded-lg border border-slate-600">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <div>
                  <div className="text-white font-medium">Distance Calculator</div>
                  <div className="text-slate-400 text-sm">Processed 15,832 distance calculations</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-white text-sm">2024-01-30 14:30:00</div>
                <div className="text-green-400 text-sm">Completed</div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-700 rounded-lg border border-slate-600">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <div>
                  <div className="text-white font-medium">Vehicle Simulation</div>
                  <div className="text-slate-400 text-sm">Updated 3,451 vehicle statuses</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-white text-sm">2024-01-30 14:20:00</div>
                <div className="text-green-400 text-sm">Completed</div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-700 rounded-lg border border-slate-600">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <div>
                  <div className="text-white font-medium">Player Progression</div>
                  <div className="text-slate-400 text-sm">Updated 892 player levels</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-white text-sm">2024-01-30 14:15:00</div>
                <div className="text-green-400 text-sm">Completed</div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-700 rounded-lg border border-slate-600">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                <div>
                  <div className="text-white font-medium">Staff Data Regeneration</div>
                  <div className="text-slate-400 text-sm">Scheduled for 00:03 AM</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-white text-sm">2024-01-30 00:03:00</div>
                <div className="text-yellow-400 text-sm">Scheduled</div>
              </div>
            </div>
          </div>

          {/* Statistics Summary */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
              <div className="text-slate-400 text-sm">Game Rules</div>
              <div className="text-2xl font-bold text-white">{gameRules.length}</div>
            </div>
            <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
              <div className="text-slate-400 text-sm">Engines</div>
              <div className="text-2xl font-bold text-green-400">{gameEngines.length}</div>
            </div>
            <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
              <div className="text-slate-400 text-sm">Cron Jobs</div>
              <div className="text-2xl font-bold text-yellow-400">{cronJobs.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {showModal && selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-xl border border-slate-700 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Details</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6">
              {renderModalContent()}
            </div>
            <div className="p-6 border-t border-slate-700 flex justify-end space-x-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
              >
                Close
              </button>
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                Edit Configuration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameRulesEngines;