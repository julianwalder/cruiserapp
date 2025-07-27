'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Download, Upload, CheckCircle, AlertTriangle, Plane, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface ImportResult {
  success: boolean;
  message: string;
  summary?: {
    total: number;
    imported: number;
    errors: number;
    details?: string[];
  };
}

export default function FleetImportTab() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      setImportResult(null);
    } else {
      toast.error('Please select a valid CSV file');
      setFile(null);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/fleet/import', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'fleet-import-template.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Template downloaded successfully');
      } else {
        toast.error('Failed to download template');
      }
    } catch (error) {
      console.error('Error downloading template:', error);
      toast.error('Failed to download template');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file first');
      return;
    }

    setIsUploading(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/fleet/import', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const result: ImportResult = await response.json();

      if (response.ok && result.success) {
        setImportResult(result);
        toast.success('Fleet imported successfully', {
          description: `Imported ${result.summary?.imported} aircraft, ${result.summary?.errors} errors`
        });
        setFile(null);
        // Reset file input
        const fileInput = document.getElementById('fleet-file-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      } else {
        setImportResult(result);
        toast.error('Import failed', {
          description: result.message
        });
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plane className="h-5 w-5" />
            Fleet Import
          </CardTitle>
          <CardDescription>
            Import aircraft fleet data from a CSV file. Download the template to see the required format.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Template Download */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <h3 className="font-medium">Step 1: Download Template</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Download the CSV template to see the required format and column headers for importing aircraft data.
            </p>
            <Button onClick={handleDownloadTemplate} variant="outline" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Download Template
            </Button>
          </div>

          <Separator />

          {/* File Upload */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              <h3 className="font-medium">Step 2: Upload CSV File</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Select a CSV file with aircraft data to import into the system.
            </p>
            <div className="space-y-4">
              <div>
                <Label htmlFor="fleet-file-input">Select CSV File</Label>
                <Input
                  id="fleet-file-input"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="mt-1"
                />
              </div>
              {file && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </div>
              )}
              <Button 
                onClick={handleUpload} 
                disabled={!file || isUploading}
                className="flex items-center gap-2"
              >
                {isUploading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Import Fleet
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Import Results */}
          {importResult && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  {importResult.success ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  )}
                  <h3 className="font-medium">Import Results</h3>
                </div>
                
                <Alert variant={importResult.success ? "default" : "destructive"}>
                  <AlertDescription>{importResult.message}</AlertDescription>
                </Alert>

                {importResult.summary && (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{importResult.summary.total}</div>
                      <div className="text-sm text-muted-foreground">Total Records</div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{importResult.summary.imported}</div>
                      <div className="text-sm text-muted-foreground">Imported</div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-red-600">{importResult.summary.errors}</div>
                      <div className="text-sm text-muted-foreground">Errors</div>
                    </div>
                  </div>
                )}

                {importResult.summary?.details && importResult.summary.details.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Error Details:</h4>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {importResult.summary.details.map((detail, index) => (
                        <div key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                          {detail}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Instructions */}
          <Separator />
          <div className="space-y-4">
            <h3 className="font-medium">CSV Format Instructions</h3>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>The CSV file should contain the following columns:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>callSign</strong> - Aircraft registration/tail number (e.g., N12345)</li>
                <li><strong>serialNumber</strong> - Aircraft serial number (e.g., 123456)</li>
                <li><strong>yearOfManufacture</strong> - Year the aircraft was manufactured (e.g., 2020)</li>
                <li><strong>icaoTypeDesignator</strong> - ICAO type designator (e.g., C172, PA28, CRUZ)</li>
                <li><strong>model</strong> - Aircraft model name (e.g., 172 Skyhawk)</li>
                <li><strong>manufacturer</strong> - Aircraft manufacturer (e.g., Cessna)</li>
                <li><strong>status</strong> - Aircraft status (ACTIVE, INACTIVE, MAINTENANCE)</li>
                <li><strong>imagePath</strong> - Optional path to aircraft image (e.g., /uploads/aircraft.jpg)</li>
              </ul>
              <p className="mt-4">
                <strong>Note:</strong> The ICAO type designator must exist in the ICAO reference database. 
                Make sure to import ICAO data first if you haven't already.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 