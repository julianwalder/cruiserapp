'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plane, Clock, Calendar } from 'lucide-react';
import { useDateFormatUtils } from '@/hooks/use-date-format';

interface FleetStatusAircraft {
  id: string;
  callSign: string;
  status: string;
  type: string;
  lastHobbs: number | null;
  lastHobbsDate: string | null;
  lastUpdated: string | null;
}

interface FleetStatusProps {
  fleetStatus: FleetStatusAircraft[];
}

export default function FleetStatus({ fleetStatus }: FleetStatusProps) {
  const { formatDate } = useDateFormatUtils();
  
  const formatHobbsDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return formatDate(new Date(dateString));
  };

  const formatHobbs = (hobbs: number | null) => {
    if (hobbs === null) return 'N/A';
    return hobbs.toFixed(1);
  };

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'MAINTENANCE':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'OUT_OF_SERVICE':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusDisplay = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
        return 'Active';
      case 'MAINTENANCE':
        return 'Maintenance';
      case 'OUT_OF_SERVICE':
        return 'Out of Service';
      default:
        return status || 'Unknown';
    }
  };

  if (!fleetStatus || fleetStatus.length === 0) {
    return (
      <div className="col-span-full">
        <Card className="card-hover">
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center py-4">No aircraft found in the fleet.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      {fleetStatus.map((aircraft) => (
        <Card key={aircraft.id} className="card-hover">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plane className="h-4 w-4" />
                <span className="text-lg">{aircraft.callSign}</span>
              </div>
              <Badge 
                variant="outline" 
                className={`text-xs ${getStatusColor(aircraft.status)}`}
              >
                {getStatusDisplay(aircraft.status)}
              </Badge>
            </CardTitle>
            <CardDescription className="text-sm">{aircraft.type}</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Last Hobbs:</span>
                <span className="font-medium">{formatHobbs(aircraft.lastHobbs)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Recorded:</span>
                <span className="font-medium">{formatHobbsDate(aircraft.lastHobbsDate)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  );
}
