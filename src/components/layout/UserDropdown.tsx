/**
 * Compact user dropdown menu with profile, settings, and account options
 */

import React, { useState } from 'react';
import { 
  User, 
  Mail, 
  Building, 
  MessageSquare, 
  Settings, 
  HelpCircle, 
  Users, 
  Crown, 
  LogOut
} from 'lucide-react';
import { useGame } from '../../contexts/GameContext';
import ForumContent from './ForumContent';

interface UserDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

const UserDropdown: React.FC<UserDropdownProps> = ({ isOpen, onClose }) => {
  const { logout } = useGame();
  const [activeTab, setActiveTab] = useState<'profile' | 'inbox' | 'company' | 'contact' | 'forum'>('profile');

  if (!isOpen) return null;

  const menuItems = [
    {
      id: 'profile',
      label: 'My Profile',
      icon: User,
      description: 'Personal information'
    },
    {
      id: 'inbox',
      label: 'Inbox',
      icon: Mail,
      description: 'Internal messaging'
    },
    {
      id: 'company',
      label: 'Customize Company',
      icon: Building,
      description: 'Branding & settings'
    },
    {
      id: 'forum',
      label: 'Forum',
      icon: MessageSquare,
      description: 'Discord community'
    },
    {
      id: 'preferences',
      label: 'Preferences',
      icon: Settings,
      description: 'Game settings'
    },
    {
      id: 'help',
      label: 'Help',
      icon: HelpCircle,
      description: 'Guides & support'
    },
    {
      id: 'contact',
      label: 'Contact Us',
      icon: MessageSquare,
      description: 'Get support'
    },
    {
      id: 'invite',
      label: 'Invite Friends',
      icon: Users,
      description: 'Share with friends'
    },
    {
      id: 'pro',
      label: 'Pro Package',
      icon: Crown,
      description: 'Upgrade experience',
      premium: true
    }
  ];

  const handleItemClick = (itemId: string) => {
    console.log('Menu item clicked:', itemId);
    if (itemId === 'logout') {
      console.log('Logout initiated');
      logout();
      onClose();
    } else if (['profile', 'inbox', 'company', 'contact', 'forum'].includes(itemId)) {
      setActiveTab(itemId as any);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return <ProfileContent />;
      case 'inbox':
        return <InboxContent />;
      case 'company':
        return <CompanyContent />;
      case 'contact':
        return <ContactContent />;
      case 'forum':
        return <ForumContent />;
      default:
        return <ProfileContent />;
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50">
      <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-4xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white">Account Settings</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-white text-lg"
          >
            ×
          </button>
        </div>

        <div className="flex h-[500px]">
          {/* Sidebar Navigation */}
          <div className="w-56 bg-slate-900 border-r border-slate-700 p-3 flex flex-col">
            {/* Scrollable Menu Items */}
            <div className="flex-1 overflow-y-auto">
              <div className="space-y-1">
                {menuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item.id)}
                    className={`w-full flex items-center space-x-2 p-2 rounded-lg text-left transition-colors ${
                      activeTab === item.id
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    } ${item.premium ? 'border border-yellow-500/30' : ''}`}
                  >
                    <item.icon className="w-4 h-4" />
                    <div className="flex-1">
                      <div className="font-medium text-xs flex items-center space-x-1">
                        <span>{item.label}</span>
                        {item.premium && (
                          <Crown className="w-3 h-3 text-yellow-400" />
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {item.description}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Fixed Logout Button - ALWAYS VISIBLE */}
            <div className="pt-2 border-t border-slate-700 mt-2">
              <button
                onClick={() => handleItemClick('logout')}
                className="w-full flex items-center space-x-2 p-2 rounded-lg text-left text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <div>
                  <div className="font-medium text-xs">Log Out</div>
                  <div className="text-[10px] text-red-400/70 mt-0.5">
                    Sign out of account
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 p-6 overflow-y-auto">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

// Profile Content Component
const ProfileContent: React.FC = () => {
  const { gameState } = useGame();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-white mb-2">Personal Information</h3>
        <p className="text-slate-400">Update your personal details and account information</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            First Name
          </label>
          <input
            type="text"
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
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
            placeholder="Enter last name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Birthday Date
          </label>
          <input
            type="date"
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Country
          </label>
          <select className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500">
            <option>Select country</option>
            <option>Germany</option>
            <option>France</option>
            <option>United Kingdom</option>
            <option>Spain</option>
            <option>Italy</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            City
          </label>
          <input
            type="text"
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
            placeholder="Enter city"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Email Address
          </label>
          <input
            type="email"
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
            placeholder="your@email.com"
          />
        </div>
      </div>

      <div className="border-t border-slate-700 pt-6">
        <h4 className="text-md font-bold text-white mb-4">Change Password</h4>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Current Password
            </label>
            <input
              type="password"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
              placeholder="Enter current password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              New Password
            </label>
            <input
              type="password"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
              placeholder="Enter new password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Confirm New Password
            </label>
            <input
              type="password"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
              placeholder="Confirm new password"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors">
          Cancel
        </button>
        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
          Save Changes
        </button>
      </div>
    </div>
  );
};

// Inbox Content Component
const InboxContent: React.FC = () => {
  const messages = [
    {
      id: 1,
      from: 'No Messages',
      subject: 'Your inbox is empty',
      preview: 'No messages available',
      time: 'No messages',
      unread: false
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-white mb-2">Internal Messaging</h3>
        <p className="text-slate-400">Communicate with other players and receive system notifications</p>
      </div>

      <div className="bg-slate-700/50 rounded-lg border border-slate-600">
        {/* Message List */}
        <div className="border-b border-slate-600 p-4">
          <div className="space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  message.unread 
                    ? 'bg-blue-500/20 border border-blue-500/30' 
                    : 'hover:bg-slate-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <div className="font-medium text-white text-sm">
                        {message.from}
                      </div>
                      <div className="text-slate-300 text-sm">
                        {message.subject}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-400">{message.time}</div>
                    {message.unread && (
                      <div className="w-2 h-2 bg-blue-400 rounded-full ml-auto mt-1"></div>
                    )}
                  </div>
                </div>
                <div className="text-sm text-slate-400 mt-2 ml-11">
                  {message.preview}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Compose Message */}
        <div className="p-4">
          <h4 className="text-md font-bold text-white mb-3">Compose New Message</h4>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="To: Player Name"
              className="w-full bg-slate-600 border border-slate-500 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
            <input
              type="text"
              placeholder="Subject"
              className="w-full bg-slate-600 border border-slate-500 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
            <textarea
              placeholder="Type your message here..."
              rows={4}
              className="w-full bg-slate-600 border border-slate-500 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 resize-none"
            />
            <div className="flex justify-end">
              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                Send Message
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Company Content Component
const CompanyContent: React.FC = () => {
  const { gameState } = useGame();
  const [logo, setLogo] = useState<string | null>(null);

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) { // 1MB
        alert('File size must be less than 1MB');
        return;
      }
      if (!['image/jpeg', 'image/png'].includes(file.type)) {
        alert('Only JPG and PNG files are allowed');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogo(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-white mb-2">Customize Company</h3>
        <p className="text-slate-400">Update your company branding and information</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Company Name
          </label>
          <input
            type="text"
            defaultValue={gameState.company?.name}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
            placeholder="Enter company name"
          />
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Company Logo
          </label>
          <div className="flex items-center space-x-6">
            <div className="w-20 h-20 bg-slate-700 border-2 border-dashed border-slate-600 rounded-lg flex items-center justify-center">
              {logo ? (
                <img src={logo} alt="Company Logo" className="w-16 h-16 object-contain" />
              ) : (
                <Building className="w-8 h-8 text-slate-400" />
              )}
            </div>
            <div className="flex-1">
              <input
                type="file"
                id="logo-upload"
                accept=".jpg,.jpeg,.png"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <label
                htmlFor="logo-upload"
                className="inline-flex items-center px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg cursor-pointer transition-colors"
              >
                <User className="w-4 h-4 mr-2" />
                Upload Logo
              </label>
              <p className="text-xs text-slate-400 mt-2">
                JPG or PNG files up to 1MB
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors">
          Cancel
        </button>
        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
          Save Changes
        </button>
      </div>
    </div>
  );
};

// Contact Content Component
const ContactContent: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-white mb-2">Contact Us</h3>
        <p className="text-slate-400">Get in touch with our support team</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Subject
          </label>
          <select className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500">
            <option>General Inquiry</option>
            <option>Technical Support</option>
            <option>Bug Report</option>
            <option>Feature Request</option>
            <option>Account Issue</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Email Address
          </label>
          <input
            type="email"
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
            placeholder="your@email.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Message
          </label>
          <textarea
            rows={6}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 resize-none"
            placeholder="Describe your issue or question in detail..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Attachments (Optional)
          </label>
          <input
            type="file"
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
          />
          <p className="text-xs text-slate-400 mt-1">
            You can attach screenshots or other files to help us understand your issue
          </p>
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors">
          Cancel
        </button>
        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
          Send Message
        </button>
      </div>
    </div>
  );
};

export default UserDropdown;
