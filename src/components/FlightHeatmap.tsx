'use client';

import { useEffect, useRef, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';
import { Loader2 } from 'lucide-react';
import type { AirfieldVisit, RouteSegment } from '@/types/heatmap-types';
import { toHeatmapPoints } from '@/lib/heatmap-utils';

interface FlightHeatmapProps {
  airfields: AirfieldVisit[];
  routes: RouteSegment[];
  center: [number, number];
  coordinates: [number, number][];
}

// Component to handle heatmap layer inside MapContainer
function HeatmapLayer({ airfields }: { airfields: AirfieldVisit[] }) {
  const map = useMap();
  const heatLayerRef = useRef<any>(null);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    // Prevent double-initialization in React Strict Mode
    if (isInitializedRef.current) {
      return;
    }

    if (!map || airfields.length === 0) return;

    // Remove existing heat layer
    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
    }

    // Create heatmap data
    const heatData = toHeatmapPoints(airfields);

    // Add new heat layer
    heatLayerRef.current = (L as any).heatLayer(heatData, {
      radius: 25,
      blur: 15,
      maxZoom: 10,
      gradient: {
        0.0: 'blue',
        0.5: 'lime',
        0.7: 'yellow',
        1.0: 'red',
      },
    }).addTo(map);

    isInitializedRef.current = true;

    return () => {
      if (heatLayerRef.current && map) {
        map.removeLayer(heatLayerRef.current);
      }
      isInitializedRef.current = false;
    };
  }, [map, airfields]);

  return null;
}

export default function FlightHeatmap({ airfields, routes, center, coordinates }: FlightHeatmapProps) {
  const [isMounted, setIsMounted] = useState(false);
  const mapInstanceRef = useRef(0);

  // Only render map client-side to avoid SSR issues
  useEffect(() => {
    setIsMounted(true);
    // Increment to create a unique key for each mount
    mapInstanceRef.current += 1;
  }, []);

  // Calculate bounds from coordinates
  const bounds = useMemo(
    () => (coordinates.length > 0 ? L.latLngBounds(coordinates) : undefined),
    [coordinates]
  );

  // Show loading state during SSR
  if (!isMounted) {
    return (
      <div className="w-full h-[600px] md:h-[700px] rounded-lg overflow-hidden border shadow-md flex items-center justify-center bg-muted">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="w-full h-[600px] md:h-[700px] rounded-lg overflow-hidden border shadow-md">
      <MapContainer
        key={`map-${mapInstanceRef.current}`}
        center={center}
        zoom={6}
        bounds={bounds}
        boundsOptions={{ padding: [50, 50] }}
        className="w-full h-full"
        style={{ minHeight: '400px' }}
        scrollWheelZoom={true}
        zoomControl={true}
      >
        {/* OpenStreetMap Tile Layer */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          crossOrigin="anonymous"
        />

        {/* Heatmap Layer */}
        <HeatmapLayer airfields={airfields} />

        {/* Flight Routes as Polylines */}
        {routes.map((route, idx) => {
          const lineWeight = Math.min(2 + route.flightCount * 0.5, 6);
          return (
            <Polyline
              key={`route-${idx}`}
              positions={[
                [route.from.lat, route.from.lng],
                [route.to.lat, route.to.lng],
              ]}
              pathOptions={{
                color: '#ef4444',
                weight: lineWeight,
                opacity: 0.6,
              }}
            >
              <Popup>
                <div className="text-sm">
                  <strong>{route.from.name}</strong> ↔ <strong>{route.to.name}</strong>
                  <br />
                  Flights: <strong>{route.flightCount}</strong>
                </div>
              </Popup>
            </Polyline>
          );
        })}

        {/* Airfield Markers as CircleMarkers */}
        {airfields.map((af) => (
          <CircleMarker
            key={`airfield-${af.airfieldId}`}
            center={[af.latitude, af.longitude]}
            radius={6}
            pathOptions={{
              color: '#dc2626',
              fillColor: '#ef4444',
              fillOpacity: 0.8,
              weight: 2,
            }}
          >
            <Popup>
              <div className="text-sm">
                <strong>{af.name}</strong> ({af.code})
                <br />
                Visits: <strong>{af.visitCount}</strong>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
