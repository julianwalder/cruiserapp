'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { NewSidebar } from '@/components/NewSidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar, Plus, Search, Filter, Clock, Plane } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

interface ScheduledFlight {
  id: string;
  pilot: string;
  aircraft: string;
  departure: string;
  arrival: string;
  date: string;
  time: string;
  duration: string;
  status: 'scheduled' | 'confirmed' | 'cancelled';
  type: 'training' | 'commercial' | 'maintenance';
}

export default function SchedulingPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [scheduledFlights, setScheduledFlights] = useState<ScheduledFlight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }
      const response = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        router.push('/login');
        return;
      }
      const userData = await response.json();
      if (!userData) {
        router.push('/login');
        return;
      }
      setUser(userData);
      
      // Fetch scheduled flights data
      // TODO: Replace with actual API call
      const mockScheduledFlights: ScheduledFlight[] = [
        {
          id: '1',
          pilot: 'John Doe',
          aircraft: 'YR-ABC',
          departure: 'OTP',
          arrival: 'BBU',
          date: '2024-01-20',
          time: '09:00',
          duration: '1h 30m',
          status: 'confirmed',
          type: 'training'
        },
        {
          id: '2',
          pilot: 'Jane Smith',
          aircraft: 'YR-DEF',
          departure: 'BBU',
          arrival: 'TGV',
          date: '2024-01-20',
          time: '14:00',
          duration: '45m',
          status: 'scheduled',
          type: 'commercial'
        },
        {
          id: '3',
          pilot: 'Bob Wilson',
          aircraft: 'YR-ABC',
          departure: 'OTP',
          arrival: 'BBU',
          date: '2024-01-21',
          time: '10:30',
          duration: '1h 15m',
          status: 'scheduled',
          type: 'training'
        }
      ];
      
      setScheduledFlights(mockScheduledFlights);
      setLoading(false);
    };
    fetchUser();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };



  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'training':
        return 'bg-purple-100 text-purple-800';
      case 'commercial':
        return 'bg-orange-100 text-orange-800';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900">
      <NewSidebar user={user} onLogout={handleLogout} />
      
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        <header className="bg-card shadow-sm border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 h-16 flex items-center">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-4">
              <div className="lg:ml-0 ml-12">
                <h1 className="text-xl sm:text-2xl font-semibold text-card-foreground">
                  Flight Scheduling
                </h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-card-foreground">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-primary-foreground">
                  {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                </span>
              </div>
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-white dark:bg-gray-900">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-card-foreground">Flight Scheduling</h1>
                <p className="text-muted-foreground">Schedule and manage flights</p>
              </div>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Schedule Flight
              </Button>
            </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Scheduled</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{scheduledFlights.length}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
                <Badge className="bg-green-100 text-green-800">Confirmed</Badge>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {scheduledFlights.filter(f => f.status === 'confirmed').length}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Training</CardTitle>
                <Badge className="bg-purple-100 text-purple-800">Training</Badge>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {scheduledFlights.filter(f => f.type === 'training').length}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {scheduledFlights.filter(f => f.date === new Date().toISOString().split('T')[0]).length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Scheduled Flights</CardTitle>
              <CardDescription>View and manage scheduled flights</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search flights by pilot, aircraft, or route..."
                      className="pl-10"
                    />
                  </div>
                </div>
                <Button variant="outline" className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filter
                </Button>
              </div>

              {/* Scheduled Flights List */}
              <div className="space-y-4">
                {scheduledFlights.map((flight) => (
                  <Card key={flight.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <Plane className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">
                              {flight.departure} → {flight.arrival}
                            </h3>
                            <div className="flex items-center gap-4 text-muted-foreground">
                              <span>{flight.pilot}</span>
                              <span>•</span>
                              <span>{flight.aircraft}</span>
                              <span>•</span>
                              <span>{flight.duration}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Date & Time</p>
                            <p className="font-semibold">
                              {new Date(flight.date).toLocaleDateString()} {flight.time}
                            </p>
                          </div>
                          <Badge className={getTypeColor(flight.type)}>
                            {flight.type}
                          </Badge>
                          <Badge className={getStatusColor(flight.status)}>
                            {flight.status}
                          </Badge>
                          <Button variant="outline" size="sm">
                            Edit
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  </div>
  );
} 