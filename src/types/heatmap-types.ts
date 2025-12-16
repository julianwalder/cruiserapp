/**
 * Represents an airfield with visit count for heatmap visualization
 */
export interface AirfieldVisit {
  airfieldId: string;
  latitude: number;
  longitude: number;
  visitCount: number;
  name: string;
  code: string;
}

/**
 * Represents a flight route segment between two airfields
 */
export interface RouteSegment {
  from: {
    lat: number;
    lng: number;
    name: string;
  };
  to: {
    lat: number;
    lng: number;
    name: string;
  };
  flightCount: number;
}

/**
 * Props for the FlightHeatmap component
 */
export interface HeatmapProps {
  airfields: AirfieldVisit[];
  routes: RouteSegment[];
  center: [number, number];
  coordinates: [number, number][];
}

/**
 * Format for leaflet.heat plugin: [latitude, longitude, intensity]
 */
export type HeatmapPoint = [number, number, number];

/**
 * Request body for heatmap image rendering
 */
export interface HeatmapRenderRequest {
  userId: string;
  year: string;
  format?: 'png' | 'jpg';
  width?: number;
  height?: number;
}
