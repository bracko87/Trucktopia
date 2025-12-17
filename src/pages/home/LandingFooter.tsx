import React from 'react';
import { Mail, MessageSquare, Facebook, Youtube, Twitter } from 'lucide-react';

const LandingFooter: React.FC = () => {
  return (
    <footer className="w-full border-t border-slate-700 bg-slate-900 px-6 py-8">
      <div className="container mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="text-sm text-slate-400">About Trucktopia</div>
            <div className="text-lg font-semibold text-white">A logistics simulation for strategic managers</div>
            <div className="text-sm text-slate-400 mt-2 max-w-xl">
              Build and run a trucking company — buy vehicles, hire staff, take contracts and grow your logistics empire.
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <div className="text-sm text-slate-400">
              <div>© 2025 Trucktopia Simulator</div>
              <div>Version 0.3.4</div>
            </div>

            <div className="flex items-center space-x-3">
              <a
                href="#email"
                aria-label="Email"
                title="Email"
                className="p-2 rounded-md bg-slate-800 hover:bg-slate-700 transition-colors text-slate-300"
              >
                <Mail className="w-5 h-5" />
              </a>

              <a
                href="#discord"
                aria-label="Discord"
                title="Discord"
                className="p-2 rounded-md bg-slate-800 hover:bg-slate-700 transition-colors text-slate-300"
              >
                <MessageSquare className="w-5 h-5" />
              </a>

              <a
                href="#facebook"
                aria-label="Facebook"
                title="Facebook"
                className="p-2 rounded-md bg-slate-800 hover:bg-slate-700 transition-colors text-slate-300"
              >
                <Facebook className="w-5 h-5" />
              </a>

              <a
                href="#youtube"
                aria-label="YouTube"
                title="YouTube"
                className="p-2 rounded-md bg-slate-800 hover:bg-slate-700 transition-colors text-slate-300"
              >
                <Youtube className="w-5 h-5" />
              </a>

              <a
                href="#x"
                aria-label="X / Twitter"
                title="X"
                className="p-2 rounded-md bg-slate-800 hover:bg-slate-700 transition-colors text-slate-300"
              >
                <Twitter className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;
