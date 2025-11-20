/**
 * User Management page for system administrators
 * Shows all registered users and allows user management actions
 */

import React, { useState, useEffect } from 'react';
import { useGame } from '../contexts/GameContext';
import { Shield, Users, Mail, Calendar, Building, Trash2, Eye, Search } from 'lucide-react';

interface User {
  email: string;
  username: string;
  company: any;
  createdAt: string;
}

const UserManagement: React.FC = () => {
  const { gameState } = useGame();
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Check if current user is admin
  const isAdmin = gameState.company?.id === 'admin-company';

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin]);

  const loadUsers = () => {
    try {
      const storedUsers = JSON.parse(localStorage.getItem('tm_users') || '[]');
      console.log('Loaded users from localStorage:', storedUsers);
      setUsers(storedUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      setUsers([]);
    }
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.company?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const deleteUser = (email: string) => {
    if (window.confirm(`Are you sure you want to delete user ${email}? This action cannot be undone.`)) {
      const updatedUsers = users.filter(user => user.email !== email);
      localStorage.setItem('tm_users', JSON.stringify(updatedUsers));
      setUsers(updatedUsers);
      setSelectedUser(null);
    }
  };

  const calculateStorageSize = () => {
    try {
      const usersData = localStorage.getItem('tm_users');
      const gameStateData = localStorage.getItem('tm_game_state');
      const adminData = localStorage.getItem('tm_admin_account');
      
      let totalSize = 0;
      if (usersData) totalSize += new Blob([usersData]).size;
      if (gameStateData) totalSize += new Blob([gameStateData]).size;
      if (adminData) totalSize += new Blob([adminData]).size;
      
      return Math.round(totalSize / 1024); // Convert to KB
    } catch (error) {
      return 0;
    }
  };

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
            <Users className="w-8 h-8 text-green-400" />
            <span>User Management</span>
          </h1>
          <p className="text-slate-400">Manage all registered users and companies</p>
        </div>
        <div className="flex items-center space-x-2 bg-green-500/20 border border-green-500/30 rounded-xl px-4 py-2">
          <Users className="w-5 h-5 text-green-400" />
          <span className="text-white font-medium">{users.length} Users</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
        <div className="flex items-center space-x-3">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search users by email, username, or company name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Users List */}
        <div className="lg:col-span-2 bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <div className="p-6 border-b border-slate-700">
            <h2 className="text-lg font-semibold text-white">Registered Users</h2>
            <p className="text-sm text-slate-400 mt-1">
              {filteredUsers.length} of {users.length} users
            </p>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">No Users Found</h3>
                <p className="text-slate-400">
                  {searchTerm ? 'No users match your search criteria.' : 'No users have registered yet.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-700">
                {filteredUsers.map((user, index) => (
                  <div
                    key={user.email}
                    className={`p-4 hover:bg-slate-700/50 cursor-pointer transition-colors ${
                      selectedUser?.email === user.email ? 'bg-slate-700' : ''
                    }`}
                    onClick={() => setSelectedUser(user)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                            <Mail className="w-5 h-5 text-green-400" />
                          </div>
                          <div>
                            <h3 className="font-medium text-white">{user.username}</h3>
                            <p className="text-sm text-slate-400">{user.email}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4 text-xs text-slate-500">
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span>Joined {formatDate(user.createdAt)}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Building className="w-3 h-3" />
                            <span>{user.company ? user.company.name : 'No Company'}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedUser(user);
                          }}
                          className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4 text-white" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteUser(user.email);
                          }}
                          className="p-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                          title="Delete User"
                        >
                          <Trash2 className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* User Details */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">User Details</h2>
          
          {!selectedUser ? (
            <div className="text-center py-12">
              <Eye className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Select a User</h3>
              <p className="text-slate-400">Click on a user to view their details</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="bg-slate-700/50 rounded-lg p-4">
                <h3 className="font-medium text-white mb-3">Basic Information</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Email:</span>
                    <span className="text-white font-medium">{selectedUser.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Username:</span>
                    <span className="text-white font-medium">{selectedUser.username}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Joined:</span>
                    <span className="text-white font-medium">{formatDate(selectedUser.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* Company Info */}
              <div className="bg-slate-700/50 rounded-lg p-4">
                <h3 className="font-medium text-white mb-3">Company Information</h3>
                {selectedUser.company ? (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Company Name:</span>
                      <span className="text-white font-medium">{selectedUser.company.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Level:</span>
                      <span className="text-blue-400 font-medium capitalize">{selectedUser.company.level}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Capital:</span>
                      <span className="text-green-400 font-medium">${selectedUser.company.capital?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Reputation:</span>
                      <span className="text-yellow-400 font-medium">{selectedUser.company.reputation}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-400 text-sm">No company created yet</p>
                )}
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <button
                  onClick={() => deleteUser(selectedUser.email)}
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete User</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="text-sm text-slate-400">Total Users</div>
          <div className="text-2xl font-bold text-white">{users.length}</div>
        </div>
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="text-sm text-slate-400">With Companies</div>
          <div className="text-2xl font-bold text-white">
            {users.filter(user => user.company).length}
          </div>
        </div>
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="text-sm text-slate-400">Active Today</div>
          <div className="text-2xl font-bold text-white">
            {users.filter(user => {
              const userDate = new Date(user.createdAt);
              const today = new Date();
              return userDate.toDateString() === today.toDateString();
            }).length}
          </div>
        </div>
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="text-sm text-slate-400">Storage Used</div>
          <div className="text-2xl font-bold text-white">
            {calculateStorageSize()} KB
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;