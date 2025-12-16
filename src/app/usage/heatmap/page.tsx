'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Loader2, Download, AlertCircle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  calculateHeatmapData,
  calculateRoutes,
  calculateMapCenter,
  getCoordinatesArray,
  getTopRoutes,
  filterValidFlights,
} from '@/lib/heatmap-utils';

const FlightHeatmap = dynamic(() => import('@/components/FlightHeatmap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[600px] md:h-[700px] rounded-lg overflow-hidden border shadow-md flex items-center justify-center bg-muted">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  ),
});

interface FlightLog {
  id: string;
  userId: string;
  date: string;
  departureAirfield: {
    id: string;
    name: string;
    code: string;
    latitude?: number;
    longitude?: number;
  };
  arrivalAirfield: {
    id: string;
    name: string;
    code: string;
    latitude?: number;
    longitude?: number;
  };
  totalHours: number;
  flightType: string;
}

export default function AllUsersHeatmapPage() {
  const router = useRouter();
  const [flights, setFlights] = useState<FlightLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState('2025');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Generate year options (current year and past 5 years)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i);

  useEffect(() => {
    const fetchFlightData = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/login');
          return;
        }

        const dateFrom = `${selectedYear}-01-01`;
        const dateTo = `${selectedYear}-12-31`;

        const response = await fetch(
          `/api/flight-logs?dateFrom=${dateFrom}&dateTo=${dateTo}&limit=10000`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch flight data');
        }

        const result = await response.json();
        setFlights(result.flightLogs || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchFlightData();
  }, [selectedYear, router]);

  // Process flight data for heatmap
  const { airfields, routes, center, coordinates, validFlightCount } = useMemo(() => {
    const validFlights = filterValidFlights(flights);
    const airfieldsData = calculateHeatmapData(validFlights);
    const routesData = calculateRoutes(validFlights);
    const topRoutes = getTopRoutes(routesData, 0); // 0 = show all routes
    const centerPoint = calculateMapCenter(airfieldsData);
    const coordsArray = getCoordinatesArray(airfieldsData);

    return {
      airfields: airfieldsData,
      routes: topRoutes,
      center: centerPoint,
      coordinates: coordsArray,
      validFlightCount: validFlights.length,
    };
  }, [flights]);

  const handleExport = async (format: 'png' | 'jpg') => {
    setExporting(true);
    setExportError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/heatmaps/render-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          year: selectedYear,
          format,
          width: 1200,
          height: 800,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to export heatmap');
      }

      // Download the image
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `all-flights-heatmap-${selectedYear}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
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
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button variant="outline" onClick={() => router.push('/usage')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Usage
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/usage')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">All Flights Heatmap</h1>
          </div>
        </div>

        {/* Year Selector and Export Button */}
        <div className="flex items-center gap-3">
          <label htmlFor="year-select" className="text-sm font-medium">
            Year:
          </label>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button disabled={exporting || flights.length === 0}>
                {exporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Export Image
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleExport('png')}>
                Export as PNG
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('jpg')}>
                Export as JPEG
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 border rounded-lg">
          <div className="text-sm text-muted-foreground">Total Flights</div>
          <div className="text-2xl font-bold">{flights.length}</div>
        </div>
        <div className="p-4 border rounded-lg">
          <div className="text-sm text-muted-foreground">Unique Airfields</div>
          <div className="text-2xl font-bold">{airfields.length}</div>
        </div>
        <div className="p-4 border rounded-lg">
          <div className="text-sm text-muted-foreground">Flight Routes</div>
          <div className="text-2xl font-bold">{routes.length}</div>
        </div>
      </div>

      {/* Warning for invalid flights */}
      {flights.length > validFlightCount && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {flights.length - validFlightCount} flight(s) excluded due to missing GPS coordinates.
          </AlertDescription>
        </Alert>
      )}

      {/* Export error */}
      {exportError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{exportError}</AlertDescription>
        </Alert>
      )}

      {/* Map or Empty State */}
      {flights.length === 0 ? (
        <Alert>
          <AlertDescription>
            No flights found for {selectedYear}. Try selecting a different year.
          </AlertDescription>
        </Alert>
      ) : (
        <FlightHeatmap airfields={airfields} routes={routes} center={center} coordinates={coordinates} />
      )}
    </div>
  );
}
