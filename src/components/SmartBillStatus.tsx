'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  Wifi,
  WifiOff,
  Database,
  Cloud,
  Clock,
  Settings,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SmartBillStatus {
  connected: boolean;
  accountStatus: 'active' | 'suspended' | 'inactive' | 'unknown';
  errorMessage?: string;
  lastChecked: string;
  apiVersion?: string;
}

interface SmartBillStatusResponse {
  success: boolean;
  status: SmartBillStatus;
  diagnostics?: any;
  recommendations: string[];
  credentials: {
    username: string;
    password: string;
    cif: string;
  };
  timestamp: string;
  apiInfo: {
    baseUrl: string;
    timeout: number;
    retries: number;
  };
}

export default function SmartBillStatus() {
  const [status, setStatus] = useState<SmartBillStatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/smartbill/status');
      const data = await response.json();
      
      if (response.ok) {
        setStatus(data);
      } else {
        setError(data.message || 'Failed to fetch status');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const getStatusIcon = (status: SmartBillStatus) => {
    if (status.connected) {
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    }
    
    switch (status.accountStatus) {
      case 'suspended':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'inactive':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      default:
        return <WifiOff className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: SmartBillStatus) => {
    if (status.connected) {
      return <Badge variant="default" className="bg-green-600">Connected</Badge>;
    }
    
    switch (status.accountStatus) {
      case 'suspended':
        return <Badge variant="destructive">Suspended</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inactive</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  if (!status && !loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            SmartBill Integration Status
          </CardTitle>
          <CardDescription>
            Check the status of your SmartBill API connection
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Unable to load status information
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            SmartBill Integration Status
          </div>
          <Button
            onClick={fetchStatus}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
            Refresh
          </Button>
        </CardTitle>
        <CardDescription>
          Real-time status of your SmartBill API connection and account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading && (
          <div className="flex items-center justify-center py-4">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            <span>Checking status...</span>
          </div>
        )}

        {error && (
          <Alert className="border-destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription className="text-destructive">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {status && (
          <>
            {/* Connection Status */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                {getStatusIcon(status.status)}
                <div>
                  <h3 className="font-medium">Connection Status</h3>
                  <p className="text-sm text-muted-foreground">
                    {status.status.connected ? 'Successfully connected to SmartBill API' : 'Unable to connect to SmartBill API'}
                  </p>
                </div>
              </div>
              {getStatusBadge(status.status)}
            </div>

            {/* Account Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Account Status
                </h4>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className="font-medium capitalize">{status.status.accountStatus}</span>
                  </div>
                  {status.status.apiVersion && (
                    <div className="flex justify-between">
                      <span>API Version:</span>
                      <span className="font-medium">{status.status.apiVersion}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Last Checked:</span>
                    <span className="font-medium">{formatTimestamp(status.status.lastChecked)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  API Configuration
                </h4>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>Base URL:</span>
                    <span className="font-mono text-xs">{status.apiInfo.baseUrl}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Timeout:</span>
                    <span className="font-medium">{status.apiInfo.timeout / 1000}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Retries:</span>
                    <span className="font-medium">{status.apiInfo.retries}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {status.status.errorMessage && (
              <Alert className="border-destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription className="text-destructive">
                  {status.status.errorMessage}
                </AlertDescription>
              </Alert>
            )}

            {/* Diagnostics */}
            {status.diagnostics && (
              <div className="space-y-2">
                <h4 className="font-medium">Diagnostics</h4>
                <div className="bg-muted p-3 rounded-md">
                  <pre className="text-xs overflow-auto">
                    {JSON.stringify(status.diagnostics, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            <Separator />

            {/* Recommendations */}
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Recommendations
              </h4>
              <ul className="space-y-2">
                {status.recommendations.map((recommendation, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <div className="h-1.5 w-1.5 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <span>{recommendation}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                onClick={fetchStatus}
                disabled={loading}
                variant="outline"
                className="flex-1"
              >
                <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
                Test Connection
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                asChild
              >
                <a href="/test-smartbill" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Advanced Test
                </a>
              </Button>
            </div>

            {/* Credentials Info */}
            <div className="text-xs text-muted-foreground">
              <p>Username: {status.credentials.username}</p>
              <p>CIF: {status.credentials.cif}</p>
              <p>Last updated: {formatTimestamp(status.timestamp)}</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
} 