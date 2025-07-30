'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';
import { 
  Calendar as CalendarIcon,
  BarChart3,
  TrendingUp,
  RefreshCw,
  Filter
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ChartData {
  month: string;
  [key: string]: string | number;
}

interface FlightHoursChartProps {
  className?: string;
}

export default function FlightHoursChart({ className }: FlightHoursChartProps) {
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [flightTypes, setFlightTypes] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [chartType, setChartType] = useState<'bar' | 'line' | 'area'>('bar');
  const [isLoading, setIsLoading] = useState(false);
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined,
  });
  const [isCustomDateRange, setIsCustomDateRange] = useState(false);
  const [selectedFlightTypes, setSelectedFlightTypes] = useState<Set<string>>(new Set());
  const [compareWithPreviousYear, setCompareWithPreviousYear] = useState(false);

  // Generate year options (current year and 5 years back)
  const yearOptions = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);

  // Linear grey color palette for current year flight types (900 to 400)
  const greyColors = [
    '#111827', // gray-900
    '#1f2937', // gray-800
    '#374151', // gray-700
    '#4b5563', // gray-600
    '#6b7280', // gray-500
    '#9ca3af', // gray-400
  ];

  // Linear blue color palette for previous year flight types (900 to 400)
  const blueColors = [
    '#1e3a8a', // blue-900
    '#1e40af', // blue-800
    '#2563eb', // blue-700
    '#3b82f6', // blue-600
    '#60a5fa', // blue-500
    '#93c5fd', // blue-400
  ];

  useEffect(() => {
    fetchChartData();
  }, [selectedYear, dateRange, isCustomDateRange, compareWithPreviousYear]);

  // Initialize selected flight types when flight types are loaded
  useEffect(() => {
    if (flightTypes.length > 0 && selectedFlightTypes.size === 0) {
      // Only select current year flight types, not comparison ones
      const currentYearTypes = flightTypes.filter(type => !type.includes('('));
      setSelectedFlightTypes(new Set(currentYearTypes));
    }
  }, [flightTypes]);

  // Update selected flight types when comparison is toggled
  useEffect(() => {
    if (flightTypes.length > 0) {
      const currentYearTypes = flightTypes.filter(type => !type.includes('('));
      const previousYearTypes = flightTypes.filter(type => type.includes('('));
      
      console.log('Flight types available:', {
        currentYear: currentYearTypes,
        previousYear: previousYearTypes,
        compareWithPreviousYear
      });
      
      if (compareWithPreviousYear) {
        // When comparison is enabled, include both current and previous year types
        const allTypes = [...currentYearTypes, ...previousYearTypes];
        setSelectedFlightTypes(new Set(allTypes));
        console.log('Selected all types:', allTypes);
      } else {
        // When comparison is disabled, only include current year types
        setSelectedFlightTypes(new Set(currentYearTypes));
        console.log('Selected current year types only:', currentYearTypes);
      }
    }
  }, [compareWithPreviousYear, flightTypes]);

  const fetchChartData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const params = new URLSearchParams({
        year: selectedYear.toString(),
      });

      // Add custom date range if selected
      if (isCustomDateRange && dateRange.from && dateRange.to) {
        params.append('from', dateRange.from.toISOString().split('T')[0]);
        params.append('to', dateRange.to.toISOString().split('T')[0]);
      }

      // Add previous year comparison if enabled
      if (compareWithPreviousYear) {
        params.append('compare', 'true');
      }

      console.log('Fetching chart data with params:', params.toString());

      const response = await fetch(`/api/reports/flight-hours-chart?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Chart data received:', data);
        console.log('Flight types in response:', data.flightTypes);
        console.log('Sample chart data:', data.chartData.slice(0, 2));
        setChartData(data.chartData);
        setFlightTypes(data.flightTypes);
      }
    } catch (error) {
      console.error('Failed to fetch chart data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatHours = (hours: number) => {
    return `${hours.toFixed(1)}h`;
  };

  // Function to get color based on flight type (current year = grey, previous year = blue)
  const getColorForFlightType = (flightType: string, index: number) => {
    const isPreviousYear = flightType.includes('(');
    const baseType = flightType.replace(/ \(\d{4}\)$/, '');
    
    // Define the custom order for flight types
    const customOrder = ['INVOICED', 'SCHOOL', 'CHARTER', 'DEMO', 'PROMO', 'FERRY'];
    
    // Find the index of the base type in the custom order
    const baseTypeIndex = customOrder.indexOf(baseType);
    
    if (isPreviousYear) {
      return blueColors[baseTypeIndex % blueColors.length];
    } else {
      return greyColors[baseTypeIndex % greyColors.length];
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const totalHours = payload.reduce((sum: number, entry: any) => sum + (entry.value || 0), 0);
      
      return (
        <div className="bg-white/90 border border-border rounded-lg p-3 shadow-lg" style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
          <p className="font-medium text-foreground">{label}</p>
          <p className="text-sm font-semibold text-primary mb-2">
            Total: {formatHours(totalHours)}
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatHours(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderChart = () => {
    if (chartData.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          <div className="text-center">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No flight data available for the selected period</p>
          </div>
        </div>
      );
    }

    // Filter data to only include selected flight types
    const filteredData = chartData.map(monthData => {
      const filtered: any = { month: monthData.month };
      Array.from(selectedFlightTypes).forEach(type => {
        if (monthData[type] !== undefined) {
          filtered[type] = monthData[type];
        }
      });
      return filtered;
    });

    console.log('Chart rendering:', {
      selectedFlightTypes: Array.from(selectedFlightTypes),
      filteredData: filteredData.slice(0, 2), // Show first 2 months for debugging
      chartType,
      allFlightTypes: flightTypes,
      chartDataKeys: chartData.length > 0 ? Object.keys(chartData[0]) : []
    });

    const commonProps = {
      data: filteredData,
      margin: { top: 20, right: 30, left: 20, bottom: 5 },
    };

    switch (chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart {...commonProps}>
              <CartesianGrid strokeDasharray="1 1" className="opacity-20" />
              <XAxis 
                dataKey="month" 
                className="text-xs"
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                className="text-xs"
                tick={{ fontSize: 11 }}
                tickFormatter={(value) => `${value}h`}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              {(() => {
                // Define the custom order for flight types
                const customOrder = ['INVOICED', 'SCHOOL', 'CHARTER', 'DEMO', 'PROMO', 'FERRY'];
                
                return Array.from(selectedFlightTypes)
                  .sort((a, b) => {
                    // Sort previous year types (with parentheses) first
                    const aIsPrevious = a.includes('(');
                    const bIsPrevious = b.includes('(');
                    if (aIsPrevious && !bIsPrevious) return -1;
                    if (!aIsPrevious && bIsPrevious) return 1;
                    
                    // Get base types (without year)
                    const aBase = a.includes('(') ? a.replace(/ \(\d{4}\)$/, '') : a;
                    const bBase = b.includes('(') ? b.replace(/ \(\d{4}\)$/, '') : b;
                    
                    // Sort by custom order
                    const aIndex = customOrder.indexOf(aBase);
                    const bIndex = customOrder.indexOf(bBase);
                    if (aIndex !== -1 && bIndex !== -1) {
                      return aIndex - bIndex;
                    }
                    if (aIndex !== -1) return -1;
                    if (bIndex !== -1) return 1;
                    return aBase.localeCompare(bBase);
                  })
                  .map((type, index) => (
                <Bar
                  key={type}
                  dataKey={type}
                  name={type.replace(/ \(\d{4}\)$/, '')}
                  fill={getColorForFlightType(type, index)}
                  radius={[2, 2, 0, 0]}
                  stroke="none"
                  stackId={type.includes('(') ? 'previous' : 'current'}
                />
              ));
              })()}
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart {...commonProps}>
              <CartesianGrid strokeDasharray="1 1" className="opacity-20" />
              <XAxis 
                dataKey="month" 
                className="text-xs"
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                className="text-xs"
                tick={{ fontSize: 11 }}
                tickFormatter={(value) => `${value}h`}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              {(() => {
                // Define the custom order for flight types
                const customOrder = ['INVOICED', 'SCHOOL', 'CHARTER', 'DEMO', 'PROMO', 'FERRY'];
                
                return Array.from(selectedFlightTypes)
                  .sort((a, b) => {
                    // Sort previous year types (with parentheses) first
                    const aIsPrevious = a.includes('(');
                    const bIsPrevious = b.includes('(');
                    if (aIsPrevious && !bIsPrevious) return -1;
                    if (!aIsPrevious && bIsPrevious) return 1;
                    
                    // Get base types (without year)
                    const aBase = a.includes('(') ? a.replace(/ \(\d{4}\)$/, '') : a;
                    const bBase = b.includes('(') ? b.replace(/ \(\d{4}\)$/, '') : b;
                    
                    // Sort by custom order
                    const aIndex = customOrder.indexOf(aBase);
                    const bIndex = customOrder.indexOf(bBase);
                    if (aIndex !== -1 && bIndex !== -1) {
                      return aIndex - bIndex;
                    }
                    if (aIndex !== -1) return -1;
                    if (bIndex !== -1) return 1;
                    return aBase.localeCompare(bBase);
                  })
                  .map((type, index) => (
                <Line
                  key={type}
                  type="monotone"
                  dataKey={type}
                  name={type.replace(/ \(\d{4}\)$/, '')}
                  stroke={getColorForFlightType(type, index)}
                  strokeWidth={1.5}
                  dot={{ fill: getColorForFlightType(type, index), strokeWidth: 1, r: 3 }}
                  activeDot={{ r: 4 }}
                />
              ));
              })()}
            </LineChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart {...commonProps}>
              <CartesianGrid strokeDasharray="1 1" className="opacity-20" />
              <XAxis 
                dataKey="month" 
                className="text-xs"
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                className="text-xs"
                tick={{ fontSize: 11 }}
                tickFormatter={(value) => `${value}h`}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              {(() => {
                // Define the custom order for flight types
                const customOrder = ['INVOICED', 'SCHOOL', 'CHARTER', 'DEMO', 'PROMO', 'FERRY'];
                
                return Array.from(selectedFlightTypes)
                  .sort((a, b) => {
                    // Sort previous year types (with parentheses) first
                    const aIsPrevious = a.includes('(');
                    const bIsPrevious = b.includes('(');
                    if (aIsPrevious && !bIsPrevious) return -1;
                    if (!aIsPrevious && bIsPrevious) return 1;
                    
                    // Get base types (without year)
                    const aBase = a.includes('(') ? a.replace(/ \(\d{4}\)$/, '') : a;
                    const bBase = b.includes('(') ? b.replace(/ \(\d{4}\)$/, '') : b;
                    
                    // Sort by custom order
                    const aIndex = customOrder.indexOf(aBase);
                    const bIndex = customOrder.indexOf(bBase);
                    if (aIndex !== -1 && bIndex !== -1) {
                      return aIndex - bIndex;
                    }
                    if (aIndex !== -1) return -1;
                    if (bIndex !== -1) return 1;
                    return aBase.localeCompare(bBase);
                  })
                  .map((type, index) => (
                <Area
                  key={type}
                  type="monotone"
                  dataKey={type}
                  name={type.replace(/ \(\d{4}\)$/, '')}
                  stackId="1"
                  stroke={getColorForFlightType(type, index)}
                  fill={getColorForFlightType(type, index)}
                  fillOpacity={0.4}
                />
              ));
              })()}
            </AreaChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Monthly Flight Hours by Type
            </CardTitle>
            <CardDescription>
              Flight hours breakdown by flight type for {isCustomDateRange && dateRange.from && dateRange.to 
                ? `${format(dateRange.from, 'MMM dd, yyyy')} to ${format(dateRange.to, 'MMM dd, yyyy')}`
                : selectedYear
              }
              {compareWithPreviousYear && ` (comparing with ${selectedYear - 1})`}
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchChartData}
              disabled={isLoading}
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Controls */}
        <div className="flex flex-col gap-4 mb-6">
          {/* Top Row Controls */}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Year Selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Year:</span>
              <Select 
                value={selectedYear.toString()} 
                onValueChange={(value) => {
                  setSelectedYear(parseInt(value));
                  setIsCustomDateRange(false);
                }}
              >
                <SelectTrigger className="w-24">
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
            </div>

            {/* Chart Type Selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Chart Type:</span>
              <Select value={chartType} onValueChange={(value: 'bar' | 'line' | 'area') => setChartType(value)}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bar">Bar</SelectItem>
                  <SelectItem value="line">Line</SelectItem>
                  <SelectItem value="area">Area</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom Date Range */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Date Range:</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Custom Range
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

            {/* Compare with Previous Year */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="compare-year"
                checked={compareWithPreviousYear}
                onCheckedChange={(checked) => setCompareWithPreviousYear(checked as boolean)}
              />
              <label
                htmlFor="compare-year"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Compare with previous year
              </label>
            </div>
          </div>

          {/* Flight Type Selection */}
          {flightTypes.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Flight Types:</span>
              <div className="flex flex-col gap-4">
                {/* Current Year Flight Types */}
                <div className="flex flex-wrap gap-3">
                  {(() => {
                    // Define the custom order for flight types
                    const customOrder = ['INVOICED', 'SCHOOL', 'CHARTER', 'DEMO', 'PROMO', 'FERRY'];
                    
                    return flightTypes
                      .filter(type => !type.includes('('))
                      .sort((a, b) => {
                        const aIndex = customOrder.indexOf(a);
                        const bIndex = customOrder.indexOf(b);
                        if (aIndex !== -1 && bIndex !== -1) {
                          return aIndex - bIndex;
                        }
                        if (aIndex !== -1) return -1;
                        if (bIndex !== -1) return 1;
                        return a.localeCompare(b);
                      })
                      .map((type, index) => (
                    <div key={type} className="flex items-center space-x-2">
                      <Checkbox
                        id={type}
                        checked={selectedFlightTypes.has(type)}
                        onCheckedChange={(checked) => {
                          const newSelected = new Set(selectedFlightTypes);
                          if (checked) {
                            newSelected.add(type);
                          } else {
                            newSelected.delete(type);
                          }
                          setSelectedFlightTypes(newSelected);
                        }}
                      />
                      <label
                        htmlFor={type}
                        className={cn(
                          "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 capitalize cursor-pointer"
                        )}
                        style={{ color: getColorForFlightType(type, index) }}
                      >
                        {type.replace(/_/g, ' ')}
                      </label>
                    </div>
                  ));
                })()}
                </div>
                
                {/* Previous Year Flight Types (when comparison is enabled) */}
                {compareWithPreviousYear && (
                  <div className="flex flex-wrap gap-3">
                    {(() => {
                      // Define the custom order for flight types
                      const customOrder = ['INVOICED', 'SCHOOL', 'CHARTER', 'DEMO', 'PROMO', 'FERRY'];
                      
                      return flightTypes
                        .filter(type => type.includes('('))
                        .sort((a, b) => {
                          const aBase = a.replace(/ \(\d{4}\)$/, '');
                          const bBase = b.replace(/ \(\d{4}\)$/, '');
                          const aIndex = customOrder.indexOf(aBase);
                          const bIndex = customOrder.indexOf(bBase);
                          if (aIndex !== -1 && bIndex !== -1) {
                            return aIndex - bIndex;
                          }
                          if (aIndex !== -1) return -1;
                          if (bIndex !== -1) return 1;
                          return aBase.localeCompare(bBase);
                        })
                        .map((type, index) => {
                          const baseType = type.replace(/ \(\d{4}\)$/, '');
                          return (
                            <div key={type} className="flex items-center space-x-2">
                              <Checkbox
                                id={type}
                                checked={selectedFlightTypes.has(type)}
                                onCheckedChange={(checked) => {
                                  const newSelected = new Set(selectedFlightTypes);
                                  if (checked) {
                                    newSelected.add(type);
                                  } else {
                                    newSelected.delete(type);
                                  }
                                  setSelectedFlightTypes(newSelected);
                                }}
                              />
                              <label
                                htmlFor={type}
                                className={cn(
                                  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 capitalize cursor-pointer"
                                )}
                                style={{ color: getColorForFlightType(type, index) }}
                              >
                                {baseType.replace(/_/g, ' ')}
                              </label>
                            </div>
                          );
                        });
                    })()}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Chart */}
        <div className="w-full">
          {renderChart()}
        </div>

        {/* Summary Stats Table */}
        {chartData.length > 0 && selectedFlightTypes.size > 0 && (
          <div className="mt-6">
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full min-w-max">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium text-sm">Flight Type</th>
                    {(() => {
                      // Get all years (e.g., [2024, 'Current'])
                      const years = new Set<string>();
                      Array.from(selectedFlightTypes).forEach(type => {
                        if (type.includes('(')) {
                          const year = type.match(/\((\d{4})\)/)?.[1];
                          if (year) years.add(year);
                        } else {
                          years.add('Current');
                        }
                      });
                      return Array.from(years)
                        .sort((a, b) => {
                          if (a === 'Current') return 1;
                          if (b === 'Current') return -1;
                          return b.localeCompare(a);
                        })
                        .flatMap(year => [
                          <th key={year + '-hours'} className="text-right p-3 font-medium text-sm">{year === 'Current' ? 'Current Year' : year} Hours</th>,
                          <th key={year + '-pct'} className="text-right p-3 font-medium text-sm">%</th>
                        ]);
                    })()}
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    // Get unique base flight types (without year)
                    const baseTypes = new Set<string>();
                    Array.from(selectedFlightTypes).forEach(type => {
                      const baseType = type.includes('(') 
                        ? type.replace(/ \(\d{4}\)$/, '')
                        : type;
                      baseTypes.add(baseType);
                    });

                    // Get all years
                    const allYears = Array.from(selectedFlightTypes).reduce((acc, type) => {
                      if (type.includes('(')) {
                        const year = type.match(/\((\d{4})\)/)?.[1];
                        if (year && !acc.includes(year)) acc.push(year);
                      } else if (!acc.includes('Current')) {
                        acc.push('Current');
                      }
                      return acc;
                    }, [] as string[]).sort((a, b) => {
                      if (a === 'Current') return 1;
                      if (b === 'Current') return -1;
                      return b.localeCompare(a);
                    });

                    // Calculate total hours for each year
                    const yearTotals: { [key: string]: number } = {};
                    allYears.forEach(year => {
                      yearTotals[year] = Array.from(selectedFlightTypes)
                        .filter(type => {
                          if (year === 'Current') {
                            return !type.includes('(');
                          } else {
                            return type.includes(`(${year})`);
                          }
                        })
                        .reduce((sum, type) => sum + chartData.reduce((monthSum, month) => monthSum + (month[type] as number || 0), 0), 0);
                    });

                    // Define the custom order for flight types
                    const customOrder = ['INVOICED', 'SCHOOL', 'CHARTER', 'DEMO', 'PROMO', 'FERRY'];
                    
                    return Array.from(baseTypes)
                      .sort((a, b) => {
                        const aIndex = customOrder.indexOf(a);
                        const bIndex = customOrder.indexOf(b);
                        // If both are in custom order, sort by that order
                        if (aIndex !== -1 && bIndex !== -1) {
                          return aIndex - bIndex;
                        }
                        // If only one is in custom order, prioritize it
                        if (aIndex !== -1) return -1;
                        if (bIndex !== -1) return 1;
                        // If neither is in custom order, sort alphabetically
                        return a.localeCompare(b);
                      })
                      .map(baseType => {
                        const displayName = baseType.replace(/_/g, ' ');
                        return (
                          <tr key={baseType} className="border-b last:border-b-0 hover:bg-muted/30">
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: getColorForFlightType(baseType, 0) }}
                                />
                                <span className="font-medium capitalize">{displayName}</span>
                              </div>
                            </td>
                            {allYears.flatMap(year => {
                              // Find the type for this baseType and year
                              let typeKey = year === 'Current' ? baseType : `${baseType} (${year})`;
                              const hours = chartData.reduce((sum, month) => sum + (month[typeKey] as number || 0), 0);
                              const pct = yearTotals[year] > 0 ? (hours / yearTotals[year]) * 100 : 0;
                              return [
                                <td key={year + '-hours'} className="text-right p-3 font-mono">{formatHours(hours)}</td>,
                                <td key={year + '-pct'} className="text-right p-3 font-mono text-sm text-muted-foreground">{pct.toFixed(1)}%</td>
                              ];
                            })}
                          </tr>
                        );
                      });
                  })()}
                  <tr className="border-t-2 bg-muted/50 font-semibold">
                    <td className="p-3">Total</td>
                    {(() => {
                      // Get all years
                      const allYears = Array.from(selectedFlightTypes).reduce((acc, type) => {
                        if (type.includes('(')) {
                          const year = type.match(/\((\d{4})\)/)?.[1];
                          if (year && !acc.includes(year)) acc.push(year);
                        } else if (!acc.includes('Current')) {
                          acc.push('Current');
                        }
                        return acc;
                      }, [] as string[]).sort((a, b) => {
                        if (a === 'Current') return 1;
                        if (b === 'Current') return -1;
                        return b.localeCompare(a);
                      });
                      // Calculate total hours for each year
                      const yearTotals: { [key: string]: number } = {};
                      allYears.forEach(year => {
                        yearTotals[year] = Array.from(selectedFlightTypes)
                          .filter(type => {
                            if (year === 'Current') {
                              return !type.includes('(');
                            } else {
                              return type.includes(`(${year})`);
                            }
                          })
                          .reduce((sum, type) => sum + chartData.reduce((monthSum, month) => monthSum + (month[type] as number || 0), 0), 0);
                      });
                      return allYears.flatMap(year => [
                        <td key={year + '-hours'} className="text-right p-3 font-mono">{formatHours(yearTotals[year])}</td>,
                        <td key={year + '-pct'} className="text-right p-3 font-mono text-sm text-muted-foreground">100.0%</td>
                      ]);
                    })()}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 