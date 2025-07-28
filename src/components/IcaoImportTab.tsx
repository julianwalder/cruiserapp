'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plane, 
  Download, 
  Upload, 
  Plus, 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  Search, 
  Filter,
  X
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CompactCombobox } from './ui/compact-combobox';
import { useDateFormat } from '@/contexts/DateFormatContext';
import { formatDate, formatDateTimeWithCurrentFormat } from '@/lib/date-utils';
import { toast } from 'sonner';

// Aircraft creation schema
const createAircraftSchema = z.object({
  manufacturer: z.string().min(2, 'Manufacturer must be at least 2 characters'),
  model: z.string().min(2, 'Model must be at least 2 characters'),
  typeDesignator: z.string().min(3, 'ICAO type designator must be at least 3 characters').max(4, 'ICAO type designator must be at most 4 characters'),
  description: z.enum(['LANDPLANE', 'SEAPLANE', 'AMPHIBIAN', 'HELICOPTER', 'GYROCOPTER', 'GLIDER', 'POWERED_GLIDER', 'AIRSHIP', 'BALLOON', 'ULTRALIGHT']),
  engineType: z.enum(['PISTON', 'TURBOFAN', 'TURBOPROP', 'TURBOSHAFT', 'ELECTRIC', 'HYBRID']),
  engineCount: z.number().min(1, 'Engine count must be at least 1').max(10, 'Engine count must be at most 10'),
  wtc: z.enum(['LIGHT', 'MEDIUM', 'HEAVY', 'SUPER']),
});

type CreateAircraftForm = z.infer<typeof createAircraftSchema>;

const ENGINE_TYPES = [
  { value: 'PISTON', label: 'Piston' },
  { value: 'TURBOFAN', label: 'Turbofan' },
  { value: 'TURBOPROP', label: 'Turboprop' },
  { value: 'TURBOSHAFT', label: 'Turboshaft' },
  { value: 'ELECTRIC', label: 'Electric' },
  { value: 'HYBRID', label: 'Hybrid' },
];

