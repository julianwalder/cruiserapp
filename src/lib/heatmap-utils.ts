import type { AirfieldVisit, RouteSegment, HeatmapPoint } from '@/types/heatmap-types';

/**
 * Extended Airfield interface with coordinates
 */
interface AirfieldWithCoords {
  id: string;
  name: string;
  code: string;
  latitude?: number;
  longitude?: number;
  city?: string;
  country?: string;
}

/**
 * Extended FlightLog interface for heatmap processing
 */
interface FlightLogForHeatmap {
  id: string;
  userId: string;
  departureAirfield: AirfieldWithCoords;
  arrivalAirfield: AirfieldWithCoords;
  totalHours: number;
  flightType: string;
}

/**
 * Calculate heatmap data by aggregating airfield visit frequencies
 * @param flights - Array of flight logs
 * @returns Array of airfield visits with counts
 */
export function calculateHeatmapData(flights: FlightLogForHeatmap[]): AirfieldVisit[] {
  const airfieldMap = new Map<string, AirfieldVisit>();

  flights.forEach((flight) => {
    // Count departure airfield
    const dep = flight.departureAirfield;
    if (dep.latitude != null && dep.longitude != null && !isNaN(dep.latitude) && !isNaN(dep.longitude)) {
      const depId = dep.id;
      if (!airfieldMap.has(depId)) {
        airfieldMap.set(depId, {
          airfieldId: depId,
          latitude: dep.latitude,
          longitude: dep.longitude,
          visitCount: 0,
          name: dep.name,
          code: dep.code,
        });
      }
      airfieldMap.get(depId)!.visitCount++;
    }

    // Count arrival airfield
    const arr = flight.arrivalAirfield;
    if (arr.latitude != null && arr.longitude != null && !isNaN(arr.latitude) && !isNaN(arr.longitude)) {
      const arrId = arr.id;
      if (!airfieldMap.has(arrId)) {
        airfieldMap.set(arrId, {
          airfieldId: arrId,
          latitude: arr.latitude,
          longitude: arr.longitude,
          visitCount: 0,
          name: arr.name,
          code: arr.code,
        });
      }
      airfieldMap.get(arrId)!.visitCount++;
    }
  });

  return Array.from(airfieldMap.values());
}

/**
 * Calculate flight routes by aggregating route segments
 * @param flights - Array of flight logs
 * @returns Array of route segments with flight counts
 */
export function calculateRoutes(flights: FlightLogForHeatmap[]): RouteSegment[] {
  const routeMap = new Map<string, RouteSegment>();

  flights.forEach((flight) => {
    const dep = flight.departureAirfield;
    const arr = flight.arrivalAirfield;

    // Skip if missing coordinates
    if (
      dep.latitude == null ||
      dep.longitude == null ||
      arr.latitude == null ||
      arr.longitude == null ||
      isNaN(dep.latitude) ||
      isNaN(dep.longitude) ||
      isNaN(arr.latitude) ||
      isNaN(arr.longitude)
    ) {
      return;
    }

    // Skip same-departure-arrival flights (local flights)
    if (dep.id === arr.id) {
      return;
    }

    // Create unique route key (bidirectional: A-B same as B-A)
    const routeKey = [dep.id, arr.id].sort().join('-');

    if (!routeMap.has(routeKey)) {
      routeMap.set(routeKey, {
        from: {
          lat: dep.latitude,
          lng: dep.longitude,
          name: dep.name,
        },
        to: {
          lat: arr.latitude,
          lng: arr.longitude,
          name: arr.name,
        },
        flightCount: 0,
      });
    }
    routeMap.get(routeKey)!.flightCount++;
  });

  return Array.from(routeMap.values());
}

/**
 * Convert airfield visits to leaflet.heat format
 * @param airfields - Array of airfield visits
 * @returns Array of [latitude, longitude, intensity] tuples
 */
export function toHeatmapPoints(airfields: AirfieldVisit[]): HeatmapPoint[] {
  return airfields.map((af) => [af.latitude, af.longitude, af.visitCount]);
}

/**
 * Calculate the center point of all airfields (average of coordinates)
 * @param airfields - Array of airfield visits
 * @returns [latitude, longitude] center point
 */
export function calculateMapCenter(airfields: AirfieldVisit[]): [number, number] {
  if (airfields.length === 0) {
    // Default: Europe center (fallback)
    return [50.0, 10.0];
  }

  const avgLat = airfields.reduce((sum, af) => sum + af.latitude, 0) / airfields.length;
  const avgLng = airfields.reduce((sum, af) => sum + af.longitude, 0) / airfields.length;

  return [avgLat, avgLng];
}

/**
 * Get coordinates array for calculating map bounds
 * @param airfields - Array of airfield visits
 * @returns Array of [latitude, longitude] coordinates
 */
export function getCoordinatesArray(airfields: AirfieldVisit[]): [number, number][] {
  return airfields.map((af) => [af.latitude, af.longitude]);
}

/**
 * Get the top N routes by flight count
 * @param routes - Array of route segments
 * @param limit - Maximum number of routes to return (default: 200, 0 for unlimited)
 * @returns Top routes sorted by flight count
 */
export function getTopRoutes(routes: RouteSegment[], limit: number = 200): RouteSegment[] {
  const sorted = routes.sort((a, b) => b.flightCount - a.flightCount);
  return limit > 0 ? sorted.slice(0, limit) : sorted;
}

/**
 * Filter out flights with missing airfield coordinates
 * @param flights - Array of flight logs
 * @returns Filtered array with only valid flights
 */
export function filterValidFlights(flights: FlightLogForHeatmap[]): FlightLogForHeatmap[] {
  return flights.filter(
    (flight) =>
      flight.departureAirfield.latitude != null &&
      flight.departureAirfield.longitude != null &&
      flight.arrivalAirfield.latitude != null &&
      flight.arrivalAirfield.longitude != null &&
      !isNaN(flight.departureAirfield.latitude) &&
      !isNaN(flight.departureAirfield.longitude) &&
      !isNaN(flight.arrivalAirfield.latitude) &&
      !isNaN(flight.arrivalAirfield.longitude)
  );
}
