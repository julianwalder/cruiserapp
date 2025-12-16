'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Plane, Calendar, Clock, MapPin, User, Gauge, Fuel, Droplet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Aircraft {
  id: string;
  callSign: string;
  icaoReferenceType?: {
    model: string;
    manufacturer: string;
    typeDesignator: string;
  };
  icao_reference_type?: {
    model: string;
    manufacturer: string;
    type_designator: string;
  };
}

interface Airfield {
  id: string;
  name: string;
  code: string;
  city: string;
  country: string;
}

interface UserInfo {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
}

interface FlightDetail {
  id: string;
  date?: string;
  userId: string;
  instructorId?: string;
  payer_id?: string;
  aircraftId: string;
  departureTime?: string;
  arrivalTime?: string;
  departureAirfieldId?: string;
  arrivalAirfieldId?: string;
  departureHobbs?: number;
  arrivalHobbs?: number;
  totalHours?: number;
  flightType?: string;
  purpose?: string;
  remarks?: string;
  route?: string;
  conditions?: string;

  // Jeppesen time breakdown
  pilotInCommand?: number;
  secondInCommand?: number;
  dualReceived?: number;
  dualGiven?: number;
  solo?: number;
  crossCountry?: number;
  night?: number;
  instrument?: number;
  actualInstrument?: number;
  simulatedInstrument?: number;

  // Landings
  dayLandings?: number;
  nightLandings?: number;

  // Fuel and oil
  oilAdded?: number;
  fuelAdded?: number;

  // Related data
  aircraft?: Aircraft;
  pilot?: UserInfo;
  instructor?: UserInfo;
  payer?: UserInfo;
  departureAirfield?: Airfield;
  arrivalAirfield?: Airfield;
  departure_airfield?: Airfield;
  arrival_airfield?: Airfield;
}

