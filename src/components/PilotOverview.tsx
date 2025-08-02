'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Plane, 
  Clock, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  FileText,
  MapPin,
  User,
  Award,
  AlertCircle,
  CheckCircle,
  XCircle,
  Cloud,
  ShoppingCart
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface PilotStats {
  user: {
    id: string;
    totalFlightHours: number;
    licenseNumber: string | null;
    medicalClass: string | null;
    instructorRating: string | null;
    roles: string[];
  };
  flights: {
    total: number;
    thisMonth: number;
    lastMonth: number;
    change: number;
    recent: Array<{
      id: string;
      date: string;
      totalHours: number;
      aircraft: { callSign: string } | null;
      departure_airfield: { name: string; code: string } | null;
      arrival_airfield: { name: string; code: string } | null;
    }>;
  };
  hours: {
    total: number;
    thisMonth: number;
    lastMonth: number;
    change: number;
  };
  billing: {
    pending: number;
    total: number;
    recent: Array<{
      id: string;
      smartbill_id: string;
      issue_date: string;
      total_amount: number;
      status: string;
      currency: string;
    }>;
  };
  easaCurrency: {
    last90Days: {
      flights: number;
      hours: number;
      required: { flights: number; hours: number };
    };
    last12Months: {
      flights: number;
      hours: number;
      required: { flights: number; hours: number };
    };
    takeoffs: {
      total: number;
      required: number;
    };
    landings: {
      total: number;
      required: number;
    };
    lastNightFlight: Date | null;
    lastInstrumentFlight: Date | null;
  };
}

