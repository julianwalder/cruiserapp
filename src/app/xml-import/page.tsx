'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  FileText, 
  AlertCircle, 
  CheckCircle,
  Info
} from 'lucide-react';
import XMLInvoiceImport from '@/components/XMLInvoiceImport';
import ImportedXMLInvoices from '@/components/ImportedXMLInvoices';
import type { XMLInvoice } from '@/lib/xml-invoice-parser';

export default function XMLImportPage() {
  const [importedCount, setImportedCount] = useState(0);

  const handleImportSuccess = (invoice: XMLInvoice) => {
    setImportedCount(prev => prev + 1);
  };

  const handleRefresh = () => {
    // This will trigger a refresh of the imported invoices list
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">XML Invoice Import</h1>
        <p className="text-muted-foreground">
          Import SmartBill XML invoices manually until the API integration is working
        </p>
      </div>

      {/* Info Alert */}
      <Alert className="mb-6 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <AlertDescription className="text-blue-800 dark:text-blue-200">
          This feature allows you to import SmartBill XML invoices manually. Once your SmartBill API account is activated, 
          you can switch to the automatic API integration.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="import" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="import" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Import Invoices
            {importedCount > 0 && (
              <Badge variant="secondary" className="ml-1">
                {importedCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="view" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            View Imported
          </TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="space-y-6">
          <XMLInvoiceImport onImportSuccess={handleImportSuccess} />
          
          {/* Features Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Import Features
              </CardTitle>
              <CardDescription>
                What you can do with the XML import feature
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Import Methods</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      File upload (.xml files)
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Direct XML content paste
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Sample XML for testing
                    </li>
                  </ul>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-medium">Validation & Preview</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      XML structure validation
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Invoice preview before import
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Duplicate detection
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="view" className="space-y-6">
          <ImportedXMLInvoices onRefresh={handleRefresh} />
          
          {/* Export Features Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Export & Management
              </CardTitle>
              <CardDescription>
                Features available for imported invoices
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Search & Filter</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Search by invoice number, client, or items
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Date range filtering
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Status-based filtering
                    </li>
                  </ul>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-medium">Export Options</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      CSV export with all invoice data
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Individual invoice download
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Total calculations and summaries
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Next Steps Card */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Next Steps</CardTitle>
          <CardDescription>
            What to do after setting up XML import
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-2 w-2 bg-primary rounded-full mt-2"></div>
              <div>
                <h4 className="font-medium">Test the import:</h4>
                <p className="text-sm text-muted-foreground">
                  Use the "Load Sample XML" button to test the import functionality with sample data.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="h-2 w-2 bg-primary rounded-full mt-2"></div>
              <div>
                <h4 className="font-medium">Import your invoices:</h4>
                <p className="text-sm text-muted-foreground">
                  Export XML invoices from SmartBill and import them using this tool.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="h-2 w-2 bg-primary rounded-full mt-2"></div>
              <div>
                <h4 className="font-medium">Activate SmartBill API:</h4>
                <p className="text-sm text-muted-foreground">
                  Contact SmartBill support to reactivate your company account in Cloud.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="h-2 w-2 bg-primary rounded-full mt-2"></div>
              <div>
                <h4 className="font-medium">Switch to API integration:</h4>
                <p className="text-sm text-muted-foreground">
                  Once your account is active, switch to the automatic API integration for real-time data.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 