const WTC_TYPES = [
  { value: 'LIGHT', label: 'Light' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HEAVY', label: 'Heavy' },
  { value: 'SUPER', label: 'Super' },
];

const DESCRIPTION_TYPES = [
  { value: 'LANDPLANE', label: 'Landplane' },
  { value: 'SEAPLANE', label: 'Seaplane' },
  { value: 'AMPHIBIAN', label: 'Amphibian' },
  { value: 'HELICOPTER', label: 'Helicopter' },
  { value: 'GYROCOPTER', label: 'Gyrocopter' },
  { value: 'GLIDER', label: 'Glider' },
  { value: 'POWERED_GLIDER', label: 'Powered Glider' },
  { value: 'AIRSHIP', label: 'Airship' },
  { value: 'BALLOON', label: 'Balloon' },
  { value: 'ULTRALIGHT', label: 'Ultralight' },
];

export default function IcaoImportTab() {
  const { dateFormat } = useDateFormat();
  const [aircraft, setAircraft] = useState<any[]>([]);

  // Function to format aircraft description from JSON
  const formatAircraftDescription = (description: string | undefined): string => {
    if (!description) return '-';
    
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
      
      // If it's a simple string (our new enum format), format it
      switch (description.toUpperCase()) {
        case 'LANDPLANE':
          return 'Landplane';
        case 'SEAPLANE':
          return 'Seaplane';
        case 'AMPHIBIAN':
          return 'Amphibian';
        case 'HELICOPTER':
          return 'Helicopter';
        case 'GYROCOPTER':
          return 'Gyrocopter';
        case 'GLIDER':
          return 'Glider';
        case 'POWERED_GLIDER':
          return 'Powered Glider';
        case 'AIRSHIP':
          return 'Airship';
        case 'BALLOON':
          return 'Balloon';
        case 'ULTRALIGHT':
          return 'Ultralight';
        default:
      return description;
      }
    } catch (error) {
      // If JSON parsing fails, return original description
      return description;
    }
  };
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [manufacturerFilter, setManufacturerFilter] = useState('');
  const [modelFilter, setModelFilter] = useState('');
  const [icaoFilter, setIcaoFilter] = useState('');
  const [engineTypeFilter, setEngineTypeFilter] = useState('');
  const [engineCountFilter, setEngineCountFilter] = useState('');
  const [wtcFilter, setWtcFilter] = useState('');
  const [importSummary, setImportSummary] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importProgress, setImportProgress] = useState<{
    current: number;
    total: number;
    percentage: number;
    status: string;
  } | null>(null);

  // Create aircraft state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createForm, setCreateForm] = useState({
    manufacturer: '',
    model: '',
    typeDesignator: '',
    description: 'LANDPLANE',
    engineType: 'PISTON',
    engineCount: 1,
    wtc: 'LIGHT',
  });

  const handleCreateFormChange = (field: string, value: any) => {
    setCreateForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateAircraftForm>({
    resolver: zodResolver(createAircraftSchema),
    defaultValues: {
      description: 'LANDPLANE',
      engineType: 'PISTON',
      engineCount: 1,
      wtc: 'LIGHT',
    },
  });

  // Fetch aircraft with pagination
  const fetchAircraft = async (page = pagination.page, limit = pagination.limit) => {
    setLoading(true);
    setError('');
    try {
      console.log('🔍 fetchAircraft - Starting fetch with page:', page, 'limit:', limit);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (search) params.append('search', search);
      if (manufacturerFilter) params.append('manufacturer', manufacturerFilter);
      if (modelFilter) params.append('model', modelFilter);
      if (icaoFilter) params.append('typeDesignator', icaoFilter);
      if (engineTypeFilter) params.append('engineType', engineTypeFilter);
      if (engineCountFilter) params.append('engineCount', engineCountFilter);
      if (wtcFilter) params.append('wtc', wtcFilter);
      
      const url = `/api/settings/icao-aircraft-data?${params}`;
      console.log('🔍 fetchAircraft - Fetching from URL:', url);
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      console.log('🔍 fetchAircraft - Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('🔍 fetchAircraft - Response error:', errorText);
        throw new Error(`Failed to fetch type designators: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      console.log('🔍 fetchAircraft - Received data:', data);
      
      setAircraft(data.aircraft || []);
      setPagination({
        page: data.pagination?.page || page,
        limit: data.pagination?.limit || limit,
        total: data.pagination?.total || (data.aircraft?.length || 0),
        pages: data.pagination?.pages || Math.ceil((data.pagination?.total || (data.aircraft?.length || 0)) / limit),
      });
    } catch (err: any) {
      console.error('🔍 fetchAircraft - Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAircraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, search, manufacturerFilter, modelFilter, icaoFilter, engineTypeFilter, engineCountFilter, wtcFilter]);

  // Add this effect to fetch aircraft when limit changes
  useEffect(() => {
    fetchAircraft(1, pagination.limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.limit]);

  // Fetch import summary on component mount
  useEffect(() => {
    const fetchImportSummary = async () => {
    try {
      const token = localStorage.getItem('token');
        const response = await fetch('/api/settings/import-icao', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (response.ok) {
          const summary = await response.json();
          console.log('Fetched import summary:', summary);
          if (summary.importSummary) {
            setImportSummary(summary.importSummary);
          }
        }
      } catch (error) {
        console.error('Failed to fetch import summary:', error);
      }
    };
    
    fetchImportSummary();
  }, []);

  // Download CSV template
  const handleDownloadTemplate = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/settings/icao-import', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to download template');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'icao_aircraft_import_template.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Template downloaded successfully!', {
        description: 'The CSV template has been downloaded to your device.',
        duration: 3000,
      });
    } catch (error) {
      toast.error('Failed to download template', {
        description: 'There was an error downloading the template file.',
        duration: 4000,
      });
    }
  };

  // Import aircraft from CSV
  const handleImportAircraft = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    (async () => {
      try {
        setImportLoading(true);
        setImportSummary(null);
        setImportProgress({ current: 0, total: 0, percentage: 0, status: 'Starting import...' });
        
        const token = localStorage.getItem('token');
        const formData = new FormData();
        formData.append('file', file);
        
        // First, get the total number of records to import
        const fileText = await file.text();
        const lines = fileText.split('\n').filter(line => line.trim());
        const totalRecords = Math.max(0, lines.length - 1); // Subtract header row
        
        setImportProgress({ current: 0, total: totalRecords, percentage: 0, status: 'Preparing import...' });
        
        // Start the import
        const response = await fetch('/api/settings/icao-import', {
          method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
          body: formData,
        });
        
        if (!response.ok) {
          const errorResult = await response.json();
          throw new Error(errorResult.error || 'Failed to import aircraft');
        }
        
        const result = await response.json();
        
        // Import completed
        const summary = {
          timestamp: new Date().toISOString(),
          imported: result.results?.success || 0,
          errors: result.results?.errors?.length || 0,
          success: (result.results?.success || 0) > 0,
          total: result.results?.total || 0,
          details: result.results?.details || [],
          errorDetails: result.results?.errors || []
        };
        setImportSummary(summary);
        setImportProgress(null);
        
        // Show success/error messages
        if (result.results?.success > 0) {
          toast.success('Type designators imported successfully!', {
            description: `${result.results.success} type designators were imported. ${result.results.errors?.length > 0 ? `${result.results.errors.length} errors occurred.` : ''}`,
            duration: 4000,
          });
          // Refresh aircraft list
          fetchAircraft();
        } else if (result.results?.errors?.length > 0) {
          toast.warning('Import completed with errors', {
            description: `No type designators were imported. ${result.results.errors.length} errors occurred.`,
            duration: 4000,
          });
        }
      } catch (error: any) {
        setError(error.message);
        setImportProgress(null);
        toast.error('Import failed', {
          description: error.message,
          duration: 4000,
        });
      } finally {
        setImportLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    })();
  };

  const handleAddAircraft = () => {
    setShowCreateDialog(true);
  };

  const handleCreateAircraft = async () => {
    try {
      setCreateLoading(true);
      
      // Basic client-side validation
      if (!createForm.manufacturer.trim() || !createForm.model.trim() || !createForm.typeDesignator.trim()) {
        throw new Error('Please fill in all required fields (Manufacturer, Model, and ICAO Type Designator)');
      }
      
      // Validate the form data using the Zod schema
      const validationResult = createAircraftSchema.safeParse(createForm);
      
      if (!validationResult.success) {
        const errors = validationResult.error.issues.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
        throw new Error(`Validation error: ${errors}`);
      }
      
      const token = localStorage.getItem('token');
      
      const aircraftData = validationResult.data; // Use validated data
      
      console.log('Sending aircraft data:', aircraftData);
      
      const response = await fetch('/api/settings/icao-aircraft-data', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(aircraftData),
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const result = await response.json();
        console.error('API Error Response:', result);
        throw new Error(result.error || 'Failed to create aircraft');
      }

      const result = await response.json();
      console.log('Success response:', result);

      // Reset form and close dialog
      setCreateForm({
        manufacturer: '',
        model: '',
        typeDesignator: '',
        description: 'LANDPLANE',
        engineType: 'PISTON',
        engineCount: 1,
        wtc: 'LIGHT',
      });
      setShowCreateDialog(false);
      
      // Refresh aircraft list
      fetchAircraft();
      
      // Clear any errors
      setError('');
      
      // Show success toast
      toast.success('Type designator created successfully!', {
        description: `${aircraftData.manufacturer} ${aircraftData.model} (${aircraftData.typeDesignator}) has been added to the database.`,
        duration: 3000,
      });
    } catch (err: any) {
      console.error('Create aircraft error:', err);
      setError(err.message);
      toast.error('Failed to create type designator', {
        description: err.message,
        duration: 4000,
      });
    } finally {
      setCreateLoading(false);
    }
  };

  // Function to refresh import summary
  const refreshImportSummary = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/settings/import-icao', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const summary = await response.json();
        console.log('Refreshed import summary:', summary);
        setImportSummary(summary.importSummary);
      }
    } catch (error) {
      console.error('Failed to refresh import summary:', error);
    }
  };

  // Badge color logic
  const getEngineTypeBadgeColor = (engineType: string) => {
    switch (engineType) {
      case 'TURBOFAN':
        return 'bg-blue-10 text-blue border-blue-20';
      case 'TURBOPROP':
        return 'bg-green-10 text-green border-green-20';
      case 'TURBOSHAFT':
        return 'bg-purple-10 text-purple border-purple-20';
      case 'ELECTRIC':
        return 'bg-yellow-10 text-yellow border-yellow-20';
      case 'HYBRID':
        return 'bg-orange-10 text-orange border-orange-20';
      default:
        return 'bg-gray-10 text-gray border-gray-20';
    }
  };

  const getWtcBadgeColor = (wtc: string) => {
    switch (wtc) {
      case 'LIGHT':
        return 'bg-green-10 text-green border-green-20';
      case 'MEDIUM':
        return 'bg-yellow-10 text-yellow border-yellow-20';
      case 'HEAVY':
        return 'bg-orange-10 text-orange border-orange-20';
      case 'SUPER':
        return 'bg-red-10 text-red border-red-20';
      default:
        return 'bg-gray-10 text-gray border-gray-20';
    }
  };

  const manufacturerOptions = useMemo(() => {
    const manufacturers = [...new Set(aircraft.map(a => a.manufacturer))].sort();
    return [
      { value: '', label: 'All manufacturers' },
      ...manufacturers.map(m => ({ value: m, label: m })),
    ];
  }, [aircraft]);

  const engineTypeOptions = useMemo(() => {
    return [
      { value: '', label: 'All engine types' },
      ...ENGINE_TYPES,
    ];
  }, []);

  const wtcOptions = useMemo(() => {
    return [
      { value: '', label: 'All WTCs' },
      ...WTC_TYPES,
    ];
  }, []);

  return (
    <div className="space-y-6 w-full">
      <input
        type="file"
        accept=".csv"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleImportAircraft}
        disabled={importLoading}
      />
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Plane className="h-5 w-5" />
                ICAO Type Designators Import
              </CardTitle>
              <CardDescription>
                Import ICAO type designators in bulk, download a template, or add a type designator manually. Only accessible to superadmins.
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" onClick={handleDownloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
              <Button 
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={importLoading}
              >
                <Upload className="h-4 w-4 mr-2" />
                {importLoading ? 'Importing...' : 'Import Type Designators'}
              </Button>
              <Button onClick={handleAddAircraft}>
                <Plus className="h-4 w-4 mr-2" />
                Add Type Designator
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-6 w-full">
          {/* Import Progress Indicator */}
          {importProgress && (
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <span className="font-medium text-sm">Importing Type Designators</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {importProgress.current} / {importProgress.total} ({importProgress.percentage}%)
                </span>
                </div>
              <Progress value={importProgress.percentage} className="h-2" />
              <p className="text-xs text-muted-foreground">{importProgress.status}</p>
            </div>
          )}

          {/* Last Import Summary */}
            <Alert className="mb-0 w-full flex items-center gap-4">
            {importSummary ? (
              <>
              {importSummary.success ? (
                <CheckCircle className="h-5 w-5 text-success shrink-0" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <AlertTitle>Last Import Summary</AlertTitle>
                <AlertDescription>
                    {formatDateTimeWithCurrentFormat(importSummary.timestamp)} -{' '}
                    {importSummary.imported} type designators imported successfully
                  {importSummary.errors > 0 && ` (${importSummary.errors} errors)`}
                    {importSummary.total > 0 && ` from ${importSummary.total} total records`}
                </AlertDescription>
              </div>
                <div className="flex items-center gap-2 ml-auto">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={refreshImportSummary}
                    className="h-6 w-6 p-0"
                  >
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                  <Badge className={(importSummary.success ? 'bg-success-10 text-success border-success-20' : 'bg-destructive-10 text-destructive border-destructive-20')}>
                {importSummary.success ? 'Success' : 'Failed'}
              </Badge>
              </div>
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <AlertTitle>Last Import Summary</AlertTitle>
                  <AlertDescription>
                    No import has been performed yet. Use the "Import Aircraft" button to start importing aircraft from a CSV file.
                  </AlertDescription>
            </div>
                <div className="flex items-center gap-2 ml-auto">
              <Button
                    variant="ghost"
                size="sm"
                    onClick={refreshImportSummary}
                    className="h-6 w-6 p-0"
              >
                    <RefreshCw className="h-3 w-3" />
              </Button>
                  <Badge className="bg-muted text-muted-foreground border-gray-200 dark:border-gray-700">
                    No Data
                  </Badge>
            </div>
              </>
            )}
          </Alert>
          
          {/* Show detailed import errors if any */}
          {importSummary && importSummary.errors > 0 && (
            <div className="bg-destructive/10 border border-destructive rounded p-4 mb-4 max-h-64 overflow-y-auto">
              <div className="font-semibold mb-2 text-destructive">Import Errors ({importSummary.errors}):</div>
              {importSummary.errorDetails && Array.isArray(importSummary.errorDetails) && importSummary.errorDetails.length > 0 ? (
                <ul className="list-disc pl-5 text-sm text-destructive">
                  {importSummary.errorDetails.map((error: string, idx: number) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-destructive">Error details not available</p>
              )}
          </div>
          )}
          
          {error && (
            <Alert variant="destructive" className="mb-4 w-full">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {/* Table with inline filters */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="py-4 w-48">
                    <div className="space-y-3">
                      <div className="font-medium">Manufacturer</div>
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-3 w-3 text-muted-foreground" />
                        <Input
                          placeholder="Search..."
                          value={search}
                          onChange={(e) => { setSearch(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                          className="h-8 pl-6 text-xs"
                        />
                      </div>
                    </div>
                  </TableHead>
                  <TableHead className="py-4 w-40">
                    <div className="space-y-3">
                      <div className="font-medium">Model</div>
                      <Input
                        placeholder="Search..."
                        value={modelFilter}
                        onChange={(e) => { setModelFilter(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                        className="h-8 text-xs"
                      />
                    </div>
                  </TableHead>
                  <TableHead className="py-4 w-32">
                    <div className="space-y-3">
                      <div className="font-medium">ICAO Code</div>
                      <Input
                        placeholder="Search..."
                        value={icaoFilter}
                        onChange={(e) => { setIcaoFilter(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                        className="h-8 text-xs"
                      />
                    </div>
                  </TableHead>
                  <TableHead className="py-4 w-40">
                    <div className="space-y-3">
                      <div className="font-medium">Description</div>
                      <Input
                        placeholder="Search..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                        className="h-8 text-xs"
                      />
                    </div>
                  </TableHead>
                  <TableHead className="py-4 w-36">
                    <div className="space-y-3">
                      <div className="font-medium">Engine Type</div>
                      <CompactCombobox
                        options={engineTypeOptions}
                        value={engineTypeFilter}
                        onValueChange={(value) => { setEngineTypeFilter(value); setPagination(p => ({ ...p, page: 1 })); }}
                        placeholder="All types..."
                      />
                    </div>
                  </TableHead>
                  <TableHead className="py-4 w-32">
                    <div className="space-y-3">
                      <div className="font-medium">Engine Count</div>
                      <CompactCombobox
                        options={[
                          { value: '', label: 'All counts' },
                          { value: '1', label: '1' },
                          { value: '2', label: '2' },
                          { value: '3', label: '3' },
                          { value: '4', label: '4' },
                        ]}
                        value={engineCountFilter}
                        onValueChange={(value) => { setEngineCountFilter(value); setPagination(p => ({ ...p, page: 1 })); }}
                        placeholder="All counts..."
                      />
                    </div>
                  </TableHead>
                  <TableHead className="py-4 w-24">
                    <div className="space-y-3">
                      <div className="font-medium">WTC</div>
                      <CompactCombobox
                        options={wtcOptions}
                        value={wtcFilter}
                        onValueChange={(value) => { setWtcFilter(value); setPagination(p => ({ ...p, page: 1 })); }}
                        placeholder="All WTCs..."
                      />
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="flex items-center justify-center space-x-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        <span>Loading type designators...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : aircraft.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="flex flex-col items-center space-y-2">
                        <Plane className="h-8 w-8 text-muted-foreground" />
                        <span className="text-muted-foreground">No type designators found</span>
                        {search || manufacturerFilter || modelFilter || icaoFilter || engineTypeFilter || engineCountFilter || wtcFilter ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSearch('');
                              setManufacturerFilter('');
                              setModelFilter('');
                              setIcaoFilter('');
                              setEngineTypeFilter('');
                              setEngineCountFilter('');
                              setWtcFilter('');
                            }}
                          >
                            Clear filters
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  aircraft.map((aircraft, idx) => (
                    <TableRow key={aircraft.id || idx}>
                      <TableCell className="w-48">{aircraft.manufacturer}</TableCell>
                      <TableCell className="w-40">{aircraft.model}</TableCell>
                      <TableCell className="w-32">{aircraft.typeDesignator}</TableCell>
                      <TableCell className="w-40">{formatAircraftDescription(aircraft.description)}</TableCell>
                      <TableCell className="w-36">{aircraft.engineType}</TableCell>
                      <TableCell className="w-32">{aircraft.engineCount}</TableCell>
                      <TableCell className="w-24">{aircraft.wtc}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-muted-foreground">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} type designators
              </div>
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">Show:</span>
                  <Select
                    value={pagination.limit.toString()}
                    onValueChange={(value) => {
                      setPagination(prev => ({
                        ...prev,
                        limit: parseInt(value),
                        page: 1 // Reset to first page when changing limit
                      }));
                    }}
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
                    disabled={pagination.page === 1 || loading}
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    className="h-8 px-3"
                  >
                    {loading ? 'Loading...' : 'Previous'}
                  </Button>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">Page</span>
                    <span className="text-sm font-medium">{pagination.page}</span>
                    <span className="text-sm text-muted-foreground">of</span>
                    <span className="text-sm font-medium">{pagination.pages}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">Go to:</span>
                    <Input
                      type="number"
                      min={1}
                      max={pagination.pages}
                      value={pagination.page}
                      onChange={(e) => {
                        const page = parseInt(e.target.value);
                        if (page >= 1 && page <= pagination.pages) {
                          setPagination(prev => ({ ...prev, page }));
                        }
                      }}
                      className="w-16 h-8 text-center"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page === pagination.pages || loading}
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    className="h-8 px-3"
                  >
                    {loading ? 'Loading...' : 'Next'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Aircraft Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => {
        setShowCreateDialog(open);
        if (!open) {
          setCreateForm({
            manufacturer: '',
            model: '',
            typeDesignator: '',
            description: 'LANDPLANE',
            engineType: 'PISTON',
            engineCount: 1,
            wtc: 'LIGHT',
          });
          setError('');
        }
      }}>
        <DialogContent className="!max-w-[90vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-6">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl">Create New ICAO Type Designator</DialogTitle>
                <DialogDescription className="text-base">
                  Add a new ICAO type designator to the reference database
                </DialogDescription>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateAircraft} disabled={createLoading}>
                  {createLoading ? 'Creating...' : 'Create Type Designator'}
                </Button>
              </div>
            </div>
          </DialogHeader>
          
          <div className="space-y-8">
            {/* Basic Information */}
            <div className="bg-muted rounded-lg p-6">
              <h3 className="text-xl font-semibold text-card-foreground mb-6 flex items-center">
                <Plane className="h-5 w-5 mr-2" />
                Type Designator Information
              </h3>
              
              {/* First Row - Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Manufacturer *</Label>
                    <Input
                      value={createForm.manufacturer}
                      onChange={(e) => handleCreateFormChange('manufacturer', e.target.value)}
                      placeholder="e.g., Boeing, Airbus, Cessna"
                      className="bg-background border-input h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Description *</Label>
                    <Select value={createForm.description} onValueChange={(value) => handleCreateFormChange('description', value)}>
                      <SelectTrigger className="bg-background border-input h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DESCRIPTION_TYPES.map((desc) => (
                          <SelectItem key={desc.value} value={desc.value}>{desc.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Model *</Label>
                    <Input
                      value={createForm.model}
                      onChange={(e) => handleCreateFormChange('model', e.target.value)}
                      placeholder="e.g., 737, A320, 172"
                      className="bg-background border-input h-10"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Engine Type *</Label>
                      <Select value={createForm.engineType} onValueChange={(value) => handleCreateFormChange('engineType', value)}>
                        <SelectTrigger className="bg-background border-input h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ENGINE_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Engine Count *</Label>
                      <Input
                        value={createForm.engineCount}
                        onChange={(e) => handleCreateFormChange('engineCount', parseInt(e.target.value) || 1)}
                        type="number"
                        min="1"
                        max="10"
                        placeholder="1"
                        className="bg-background border-input h-10"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">ICAO Type Designator *</Label>
                    <Input
                      value={createForm.typeDesignator}
                      onChange={(e) => handleCreateFormChange('typeDesignator', e.target.value.toUpperCase())}
                      placeholder="e.g., B738, A320, C172"
                      maxLength={4}
                      className="bg-background border-input font-mono h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Wake Turbulence Category *</Label>
                    <Select value={createForm.wtc} onValueChange={(value) => handleCreateFormChange('wtc', value)}>
                      <SelectTrigger className="bg-background border-input h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {WTC_TYPES.map((wtc) => (
                          <SelectItem key={wtc.value} value={wtc.value}>{wtc.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 