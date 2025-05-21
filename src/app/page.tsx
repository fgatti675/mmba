
"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Building2, Wand2, AlertTriangle, Loader2, Eye, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { facadeTransformation } from '@/ai/flows/facade-transformation';
import type { FacadeTransformationInput } from '@/ai/flows/facade-transformation';
import { MapApiKeyProvider, useMapApiKey } from '@/components/map-api-key-provider';
import { StreetViewMap } from '@/components/street-view-map';
import type { StreetViewLookAt } from '@/components/street-view-map';
import { ImageComparison } from '@/components/image-comparison';
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';

const INITIAL_STREET_VIEW_POV: google.maps.StreetViewPov = { heading: 0, pitch: 0, zoom: 1 };

const HomePageContent: React.FC = () => {
  const { apiKey, isLoaded, loadError: mapScriptLoadError } = useMapApiKey();
  const { toast } = useToast();

  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [transformedImage, setTransformedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transformationAttempted, setTransformationAttempted] = useState(false);

  const [selectedLocationForStreetView, setSelectedLocationForStreetView] = useState<google.maps.LatLngLiteral | null>(null);
  const [streetViewLookAt, setStreetViewLookAt] = useState<StreetViewLookAt | null>(null);
  const [panoramaError, setPanoramaError] = useState<string | null>(null);

  const streetViewPanoramaContainerRef = useRef<HTMLDivElement>(null);
  const panoramaInstanceRef = useRef<google.maps.StreetViewPanorama | null>(null);
  const povChangedListenerRef = useRef<google.maps.MapsEventListener | null>(null);
  const positionChangedListenerRef = useRef<google.maps.MapsEventListener | null>(null);

  const handleMapClick = useCallback((location: google.maps.LatLngLiteral) => {
    setOriginalImage(null);
    setTransformedImage(null);
    setError(null);
    setPanoramaError(null);
    setStreetViewLookAt(null); // Clear previous POV before new one loads
    setSelectedLocationForStreetView(location);
  }, []);

  useEffect(() => {
    if (!isLoaded || !window.google || !selectedLocationForStreetView || !streetViewPanoramaContainerRef.current) {
      if (panoramaInstanceRef.current) {
        if (povChangedListenerRef.current) window.google.maps.event.removeListener(povChangedListenerRef.current);
        if (positionChangedListenerRef.current) window.google.maps.event.removeListener(positionChangedListenerRef.current);
        povChangedListenerRef.current = null;
        positionChangedListenerRef.current = null;
        panoramaInstanceRef.current.setVisible(false);
        if (streetViewPanoramaContainerRef.current) streetViewPanoramaContainerRef.current.innerHTML = ''; // Clear container
        panoramaInstanceRef.current = null;
      }
      setStreetViewLookAt(null);
      if (selectedLocationForStreetView === null) setPanoramaError(null); // Clear error if location is deselected
      return;
    }

    // Force cleanup of previous instance
    if (panoramaInstanceRef.current) {
        if (povChangedListenerRef.current) window.google.maps.event.removeListener(povChangedListenerRef.current);
        if (positionChangedListenerRef.current) window.google.maps.event.removeListener(positionChangedListenerRef.current);
        povChangedListenerRef.current = null;
        positionChangedListenerRef.current = null;
        panoramaInstanceRef.current.setVisible(false);
        panoramaInstanceRef.current = null; // Ensure old instance is gone
    }
    if (streetViewPanoramaContainerRef.current) {
        streetViewPanoramaContainerRef.current.innerHTML = ''; // Clear container for new panorama
    }
    
    setStreetViewLookAt(null); // Reset lookAt for new panorama
    setPanoramaError(null); // Reset panorama error

    const svService = new window.google.maps.StreetViewService();
    svService.getPanorama(
      { location: selectedLocationForStreetView, radius: 50, source: google.maps.StreetViewSource.OUTDOOR },
      (data, status) => {
        if (streetViewPanoramaContainerRef.current === null) return; // Container might have unmounted

        if (status === google.maps.StreetViewStatus.OK && data?.location?.latLng) {
          setPanoramaError(null);
          const panoramaOptions: google.maps.StreetViewPanoramaOptions = {
              position: data.location.latLng,
              pov: INITIAL_STREET_VIEW_POV,
              visible: true,
              controlSize: 24,
              addressControl: false,
              enableCloseButton: false, 
              fullscreenControl: false,
              linksControl: true,
              panControl: true,
              zoomControl: true,
              motionTracking: false,
              motionTrackingControl: false,
          };

          // Ensure the container is empty before creating a new panorama
          streetViewPanoramaContainerRef.current.innerHTML = '';
          const panorama = new window.google.maps.StreetViewPanorama(
            streetViewPanoramaContainerRef.current!,
            panoramaOptions
          );
          panoramaInstanceRef.current = panorama;
          
          // Initial POV and Position
          const initialPov = panorama.getPov();
          const initialPos = panorama.getPosition();
          if (initialPos && initialPov) {
              setStreetViewLookAt({
                  lat: initialPos.lat(),
                  lng: initialPos.lng(),
                  heading: initialPov.heading ?? 0,
                  pitch: initialPov.pitch ?? 0,
                  zoom: initialPov.zoom ?? 1,
              });
          }
          
          // Remove old listeners before adding new ones
          if (povChangedListenerRef.current) window.google.maps.event.removeListener(povChangedListenerRef.current);
          povChangedListenerRef.current = panorama.addListener('pov_changed', () => {
            if (panoramaInstanceRef.current) {
              const pov = panoramaInstanceRef.current.getPov();
              const pos = panoramaInstanceRef.current.getPosition();
              if (pos && pov) {
                setStreetViewLookAt({
                  lat: pos.lat(),
                  lng: pos.lng(),
                  heading: pov.heading ?? 0,
                  pitch: pov.pitch ?? 0,
                  zoom: pov.zoom ?? 1,
                });
              }
            }
          });

          if (positionChangedListenerRef.current) window.google.maps.event.removeListener(positionChangedListenerRef.current);
          positionChangedListenerRef.current = panorama.addListener('position_changed', () => {
              if (panoramaInstanceRef.current) {
                  const pov = panoramaInstanceRef.current.getPov();
                  const pos = panoramaInstanceRef.current.getPosition();
                  if (pos && pov) {
                       setStreetViewLookAt({
                          lat: pos.lat(),
                          lng: pos.lng(),
                          heading: pov.heading ?? 0,
                          pitch: pov.pitch ?? 0,
                          zoom: pov.zoom ?? 1,
                      });
                  }
              }
          });

        } else {
          let errorMsg = "Exterior Street View imagery is not available for this location. Please try a different spot.";
          if (status === google.maps.StreetViewStatus.ZERO_RESULTS) {
            errorMsg = "No Street View imagery found for this location (even indoors). Click on a road for better results.";
          } else if (status !== google.maps.StreetViewStatus.OK) {
            errorMsg = `Street View request failed: ${status}. Please try again.`;
          }
          setPanoramaError(errorMsg);
          setStreetViewLookAt(null); // No valid panorama
          if (panoramaInstanceRef.current) {
            panoramaInstanceRef.current.setVisible(false); // Hide if creation failed mid-way
          }
          // Optionally, toast for non-ZERO_RESULTS errors as they might be API key issues or temporary problems
          if (status !== google.maps.StreetViewStatus.OK && status !== google.maps.StreetViewStatus.ZERO_RESULTS) {
            toast({
              title: "Street View Unavailable",
              description: errorMsg,
              variant: "destructive",
            });
          }
        }
      }
    );
    
    // Cleanup function
    return () => {
      if (povChangedListenerRef.current) {
        window.google.maps.event.removeListener(povChangedListenerRef.current);
        povChangedListenerRef.current = null;
      }
      if (positionChangedListenerRef.current) {
        window.google.maps.event.removeListener(positionChangedListenerRef.current);
        positionChangedListenerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, selectedLocationForStreetView, apiKey]); 


  const blobToDataURI = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleCaptureAndTransform = async () => {
    if (!apiKey) {
      setError("API key is missing.");
      toast({ title: "Error", description: "API key is missing.", variant: "destructive" });
      return;
    }
    if (!streetViewLookAt) {
      setError("Street View parameters not available. Please select a view in the panorama.");
      toast({ title: "Error", description: "Street View parameters not available.", variant: "destructive" });
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setOriginalImage(null); // Clear previous images
    setTransformedImage(null);
    setTransformationAttempted(true); // Open the dialog

    const { lat, lng, heading, pitch, zoom } = streetViewLookAt;
    // Use a taller aspect ratio for the captured image
    const captureWidth = 400;
    const captureHeight = 600;
    let fov = Math.max(10, Math.min(180 / Math.pow(2, zoom), 120));

    const imageUrl = `https://maps.googleapis.com/maps/api/streetview?size=${captureWidth}x${captureHeight}&location=${lat},${lng}&heading=${heading}&pitch=${pitch}&fov=${fov}&key=${apiKey}`;

    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        let errorMessageText = `Failed to fetch Street View image. Status: ${response.status}`;
         if (response.status === 403) errorMessageText += " This might be due to API key restrictions or billing issues.";
         else { 
           const apiResponseText = await response.text(); 
           if (apiResponseText.includes("ZERO_RESULTS") || response.status === 404) {
             errorMessageText = "No Street View imagery available for this exact location/orientation.";
             setOriginalImage(`https://placehold.co/${captureWidth}x${captureHeight}.png?text=No+Street+View`);
           } else {
             errorMessageText = `Failed to fetch Street View image (${response.status}): ${apiResponseText || 'Bad request'}`;
           }
         }
        throw new Error(errorMessageText);
      }
      const blob = await response.blob();
      const dataUri = await blobToDataURI(blob);
      setOriginalImage(dataUri); 

      const input: FacadeTransformationInput = { photoDataUri: dataUri };
      const result = await facadeTransformation(input);
      if (!result.transformedPhotoDataUri) {
        throw new Error('AI transformation did not return an image.');
      }
      setTransformedImage(result.transformedPhotoDataUri);
      toast({ title: "Success!", description: "Facade transformation complete." });
    } catch (err) {
      console.error("Transformation error:", err);
      const errorMessageText = err instanceof Error ? err.message : "An unknown error occurred during transformation.";
      setError(errorMessageText);
      if (!originalImage && !(errorMessageText.toLowerCase().includes("zero_results") || errorMessageText.toLowerCase().includes("no street view"))) {
        setOriginalImage(`https://placehold.co/${captureWidth}x${captureHeight}.png?text=Error+Fetching`);
      }
      setTransformedImage(null);
      toast({ title: "Transformation Failed", description: errorMessageText, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="bg-primary text-primary-foreground shadow-md shrink-0">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="h-8 w-8" />
            <h1 className="text-2xl font-bold">Madrid Facade Makeover</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="lg"
              onClick={handleCaptureAndTransform}
              disabled={!streetViewLookAt || isLoading || !!panoramaError}
              className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-md"
            >
              {isLoading && transformationAttempted ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Wand2 className="mr-2 h-5 w-5" />}
              {isLoading && transformationAttempted ? "Transforming..." : "Transform This View"}
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-grow flex flex-row overflow-hidden">
        {/* Left Column: Map */}
        <div className="w-1/2 h-full border-r border-border p-1">
          {isLoaded && !mapScriptLoadError && (
             <StreetViewMap
              containerClassName="w-full h-full rounded-md shadow-inner border border-border"
              onMapClick={handleMapClick}
              selectedLocation={selectedLocationForStreetView}
            />
          )}
          {mapScriptLoadError && (
            <div className="w-full h-full flex items-center justify-center p-4">
              <Alert variant="destructive" className="max-w-md"><AlertTriangle className="h-4 w-4" /><AlertTitle>Map Error</AlertTitle><AlertDescription>{mapScriptLoadError.message}</AlertDescription></Alert>
            </div>
          )}
          {!isLoaded && !mapScriptLoadError && (
             <div className="w-full h-full flex items-center justify-center bg-muted"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <p className="ml-2">Loading Map...</p></div>
          )}
        </div>

        {/* Right Column: Street View Panorama */}
        <div className="w-1/2 h-full p-1 flex flex-col bg-muted/20">
            <div ref={streetViewPanoramaContainerRef} className="flex-grow w-full h-full rounded-md bg-muted border border-border shadow-inner min-h-0">
              {!selectedLocationForStreetView && !panoramaError && (
                <div className="w-full h-full flex flex-col items-center justify-center text-center p-4 text-muted-foreground">
                  <Eye className="h-16 w-16 mb-4 text-primary/50" />
                  <p className="text-lg font-semibold">Street View</p>
                  <p>Click on the map to select a location and view Street View here.</p>
                </div>
              )}
              {panoramaError && (
                  <div className="w-full h-full flex flex-col items-center justify-center text-center p-4 text-destructive">
                  <XCircle className="h-16 w-16 mb-4" />
                  <p className="text-lg font-semibold">Street View Error</p>
                  <p>{panoramaError}</p>
                </div>
              )}
            </div>
            {!streetViewLookAt && selectedLocationForStreetView && !panoramaError && !(isLoading && !transformationAttempted) && (
                <p className="text-center text-xs text-muted-foreground mt-2 p-2 shrink-0">Adjust the view in the panel above. The "Transform This View" button will activate when a valid Street View is loaded.</p>
            )}
        </div>
        
        {isLoading && !transformationAttempted && (
          <div className="fixed inset-0 bg-background/80 flex flex-col items-center justify-center z-50">
            <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
            <p className="text-xl font-semibold text-foreground">Loading Street View for Capture...</p>
          </div>
        )}
        
        <Dialog open={transformationAttempted} onOpenChange={(isOpen) => {
            setTransformationAttempted(isOpen);
            if (!isOpen) { // Reset when dialog is closed
                setOriginalImage(null);
                setTransformedImage(null);
                setError(null);
            }
        }}>
            <DialogContent className="w-[90vw] max-w-[1200px] h-[85vh] flex flex-col p-0 sm:rounded-lg">
                <DialogHeader className="p-4 py-3 border-b shrink-0">
                    <DialogTitle className="text-xl">Transformation Result</DialogTitle>
                     <DialogClose asChild>
                        {/* This uses the X from DialogContent by default */}
                    </DialogClose>
                </DialogHeader>
                <div className="flex-grow overflow-y-auto p-2 pt-2"> {/* Reduced padding here */}
                    {isLoading && (
                        <div className="flex flex-col items-center justify-center h-full">
                            <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
                            <p className="text-xl font-semibold text-foreground">Transforming facade...</p>
                            <p className="text-sm text-muted-foreground">This may take a moment.</p>
                        </div>
                    )}
                    {!isLoading && error && (
                        <Alert variant="destructive" className="my-4">
                        <AlertTriangle className="h-5 w-5" />
                        <AlertTitle>Transformation Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                    {!isLoading && (originalImage || transformedImage) && (
                        <ImageComparison originalImage={originalImage} transformedImage={transformedImage} targetWidth={400} targetHeight={600} />
                    )}
                     {!isLoading && !originalImage && !transformedImage && !error && (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                           <p className="text-lg">No transformation data available.</p>
                           <p className="text-sm">Try capturing a view and transforming it.</p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default function Page() {
  return (
    <MapApiKeyProvider>
      <HomePageContent />
    </MapApiKeyProvider>
  );
}

