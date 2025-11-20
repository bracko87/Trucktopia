/**
 * Clean Settings page with simplified form structure
 * Modern, minimal design with focus on usability
 */

import React, { useState, useEffect } from 'react';
import { useGame } from '../contexts/GameContext';
import { Settings, User, Shield, Bell, Globe, Palette } from 'lucide-react';

interface SettingsData {
  firstName: string;
  lastName: string;
  email: string;
  language: string;
  theme: string;
  notifications: boolean;
  sound: boolean;
}

const Settings: React.FC = () => {
  const { gameState } = useGame();
  const [settingsData, setSettingsData] = useState<SettingsData>({
    firstName: '',
    lastName: '',
    email: gameState.company?.email || '',
    language: 'english',
    theme: 'dark',
    notifications: true,
    sound: true
  });

  const [activeTab, setActiveTab] = useState('profile');
  const [isSaved, setIsSaved] = useState(false);

  // Load saved settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('tm_user_settings');
    if (savedSettings) {
      try {
        const parsedData = JSON.parse(savedSettings);
        setSettingsData(prev => ({
          ...prev,
          ...parsedData
        }));
      } catch (error) {
        console.log('No saved settings found');
      }
    }
  }, []);

  const saveSettings = (data: SettingsData) => {
    localStorage.setItem('tm_user_settings', JSON.stringify(data));
    console.log('Settings saved to localStorage:', data);
  };

  const handleInputChange = (field: keyof SettingsData, value: string | boolean) => {
    setSettingsData(prev => ({
      ...prev,
      [field]: value
    }));
    setIsSaved(false);
  };

  const handleSaveChanges = () => {
    saveSettings(settingsData);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleReset = () => {
    const defaultSettings: SettingsData = {
      firstName: '',
      lastName: '',
      email: gameState.company?.email || '',
      language: 'english',
      theme: 'dark',
      notifications: true,
      sound: true
    };
    setSettingsData(defaultSettings);
    saveSettings(defaultSettings);
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User, color: 'blue' },
    { id: 'preferences', label: 'Preferences', icon: Settings, color: 'green' },
    { id: 'notifications', label: 'Notifications', icon: Bell, color: 'purple' },
    { id: 'appearance', label: 'Appearance', icon: Palette, color: 'orange' },
    { id: 'language', label: 'Language', icon: Globe, color: 'indigo' },
    { id: 'security', label: 'Security', icon: Shield, color: 'red' }
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      green: 'bg-green-500/20 text-green-400 border-green-500/30',
      purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      orange: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      indigo: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
      red: 'bg-red-500/20 text-red-400 border-red-500/30'
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
          <p className="text-slate-400">Manage your account preferences and game settings</p>
        </div>

        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <div className="flex flex-col lg:flex-row">
            {/* Sidebar Navigation */}
            <div className="lg:w-64 bg-slate-900 border-b lg:border-b-0 lg:border-r border-slate-700 p-4">
              <div className="flex lg:flex-col space-x-2 lg:space-x-0 lg:space-y-2 overflow-x-auto lg:overflow-x-visible">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all min-w-max ${
                      activeTab === tab.id
                        ? `${getColorClasses(tab.color)} border`
                        : 'text-slate-400 hover:text-white hover:bg-slate-700'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-6">
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">Profile Information</h3>
                    <p className="text-slate-400">Update your personal details</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        First Name
                      </label>
                      <input
                        type="text"
                        value={settingsData.firstName}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                        placeholder="Enter first name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={settingsData.lastName}
                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                        placeholder="Enter last name"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={settingsData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                        placeholder="your@email.com"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'preferences' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">Game Preferences</h3>
                    <p className="text-slate-400">Customize your gaming experience</p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
                      <div>
                        <div className="font-medium text-white">Enable Sound</div>
                        <div className="text-sm text-slate-400">Play sound effects in the game</div>
                      </div>
                      <button
                        onClick={() => handleInputChange('sound', !settingsData.sound)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settingsData.sound ? 'bg-green-500' : 'bg-slate-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            settingsData.sound ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
                      <div>
                        <div className="font-medium text-white">Enable Notifications</div>
                        <div className="text-sm text-slate-400">Receive in-game notifications</div>
                      </div>
                      <button
                        onClick={() => handleInputChange('notifications', !settingsData.notifications)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settingsData.notifications ? 'bg-green-500' : 'bg-slate-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            settingsData.notifications ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'appearance' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">Appearance</h3>
                    <p className="text-slate-400">Customize the look and feel</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-3">
                        Theme
                      </label>
                      <div className="grid grid-cols-2 gap-4">
                        <button
                          onClick={() => handleInputChange('theme', 'dark')}
                          className={`p-4 rounded-lg border-2 transition-all ${
                            settingsData.theme === 'dark'
                              ? 'border-blue-500 bg-blue-500/10'
                              : 'border-slate-600 bg-slate-700 hover:border-slate-500'
                          }`}
                        >
                          <div className="text-white font-medium mb-2">Dark</div>
                          <div className="text-slate-400 text-sm">Default dark theme</div>
                        </button>
                        <button
                          onClick={() => handleInputChange('theme', 'light')}
                          className={`p-4 rounded-lg border-2 transition-all ${
                            settingsData.theme === 'light'
                              ? 'border-blue-500 bg-blue-500/10'
                              : 'border-slate-600 bg-slate-700 hover:border-slate-500'
                          }`}
                        >
                          <div className="text-white font-medium mb-2">Light</div>
                          <div className="text-slate-400 text-sm">Light mode</div>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'language' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">Language & Region</h3>
                    <p className="text-slate-400">Choose your preferred language</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Language
                    </label>
                    <select
                      value={settingsData.language}
                      onChange={(e) => handleInputChange('language', e.target.value)}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="english">English</option>
                      <option value="german">German</option>
                      <option value="french">French</option>
                      <option value="spanish">Spanish</option>
                      <option value="italian">Italian</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Placeholder for other tabs */}
              {['notifications', 'security'].includes(activeTab) && (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Settings className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">
                      {tabs.find(tab => tab.id === activeTab)?.label}
                    </h3>
                    <p className="text-slate-400">This section is coming soon</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="border-t border-slate-700 p-6 bg-slate-800/50">
            <div className="flex justify-between items-center">
              <button
                onClick={handleReset}
                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors font-medium"
              >
                Reset to Defaults
              </button>
              <button
                onClick={handleSaveChanges}
                className={`px-6 py-3 rounded-lg transition-colors font-medium ${
                  isSaved 
                    ? 'bg-green-600 text-white cursor-default' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {isSaved ? '✓ Settings Saved!' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;