export default function FlightDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params?.userId as string;
  const flightId = params?.flightId as string;
  const [flight, setFlight] = useState<FlightDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFlightDetail = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/login');
          return;
        }

        const response = await fetch(`/api/flight-logs/${flightId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch flight details');
        }

        const result = await response.json();
        setFlight(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (flightId) {
      fetchFlightDetail();
    }
  }, [flightId, router]);

  const formatHours = (hours: number) => {
    if (!hours) return '0:00';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}:${m.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const formatTime = (timeString: string | null | undefined) => {
    if (!timeString) return 'N/A';
    try {
      // Check if it's already in HH:MM:SS or HH:MM format
      if (timeString.match(/^\d{2}:\d{2}(:\d{2})?$/)) {
        return timeString.substring(0, 5); // Return HH:MM
      }

      // Try parsing as full datetime
      const date = new Date(timeString);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'N/A';
    }
  };

  const formatUserName = (user?: UserInfo) => {
    if (!user) return 'N/A';
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.email;
  };

  const getFlightTypeColor = (flightType: string) => {
    switch (flightType) {
      case 'FERRY':
        return 'bg-purple-100 text-purple-800';
      case 'DEMO':
        return 'bg-blue-100 text-blue-800';
      case 'CHARTER':
        return 'bg-orange-100 text-orange-800';
      case 'TRAINING':
      case 'DUAL':
        return 'bg-green-100 text-green-800';
      case 'SOLO':
        return 'bg-cyan-100 text-cyan-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!flight) {
    return null;
  }

  const departure = flight.departureAirfield || flight.departure_airfield;
  const arrival = flight.arrivalAirfield || flight.arrival_airfield;
  const aircraft = flight.aircraft;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/usage/${userId}`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Ledger
        </Button>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Plane className="h-8 w-8" />
            Flight Details
          </h1>
          <p className="text-muted-foreground">Flight ID: {flightId.substring(0, 8)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Flight Information */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Flight Information</CardTitle>
              {flight.flightType && (
                <Badge className={cn("text-sm", getFlightTypeColor(flight.flightType))}>
                  {flight.flightType}
                </Badge>
              )}
            </div>
            <CardDescription>{formatDate(flight.date)}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Date</span>
                </div>
                <p className="text-lg font-medium">{formatDate(flight.date)}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Total Hours</span>
                </div>
                <p className="text-lg font-medium">{formatHours(flight.totalHours || 0)}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Departure Time</span>
                </div>
                <p className="text-lg font-medium">{formatTime(flight.departureTime)}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Arrival Time</span>
                </div>
                <p className="text-lg font-medium">{formatTime(flight.arrivalTime)}</p>
              </div>

              {departure && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>Departure</span>
                  </div>
                  <p className="text-lg font-medium">{departure.name} ({departure.code})</p>
                  <p className="text-sm text-muted-foreground">{departure.city}, {departure.country}</p>
                </div>
              )}

              {arrival && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>Arrival</span>
                  </div>
                  <p className="text-lg font-medium">{arrival.name} ({arrival.code})</p>
                  <p className="text-sm text-muted-foreground">{arrival.city}, {arrival.country}</p>
                </div>
              )}

              {aircraft && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Plane className="h-4 w-4" />
                    <span>Aircraft</span>
                  </div>
                  <p className="text-lg font-medium">{aircraft.callSign}</p>
                  {(aircraft.icaoReferenceType || aircraft.icao_reference_type) && (
                    <p className="text-sm text-muted-foreground">
                      {(aircraft.icaoReferenceType || aircraft.icao_reference_type)?.manufacturer}{' '}
                      {(aircraft.icaoReferenceType || aircraft.icao_reference_type)?.model}
                    </p>
                  )}
                </div>
              )}

              {flight.purpose && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Purpose</span>
                  </div>
                  <p className="text-lg font-medium">{flight.purpose}</p>
                </div>
              )}
            </div>

            {/* Hobbs and Fuel */}
            {(flight.departureHobbs !== undefined || flight.arrivalHobbs !== undefined || flight.fuelAdded !== undefined || flight.oilAdded !== undefined) && (
              <div className="pt-4 border-t">
                <h3 className="text-lg font-semibold mb-4">Aircraft Meters & Fluids</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {flight.departureHobbs !== undefined && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Gauge className="h-4 w-4" />
                        <span>Hobbs Start</span>
                      </div>
                      <p className="text-lg font-medium">{flight.departureHobbs.toFixed(1)}</p>
                    </div>
                  )}

                  {flight.arrivalHobbs !== undefined && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Gauge className="h-4 w-4" />
                        <span>Hobbs End</span>
                      </div>
                      <p className="text-lg font-medium">{flight.arrivalHobbs.toFixed(1)}</p>
                    </div>
                  )}

                  {flight.fuelAdded !== undefined && flight.fuelAdded > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Fuel className="h-4 w-4" />
                        <span>Fuel Added</span>
                      </div>
                      <p className="text-lg font-medium">{flight.fuelAdded} L</p>
                    </div>
                  )}

                  {flight.oilAdded !== undefined && flight.oilAdded > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Droplet className="h-4 w-4" />
                        <span>Oil Added</span>
                      </div>
                      <p className="text-lg font-medium">{flight.oilAdded} L</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Pilot Time Breakdown */}
            <div className="pt-4 border-t">
              <h3 className="text-lg font-semibold mb-4">Pilot Time Breakdown</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {(flight.pilotInCommand ?? 0) > 0 && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Pilot in Command</p>
                    <p className="text-base font-medium">{formatHours(flight.pilotInCommand ?? 0)}</p>
                  </div>
                )}
                {(flight.secondInCommand ?? 0) > 0 && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Second in Command</p>
                    <p className="text-base font-medium">{formatHours(flight.secondInCommand ?? 0)}</p>
                  </div>
                )}
                {(flight.dualReceived ?? 0) > 0 && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Dual Received</p>
                    <p className="text-base font-medium">{formatHours(flight.dualReceived ?? 0)}</p>
                  </div>
                )}
                {(flight.dualGiven ?? 0) > 0 && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Dual Given</p>
                    <p className="text-base font-medium">{formatHours(flight.dualGiven ?? 0)}</p>
                  </div>
                )}
                {(flight.solo ?? 0) > 0 && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Solo</p>
                    <p className="text-base font-medium">{formatHours(flight.solo ?? 0)}</p>
                  </div>
                )}
                {(flight.crossCountry ?? 0) > 0 && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Cross Country</p>
                    <p className="text-base font-medium">{formatHours(flight.crossCountry ?? 0)}</p>
                  </div>
                )}
                {(flight.night ?? 0) > 0 && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Night</p>
                    <p className="text-base font-medium">{formatHours(flight.night ?? 0)}</p>
                  </div>
                )}
                {(flight.instrument ?? 0) > 0 && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Instrument</p>
                    <p className="text-base font-medium">{formatHours(flight.instrument ?? 0)}</p>
                  </div>
                )}
                {(flight.actualInstrument ?? 0) > 0 && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Actual Instrument</p>
                    <p className="text-base font-medium">{formatHours(flight.actualInstrument ?? 0)}</p>
                  </div>
                )}
                {(flight.simulatedInstrument ?? 0) > 0 && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Simulated Instrument</p>
                    <p className="text-base font-medium">{formatHours(flight.simulatedInstrument ?? 0)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Landings */}
            {((flight.dayLandings ?? 0) > 0 || (flight.nightLandings ?? 0) > 0) && (
              <div className="pt-4 border-t">
                <h3 className="text-lg font-semibold mb-4">Landings</h3>
                <div className="grid grid-cols-2 gap-4">
                  {(flight.dayLandings ?? 0) > 0 && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Day Landings</p>
                      <p className="text-base font-medium">{flight.dayLandings}</p>
                    </div>
                  )}
                  {(flight.nightLandings ?? 0) > 0 && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Night Landings</p>
                      <p className="text-base font-medium">{flight.nightLandings}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Route and Conditions */}
            {(flight.route || flight.conditions) && (
              <div className="pt-4 border-t space-y-4">
                {flight.route && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Route</p>
                    <p className="text-base">{flight.route}</p>
                  </div>
                )}
                {flight.conditions && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Conditions</p>
                    <p className="text-base">{flight.conditions}</p>
                  </div>
                )}
              </div>
            )}

            {/* Remarks */}
            {flight.remarks && (
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-2">Remarks</p>
                <p className="text-base">{flight.remarks}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Personnel Information */}
        <Card>
          <CardHeader>
            <CardTitle>Personnel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <User className="h-4 w-4" />
                <span>Pilot</span>
              </div>
              <p className="font-medium">{formatUserName(flight.pilot)}</p>
            </div>

            {flight.instructor && (
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <User className="h-4 w-4" />
                  <span>Instructor</span>
                </div>
                <p className="font-medium">{formatUserName(flight.instructor)}</p>
              </div>
            )}

            {flight.payer && (
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <User className="h-4 w-4" />
                  <span>Payer</span>
                </div>
                <p className="font-medium">{formatUserName(flight.payer)}</p>
                <Badge variant="outline" className="mt-1">Charter Flight</Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
