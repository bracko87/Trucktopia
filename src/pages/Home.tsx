/**
 * Professional multi-layer home page with enhanced design
 * Shows company dashboard for authenticated users and landing page for guests
 */

import { Link } from 'react-router'
import { useGame } from '../contexts/GameContext'
import { Truck, Map, DollarSign, Users, Building, TrendingUp, BarChart3, Shield, Globe } from 'lucide-react'

export default function Home() {
  const { gameState } = useGame()

  // If user is authenticated, show professional dashboard
  if (gameState.isAuthenticated && gameState.company) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800/50 via-slate-900/80 to-slate-900"></div>
        
        <div className="container mx-auto px-4 py-8 relative z-10">
          {/* Welcome Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center space-x-3 bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl px-6 py-3 mb-6">
              <Building className="w-6 h-6 text-yellow-400" />
              <h1 className="text-3xl font-bold text-white">
                Welcome back, {gameState.company.name}!
              </h1>
            </div>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Ready to expand your logistics empire across Europe?
            </p>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 shadow-xl hover:border-slate-600 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-blue-500/20">
                  <DollarSign className="w-6 h-6 text-blue-400" />
                </div>
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-1">
                ${(gameState.company?.capital || 0).toLocaleString()}
              </h3>
              <p className="text-sm text-slate-400">Company Capital</p>
            </div>

            <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 shadow-xl hover:border-slate-600 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-green-500/20">
                  <Truck className="w-6 h-6 text-green-400" />
                </div>
                <BarChart3 className="w-5 h-5 text-green-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-1">
                {Array.isArray(gameState.company?.trucks) ? gameState.company.trucks.length : 0}
              </h3>
              <p className="text-sm text-slate-400">Active Trucks</p>
            </div>

            <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 shadow-xl hover:border-slate-600 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-orange-500/20">
                  <Users className="w-6 h-6 text-orange-400" />
                </div>
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-1">
                {Array.isArray(gameState.company?.staff) ? gameState.company.staff.length : 0}
              </h3>
              <p className="text-sm text-slate-400">Staff Members</p>
            </div>

            <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 shadow-xl hover:border-slate-600 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-purple-500/20">
                  <Building className="w-6 h-6 text-purple-400" />
                </div>
                <Globe className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-1">
                {gameState.company?.hub?.name || 'No Hub'}
              </h3>
              <p className="text-sm text-slate-400">Headquarters</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <Link 
              to="/market" 
              className="group bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-2xl p-6 border border-blue-500/30 transition-all duration-300 transform hover:scale-105 shadow-xl"
            >
              <div className="flex items-center space-x-4">
                <div className="p-3 rounded-xl bg-white/10">
                  <Map className="w-8 h-8 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-bold text-white mb-1">Find Jobs</h3>
                  <p className="text-blue-100 text-sm">Browse freight market opportunities</p>
                </div>
              </div>
            </Link>

            <Link 
              to="/garage" 
              className="group bg-gradient-to-br from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 rounded-2xl p-6 border border-green-500/30 transition-all duration-300 transform hover:scale-105 shadow-xl"
            >
              <div className="flex items-center space-x-4">
                <div className="p-3 rounded-xl bg-white/10">
                  <Truck className="w-8 h-8 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-bold text-white mb-1">Manage Fleet</h3>
                  <p className="text-green-100 text-sm">View and maintain your trucks</p>
                </div>
              </div>
            </Link>

            <Link 
              to="/jobs" 
              className="group bg-gradient-to-br from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 rounded-2xl p-6 border border-orange-500/30 transition-all duration-300 transform hover:scale-105 shadow-xl"
            >
              <div className="flex items-center space-x-4">
                <div className="p-3 rounded-xl bg-white/10">
                  <DollarSign className="w-8 h-8 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-bold text-white mb-1">Active Jobs</h3>
                  <p className="text-orange-100 text-sm">Monitor ongoing deliveries</p>
                </div>
              </div>
            </Link>
          </div>

          {/* Company Stats Section */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700/50 shadow-xl">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">Company Performance</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-yellow-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Reputation</h3>
                <div className="w-full bg-slate-700 rounded-full h-3">
                  <div 
                    className="bg-yellow-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${gameState.company?.reputation || 0}%` }}
                  ></div>
                </div>
                <p className="text-slate-400 mt-2">{gameState.company?.reputation || 0}%</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Building className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Company Level</h3>
                <p className="text-2xl font-bold text-blue-400 capitalize">
                  {gameState.company?.level || 'Starter'}
                </p>
                <p className="text-slate-400 text-sm">Current Tier</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Team Size</h3>
                <p className="text-2xl font-bold text-green-400">
                  {Array.isArray(gameState.company?.staff) ? gameState.company.staff.length : 0}
                </p>
                <p className="text-slate-400 text-sm">Staff Members</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Professional landing page for unauthenticated users
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800/20 via-slate-900/50 to-slate-900"></div>
      <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>

      <div className="container mx-auto px-4 py-16 relative z-10">
        {/* Hero Section */}
        <div className="text-center mb-20">
          <div className="flex items-center justify-center mb-8">
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-2xl">
                <Truck className="w-10 h-10 text-white" />
              </div>
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full border-4 border-slate-900"></div>
            </div>
            <div className="ml-4 text-left">
              <h1 className="text-6xl font-bold text-white mb-2">TRUCK MANAGER</h1>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <p className="text-yellow-400 text-lg font-semibold">SIMULATOR 2024</p>
              </div>
            </div>
          </div>
          
          <p className="text-xl text-slate-300 max-w-3xl mx-auto mb-10 leading-relaxed">
            Build your trucking empire from the ground up. Manage your fleet, hire professional drivers, 
            and become the most successful logistics company across Europe. Real-time operations, 
            dynamic markets, and strategic growth await.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <Link 
              to="/login" 
              className="group bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-10 py-4 rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-105 shadow-2xl flex items-center space-x-3"
            >
              <Shield className="w-5 h-5" />
              <span>Login to Your Company</span>
            </Link>
            <Link 
              to="/register" 
              className="group bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-10 py-4 rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-105 shadow-2xl flex items-center space-x-3"
            >
              <Building className="w-5 h-5" />
              <span>Start New Company</span>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="group bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700/50 hover:border-blue-500/50 transition-all duration-300 transform hover:-translate-y-2">
            <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
              <Truck className="w-8 h-8 text-blue-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-4 text-center">Advanced Fleet Management</h3>
            <p className="text-slate-300 text-center leading-relaxed">
              Buy, maintain, and optimize your truck fleet. Hire professional drivers and manage 
              logistics operations with real-time tracking and analytics.
            </p>
          </div>

          <div className="group bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700/50 hover:border-green-500/50 transition-all duration-300 transform hover:-translate-y-2">
            <div className="w-16 h-16 bg-green-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
              <Map className="w-8 h-8 text-green-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-4 text-center">European Transport Network</h3>
            <p className="text-slate-300 text-center leading-relaxed">
              Take on freight contracts across different European countries. Expand your business 
              internationally with dynamic markets and real economic simulation.
            </p>
          </div>

          <div className="group bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700/50 hover:border-purple-500/50 transition-all duration-300 transform hover:-translate-y-2">
            <div className="w-16 h-16 bg-purple-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
              <DollarSign className="w-8 h-8 text-purple-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-4 text-center">Strategic Business Growth</h3>
            <p className="text-slate-300 text-center leading-relaxed">
              Earn profits, upgrade equipment, and strategically grow your empire. Become the top 
              logistics provider with smart investments and market dominance.
            </p>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <div className="inline-flex items-center space-x-2 bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl px-6 py-3">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <p className="text-slate-300 text-sm">
              Join thousands of logistics professionals building their empires
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}