'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Loader2, ExternalLink } from 'lucide-react';

export default function TestSmartBillPage() {
  const [testResult, setTestResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testConnection = async () => {
    setLoading(true);
    setError(null);
    setTestResult(null);

    try {
      const response = await fetch('/api/smartbill/test');
      const data = await response.json();
      
      setTestResult(data);
      
      if (!response.ok) {
        setError(data.message || 'Test failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const testInvoices = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/smartbill/invoices');
      const data = await response.json();
      
      if (response.ok) {
        setTestResult({
          success: true,
          message: 'Invoices fetched successfully',
          data: data
        });
      } else {
        setError(data.error || 'Failed to fetch invoices');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">SmartBill Integration Test</h1>
        <p className="text-muted-foreground">
          Test your SmartBill API connection and verify the integration is working correctly.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5" />
              Connection Test
            </CardTitle>
            <CardDescription>
              Test the basic API connection and credentials
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={testConnection} 
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                'Test Connection'
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5" />
              Invoices Test
            </CardTitle>
            <CardDescription>
              Test fetching invoices from SmartBill
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={testInvoices} 
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                'Test Invoices'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {error && (
        <Alert className="mb-6 border-destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription className="text-destructive">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {testResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {testResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              Test Results
            </CardTitle>
            <CardDescription>
              {testResult.message}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Status:</span>
                <Badge variant={testResult.success ? "default" : "destructive"}>
                  {testResult.success ? "Success" : "Failed"}
                </Badge>
              </div>
              
              {testResult.credentials && (
                <div className="space-y-2">
                  <h4 className="font-medium">Credentials:</h4>
                  <div className="text-sm space-y-1">
                    <div>Username: {testResult.credentials.username}</div>
                    <div>Password: {testResult.credentials.password}</div>
                  </div>
                </div>
              )}
              
              {testResult.timestamp && (
                <div className="flex items-center justify-between">
                  <span className="font-medium">Timestamp:</span>
                  <span className="text-sm text-muted-foreground">
                    {new Date(testResult.timestamp).toLocaleString()}
                  </span>
                </div>
              )}
              
              {testResult.data && (
                <div className="space-y-2">
                  <h4 className="font-medium">Response Data:</h4>
                  <pre className="bg-muted p-3 rounded-md text-sm overflow-auto">
                    {JSON.stringify(testResult.data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Next Steps</CardTitle>
          <CardDescription>
            What to do after testing the integration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-2 w-2 bg-primary rounded-full mt-2"></div>
              <div>
                <h4 className="font-medium">If the test is successful:</h4>
                <p className="text-sm text-muted-foreground">
                  Navigate to your dashboard and go to the Accounting tab to view your SmartBill invoices.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="h-2 w-2 bg-primary rounded-full mt-2"></div>
              <div>
                <h4 className="font-medium">If the test fails:</h4>
                <p className="text-sm text-muted-foreground">
                  Check your environment variables and SmartBill credentials. Refer to the SMARTBILL_SETUP.md file for troubleshooting.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="h-2 w-2 bg-primary rounded-full mt-2"></div>
              <div>
                <h4 className="font-medium">Environment Variables:</h4>
                <p className="text-sm text-muted-foreground">
                  Make sure you have set SMARTBILL_USERNAME and SMARTBILL_PASSWORD in your .env.local file.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 