export default function PilotOverview() {
  const router = useRouter();
  const [stats, setStats] = useState<PilotStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('No authentication token found');
          return;
        }

        const response = await fetch('/api/dashboard/pilot-stats', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch pilot statistics');
        }

        const data = await response.json();
        console.log('Pilot stats data received:', data);
        console.log('User totalFlightHours:', data.user?.totalFlightHours);
        console.log('Hours total:', data.hours?.total);
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: currency || 'RON',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy');
  };

  const formatHours = (hours: number): string => {
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return `${wholeHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'sent':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'overdue':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const getEasaCurrencyStatus = (current: number, required: number) => {
    if (current >= required) return 'current';
    if (current >= required * 0.8) return 'warning';
    return 'expired';
  };

  const getEasaCurrencyColor = (status: string) => {
    switch (status) {
      case 'current': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'expired': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getEasaCurrencyIcon = (status: string) => {
    switch (status) {
      case 'current': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'expired': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-red-500';
    if (percentage >= 60) return 'bg-yellow-500';
    if (percentage >= 40) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getProgressBarTextColor = (percentage: number) => {
    if (percentage >= 80) return 'text-red-600';
    if (percentage >= 60) return 'text-yellow-600';
    if (percentage >= 40) return 'text-blue-600';
    return 'text-green-600';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
                <div className="h-4 w-4 bg-gray-200 rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-32"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              <p>Failed to load pilot statistics</p>
              {error && <p className="text-sm">{error}</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Flights</CardTitle>
            <Plane className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.flights.total}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {stats.flights.change > 0 ? (
                <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
              )}
              {Math.abs(stats.flights.change)}% from last month
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Flight Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatHours(stats.hours.total)}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {stats.hours.change > 0 ? (
                <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
              )}
              {Math.abs(stats.hours.change)}% from last month
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.flights.thisMonth}</div>
            <p className="text-xs text-muted-foreground">
              {formatHours(stats.hours.thisMonth)} hours
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Invoices</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.billing.pending}</div>
            <p className="text-xs text-muted-foreground">
              of {stats.billing.total} total
            </p>
          </CardContent>
        </Card>
      </div>

             {/* User Profile & Quick Actions */}
       <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                 {/* User Profile */}
         <Card>
           <CardHeader>
             <CardTitle className="flex items-center gap-2">
               <User className="h-5 w-5" />
               Pilot Profile
             </CardTitle>
           </CardHeader>
           <CardContent className="space-y-4">
             <div className="space-y-2">
               <div className="flex justify-between">
                 <span className="text-sm text-muted-foreground">Hours Used / Bought</span>
                 <span className={`text-sm font-medium ${getProgressBarTextColor((stats.hours.total / Math.max(stats.user.totalFlightHours, 1)) * 100)}`}>
                   {formatHours(stats.hours.total)} / {formatHours(stats.user.totalFlightHours)}
                 </span>
               </div>
               <div className="w-full bg-gray-200 rounded-full h-2 relative overflow-hidden">
                 {/* Used hours - black */}
                 <div 
                   className="h-2 transition-all duration-300 bg-black"
                   style={{ 
                     width: `${Math.min((stats.hours.total / Math.max(stats.user.totalFlightHours, 1)) * 100, 100)}%`,
                     borderRadius: stats.hours.total > 0 ? '0.25rem 0 0 0.25rem' : '0.25rem'
                   }}
                 ></div>
                 {/* Remaining hours - color coded */}
                 <div 
                   className={`h-2 transition-all duration-300 absolute top-0 ${getProgressBarColor((stats.hours.total / Math.max(stats.user.totalFlightHours, 1)) * 100)}`}
                   style={{ 
                     left: `${Math.min((stats.hours.total / Math.max(stats.user.totalFlightHours, 1)) * 100, 100)}%`,
                     width: `${Math.max(0, 100 - Math.min((stats.hours.total / Math.max(stats.user.totalFlightHours, 1)) * 100, 100))}%`,
                     borderRadius: stats.hours.total < stats.user.totalFlightHours ? '0 0.25rem 0.25rem 0' : '0.25rem'
                   }}
                 ></div>
               </div>
             </div>
             
             <Button 
               variant="default" 
               className="w-full bg-black hover:bg-gray-800 text-white"
               onClick={() => router.push('/packages')}
             >
               <ShoppingCart className="h-4 w-4 mr-2" />
               Buy Flight Hours
             </Button>
             
             {/* Temporary button to setup hour packages system - remove after setup */}
             {stats.user.totalFlightHours === 0 && (
               <Button 
                 variant="outline" 
                 className="w-full"
                 onClick={async () => {
                   try {
                     const token = localStorage.getItem('token');
                     const response = await fetch('/api/setup-hour-packages', {
                       method: 'POST',
                       headers: {
                         'Authorization': `Bearer ${token}`,
                       },
                     });
                     
                     if (response.ok) {
                       toast.success('Hour packages system setup complete!');
                       window.location.reload();
                     } else {
                       const errorData = await response.json();
                       toast.error(errorData.error || 'Failed to setup hour packages');
                     }
                   } catch (error) {
                     toast.error('Error setting up hour packages');
                   }
                 }}
               >
                 Setup Hour Packages System
               </Button>
             )}
             
             {stats.user.licenseNumber && (
               <div className="flex justify-between">
                 <span className="text-sm text-muted-foreground">License Number</span>
                 <span className="text-sm font-medium">{stats.user.licenseNumber}</span>
               </div>
             )}
             
             {stats.user.medicalClass && (
               <div className="flex justify-between">
                 <span className="text-sm text-muted-foreground">Medical Class</span>
                 <span className="text-sm font-medium">{stats.user.medicalClass}</span>
               </div>
             )}
             
             {stats.user.instructorRating && (
               <div className="flex justify-between">
                 <span className="text-sm text-muted-foreground">Instructor Rating</span>
                 <span className="text-sm font-medium">{stats.user.instructorRating}</span>
               </div>
             )}
             
             <div className="flex flex-wrap gap-1">
               {stats.user.roles.map((role) => (
                 <Badge key={role} variant="outline" className="text-xs">
                   {role}
                 </Badge>
               ))}
             </div>
           </CardContent>
         </Card>

         {/* EASA Currency */}
         <Card>
           <CardHeader>
             <CardTitle className="flex items-center gap-2">
               <Award className="h-5 w-5" />
               EASA Currency
             </CardTitle>
           </CardHeader>
           <CardContent className="space-y-4">
             {/* 90 Days Currency */}
             <div className="space-y-2">
               <div className="flex items-center justify-between">
                 <span className="text-sm font-medium">Last 90 Days</span>
                 {getEasaCurrencyIcon(getEasaCurrencyStatus(stats.easaCurrency.last90Days.flights, stats.easaCurrency.last90Days.required.flights))}
               </div>
               <div className="grid grid-cols-2 gap-2 text-xs">
                 <div className="flex justify-between">
                   <span className="text-muted-foreground">Flights:</span>
                   <span className={getEasaCurrencyColor(getEasaCurrencyStatus(stats.easaCurrency.last90Days.flights, stats.easaCurrency.last90Days.required.flights))}>
                     {stats.easaCurrency.last90Days.flights}/{stats.easaCurrency.last90Days.required.flights}
                   </span>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-muted-foreground">Hours:</span>
                   <span className={getEasaCurrencyColor(getEasaCurrencyStatus(stats.easaCurrency.last90Days.hours, stats.easaCurrency.last90Days.required.hours))}>
                     {formatHours(stats.easaCurrency.last90Days.hours)}/{formatHours(stats.easaCurrency.last90Days.required.hours)}
                   </span>
                 </div>
               </div>
             </div>

             {/* 12 Months Currency */}
             <div className="space-y-2">
               <div className="flex items-center justify-between">
                 <span className="text-sm font-medium">Last 12 Months</span>
                 {getEasaCurrencyIcon(getEasaCurrencyStatus(stats.easaCurrency.last12Months.flights, stats.easaCurrency.last12Months.required.flights))}
               </div>
               <div className="grid grid-cols-2 gap-2 text-xs">
                 <div className="flex justify-between">
                   <span className="text-muted-foreground">Flights:</span>
                   <span className={getEasaCurrencyColor(getEasaCurrencyStatus(stats.easaCurrency.last12Months.flights, stats.easaCurrency.last12Months.required.flights))}>
                     {stats.easaCurrency.last12Months.flights}/{stats.easaCurrency.last12Months.required.flights}
                   </span>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-muted-foreground">Hours:</span>
                   <span className={getEasaCurrencyColor(getEasaCurrencyStatus(stats.easaCurrency.last12Months.hours, stats.easaCurrency.last12Months.required.hours))}>
                     {formatHours(stats.easaCurrency.last12Months.hours)}/{formatHours(stats.easaCurrency.last12Months.required.hours)}
                   </span>
                 </div>
               </div>
             </div>

             {/* Takeoffs & Landings */}
             <div className="space-y-2">
               <div className="flex items-center justify-between">
                 <span className="text-sm font-medium">Takeoffs & Landings</span>
                 {getEasaCurrencyIcon(getEasaCurrencyStatus(stats.easaCurrency.takeoffs.total, stats.easaCurrency.takeoffs.required))}
               </div>
               <div className="grid grid-cols-2 gap-2 text-xs">
                 <div className="flex justify-between">
                   <span className="text-muted-foreground">Takeoffs:</span>
                   <span className={getEasaCurrencyColor(getEasaCurrencyStatus(stats.easaCurrency.takeoffs.total, stats.easaCurrency.takeoffs.required))}>
                     {stats.easaCurrency.takeoffs.total}/{stats.easaCurrency.takeoffs.required}
                   </span>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-muted-foreground">Landings:</span>
                   <span className={getEasaCurrencyColor(getEasaCurrencyStatus(stats.easaCurrency.landings.total, stats.easaCurrency.landings.required))}>
                     {stats.easaCurrency.landings.total}/{stats.easaCurrency.landings.required}
                   </span>
                 </div>
               </div>
             </div>


           </CardContent>
         </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks and shortcuts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3">
              <Button 
                variant="outline" 
                className="justify-start h-12"
                onClick={() => router.push('/dashboard?tab=flight-logs')}
              >
                <Plane className="h-4 w-4 mr-2" />
                Log New Flight
              </Button>
              <Button 
                variant="outline" 
                className="justify-start h-12"
                onClick={() => router.push('/dashboard?tab=flight-logs')}
              >
                <FileText className="h-4 w-4 mr-2" />
                View Flight Logs
              </Button>
              <Button 
                variant="outline" 
                className="justify-start h-12"
                onClick={() => window.open('https://www.aviationweather.gov/', '_blank')}
              >
                <Cloud className="h-4 w-4 mr-2" />
                Check Weather
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Your latest flights and updates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.flights.recent.length > 0 ? (
                stats.flights.recent.slice(0, 3).map((flight) => (
                  <div key={flight.id} className="flex items-center space-x-3">
                    <div className="h-2 w-2 bg-primary rounded-full"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {flight.departure_airfield?.code || 'N/A'} → {flight.arrival_airfield?.code || 'N/A'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(flight.date)} • {formatHours(flight.totalHours)} • {flight.aircraft?.callSign || 'N/A'}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground py-4">
                  <Plane className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No recent flights</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Invoices */}
      {stats.billing.recent.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Recent Invoices
            </CardTitle>
            <CardDescription>
              Your latest billing activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.billing.recent.map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(invoice.status)}
                    <div>
                      <p className="text-sm font-medium">{invoice.smartbill_id}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(invoice.issue_date)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {formatCurrency(invoice.total_amount, invoice.currency)}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      {invoice.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 