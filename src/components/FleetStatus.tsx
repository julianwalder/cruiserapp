'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plane, Clock, Calendar, AlertCircle } from 'lucide-react';
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

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plane className="h-5 w-5" />
          Fleet Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!fleetStatus || fleetStatus.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No aircraft found in the fleet.</p>
            </div>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aircraft</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Hobbs</TableHead>
                  <TableHead>Last Recorded</TableHead>
                  <TableHead>Days Since Update</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fleetStatus.map((aircraft) => {
                  const daysSinceUpdate = aircraft.lastHobbsDate 
                    ? Math.floor((Date.now() - new Date(aircraft.lastHobbsDate).getTime()) / (1000 * 60 * 60 * 24))
                    : null;

                  return (
                    <TableRow key={aircraft.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Plane className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{aircraft.callSign}</span>
                        </div>
                      </TableCell>
                      <TableCell>{aircraft.type}</TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getStatusColor(aircraft.status)}`}
                        >
                          {getStatusDisplay(aircraft.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="font-mono">{formatHobbs(aircraft.lastHobbs)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{formatHobbsDate(aircraft.lastHobbsDate)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {daysSinceUpdate !== null ? (
                          <span className={daysSinceUpdate > 30 ? 'text-orange-600 font-medium' : 'text-muted-foreground'}>
                            {daysSinceUpdate === 0 ? 'Today' : `${daysSinceUpdate} days`}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Never</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
