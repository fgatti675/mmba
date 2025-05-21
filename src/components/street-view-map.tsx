
"use client";

import React, { useRef, useEffect, useState } from 'react';
import { useMapApiKey } from './map-api-key-provider'; 

// Default Madrid coordinates (Puerta del Sol)
const MADRID_CENTER = { lat: 40.416775, lng: -3.703790 };
const INITIAL_MAP_ZOOM = 12;

interface StreetViewMapProps {
  containerClassName?: string;
  onMapClick: (location: google.maps.LatLngLiteral) => void;
  selectedLocation?: google.maps.LatLngLiteral | null;
}

export const StreetViewMap: React.FC<StreetViewMapProps> = ({
  containerClassName,
  onMapClick,
  selectedLocation,
}) => {
  const { isLoaded, apiKey } = useMapApiKey();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);

  useEffect(() => {
    if (!isLoaded || !mapRef.current || !window.google || !window.google.maps || !apiKey) {
      return;
    }

    if (!mapInstanceRef.current) {
      const mapOptions: google.maps.MapOptions = {
        center: selectedLocation || MADRID_CENTER,
        zoom: INITIAL_MAP_ZOOM,
        streetViewControl: false, 
        fullscreenControl: false,
        mapTypeControl: false,
        gestureHandling: 'greedy', // Changed to greedy
        zoomControl: true,
        clickableIcons: false, // Prevent info windows for POIs to simplify click handling
      };
      const map = new window.google.maps.Map(mapRef.current!, mapOptions);
      mapInstanceRef.current = map;

      map.addListener('click', (e: google.maps.MapMouseEvent | google.maps.IconMouseEvent) => {
         // Check if a POI (place) was clicked, e.g. an icon for a business
        if ('placeId' in e && e.placeId) {
           if (e.stop) e.stop(); // Stop event propagation for icon clicks
           // Optionally, you could allow POI clicks to do something else or nothing
           // For now, we just prevent the map click from firing if a POI was clicked.
           return; 
        }
        if (e.latLng) {
          onMapClick(e.latLng.toJSON());
        }
      });
    } else {
      // If map already exists, and selectedLocation is different, pan to it
      if (selectedLocation) {
        const currentMapCenter = mapInstanceRef.current.getCenter();
        if (currentMapCenter && (currentMapCenter.lat() !== selectedLocation.lat || currentMapCenter.lng() !== selectedLocation.lng)) {
           // mapInstanceRef.current.panTo(selectedLocation); // Optional: pan smoothly if desired
        }
      } else { // If selectedLocation is null (e.g. after reset)
         mapInstanceRef.current.setCenter(MADRID_CENTER);
         mapInstanceRef.current.setZoom(INITIAL_MAP_ZOOM);
      }
    }
  }, [isLoaded, apiKey, selectedLocation, onMapClick]);

  // Update marker when selectedLocation changes
  useEffect(() => {
    if (!isLoaded || !mapInstanceRef.current || !window.google || !window.google.maps) {
        return;
    }
    if (selectedLocation) {
      if (!markerRef.current) {
        markerRef.current = new window.google.maps.Marker({
          position: selectedLocation,
          map: mapInstanceRef.current,
          title: "Selected Location",
        });
      } else {
        markerRef.current.setPosition(selectedLocation);
        markerRef.current.setMap(mapInstanceRef.current); 
      }
      // Center map on selected marker
      mapInstanceRef.current.panTo(selectedLocation);
      if (mapInstanceRef.current.getZoom() < 15) { // Zoom in if map is too zoomed out
        mapInstanceRef.current.setZoom(15);
      }

    } else {
      if (markerRef.current) {
        markerRef.current.setMap(null); 
      }
    }
  }, [selectedLocation, isLoaded]); 

  return (
    <div 
      ref={mapRef} 
      className={containerClassName || "w-full h-full"}
    />
  );
};

// This interface is also defined in page.tsx, ensure consistency or centralize
export interface StreetViewLookAt {
  lat: number;
  lng: number;
  heading: number;
  pitch: number;
  zoom: number;
}
