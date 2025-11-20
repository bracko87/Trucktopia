/**
 * Home.tsx
 *
 * Main application Home page.
 *
 * Responsibilities:
 * - Provide non-empty home content and entrances to other pages.
 * - Expose a quick in-app link to /test-supabase so the Supabase test can be reached
 *   without relying on Netlify server redirects (avoids direct-load 404).
 *
 * Note: BrowserRouter client-side navigation will be used via useNavigate from react-router.
 */

import React from 'react';
import { useNavigate } from 'react-router';
import { Database, Users, Grid } from 'lucide-react';

/**
 * QuickLinkCardProps
 * @description Props for the small quick-link card used on the Home page.
 */
interface QuickLinkCardProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  onClick: () => void;
  accentClass?: string;
}

/**
 * QuickLinkCard
 * @component Small reusable card used to navigate to different app pages.
 */
const QuickLinkCard: React.FC<QuickLinkCardProps> = ({ title, description, icon, onClick, accentClass = 'bg-slate-700' }) => {
  return (
    <button
      onClick={onClick}
      className={`flex items-start gap-4 p-4 rounded-lg border border-slate-600 hover:shadow-lg transition-shadow w-full text-left ${accentClass}`}
      aria-label={`Open ${title}`}
    >
      <div className="w-12 h-12 rounded-md flex items-center justify-center bg-slate-800/60 text-white">
        {icon}
      </div>
      <div className="flex-1">
        <div className="font-semibold text-white">{title}</div>
        <div className="text-sm text-slate-400 mt-1">{description}</div>
      </div>
    </button>
  );
};

/**
 * Home
 * @component The application's home screen. Contains quick navigation cards and a prominent
 *           button to open the Supabase test route inside the SPA (avoids direct URL 404s).
 */
export default function Home(): JSX.Element {
  const navigate = useNavigate();

  /**
   * openSupabaseTest
   * @description Navigate to the internal test page for Supabase connectivity.
   */
  const openSupabaseTest = () => {
    // Use SPA navigation so the client router handles the route (avoids server 404)
    navigate('/test-supabase');
  };

  return (
    <main className="p-6 space-y-6">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Trucktopia</h1>
          <p className="text-slate-400 mt-1">
            Welcome back — quick access to important pages and tools.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={openSupabaseTest}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
            title="Open Supabase Test"
          >
            <Database className="w-4 h-4" />
            Open Supabase Test
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-100 px-4 py-2 rounded-md font-medium transition-colors"
            title="Open Dashboard"
          >
            <Grid className="w-4 h-4" />
            Dashboard
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuickLinkCard
          title="Staff"
          description="Manage employees, hire and fire, promotions."
          icon={<Users className="w-5 h-5" />}
          onClick={() => navigate('/staff')}
          accentClass="bg-slate-800"
        />

        <QuickLinkCard
          title="Supabase Test"
          description="Open the Supabase connectivity test page (runs inside the SPA). Use this if direct links return a 404."
          icon={<Database className="w-5 h-5" />}
          onClick={openSupabaseTest}
          accentClass="bg-slate-800"
        />

        <QuickLinkCard
          title="Financial Overview"
          description="Open finances and budget tools."
          icon={<Grid className="w-5 h-5" />}
          onClick={() => navigate('/finances')}
          accentClass="bg-slate-800"
        />
      </section>

      <section className="bg-slate-800 rounded-xl border border-slate-700 p-4">
        <h2 className="text-lg font-semibold text-white">Why the in-app link?</h2>
        <p className="text-sm text-slate-400 mt-2">
          If you load /test-supabase directly and Netlify returns a server 404, use the
          "Open Supabase Test" button above after loading the site root. This navigates
          inside the SPA and avoids the server-side routing problem while we fix Netlify redirects.
        </p>
      </section>
    </main>
  );
}