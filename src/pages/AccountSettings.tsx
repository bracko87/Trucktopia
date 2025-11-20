/**
 * Account Settings page - Full page layout with sidebar navigation
 * Replaces the popup modal with dedicated page
 */

import React, { useState, useEffect } from 'react';
import { useGame } from '../contexts/GameContext';

interface ProfileData {
  firstName: string;
  lastName: string;
  birthday: string;
  country: string;
  city: string;
  email: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const AccountSettings: React.FC = () => {
  const { gameState } = useGame();
  const [activeSection, setActiveSection] = useState('profile');
  const [profileData, setProfileData] = useState<ProfileData>({
    firstName: '',
    lastName: '',
    birthday: '',
    country: '',
    city: '',
    email: gameState.company?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [isSaved, setIsSaved] = useState(false);

  // Load saved profile data from localStorage
  useEffect(() => {
    const savedProfile = localStorage.getItem('tm_user_profile');
    if (savedProfile) {
      try {
        const parsedData = JSON.parse(savedProfile);
        setProfileData(prev => ({
          ...prev,
          ...parsedData,
          // Don't load passwords for security
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        }));
      } catch (error) {
        console.log('No saved profile data found');
      }
    }
  }, []);

  // Save profile data to localStorage
  const saveProfileData = (data: ProfileData) => {
    // Don't save passwords for security
    const dataToSave = {
      firstName: data.firstName,
      lastName: data.lastName,
      birthday: data.birthday,
      country: data.country,
      city: data.city,
      email: data.email
    };
    
    localStorage.setItem('tm_user_profile', JSON.stringify(dataToSave));
    console.log('Profile data saved to localStorage:', dataToSave);
  };

  const handleInputChange = (field: keyof ProfileData, value: string) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
    setIsSaved(false);
  };

  const handleSaveChanges = () => {
    // Validate passwords if they are being changed
    if (profileData.newPassword || profileData.confirmPassword) {
      if (profileData.newPassword !== profileData.confirmPassword) {
        alert('New passwords do not match!');
        return;
      }
      if (profileData.newPassword.length < 6) {
        alert('New password must be at least 6 characters long!');
        return;
      }
    }

    // Save to localStorage
    saveProfileData(profileData);
    setIsSaved(true);
    
    // Clear password fields after save for security
    setProfileData(prev => ({
      ...prev,
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }));

    // Show success message with visual feedback
    setTimeout(() => {
      setIsSaved(false);
    }, 3000);
  };

  const handleCancel = () => {
    // Reload saved data from localStorage
    const savedProfile = localStorage.getItem('tm_user_profile');
    if (savedProfile) {
      try {
        const parsedData = JSON.parse(savedProfile);
        setProfileData(prev => ({
          ...prev,
          ...parsedData,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        }));
      } catch (error) {
        // Reset to empty if no saved data
        setProfileData({
          firstName: '',
          lastName: '',
          birthday: '',
          country: '',
          city: '',
          email: gameState.company?.email || '',
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      }
    }
    setIsSaved(false);
  };

  const menuItems = [
    { id: 'profile', label: 'My Profile', description: 'Personal information', icon: 'user' },
    { id: 'inbox', label: 'Inbox', description: 'Internal messaging', icon: 'mail' },
    { id: 'company', label: 'Customize Company', description: 'Branding & settings', icon: 'building' },
    { id: 'forum', label: 'Forum', description: 'Discord community', icon: 'message-square' },
    { id: 'preferences', label: 'Preferences', description: 'Game settings', icon: 'settings' },
    { id: 'help', label: 'Help', description: 'Guides & support', icon: 'circle-help' },
    { id: 'contact', label: 'Contact Us', description: 'Get support', icon: 'message-square' },
    { id: 'invite', label: 'Invite Friends', description: 'Share with friends', icon: 'users' },
    { id: 'pro', label: 'Pro Package', description: 'Upgrade experience', icon: 'crown', highlight: true }
  ];

  const renderIcon = (iconName: string) => {
    const icons: { [key: string]: string } = {
      user: 'M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2 M12 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
      mail: 'M22 4H2a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h20a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2 M22 7l-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7',
      building: 'M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18 M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2 M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2 M10 6h4 M10 10h4 M10 14h4 M10 18h4',
      'message-square': 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
      settings: 'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6',
      'circle-help': 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10 M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3 M12 17h.01',
      users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
      crown: 'M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z M5 21h14'
    };
    
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d={icons[iconName]} />
      </svg>
    );
  };

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Account Settings</h1>
          <p className="text-slate-400">Manage your account preferences and personal information</p>
        </div>

        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <div className="flex h-[600px]">
            {/* Sidebar */}
            <div className="w-64 bg-slate-900 border-r border-slate-700 p-4 flex flex-col">
              <div className="flex-1 overflow-y-auto">
                <div className="space-y-1">
                  {menuItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setActiveSection(item.id)}
                      className={`w-full flex items-center space-x-3 p-3 rounded-lg text-left transition-colors ${
                        activeSection === item.id
                          ? 'bg-blue-600 text-white'
                          : `text-slate-300 hover:bg-slate-700 hover:text-white ${item.highlight ? 'border border-yellow-500/30' : ''}`
                      }`}
                    >
                      {renderIcon(item.icon)}
                      <div className="flex-1">
                        <div className="font-medium text-sm flex items-center space-x-2">
                          <span>{item.label}</span>
                          {item.highlight && (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-400">
                              <path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z" />
                              <path d="M5 21h14" />
                            </svg>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">{item.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Logout Button */}
              <div className="pt-4 border-t border-slate-700 mt-4">
                <button className="w-full flex items-center space-x-3 p-3 rounded-lg text-left text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  <div>
                    <div className="font-medium text-sm">Log Out</div>
                    <div className="text-xs text-red-400/70 mt-1">Sign out of account</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-6 overflow-y-auto">
              {activeSection === 'profile' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-white mb-2">Personal Information</h3>
                    <p className="text-slate-400">Update your personal details and account information</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">First Name</label>
                      <input
                        type="text"
                        value={profileData.firstName}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                        placeholder="Enter first name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Last Name</label>
                      <input
                        type="text"
                        value={profileData.lastName}
                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                        placeholder="Enter last name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Birthday Date</label>
                      <input
                        type="date"
                        value={profileData.birthday}
                        onChange={(e) => handleInputChange('birthday', e.target.value)}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Country</label>
                      <select
                        value={profileData.country}
                        onChange={(e) => handleInputChange('country', e.target.value)}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="">Select country</option>
                        <option value="Germany">Germany</option>
                        <option value="France">France</option>
                        <option value="United Kingdom">United Kingdom</option>
                        <option value="Spain">Spain</option>
                        <option value="Italy">Italy</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">City</label>
                      <input
                        type="text"
                        value={profileData.city}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                        placeholder="Enter city"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
                      <input
                        type="email"
                        value={profileData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                        placeholder="your@email.com"
                      />
                    </div>
                  </div>

                  <div className="border-t border-slate-700 pt-6">
                    <h4 className="text-lg font-bold text-white mb-4">Change Password</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Current Password</label>
                        <input
                          type="password"
                          value={profileData.currentPassword}
                          onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                          placeholder="Enter current password"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">New Password</label>
                        <input
                          type="password"
                          value={profileData.newPassword}
                          onChange={(e) => handleInputChange('newPassword', e.target.value)}
                          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                          placeholder="Enter new password"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Confirm New Password</label>
                        <input
                          type="password"
                          value={profileData.confirmPassword}
                          onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                          placeholder="Confirm new password"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={handleCancel}
                      className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveChanges}
                      className={`px-6 py-3 rounded-lg transition-colors font-medium ${
                        isSaved 
                          ? 'bg-green-600 text-white cursor-default' 
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {isSaved ? '✓ Changes Saved!' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              )}

              {activeSection !== 'profile' && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <h3 className="text-xl font-bold text-white mb-2">{menuItems.find(item => item.id === activeSection)?.label}</h3>
                    <p className="text-slate-400">This section is coming soon</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountSettings;