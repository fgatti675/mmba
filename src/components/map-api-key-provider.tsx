
"use client";
import type { ReactNode } from 'react';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, Loader2 } from 'lucide-react';

declare global {
  interface Window {
    initMap?: () => void;
    google?: typeof google;
  }
}

interface MapApiKeyContextType {
  apiKey: string | null;
  isLoaded: boolean;
  loadError: Error | null;
}

const MapApiKeyContext = createContext<MapApiKeyContextType | undefined>(undefined);

export const useMapApiKey = (): MapApiKeyContextType => {
  const context = useContext(MapApiKeyContext);
  if (!context) {
    throw new Error('useMapApiKey must be used within a MapApiKeyProvider');
  }
  return context;
};

interface MapApiKeyProviderProps {
  children: ReactNode;
}

export const MapApiKeyProvider: React.FC<MapApiKeyProviderProps> = ({ children }) => {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || null;
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<Error | null>(null);

  useEffect(() => {
    if (!apiKey) {
      setLoadError(new Error("API key is missing."));
      return;
    }

    if (window.google && window.google.maps) {
      setIsLoaded(true);
      return;
    }

    const scriptId = "google-maps-script";
    if (document.getElementById(scriptId)) {
      // Script already added, might be loading or loaded
      // Add a listener to check its state if necessary, or assume it will load
      // For simplicity, if it exists and google.maps isn't ready, we wait.
      // This case needs careful handling if multiple providers try to load.
      // A better approach for multiple instances is a global flag.
      return;
    }
    
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=streetView,marker&callback=initMapGlobally`;
    script.async = true;
    script.defer = true;

    window.initMapGlobally = () => {
      setIsLoaded(true);
      delete window.initMapGlobally; // Clean up global callback
    };
    
    script.onerror = () => {
      setLoadError(new Error('Google Maps script failed to load.'));
      delete window.initMapGlobally; // Clean up global callback on error
    };

    document.head.appendChild(script);

    return () => {
      // Optional: Clean up script if component unmounts, though the API will remain loaded.
      // const existingScript = document.getElementById(scriptId);
      // if (existingScript) {
      //   document.head.removeChild(existingScript);
      // }
      // delete window.initMapGlobally;
    };
  }, [apiKey]);

  if (!apiKey) {
    return (
      <div className="container mx-auto p-4 flex justify-center items-center min-h-screen">
        <Alert variant="destructive" className="max-w-md">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Google Maps API Key Missing</AlertTitle>
          <AlertDescription>
            Please set the NEXT_PUBLIC_GOOGLE_MAPS_API_KEY environment variable in your .env.local file to use the map features.
            You can get an API key from the Google Cloud Console. Make sure to enable "Maps JavaScript API" and "Street View Static API".
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  if (loadError) {
    return (
      <div className="container mx-auto p-4 flex justify-center items-center min-h-screen">
        <Alert variant="destructive" className="max-w-md">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Error Loading Google Maps</AlertTitle>
          <AlertDescription>
            There was an error loading the Google Maps script. Please check your API key and network connection.
            Error: {loadError.message}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="container mx-auto p-4 flex flex-col justify-center items-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-foreground">Loading Maps...</p>
      </div>
    );
  }

  return (
    <MapApiKeyContext.Provider value={{ apiKey, isLoaded, loadError }}>
      {children}
    </MapApiKeyContext.Provider>
  );
};

// Ensure this global function is defined for the script callback
declare global {
  interface Window {
    initMapGlobally?: () => void;
  }
}
