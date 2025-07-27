'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  BarChart3, 
  Users, 
  Plane, 
  Calendar as CalendarIcon,
  Download,
  TrendingUp,
  TrendingDown,
  Clock,
  MapPin,
  DollarSign,
  FileText,
  Filter,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface FlightStats {
  totalFlights: number;
  totalHours: number;
  flightsThisMonth: number;
  hoursThisMonth: number;
  averageFlightDuration: number;
  mostActiveAircraft: string;
  mostActivePilot: string;
  topDestination: string;
  previousFlights?: number;
  previousHours?: number;
  flightsChange?: number;
  hoursChange?: number;
}

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  newUsersThisMonth: number;
  usersByRole: { role: string; count: number }[];
  topInstructors: { name: string; flights: number; hours: number }[];
}

interface AircraftStats {
  totalAircraft: number;
  activeAircraft: number;
  maintenanceDue: number;
  utilizationRate: number;
  topUtilized: { aircraft: string; hours: number; flights: number }[];
}

interface FinancialStats {
  totalRevenue: number;
  revenueThisMonth: number;
  averageRevenuePerFlight: number;
  topRevenueSources: { source: string; amount: number }[];
  previousRevenue?: number;
  revenueChange?: number;
}

export default function Reports() {
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(),
  });
  const [timeframe, setTimeframe] = useState('month');
  const [isLoading, setIsLoading] = useState(false);
  const [isCustomDateRange, setIsCustomDateRange] = useState(false);
  
  const [flightStats, setFlightStats] = useState<FlightStats>({
    totalFlights: 0,
    totalHours: 0,
    flightsThisMonth: 0,
    hoursThisMonth: 0,
    averageFlightDuration: 0,
    mostActiveAircraft: '',
    mostActivePilot: '',
    topDestination: '',
  });

  const [userStats, setUserStats] = useState<UserStats>({
    totalUsers: 0,
    activeUsers: 0,
    newUsersThisMonth: 0,
    usersByRole: [],
    topInstructors: [],
  });

  const [aircraftStats, setAircraftStats] = useState<AircraftStats>({
    totalAircraft: 0,
    activeAircraft: 0,
    maintenanceDue: 0,
    utilizationRate: 0,
    topUtilized: [],
  });

  const [financialStats, setFinancialStats] = useState<FinancialStats>({
    totalRevenue: 0,
    revenueThisMonth: 0,
    averageRevenuePerFlight: 0,
    topRevenueSources: [],
  });

  useEffect(() => {
    fetchReportData();
  }, [dateRange, timeframe]);

  const fetchReportData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const params = new URLSearchParams({
        timeframe,
      });
      
      // Only add custom date range if user has explicitly selected custom dates
      // For predefined timeframes, let the API calculate the dates
      if (isCustomDateRange && dateRange.from && dateRange.to) {
        params.append('from', dateRange.from.toISOString());
        params.append('to', dateRange.to.toISOString());
      }

      const response = await fetch(`/api/reports?type=overview&${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setFlightStats(data.flightStats);
        setUserStats(data.userStats);
        setAircraftStats(data.aircraftStats);
        setFinancialStats(data.financialStats);
      }
    } catch (error) {
      console.error('Failed to fetch report data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const exportReport = (type: string) => {
    // Implement export functionality
    const token = localStorage.getItem('token');
    if (!token) return;

    const params = new URLSearchParams({
      type,
      timeframe,
      ...(dateRange.from && { from: dateRange.from.toISOString() }),
      ...(dateRange.to && { to: dateRange.to.toISOString() }),
    });

    // Create a download link for CSV export
    const link = document.createElement('a');
    link.href = `/api/reports/export?${params}`;
    link.download = `${type}-report-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const formatCurrency = (amount: number | undefined | null) => {
    if (amount === undefined || amount === null || isNaN(amount)) {
      return '$0.00';
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatHours = (hours: number | undefined | null) => {
    if (hours === undefined || hours === null || isNaN(hours)) {
      return '0.0h';
    }
    return `${hours.toFixed(1)}h`;
  };

  const getPercentageChange = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const getTimeframeDisplayText = (timeframe: string) => {
    const now = new Date();
    switch (timeframe) {
      case 'week':
        // Current week (Monday to Sunday)
        const dayOfWeek = now.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - daysToMonday);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return `${format(weekStart, 'MMM dd')} to ${format(weekEnd, 'MMM dd, yyyy')}`;
      case 'month':
        // Current month (1st to last day)
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return `${format(monthStart, 'MMM dd')} to ${format(monthEnd, 'MMM dd, yyyy')}`;
      case 'quarter':
        // Current quarter
        const currentMonth = now.getMonth();
        const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
        const quarterStart = new Date(now.getFullYear(), quarterStartMonth, 1);
        const quarterEnd = new Date(now.getFullYear(), quarterStartMonth + 3, 0);
        return `${format(quarterStart, 'MMM dd')} to ${format(quarterEnd, 'MMM dd, yyyy')}`;
      case 'year':
        // Current year (Jan 1 to Dec 31)
        const yearStart = new Date(now.getFullYear(), 0, 1);
        const yearEnd = new Date(now.getFullYear(), 11, 31);
        return `${format(yearStart, 'MMM dd')} to ${format(yearEnd, 'MMM dd, yyyy')}`;
      default:
        return 'Custom period';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-card-foreground">Reports & Analytics</h2>
          <p className="text-muted-foreground">Comprehensive insights into your flight school operations</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchReportData}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
          
          <Select value={timeframe} onValueChange={(value) => {
            setTimeframe(value);
            setIsCustomDateRange(false);
          }}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Date Range
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange.from}
                selected={dateRange}
                onSelect={(range: any) => {
                  setDateRange(range || { from: undefined, to: undefined });
                  setIsCustomDateRange(true);
                }}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Main Reports Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="flights">Flight Reports</TabsTrigger>
          <TabsTrigger value="users">User Reports</TabsTrigger>
          <TabsTrigger value="aircraft">Aircraft Reports</TabsTrigger>
          <TabsTrigger value="financial">Financial Reports</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="mb-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-4">
              <h3 className="font-medium text-card-foreground">Reporting Period:</h3>
              <p className="text-sm text-muted-foreground">
                {isCustomDateRange && dateRange.from && dateRange.to ? (
                  `${format(dateRange.from, 'MMM dd, yyyy')} to ${format(dateRange.to, 'MMM dd, yyyy')}`
                ) : (
                  getTimeframeDisplayText(timeframe)
                )}
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
          {timeframe === 'week' ? 'Flights WTD' : 
           timeframe === 'month' ? 'Flights MTD' :
           timeframe === 'quarter' ? 'Flights QTD' :
           timeframe === 'year' ? 'Flights YTD' : 'Flights This Period'}
        </CardTitle>
                <Plane className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{flightStats.totalFlights}</div>
                <div className="flex items-center space-x-1 mt-1">
                  {flightStats.flightsChange && flightStats.flightsChange > 0 ? (
                    <TrendingUp className="h-3 w-3 text-success" />
                  ) : flightStats.flightsChange && flightStats.flightsChange < 0 ? (
                    <TrendingDown className="h-3 w-3 text-destructive" />
                  ) : (
                    <span className="h-3 w-3" />
                  )}
                  <p className="text-xs text-muted-foreground">
                    {flightStats.flightsChange ? `${flightStats.flightsChange > 0 ? '+' : ''}${flightStats.flightsChange.toFixed(1)}% vs previous ${timeframe === 'week' ? 'year WTD' : timeframe === 'month' ? 'year MTD' : timeframe === 'quarter' ? 'year QTD' : 'year YTD'}` : 'No previous data'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
          {timeframe === 'week' ? 'Hours WTD' : 
           timeframe === 'month' ? 'Hours MTD' :
           timeframe === 'quarter' ? 'Hours QTD' :
           timeframe === 'year' ? 'Hours YTD' : 'Hours This Period'}
        </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatHours(flightStats.totalHours)}</div>
                <div className="flex items-center space-x-1 mt-1">
                  {flightStats.hoursChange && flightStats.hoursChange > 0 ? (
                    <TrendingUp className="h-3 w-3 text-success" />
                  ) : flightStats.hoursChange && flightStats.hoursChange < 0 ? (
                    <TrendingDown className="h-3 w-3 text-destructive" />
                  ) : (
                    <span className="h-3 w-3" />
                  )}
                  <p className="text-xs text-muted-foreground">
                    {flightStats.hoursChange ? `${flightStats.hoursChange > 0 ? '+' : ''}${flightStats.hoursChange.toFixed(1)}% vs previous ${timeframe === 'week' ? 'year WTD' : timeframe === 'month' ? 'year MTD' : timeframe === 'quarter' ? 'year QTD' : 'year YTD'}` : 'No previous data'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userStats.activeUsers}</div>
                <p className="text-xs text-muted-foreground">
                  {userStats.newUsersThisMonth} new users this period
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
          {timeframe === 'week' ? 'Revenue WTD' : 
           timeframe === 'month' ? 'Revenue MTD' :
           timeframe === 'quarter' ? 'Revenue QTD' :
           timeframe === 'year' ? 'Revenue YTD' : 'Revenue This Period'}
        </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(financialStats.totalRevenue)}</div>
                <div className="flex items-center space-x-1 mt-1">
                  {financialStats.revenueChange && financialStats.revenueChange > 0 ? (
                    <TrendingUp className="h-3 w-3 text-success" />
                  ) : financialStats.revenueChange && financialStats.revenueChange < 0 ? (
                    <TrendingDown className="h-3 w-3 text-destructive" />
                  ) : (
                    <span className="h-3 w-3" />
                  )}
                  <p className="text-xs text-muted-foreground">
                    {financialStats.revenueChange ? `${financialStats.revenueChange > 0 ? '+' : ''}${financialStats.revenueChange.toFixed(1)}% vs previous ${timeframe === 'week' ? 'year WTD' : timeframe === 'month' ? 'year MTD' : timeframe === 'quarter' ? 'year QTD' : 'year YTD'}` : 'No previous data'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Aircraft</CardTitle>
                <CardDescription>Most utilized aircraft in selected period</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {aircraftStats.topUtilized.length > 0 ? (
                    aircraftStats.topUtilized.map((aircraft, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Badge variant="secondary">{index + 1}</Badge>
                          <div>
                            <p className="font-medium">{aircraft.aircraft}</p>
                            <p className="text-sm text-muted-foreground">
                              {aircraft.flights} flights
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatHours(aircraft.hours)}</p>
                          <p className="text-sm text-muted-foreground">
                            {flightStats.totalHours > 0 ? ((aircraft.hours / flightStats.totalHours) * 100).toFixed(1) : '0'}%
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      No aircraft data available for this period
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Instructors</CardTitle>
                <CardDescription>Most active instructors in selected period</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {userStats.topInstructors.length > 0 ? (
                    userStats.topInstructors.map((instructor, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Badge variant="secondary">{index + 1}</Badge>
                          <div>
                            <p className="font-medium">{instructor.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {instructor.flights} flights
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatHours(instructor.hours)}</p>
                          <p className="text-sm text-muted-foreground">
                            {flightStats.totalHours > 0 ? ((instructor.hours / flightStats.totalHours) * 100).toFixed(1) : '0'}%
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      No instructor data available for this period
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Quick Summary</CardTitle>
              <CardDescription>Key insights from the selected reporting period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">{flightStats.averageFlightDuration ? flightStats.averageFlightDuration.toFixed(1) : '0.0'}h</div>
                  <p className="text-sm text-muted-foreground">Average Flight Duration</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">{formatCurrency(financialStats.averageRevenuePerFlight)}</div>
                  <p className="text-sm text-muted-foreground">Average Revenue per Flight</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">{aircraftStats.utilizationRate ? aircraftStats.utilizationRate.toFixed(1) : '0.0'}%</div>
                  <p className="text-sm text-muted-foreground">Fleet Utilization Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Flight Reports Tab */}
        <TabsContent value="flights" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Flight Statistics</h3>
            <Button variant="outline" size="sm" onClick={() => exportReport('flights')}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Flight Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Total Flights</span>
                  <span className="font-medium">{flightStats.totalFlights}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Flights</span>
                  <span className="font-medium">{flightStats.totalFlights}</span>
                </div>
                <div className="flex justify-between">
                  <span>Average Duration</span>
                  <span className="font-medium">{flightStats.averageFlightDuration ? flightStats.averageFlightDuration.toFixed(1) : '0.0'}h</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Flight Hours</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Total Hours</span>
                  <span className="font-medium">{formatHours(flightStats.totalHours)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Hours</span>
                  <span className="font-medium">{formatHours(flightStats.totalHours)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Daily Average</span>
                  <span className="font-medium">{formatHours(flightStats.totalHours ? flightStats.totalHours / 30 : 0)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Top Performers</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Most Active Aircraft</p>
                  <p className="font-medium">{flightStats.mostActiveAircraft}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Most Active Pilot</p>
                  <p className="font-medium">{flightStats.mostActivePilot}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Top Destination</p>
                  <p className="font-medium">{flightStats.topDestination}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* User Reports Tab */}
        <TabsContent value="users" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">User Statistics</h3>
            <Button variant="outline" size="sm" onClick={() => exportReport('users')}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>User Distribution by Role</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {userStats.usersByRole.map((role) => (
                    <div key={role.role} className="flex items-center justify-between">
                      <span className="capitalize">{role.role.replace('_', ' ').toLowerCase()}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-muted rounded-full h-2">
                                                  <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{ width: `${userStats.totalUsers > 0 ? (role.count / userStats.totalUsers) * 100 : 0}%` }}
                        />
                        </div>
                        <span className="text-sm font-medium">{role.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Instructors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {userStats.topInstructors.map((instructor, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">{instructor.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {instructor.flights} flights • {formatHours(instructor.hours)}
                        </p>
                      </div>
                      <Badge variant="secondary">#{index + 1}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Aircraft Reports Tab */}
        <TabsContent value="aircraft" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Aircraft Statistics</h3>
            <Button variant="outline" size="sm" onClick={() => exportReport('aircraft')}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Aircraft</CardTitle>
                <Plane className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{aircraftStats.totalAircraft}</div>
                <p className="text-xs text-muted-foreground">
                  {aircraftStats.activeAircraft} active
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Utilization Rate</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{aircraftStats.utilizationRate}%</div>
                <p className="text-xs text-muted-foreground">
                  Average across fleet
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Maintenance Due</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-warning">{aircraftStats.maintenanceDue}</div>
                <p className="text-xs text-muted-foreground">
                  Aircraft requiring service
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Aircraft</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-success">{aircraftStats.activeAircraft}</div>
                <p className="text-xs text-muted-foreground">
                  Available for operations
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Aircraft Utilization Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {aircraftStats.topUtilized.map((aircraft, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <Badge variant="outline">{aircraft.aircraft}</Badge>
                      <div>
                        <p className="font-medium">{formatHours(aircraft.hours)}</p>
                        <p className="text-sm text-muted-foreground">
                          {aircraft.flights} flights completed
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {flightStats.totalHours > 0 ? ((aircraft.hours / flightStats.totalHours) * 100).toFixed(1) : '0'}%
                      </p>
                      <p className="text-xs text-muted-foreground">of total hours</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financial Reports Tab */}
        <TabsContent value="financial" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Financial Statistics</h3>
            <Button variant="outline" size="sm" onClick={() => exportReport('financial')}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(financialStats.totalRevenue)}</div>
                <p className="text-xs text-muted-foreground">
                  +{formatCurrency(financialStats.revenueThisMonth)} this month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Revenue per Flight</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(financialStats.averageRevenuePerFlight)}</div>
                <p className="text-xs text-muted-foreground">
                  Per flight average
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(financialStats.revenueThisMonth)}</div>
                <p className="text-xs text-muted-foreground">
                  Current month
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Revenue by Source</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {financialStats.topRevenueSources.map((source, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="font-medium">{source.source}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-32 bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{ width: `${financialStats.totalRevenue > 0 ? (source.amount / financialStats.totalRevenue) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{formatCurrency(source.amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 