'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Users, Clock, TrendingUp, Calendar, AlertTriangle, CheckCircle, Search, Filter, ArrowUpDown, ArrowUp, ArrowDown, X } from 'lucide-react';
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
  metrics: StudentMetrics;
}

interface StudentsStatusData {
  students: Student[];
  summary: {
    totalStudents: number;
    activeStudents: number;
    totalHoursFlown: number;
    totalFlights: number;
    averageHoursPerWeek: number;
  };
}

type SortField = 'name' | 'startDate' | 'homebase' | 'totalHoursFlown' | 'totalFlights' | 'averageHoursPerWeek' | 'lastFlightDate' | 'status';
type SortDirection = 'asc' | 'desc';

export function StudentsStatus() {
  const [data, setData] = useState<StudentsStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [homebaseFilter, setHomebaseFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  useEffect(() => {
    fetchStudentsStatus();
  }, []);

  const fetchStudentsStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/students/status');
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

  const getActivityBadge = (isActive: boolean, daysSinceLastFlight: number | null) => {
    if (isActive) {
      return <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>;
    } else if (daysSinceLastFlight !== null && daysSinceLastFlight > 90) {
      return <Badge variant="destructive">Inactive</Badge>;
    } else {
      return <Badge variant="secondary">Needs Attention</Badge>;
    }
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
  const filteredAndSortedStudents = useMemo(() => {
    if (!data) return [];

    let filtered = data.students.filter(student => {
      // Search filter
      const matchesSearch = searchTerm === '' || 
        student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email.toLowerCase().includes(searchTerm.toLowerCase());

      // Status filter
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'active' && student.metrics.isActive) ||
        (statusFilter === 'inactive' && !student.metrics.isActive) ||
        (statusFilter === 'needs-attention' && !student.metrics.isActive && student.metrics.daysSinceLastFlight !== null && student.metrics.daysSinceLastFlight <= 90);

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
          aValue = a.metrics.isActive ? 0 : (a.metrics.daysSinceLastFlight !== null && a.metrics.daysSinceLastFlight <= 90 ? 1 : 2);
          bValue = b.metrics.isActive ? 0 : (b.metrics.daysSinceLastFlight !== null && b.metrics.daysSinceLastFlight <= 90 ? 1 : 2);
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

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setHomebaseFilter('all');
    setSortField('name');
    setSortDirection('asc');
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />;
    return sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
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
              {data.summary.activeStudents} active
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
              {Math.round((data.summary.activeStudents / data.summary.totalStudents) * 100)}%
            </div>
            <p className="text-xs text-muted-foreground">
              students active
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Students Table */}
      <Card>
        <CardHeader>
          <CardTitle>Student Details</CardTitle>
          <CardDescription>
            Individual student metrics and progress
            {filteredAndSortedStudents.length !== data.students.length && (
              <span className="text-muted-foreground">
                {' '}({filteredAndSortedStudents.length} of {data.students.length} students)
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search and Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="needs-attention">Needs Attention</SelectItem>
                </SelectContent>
              </Select>
              <Select value={homebaseFilter} onValueChange={setHomebaseFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Homebase" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Homebases</SelectItem>
                  {homebases.map((homebase) => (
                    <SelectItem key={homebase} value={homebase}>
                      {homebase}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="px-3"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
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
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('startDate')}
                      className="h-auto p-0 font-semibold hover:bg-transparent"
                    >
                      <div className="flex flex-row items-center gap-1">
                        <span>Start</span>
                        <span>Date</span>
                        {getSortIcon('startDate')}
                      </div>
                    </Button>
                  </TableHead>
                  <TableHead>
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
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('totalHoursFlown')}
                      className="h-auto p-0 font-semibold hover:bg-transparent"
                    >
                      <div className="flex flex-row items-center gap-1">
                        <span>Hours</span>
                        <span>Flown</span>
                        {getSortIcon('totalHoursFlown')}
                      </div>
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('totalFlights')}
                      className="h-auto p-0 font-semibold hover:bg-transparent"
                    >
                      <div className="flex flex-row items-center gap-1">
                        <span>Total</span>
                        <span>Flights</span>
                        {getSortIcon('totalFlights')}
                      </div>
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('averageHoursPerWeek')}
                      className="h-auto p-0 font-semibold hover:bg-transparent"
                    >
                      <div className="flex flex-row items-center gap-1">
                        <span>Avg Hours</span>
                        <span>/Week</span>
                        {getSortIcon('averageHoursPerWeek')}
                      </div>
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('lastFlightDate')}
                      className="h-auto p-0 font-semibold hover:bg-transparent"
                    >
                      <div className="flex flex-row items-center gap-1">
                        <span>Last</span>
                        <span>Flight</span>
                        {getSortIcon('lastFlightDate')}
                      </div>
                    </Button>
                  </TableHead>
                  <TableHead>
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
              </TableHeader>
              <TableBody>
                {filteredAndSortedStudents.length === 0 ? (
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
                  filteredAndSortedStudents.map((student) => (
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
                        {getActivityBadge(student.metrics.isActive, student.metrics.daysSinceLastFlight)}
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
