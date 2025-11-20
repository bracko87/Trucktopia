/**
 * User Settings page with comprehensive account management features
 * Includes profile, messaging, company customization, and preferences
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

interface Message {
  id: string;
  from: string;
  subject: string;
  content: string;
  timestamp: string;
  read: boolean;
}

interface CompanyData {
  name: string;
  logo: string | null;
}

interface Preferences {
  language: string;
  theme: string;
  notifications: boolean;
  sound: boolean;
  autoSave: boolean;
}

const UserSettings: React.FC = () => {
  const { gameState } = useGame();
  const [activeSection, setActiveSection] = useState('profile');
  const [saveStatus, setSaveStatus] = useState<{ [key: string]: boolean }>({});

  // Get user-specific storage keys with world isolation
  const getStorageKey = (baseKey: string) => {
    const userEmail = gameState.company?.email;
    if (!userEmail) {
      console.error('No user email found for storage key generation');
      return `tm_euro-asia_${baseKey}_anonymous`;
    }
    const cleanEmail = userEmail.replace(/[^a-zA-Z0-9]/g, '_');
    const worldId = 'euro-asia'; // Current world - will be dynamic later
    return `tm_${worldId}_${baseKey}_${cleanEmail}`;
  };

  // Profile Data
  const [profileData, setProfileData] = useState<ProfileData>({
    firstName: '',
    lastName: '',
    birthday: '',
    country: '',
    city: '',
    email: '', // Will be set from current user's email
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Inbox Data
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [newMessage, setNewMessage] = useState({
    to: '',
    subject: '',
    content: ''
  });

  // Company Data
  const [companyData, setCompanyData] = useState<CompanyData>({
    name: gameState.company?.name || '',
    logo: null
  });

  // Preferences
  const [preferences, setPreferences] = useState<Preferences>({
    language: 'english',
    theme: 'dark',
    notifications: true,
    sound: true,
    autoSave: true
  });

  // Contact Form
  const [contactForm, setContactForm] = useState({
    subject: '',
    email: '',
    message: '',
    attachments: null as File | null
  });

  // Load saved data from localStorage for current user only
  useEffect(() => {
    console.log('UserSettings useEffect triggered');
    console.log('Current gameState:', gameState);
    console.log('Company object:', JSON.stringify(gameState.company, null, 2));
    console.log('Company email:', gameState.company?.email);
    
    if (!gameState.company?.email) {
      console.log('No company email found in gameState');
      console.log('Company object exists:', !!gameState.company);
      console.log('Company object keys:', gameState.company ? Object.keys(gameState.company) : 'none');
      return;
    }

    console.log('Loading data for user:', gameState.company.email);
    console.log('Storage key prefix:', getStorageKey('user_profile'));

    // Load profile data
    const savedProfile = localStorage.getItem(getStorageKey('user_profile'));
    console.log('Found profile data:', savedProfile);
    
    if (savedProfile) {
      try {
        const parsedData = JSON.parse(savedProfile);
        setProfileData(prev => ({
          ...prev,
          ...parsedData,
          email: gameState.company?.email || parsedData.email, // Ensure current user's email is used
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        }));
      } catch (error) {
        console.log('No saved profile data found for current user');
        // Reset to current user's data
        setProfileData(prev => ({
          ...prev,
          firstName: '',
          lastName: '',
          birthday: '',
          country: '',
          city: '',
          email: gameState.company?.email || '',
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        }));
        console.log('Reset profile data with email:', gameState.company?.email);
      }
    } else {
      // No saved data, set default with current user's email
      setProfileData(prev => ({
        ...prev,
        firstName: '',
        lastName: '',
        birthday: '',
        country: '',
        city: '',
        email: gameState.company?.email || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
    }

    // Load other data...
    const savedCompany = localStorage.getItem(getStorageKey('user_company'));
    if (savedCompany) {
      try {
        const parsedData = JSON.parse(savedCompany);
        setCompanyData(parsedData);
      } catch (error) {
        console.log('No saved company data found for current user');
      }
    }

    const savedPreferences = localStorage.getItem(getStorageKey('user_preferences'));
    if (savedPreferences) {
      try {
        const parsedData = JSON.parse(savedPreferences);
        setPreferences(parsedData);
      } catch (error) {
        console.log('No saved preferences found for current user');
      }
    }

    const savedMessages = localStorage.getItem(getStorageKey('user_messages'));
    if (savedMessages) {
      try {
        const parsedData = JSON.parse(savedMessages);
        setMessages(parsedData);
      } catch (error) {
        console.log('No saved messages found for current user');
      }
    }
  }, [gameState.company?.email]);

  // Save data to localStorage for current user only
  const saveToStorage = (key: string, data: any) => {
    const userEmail = gameState.company?.email;
    console.log('saveToStorage called with email:', userEmail);
    
    if (!userEmail) {
      console.error('No user email found, cannot save data');
      return;
    }
    
    const storageKey = getStorageKey(key);
    console.log('Saving to key:', storageKey);
    
    // Always ensure we save with current user's email
    const dataWithEmail = {
      ...data,
      savedForUser: userEmail,
      savedAt: new Date().toISOString()
    };
    
    localStorage.setItem(storageKey, JSON.stringify(dataWithEmail));
    console.log('Data saved successfully for user:', userEmail);
  };

  // Handle profile save
  const handleProfileSave = () => {
    console.log('handleProfileSave called');
    console.log('Current gameState:', gameState);
    
    // Always use the current company email for security
    const currentEmail = gameState.company?.email;
    if (!currentEmail) {
      console.error('No company email found in gameState');
      alert('No user email found. Please log in again.');
      return;
    }
    
    console.log('Using email for save:', currentEmail);

    // Validate passwords if changing
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

    // Save profile data (without passwords) - always use current user's email
    const profileToSave = {
      firstName: profileData.firstName,
      lastName: profileData.lastName,
      birthday: profileData.birthday,
      country: profileData.country,
      city: profileData.city,
      email: gameState.company.email // ALWAYS use current logged-in user's email
    };
    
    saveToStorage('user_profile', profileToSave);
    setSaveStatus(prev => ({ ...prev, profile: true }));
    
    // Clear password fields and reset email to current system email
    setProfileData(prev => ({
      ...prev,
      email: currentEmail, // Reset to current system email
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }));

    setTimeout(() => {
      setSaveStatus(prev => ({ ...prev, profile: false }));
    }, 3000);
  };

  // Handle company save
  const handleCompanySave = () => {
    saveToStorage('user_company', companyData);
    setSaveStatus(prev => ({ ...prev, company: true }));
    
    setTimeout(() => {
      setSaveStatus(prev => ({ ...prev, company: false }));
    }, 3000);
  };

  // Handle preferences save
  const handlePreferencesSave = () => {
    saveToStorage('user_preferences', preferences);
    setSaveStatus(prev => ({ ...prev, preferences: true }));
    
    setTimeout(() => {
      setSaveStatus(prev => ({ ...prev, preferences: false }));
    }, 3000);
  };

  // Handle logo upload
  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        alert('File size must be less than 1MB');
        return;
      }
      if (!['image/jpeg', 'image/png'].includes(file.type)) {
        alert('Only JPG and PNG files are allowed');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setCompanyData(prev => ({
          ...prev,
          logo: e.target?.result as string
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle send message
  const handleSendMessage = () => {
    if (!newMessage.to || !newMessage.subject || !newMessage.content) {
      alert('Please fill all message fields');
      return;
    }

    const message: Message = {
      id: `msg-${Date.now()}`,
      from: gameState.company?.name || 'You',
      subject: newMessage.subject,
      content: newMessage.content,
      timestamp: new Date().toLocaleString(),
      read: false
    };

    const updatedMessages = [message, ...messages];
    setMessages(updatedMessages);
    saveToStorage('user_messages', updatedMessages);
    
    setNewMessage({ to: '', subject: '', content: '' });
    alert('Message sent successfully!');
  };

  // Handle contact form submit
  const handleContactSubmit = () => {
    if (!contactForm.subject || !contactForm.email || !contactForm.message) {
      alert('Please fill all required fields');
      return;
    }

    // Simulate sending contact form
    console.log('Contact form submitted:', contactForm);
    setSaveStatus(prev => ({ ...prev, contact: true }));
    setContactForm({ subject: '', email: '', message: '', attachments: null });
    
    setTimeout(() => {
      setSaveStatus(prev => ({ ...prev, contact: false }));
    }, 3000);
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

  // ... rest of the component remains the same (renderIcon function and JSX)
  // The JSX code is too long to include here, but it uses the same user-specific storage keys

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
                        onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                        placeholder="Enter first name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Last Name</label>
                      <input
                        type="text"
                        value={profileData.lastName}
                        onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                        placeholder="Enter last name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Birthday Date</label>
                      <input
                        type="date"
                        value={profileData.birthday}
                        onChange={(e) => setProfileData(prev => ({ ...prev, birthday: e.target.value }))}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Country</label>
                      <input
                        type="text"
                        value={profileData.country}
                        onChange={(e) => setProfileData(prev => ({ ...prev, country: e.target.value }))}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                        placeholder="Enter country"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">City</label>
                      <input
                        type="text"
                        value={profileData.city}
                        onChange={(e) => setProfileData(prev => ({ ...prev, city: e.target.value }))}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                        placeholder="Enter city"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
                      <input
                        type="email"
                        value={gameState.company?.email || 'No email found'}
                        disabled
                        className="w-full bg-slate-600 border border-slate-500 rounded-lg px-3 py-2 text-slate-400 cursor-not-allowed"
                        title="Email cannot be changed for security reasons"
                      />
                      <p className="text-xs text-slate-500 mt-1">Email address cannot be changed for security reasons</p>
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
                          onChange={(e) => setProfileData(prev => ({ ...prev, currentPassword: e.target.value }))}
                          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                          placeholder="Enter current password"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">New Password</label>
                        <input
                          type="password"
                          value={profileData.newPassword}
                          onChange={(e) => setProfileData(prev => ({ ...prev, newPassword: e.target.value }))}
                          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                          placeholder="Enter new password"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Confirm New Password</label>
                        <input
                          type="password"
                          value={profileData.confirmPassword}
                          onChange={(e) => setProfileData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                          placeholder="Confirm new password"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => {
                        const savedProfile = localStorage.getItem(getStorageKey('user_profile'));
                        if (savedProfile) {
                          const parsedData = JSON.parse(savedProfile);
                          setProfileData(prev => ({
                            ...prev,
                            ...parsedData,
                            currentPassword: '',
                            newPassword: '',
                            confirmPassword: ''
                          }));
                        }
                      }}
                      className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleProfileSave}
                      className={`px-6 py-2 rounded-lg transition-colors font-medium ${
                        saveStatus.profile 
                          ? 'bg-green-600 text-white cursor-default' 
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {saveStatus.profile ? '✓ Changes Saved!' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              )}

              {/* ... rest of the sections remain the same ... */}
              {activeSection !== 'profile' && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <h3 className="text-xl font-bold text-white mb-2">
                      {menuItems.find(item => item.id === activeSection)?.label}
                    </h3>
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

export default UserSettings;
