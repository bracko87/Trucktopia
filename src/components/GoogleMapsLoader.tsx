/**
 * Component to handle Google Maps API loading and initialization
 */

import React, { useEffect, useState } from 'react';

interface GoogleMapsLoaderProps {
  children: React.ReactNode;
}

const GoogleMapsLoader: React.FC<GoogleMapsLoaderProps> = ({ children }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    // Check if Google Maps is already loaded
    if (window.google && window.google.maps) {
      setIsLoaded(true);
      return;
    }

    // Load Google Maps script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyCVbZvtYTWB9wxWwPO3N_V5jBdo-V39pkk&libraries=geometry`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      setIsLoaded(true);
    };

    script.onerror = () => {
      setLoadError('Failed to load Google Maps');
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  if (loadError) {
    return (
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 text-center">
        <div className="text-red-400 text-lg mb-2">Map Loading Error</div>
        <div className="text-slate-400">{loadError}</div>
        <div className="text-sm text-slate-500 mt-2">
          Please check your API key and ensure Google Maps JavaScript API is enabled.
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 text-center">
        <div className="text-slate-400">Loading Google Maps...</div>
        <div className="mt-2">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default GoogleMapsLoader;
