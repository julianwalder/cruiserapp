'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Combobox } from '@/components/ui/combobox';
import { Loader2, Download, CheckCircle, AlertCircle, Calendar, RefreshCw, Search, Filter, Plane, ChevronsUpDown, Check, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useDateFormat } from '@/contexts/DateFormatContext';
import { formatDate } from '@/lib/date-utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ImportSummary {
  timestamp: string;
  totalEntries: number;
  imported: number;
  errors: number;
  lastUpdated: string;
  nextScheduledUpdate: string;
  success: boolean;
}

interface StatsData {
  LastUpdated: string;
  NextUpdate: string;
  AircraftTypeCount: number;
  ManufacturerCount: number;
}

interface AircraftData {
  id: string;
  manufacturer: string;
  model: string;
  typeDesignator: string;
  description?: string;
  engineType: string;
  engineCount: number;
  wtc: string;
  createdAt: string;
  updatedAt: string;
}

export default function IcaoImportTab() {
  const { dateFormat } = useDateFormat();
  const [isImporting, setIsImporting] = useState(false);

  // Function to format aircraft description from JSON
  const formatAircraftDescription = (description: string | undefined): string => {
    if (!description) return '';
    
    try {
      // Check if it's JSON
      if (description.startsWith('{')) {
        const descData = JSON.parse(description);
        if (descData.AircraftDescription) {
          // Format the aircraft description properly
          const aircraftDesc = descData.AircraftDescription;
          switch (aircraftDesc.toLowerCase()) {
            case 'landplane':
              return 'Landplane';
            case 'seaplane':
              return 'Seaplane';
            case 'amphibian':
              return 'Amphibian';
            case 'helicopter':
              return 'Helicopter';
            case 'gyrocopter':
              return 'Gyrocopter';
            case 'glider':
              return 'Glider';
            case 'poweredglider':
              return 'Powered Glider';
            case 'airship':
              return 'Airship';
            case 'balloon':
              return 'Balloon';
            case 'ultralight':
              return 'Ultralight';
            default:
              return aircraftDesc;
          }
        }
        // If no AircraftDescription, try to use Description field
        if (descData.Description) {
          return descData.Description;
        }
      }
      
      // If not JSON, return as is
      return description;
    } catch (error) {
      // If JSON parsing fails, return original description
      return description;
    }
  };
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [statsData, setStatsData] = useState<StatsData | null>(null);
  const [aircraftData, setAircraftData] = useState<AircraftData[]>([]);
  const [filteredData, setFilteredData] = useState<AircraftData[]>([]);
  const [filters, setFilters] = useState({
    manufacturer: '',
    model: '',
    typeDesignator: '',
    description: '',
    engineType: '',
    engineCount: '',
    wtc: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [scraperLoading, setScraperLoading] = useState(false);

  // Generate unique values for comboboxes
  const uniqueValues = useMemo(() => {
    if (!aircraftData.length) return {
      descriptions: [],
      engineTypes: [],
      engineCounts: [],
      wtcs: []
    };

    const descriptions = [...new Set(aircraftData.map(item => item.description).filter(Boolean))].sort();
    const engineTypes = [...new Set(aircraftData.map(item => item.engineType).filter(Boolean))].sort();
    const engineCounts = [...new Set(aircraftData.map(item => item.engineCount).filter(Boolean))].map(c => c.toString()).sort();
    const wtcs = [...new Set(aircraftData.map(item => item.wtc).filter(Boolean))].sort();

    return {
      descriptions: descriptions.map(d => ({ value: d || '', label: d || '' })),
      engineTypes: engineTypes.map(e => ({ value: e || '', label: e || '' })),
      engineCounts: engineCounts.map(c => ({ value: c, label: c })),
      wtcs: wtcs.map(w => ({ value: w || '', label: w || '' })),
    };
  }, [aircraftData]);

  // Compact combobox for table header
  const CompactCombobox = ({ 
    options, 
    value, 
    onValueChange, 
    placeholder 
  }: { 
    options: { value: string; label: string }[];
    value: string;
    onValueChange: (value: string) => void;
    placeholder: string;
  }) => {
    const [open, setOpen] = useState(false);
    const [searchValue, setSearchValue] = useState("");

    return (
      <Popover open={open} onOpenChange={(newOpen) => {
        setOpen(newOpen);
        if (!newOpen) {
          setSearchValue("");
        }
      }}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full h-8 justify-between text-xs"
            size="sm"
          >
            {value
              ? options.find((option) => option.value === value)?.label
              : placeholder}
            <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
          <Command shouldFilter={false}>
            <CommandInput 
              placeholder="Search..." 
              value={searchValue}
              onValueChange={setSearchValue}
              className="h-8 text-xs"
            />
            <CommandList>
              <CommandEmpty className="text-xs">No options found.</CommandEmpty>
              <CommandGroup>
                {options
                  .filter((option) => {
                    if (!searchValue) return true;
                    return option.label.toLowerCase().includes(searchValue.toLowerCase());
                  })
                  .map((option) => (
                    <CommandItem
                      key={option.value}
                      value={option.value}
                      onSelect={(currentValue: string) => {
                        onValueChange(currentValue === value ? "" : currentValue)
                        setOpen(false)
                      }}
                      className="text-xs"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-3 w-3",
                          value === option.value ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {option.label}
                    </CommandItem>
                  ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [aircraftData, filters]);

  const loadData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Load stats data
      const statsResponse = await fetch('/api/settings/import-icao', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (statsResponse.ok) {
        const stats = await statsResponse.json();
        setStatsData(stats.statsData);
        setImportSummary(stats.importSummary);
      }

      // Load aircraft data
      const dataResponse = await fetch('/api/settings/icao-aircraft-data', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (dataResponse.ok) {
        const data = await dataResponse.json();
        // Map engineCount to number, and fill missing fields if needed
        setAircraftData(data.map((item: any) => ({
          id: item.id,
          manufacturer: item.manufacturer,
          model: item.model,
          typeDesignator: item.typeDesignator,
          description: item.description ?? '',
          engineType: item.engineType,
          engineCount: typeof item.engineCount === 'number' ? item.engineCount : parseInt(item.engineCount) || 1,
          wtc: item.wtc,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        })));
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load ICAO data');
    }
  };

  const applyFilters = () => {
    let filtered = [...aircraftData];

    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        filtered = filtered.filter(item => {
          if (key === 'engineCount') {
            return item.engineCount.toString().toLowerCase().includes(value.toLowerCase());
          }
          return item[key as keyof AircraftData]?.toString().toLowerCase().includes(value.toLowerCase());
        });
      }
    });

    setFilteredData(filtered);
    setCurrentPage(1);
  };

  const handleImport = async () => {
    setIsImporting(true);
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/settings/import-icao', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setImportSummary(result.summary);
        if (result.success) {
          const summary = result.summary;
          toast.success('Database seeded successfully', {
            description: `Inserted: ${summary?.inserted ?? 0}, Updated: ${summary?.updated ?? 0}, Unchanged: ${summary?.unchanged ?? 0}`
          });
        } else {
          toast.error('Seeding failed', { description: result.error || 'Unknown error' });
        }
        await loadData(); // Reload data after import
      } else {
        const error = await response.json();
        toast.error(`Import failed: ${error.error}`);
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Import failed. Please try again.');
    } finally {
      setIsImporting(false);
    }
  };

  // Use a public env variable for the token
  // Make sure to set NEXT_PUBLIC_ICAO_SCRAPER_TOKEN in your .env file

  const handleRunScraper = async () => {
    setScraperLoading(true);
    try {
      toast.info('ICAO data is now managed directly through the database seeding. Use the "Seed Database" button to import or update ICAO aircraft data.', {
        description: 'The external scraper is no longer needed as the system now uses comprehensive ICAO data files.'
      });
    } catch (err: any) {
      toast.error('Failed to run scraper', { description: err.message });
    } finally {
      setScraperLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      manufacturer: '',
      model: '',
      typeDesignator: '',
      description: '',
      engineType: '',
      engineCount: '',
      wtc: ''
    });
  };

  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  // Reset to page 1 when itemsPerPage changes
  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage]);

  return (
    <div className="space-y-6">
      {/* Header with Import Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                ICAO Aircraft Database Import
              </CardTitle>
              <CardDescription>
                Import aircraft type designators from the ICAO database and manage reference data
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Button 
                onClick={handleImport} 
                disabled={isImporting}
                className="flex items-center gap-2"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Seeding...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Seed Database
                  </>
                )}
              </Button>
              <Button onClick={handleRunScraper} disabled={scraperLoading} variant="secondary">
                {scraperLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Info
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Update Dates */}
          {statsData && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg border">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Last Updated</p>
                  <p className="text-sm text-muted-foreground">{statsData.LastUpdated}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg border">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <RefreshCw className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Next Scheduled Update</p>
                  <p className="text-sm text-muted-foreground">{statsData.NextUpdate}</p>
                </div>
              </div>
            </div>
          )}

          {/* Import Summary */}
          {importSummary && (
            <Alert className="mb-0 w-full flex items-center gap-4">
              {importSummary.success ? (
                <CheckCircle className="h-5 w-5 text-success shrink-0" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <AlertTitle>Last Import Summary</AlertTitle>
                <AlertDescription>
                  {formatDate(importSummary.timestamp, dateFormat)} -
                  {importSummary.imported} aircraft imported successfully
                  {importSummary.errors > 0 && ` (${importSummary.errors} errors)`}
                </AlertDescription>
              </div>
              <Badge className={(importSummary.success ? 'bg-success-10 text-success border-success-20' : 'bg-destructive-10 text-destructive border-destructive-20') + ' ml-auto'}>
                {importSummary.success ? 'Success' : 'Failed'}
              </Badge>
            </Alert>
          )}

          {/* Progress Bar */}
          {isImporting && (
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Importing aircraft data...</span>
                <span className="text-muted-foreground">Please wait</span>
              </div>
              <Progress value={undefined} className="w-full" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Aircraft Data Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Plane className="h-5 w-5" />
                Aircraft Database
              </CardTitle>
              <CardDescription>
                Browse and filter ICAO aircraft data with inline search and filter controls ({filteredData.length} entries)
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="flex items-center gap-2"
                disabled={Object.values(filters).every(v => !v)}
              >
                <Filter className="h-4 w-4" />
                Clear All Filters
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Table with inline filters */}
          <div className="border border-border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <div className="space-y-2">
                      <div className="font-medium">Manufacturer</div>
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-3 w-3 text-muted-foreground" />
                        <Input
                          placeholder="Search..."
                          value={filters.manufacturer}
                          onChange={(e) => handleFilterChange('manufacturer', e.target.value)}
                          className="h-8 pl-6 text-xs"
                        />
                      </div>
                      {filters.manufacturer && (
                        <div className="text-xs text-muted-foreground">Searching</div>
                      )}
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="space-y-2">
                      <div className="font-medium">Model</div>
                      <Input
                        placeholder="Search..."
                        value={filters.model}
                        onChange={(e) => handleFilterChange('model', e.target.value)}
                        className="h-8 text-xs"
                      />
                      {filters.model && (
                        <div className="text-xs text-muted-foreground">Searching</div>
                      )}
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="space-y-2">
                      <div className="font-medium">ICAO Code</div>
                      <Input
                        placeholder="Search..."
                        value={filters.typeDesignator}
                        onChange={(e) => handleFilterChange('typeDesignator', e.target.value)}
                        className="h-8 text-xs"
                      />
                      {filters.typeDesignator && (
                        <div className="text-xs text-muted-foreground">Searching</div>
                      )}
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="space-y-2">
                      <div className="font-medium">Description</div>
                      <CompactCombobox
                        options={uniqueValues.descriptions}
                        value={filters.description}
                        onValueChange={(value) => handleFilterChange('description', value)}
                        placeholder="All descriptions..."
                      />
                      {filters.description && (
                        <div className="text-xs text-muted-foreground">Filtered</div>
                      )}
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="space-y-2">
                      <div className="font-medium">Engine Type</div>
                      <CompactCombobox
                        options={uniqueValues.engineTypes}
                        value={filters.engineType}
                        onValueChange={(value) => handleFilterChange('engineType', value)}
                        placeholder="All types..."
                      />
                      {filters.engineType && (
                        <div className="text-xs text-muted-foreground">Filtered</div>
                      )}
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="space-y-2">
                      <div className="font-medium">Engine Count</div>
                      <CompactCombobox
                        options={uniqueValues.engineCounts}
                        value={filters.engineCount}
                        onValueChange={(value) => handleFilterChange('engineCount', value)}
                        placeholder="All counts..."
                      />
                      {filters.engineCount && (
                        <div className="text-xs text-muted-foreground">Filtered</div>
                      )}
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="space-y-2">
                      <div className="font-medium">WTC</div>
                      <CompactCombobox
                        options={uniqueValues.wtcs}
                        value={filters.wtc}
                        onValueChange={(value) => handleFilterChange('wtc', value)}
                        placeholder="All WTCs..."
                      />
                      {filters.wtc && (
                        <div className="text-xs text-muted-foreground">Filtered</div>
                      )}
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.map((aircraft, index) => (
                  <TableRow key={aircraft.id}>
                    <TableCell className="font-medium max-w-[200px] truncate" title={aircraft.manufacturer}>
                      {aircraft.manufacturer}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate" title={aircraft.model}>
                      {aircraft.model}
                    </TableCell>
                    <TableCell className="font-mono">{aircraft.typeDesignator}</TableCell>
                    <TableCell className="max-w-[300px] truncate" title={aircraft.description}>
                      {formatAircraftDescription(aircraft.description)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {aircraft.engineType}
                      </Badge>
                    </TableCell>
                    <TableCell>{aircraft.engineCount}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {aircraft.wtc}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredData.length)} of {filteredData.length} entries
              </div>
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">Show:</span>
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={(value) => setItemsPerPage(parseInt(value))}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-muted-foreground">per page</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className="h-8 px-3"
                  >
                    Previous
                  </Button>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">Page</span>
                    <span className="text-sm font-medium">{currentPage}</span>
                    <span className="text-sm text-muted-foreground">of</span>
                    <span className="text-sm font-medium">{totalPages}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">Go to:</span>
                    <Input
                      type="number"
                      min={1}
                      max={totalPages}
                      value={currentPage}
                      onChange={(e) => {
                        const page = parseInt(e.target.value);
                        if (page >= 1 && page <= totalPages) {
                          setCurrentPage(page);
                        }
                      }}
                      className="w-16 h-8 text-center"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    className="h-8 px-3"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 