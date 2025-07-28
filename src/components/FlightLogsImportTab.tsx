'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Download, 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  Clock,
  Plane,
  Calendar,
  User,
  MapPin,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDateTimeWithCurrentFormat } from '@/lib/date-utils';

interface ImportResults {
  message: string;
  results: {
    success: number;
    errors: string[];
    skipped: number; // Add skipped count
    total: number;
    details: Array<{
      row: number;
      status: 'success' | 'error' | 'skipped';
      message: string;
      date?: string;
      pilot?: string;
      aircraft?: string;
      departure?: string;
      arrival?: string;
    }>;
  };
}

export default function FlightLogsImportTab() {
  const [importLoading, setImportLoading] = useState(false);
  const [importResults, setImportResults] = useState<ImportResults | null>(null);
  const [importProgress, setImportProgress] = useState<{
    current: number;
    total: number;
    percentage: number;
    status: string;
  } | null>(null);
  const [lastImportSummary, setLastImportSummary] = useState<{
    date: string;
    totalImported: number;
    totalErrors: number;
    lastImportDate: string;
    total: number;
    totalSkipped: number; // Add totalSkipped to the interface
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch last import summary on mount
  useEffect(() => {
    fetchImportSummary();
  }, []);

  const fetchImportSummary = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/flight-logs/import-summary', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setLastImportSummary(data);
      }
    } catch (error) {
      console.error('Error fetching import summary:', error);
    }
  };

  // Download CSV template
  const handleDownloadTemplate = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/flight-logs/import', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to download template');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'flight_logs_import_template.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Template downloaded successfully!', {
        description: 'The CSV template has been downloaded to your device.',
        duration: 3000,
      });
    } catch (error) {
      console.error('Error downloading template:', error);
      toast.error('Failed to download template', {
        description: 'There was an error downloading the template file.',
        duration: 4000,
      });
    }
  };

  // Import flight logs from CSV
  const handleImportFlightLogs = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setImportLoading(true);
      setImportResults(null);
      setImportProgress(null);
      
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/flight-logs/import', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Import failed');
      }

      // Check if we have an import ID for progress tracking
      if (result.importId) {
        // Start polling for progress
        const pollProgress = async () => {
          try {
            const progressResponse = await fetch(`/api/flight-logs/import-progress/${result.importId}`, {
              headers: { 'Authorization': `Bearer ${token}` },
            });
            
            if (progressResponse.ok) {
              const progressData = await progressResponse.json();
              setImportProgress(progressData);
              
              if (!progressData.completed) {
                // Continue polling
                setTimeout(pollProgress, 1000);
              } else {
                // Import completed
                setImportResults(progressData.results);
                setImportProgress(null);
                setImportLoading(false);
                
                // Update import summary
                await fetchImportSummary();
                
                // Show success message
                if (progressData.results && progressData.results.success > 0) {
                  toast.success(`Successfully imported ${progressData.results.success} flight logs`, {
                    description: progressData.results.errors && progressData.results.errors.length > 0 
                      ? `${progressData.results.errors.length} errors occurred` 
                      : 'All flight logs imported successfully',
                    duration: 5000,
                  });
                } else {
                  toast.error('Import failed', {
                    description: progressData.results && progressData.results.errors ? `${progressData.results.errors.length} errors occurred` : 'Unknown error occurred',
                    duration: 5000,
                  });
                }
              }
            }
          } catch (error) {
            console.error('Error polling progress:', error);
            setImportProgress(null);
            setImportLoading(false);
          }
        };
        
        pollProgress();
      } else {
        // Direct response without progress tracking
        setImportResults(result);
        setImportLoading(false);
        
        // Update import summary
        await fetchImportSummary();
        
        if (result.results && result.results.success > 0) {
          toast.success(`Successfully imported ${result.results.success} flight logs`, {
            description: result.results.errors && result.results.errors.length > 0 
              ? `${result.results.errors.length} errors occurred` 
              : 'All flight logs imported successfully',
            duration: 5000,
          });
        } else {
          toast.error('Import failed', {
            description: result.results && result.results.errors ? `${result.results.errors.length} errors occurred` : 'Unknown error occurred',
            duration: 5000,
          });
        }
      }

    } catch (error: any) {
      console.error('Error importing flight logs:', error);
      setImportLoading(false);
      setImportProgress(null);
      toast.error('Import failed', {
        description: error.message || 'An unexpected error occurred',
        duration: 5000,
      });
    } finally {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const refreshImportSummary = async () => {
    await fetchImportSummary();
    toast.success('Import summary refreshed');
  };

  return (
    <div className="space-y-6">
      {/* Import Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Plane className="h-5 w-5" />
                <span>Flight Logs Import</span>
              </CardTitle>
              <CardDescription>
                Import flight logs from a CSV file. Download the template first to see the required format.
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                onClick={handleDownloadTemplate}
                disabled={importLoading}
                variant="outline"
              >
                <Download className="h-4 w-4 mr-2" />
                <span>Download Template</span>
              </Button>
              
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={importLoading}
                variant="outline"
              >
                <Upload className="h-4 w-4 mr-2" />
                <span>{importLoading ? 'Importing...' : 'Import Flight Logs'}</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleImportFlightLogs}
            className="hidden"
          />

          {/* Progress Indicator */}
          {importProgress && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Importing flight logs...</span>
                <span>{importProgress.current || 0} / {importProgress.total || 0} ({importProgress.percentage || 0}%)</span>
              </div>
              <Progress value={importProgress.percentage || 0} className="w-full" />
              <p className="text-xs text-muted-foreground">{importProgress.status || 'Processing...'}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Last Import Summary */}
      {lastImportSummary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>Last Import Summary</span>
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={refreshImportSummary}
                className="flex items-center space-x-2"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Refresh</span>
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{lastImportSummary.totalImported || 0}</div>
                <div className="text-sm text-muted-foreground">Successfully Imported</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{lastImportSummary.totalSkipped || 0}</div>
                <div className="text-sm text-muted-foreground">Skipped Duplicates</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{lastImportSummary.totalErrors || 0}</div>
                <div className="text-sm text-muted-foreground">Errors</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{lastImportSummary.total || 0}</div>
                <div className="text-sm text-muted-foreground">Total Records</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium">{lastImportSummary.lastImportDate ? formatDateTimeWithCurrentFormat(lastImportSummary.lastImportDate) : 'Never'}</div>
                <div className="text-sm text-muted-foreground">Last Import</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import Results */}
      {importResults && importResults.results && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Import Results</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {importResults.message}
              </AlertDescription>
            </Alert>
            
            {importResults.results.success > 0 && (
              <div className="bg-muted rounded-lg p-4">
                <h4 className="font-medium mb-2">Successfully Imported ({importResults.results.success})</h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {importResults.results.details
                    .filter((detail) => detail.status === 'success')
                    .slice(0, 10) // Show only first 10 successful imports
                    .map((detail, index) => (
                      <div key={index} className="text-sm text-muted-foreground flex items-center space-x-2">
                        <CheckCircle className="h-3 w-3 text-green-600" />
                        <span>Row {detail.row}: {detail.date} | {detail.pilot} | {detail.aircraft} | {detail.departure} → {detail.arrival}</span>
                      </div>
                    ))}
                  {importResults.results.details.filter((detail) => detail.status === 'success').length > 10 && (
                    <div className="text-sm text-muted-foreground">
                      ... and {importResults.results.details.filter((detail) => detail.status === 'success').length - 10} more
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {importResults.results.skipped > 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">Skipped Duplicates ({importResults.results.skipped})</h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {importResults.results.details
                    .filter((detail) => detail.status === 'skipped')
                    .slice(0, 10) // Show only first 10 skipped records
                    .map((detail, index) => (
                      <div key={index} className="text-sm text-yellow-700 dark:text-yellow-300 flex items-center space-x-2">
                        <AlertTriangle className="h-3 w-3" />
                        <span>Row {detail.row}: {detail.date} | {detail.pilot} | {detail.aircraft} | {detail.departure} → {detail.arrival}</span>
                      </div>
                    ))}
                  {importResults.results.details.filter((detail) => detail.status === 'skipped').length > 10 && (
                    <div className="text-sm text-yellow-700 dark:text-yellow-300">
                      ... and {importResults.results.details.filter((detail) => detail.status === 'skipped').length - 10} more
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {importResults.results.errors && importResults.results.errors.length > 0 && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                <h4 className="font-medium text-destructive mb-2">Errors ({importResults.results.errors.length})</h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {importResults.results.errors.slice(0, 10).map((error, index) => (
                    <div key={index} className="text-sm text-destructive flex items-center space-x-2">
                      <AlertTriangle className="h-3 w-3" />
                      <span>{error}</span>
                    </div>
                  ))}
                  {importResults.results.errors.length > 10 && (
                    <div className="text-sm text-destructive">
                      ... and {importResults.results.errors.length - 10} more errors
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Important Notes</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Required Fields:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Date (YYYY-MM-DD format)</li>
                  <li>• Pilot ID or Email</li>
                  <li>• Aircraft ID or Call Sign</li>
                  <li>• Departure Airfield ID or Code</li>
                  <li>• Arrival Airfield ID or Code</li>
                  <li>• Departure Time (HH:MM UTC)</li>
                  <li>• Arrival Time (HH:MM UTC)</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Optional Fields:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Instructor ID or Email</li>
                  <li>• Flight Type (INVOICED, SCHOOL, FERRY, CHARTER, DEMO, PROMO)</li>
                  <li>• Purpose</li>
                  <li>• Remarks</li>
                  <li>• Day/Night Landings</li>
                  <li>• Route and Conditions</li>
                  <li>• Oil and Fuel Added</li>
                  <li className="font-medium text-green-600">• Time fields (PIC, SIC, Dual, Solo, etc.) are calculated automatically</li>
                </ul>
              </div>
            </div>
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Only Super Admins can import flight logs</li>
                <li>• Date format must be YYYY-MM-DD</li>
                <li>• Time format must be HH:MM (24-hour)</li>
                <li>• All times should be in UTC</li>
                <li>• Pilot and Aircraft must exist in the system</li>
                <li className="font-medium text-blue-600">• Airfields not in the database will be automatically created as "Historical Airfield" records</li>
                <li className="font-medium text-blue-600">• Historical airfields are marked as INACTIVE and can be updated later</li>
                <li className="font-medium text-green-600">• Duplicate flight logs are automatically detected and skipped</li>
                <li className="font-medium text-green-600">• No need to delete previous imports - duplicates are handled automatically</li>
              </ul>
            </div>
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <h4 className="font-medium text-sm mb-2">Automatic Time Calculations:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <strong>Dual Received:</strong> Full flight time when instructor is present</li>
                <li>• <strong>Solo:</strong> Full flight time when no instructor is present</li>
                <li>• <strong>PIC Time:</strong> Full flight time when no instructor (instructor is PIC when present)</li>
                <li>• <strong>Cross Country:</strong> Full flight time when departure ≠ arrival airfield</li>
                <li>• <strong>Total Hours:</strong> Calculated from departure to arrival time</li>
                <li>• <strong>Other times:</strong> Set to 0 (can be edited manually after import)</li>
              </ul>
              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-md">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>💡 Historical Data Support:</strong> You can now import flight logs with airfields that don't exist in your current database. 
                  The system will automatically create "Historical Airfield" records for these airfields, allowing you to import past flight logs 
                  even if the airfields have been closed, renamed, or are not in your current airfield database.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 