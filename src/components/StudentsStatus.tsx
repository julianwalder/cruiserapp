'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Users, Clock, TrendingUp, Calendar, AlertTriangle, CheckCircle, Search, Filter, ChevronsUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';

interface StudentMetrics {
  totalHoursFlown: number;
  lastFlightDate: string | null;
  daysSinceStart: number;
  daysSinceLastFlight: number | null;
  averageHoursPerWeek: number;
  averageFlightDuration: number;
  totalFlights: number;
  flightsPerWeek: number;
  isActive: boolean;
}

interface Student {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  startDate: string;
  homebase: string;
  status: string;
  metrics: StudentMetrics;
}

interface StudentsStatusData {
  students: Student[];
  summary: {
    totalStudents: number;
    activeStudents: number;
    inactiveStudents: number;
    currentStudents: number;
    totalHoursFlown: number;
    totalFlights: number;
    averageHoursPerWeek: number;
  };
}


export function StudentsStatus() {
  const [data, setData] = useState<StudentsStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [homebaseFilter, setHomebaseFilter] = useState<string>('all');
  const [includeInactive, setIncludeInactive] = useState<boolean>(false);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

type SortField = 'name' | 'startDate' | 'homebase' | 'totalHoursFlown' | 'totalFlights' | 'averageHoursPerWeek' | 'lastFlightDate' | 'status';
type SortDirection = 'asc' | 'desc';

  useEffect(() => {
    fetchStudentsStatus();
  }, [includeInactive]);

  const fetchStudentsStatus = async () => {
    try {
      setLoading(true);
      const url = includeInactive ? '/api/students/status?includeInactive=true' : '/api/students/status';
      const response = await fetch(url);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch students status');
      }

      setData(result);
      setError(null);
    } catch (err) {
      console.error('Error fetching students status:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'MMM dd, yyyy');
    } catch {
      return 'Invalid date';
    }
  };

  const getActivityBadge = (student: Student) => {
    const { isActive, daysSinceLastFlight, totalFlights, daysSinceStart } = student.metrics;
    
    // First check database status - if INACTIVE, show inactive
    if (student.status === 'INACTIVE') {
      return <Badge className="bg-red-100 text-red-800 border-red-200">Inactive</Badge>;
    }
    
    // New students: enrolled within last 30 days and have no flights or very few flights
    if (daysSinceStart <= 30 && totalFlights <= 2) {
      return <Badge className="bg-blue-100 text-blue-800 border-blue-200">New</Badge>;
    }
    
    // Current students: active (flown within 30 days) or never flown
    if (isActive) {
      return <Badge className="bg-green-100 text-green-800 border-green-200">Current</Badge>;
    }
    
    // Dormant students: haven't flown in over 30 days
    return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Dormant</Badge>;
  };

  const getCompletionColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-yellow-500';
    if (percentage >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  // Get unique homebases for filter
  const homebases = useMemo(() => {
    if (!data) return [];
    const uniqueHomebases = [...new Set(data.students.map(s => s.homebase).filter(Boolean))];
    return uniqueHomebases.sort();
  }, [data]);

  // Filter and sort students
  const filteredStudents = useMemo(() => {
    if (!data) return [];

    let filtered = data.students.filter(student => {
      // Search filter
      const matchesSearch = searchTerm === '' || 
        student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email.toLowerCase().includes(searchTerm.toLowerCase());

      // Status filter
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'new' && student.metrics.daysSinceStart <= 30 && student.metrics.totalFlights <= 2) ||
        (statusFilter === 'current' && student.metrics.isActive && student.status === 'ACTIVE') ||
        (statusFilter === 'dormant' && !student.metrics.isActive && student.status === 'ACTIVE') ||
        (statusFilter === 'inactive' && student.status === 'INACTIVE');

      // Homebase filter
      const matchesHomebase = homebaseFilter === 'all' || student.homebase === homebaseFilter;

      return matchesSearch && matchesStatus && matchesHomebase;
    });

    // Sort students
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'name':
          aValue = a.fullName.toLowerCase();
          bValue = b.fullName.toLowerCase();
          break;
        case 'startDate':
          aValue = new Date(a.startDate);
          bValue = new Date(b.startDate);
          break;
        case 'homebase':
          aValue = a.homebase.toLowerCase();
          bValue = b.homebase.toLowerCase();
          break;
        case 'totalHoursFlown':
          aValue = a.metrics.totalHoursFlown;
          bValue = b.metrics.totalHoursFlown;
          break;
        case 'totalFlights':
          aValue = a.metrics.totalFlights;
          bValue = b.metrics.totalFlights;
          break;
        case 'averageHoursPerWeek':
          aValue = a.metrics.averageHoursPerWeek;
          bValue = b.metrics.averageHoursPerWeek;
          break;
        case 'lastFlightDate':
          aValue = a.metrics.lastFlightDate ? new Date(a.metrics.lastFlightDate) : new Date(0);
          bValue = b.metrics.lastFlightDate ? new Date(b.metrics.lastFlightDate) : new Date(0);
          break;
        case 'status':
          // Sort: New (0), Current (1), Dormant (2)
          const getStatusValue = (student: Student) => {
            if (student.metrics.daysSinceStart <= 30 && student.metrics.totalFlights <= 2) return 0; // New
            if (student.metrics.isActive) return 1; // Current
            return 2; // Dormant
          };
          aValue = getStatusValue(a);
          bValue = getStatusValue(b);
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [data, searchTerm, statusFilter, homebaseFilter, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ChevronsUpDown className="h-4 w-4" />;
    }
    return sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />;
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setHomebaseFilter('all');
    setIncludeInactive(false);
    setSortField('name');
    setSortDirection('asc');
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Students Status
          </CardTitle>
          <CardDescription>Loading student metrics...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Students Status
          </CardTitle>
          <CardDescription>Error loading student metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-red-500">
            <AlertTriangle className="h-5 w-5 mr-2" />
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalStudents}</div>
            <p className="text-xs text-muted-foreground">
              {data.summary.activeStudents} active, {data.summary.currentStudents} current
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours Flown</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalHoursFlown.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">
              flight hours logged
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Flights</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalFlights}</div>
            <p className="text-xs text-muted-foreground">
              flights completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round((data.summary.currentStudents / data.summary.totalStudents) * 100)}%
            </div>
            <p className="text-xs text-muted-foreground">
              students current
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Students Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Student Details</CardTitle>
              {filteredStudents.length !== data.students.length && (
                <CardDescription>
                  Showing {filteredStudents.length} of {data.students.length} students
                </CardDescription>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-inactive"
                checked={includeInactive}
                onCheckedChange={(checked) => setIncludeInactive(checked as boolean)}
              />
              <label
                htmlFor="include-inactive"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Include inactive
              </label>
            </div>
          </div>
        </CardHeader>
        <CardContent>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-64">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('name')}
                      className="h-auto p-0 font-semibold hover:bg-transparent"
                    >
                      Student
                      {getSortIcon('name')}
                    </Button>
                  </TableHead>
                  <TableHead className="w-32">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('startDate')}
                      className="h-auto p-0 font-semibold hover:bg-transparent"
                    >
                      Start Date
                      {getSortIcon('startDate')}
                    </Button>
                  </TableHead>
                  <TableHead className="w-48">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('homebase')}
                      className="h-auto p-0 font-semibold hover:bg-transparent"
                    >
                      Homebase
                      {getSortIcon('homebase')}
                    </Button>
                  </TableHead>
                  <TableHead className="w-32">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('totalHoursFlown')}
                      className="h-auto p-0 font-semibold hover:bg-transparent"
                    >
                      Hours
                      {getSortIcon('totalHoursFlown')}
                    </Button>
                  </TableHead>
                  <TableHead className="w-32">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('totalFlights')}
                      className="h-auto p-0 font-semibold hover:bg-transparent"
                    >
                      Flights
                      {getSortIcon('totalFlights')}
                    </Button>
                  </TableHead>
                  <TableHead className="w-32">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('averageHoursPerWeek')}
                      className="h-auto p-0 font-semibold hover:bg-transparent"
                    >
                      Avg H/Week
                      {getSortIcon('averageHoursPerWeek')}
                    </Button>
                  </TableHead>
                  <TableHead className="w-32">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('lastFlightDate')}
                      className="h-auto p-0 font-semibold hover:bg-transparent"
                    >
                      Last Flight
                      {getSortIcon('lastFlightDate')}
                    </Button>
                  </TableHead>
                  <TableHead className="w-32">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('status')}
                      className="h-auto p-0 font-semibold hover:bg-transparent"
                    >
                      Status
                      {getSortIcon('status')}
                    </Button>
                  </TableHead>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <Input
                      placeholder="Search name/email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </TableCell>
                  <TableCell></TableCell>
                  <TableCell>
                    <Select value={homebaseFilter} onValueChange={setHomebaseFilter}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        {homebases.map((homebase) => (
                          <SelectItem key={homebase} value={homebase}>
                            {homebase}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                  <TableCell>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="current">Current</SelectItem>
                        <SelectItem value="dormant">Dormant</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="flex flex-col items-center justify-center">
                        <Search className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">No students found matching your criteria</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={clearFilters}
                          className="mt-2"
                        >
                          Clear filters
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{student.fullName}</div>
                          <div className="text-sm text-muted-foreground">{student.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDate(student.startDate)}
                          <div className="text-xs text-muted-foreground">
                            {student.metrics.daysSinceStart} days ago
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{student.homebase}</TableCell>
                      <TableCell>
                        <div>
                          {student.metrics.totalHoursFlown.toFixed(1)}h
                          <div className="text-xs text-muted-foreground">
                            avg {student.metrics.averageFlightDuration.toFixed(1)}h/flight
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          {student.metrics.totalFlights}
                          <div className="text-xs text-muted-foreground">
                            {student.metrics.flightsPerWeek.toFixed(1)}/week
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {student.metrics.averageHoursPerWeek.toFixed(1)}h
                          <div className="text-xs text-muted-foreground">
                            per week
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {student.metrics.lastFlightDate ? (
                          <div className="text-sm">
                            {formatDate(student.metrics.lastFlightDate)}
                            <div className="text-xs text-muted-foreground">
                              {student.metrics.daysSinceLastFlight} days ago
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">No flights</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {getActivityBadge(student)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
