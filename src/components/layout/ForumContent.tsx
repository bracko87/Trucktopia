/**
 * Forum/Discord community information component
 */

import React from 'react';
import { ExternalLink, Users, MessageSquare, Star } from 'lucide-react';

const ForumContent: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-white mb-2">Join Our Community</h3>
        <p className="text-slate-400">Connect with other players, share strategies, and get the latest updates</p>
      </div>

      {/* Discord Card */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl p-6 border border-indigo-500/50">
        <div className="flex items-center space-x-4 mb-4">
          <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center">
            <div className="w-12 h-12 bg-indigo-500 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-8 h-8 text-white" />
            </div>
          </div>
          <div className="flex-1">
            <h4 className="text-xl font-bold text-white">Discord Community</h4>
            <p className="text-indigo-100">Join thousands of Truck Manager players</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white/10 rounded-lg p-4 text-center">
            <Users className="w-8 h-8 text-white mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">2,500+</div>
            <div className="text-indigo-100 text-sm">Active Players</div>
          </div>
          <div className="bg-white/10 rounded-lg p-4 text-center">
            <MessageSquare className="w-8 h-8 text-white mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">15K+</div>
            <div className="text-indigo-100 text-sm">Messages Daily</div>
          </div>
          <div className="bg-white/10 rounded-lg p-4 text-center">
            <Star className="w-8 h-8 text-white mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">24/7</div>
            <div className="text-indigo-100 text-sm">Support Available</div>
          </div>
        </div>

        <div className="space-y-3">
          <h5 className="text-white font-semibold">What you'll find:</h5>
          <ul className="text-indigo-100 space-y-2">
            <li className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>Strategy discussions and tips</span>
            </li>
            <li className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>Latest game updates and news</span>
            </li>
            <li className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>Player-run events and competitions</span>
            </li>
            <li className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>Direct support from developers</span>
            </li>
            <li className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>Community guides and resources</span>
            </li>
          </ul>
        </div>

        <div className="mt-6 p-4 bg-black/20 rounded-lg border border-white/10">
          <p className="text-indigo-100 text-sm mb-3">
            <strong>Note:</strong> The Discord invite link will be provided in a future update. 
            Check back later or look for announcements in the game.
          </p>
          <button 
            disabled
            className="w-full bg-white/20 hover:bg-white/30 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 opacity-50 cursor-not-allowed"
          >
            <ExternalLink className="w-5 h-5" />
            <span>Join Discord Community (Coming Soon)</span>
          </button>
        </div>
      </div>

      {/* Additional Community Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-700/50 rounded-lg p-6 border border-slate-600">
          <h4 className="text-md font-bold text-white mb-3">Community Guidelines</h4>
          <ul className="text-slate-300 text-sm space-y-2">
            <li>• Be respectful to all players</li>
            <li>• No spam or self-promotion</li>
            <li>• Keep discussions game-related</li>
            <li>• Report any issues to moderators</li>
          </ul>
        </div>
        
        <div className="bg-slate-700/50 rounded-lg p-6 border border-slate-600">
          <h4 className="text-md font-bold text-white mb-3">Get Involved</h4>
          <ul className="text-slate-300 text-sm space-y-2">
            <li>• Share your company success stories</li>
            <li>• Help new players get started</li>
            <li>• Participate in community events</li>
            <li>• Provide feedback for game improvements</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ForumContent;