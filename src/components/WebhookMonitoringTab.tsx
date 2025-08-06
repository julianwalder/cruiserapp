'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  RefreshCw, 
  Eye, 
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Zap,
  Shield,
  Users,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface WebhookMetrics {
  total: number;
  successful: number;
  failed: number;
  pending: number;
  successRate: number;
  averageProcessingTime: number;
  webhookTypeBreakdown: {
    submitted: number;
    approved: number;
    declined: number;
    unknown: number;
  };
}

interface WebhookAlert {
  id: string;
  type: 'high_failure_rate' | 'long_pending' | 'processing_error';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  createdAt: string;
  resolved: boolean;
}

interface FailedWebhook {
  id: string;
  userId: string;
  eventType: string;
  webhookType: string;
  sessionId: string;
  status: string;
  error: string;
  retryCount: number;
  createdAt: string;
  processedAt: string;
}

export default function WebhookMonitoringTab() {
  const [metrics, setMetrics] = useState<WebhookMetrics | null>(null);
  const [alerts, setAlerts] = useState<WebhookAlert[]>([]);
  const [failedWebhooks, setFailedWebhooks] = useState<FailedWebhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [timePeriod, setTimePeriod] = useState<number>(0); // 0 = all time, 24 = last 24 hours, etc.

  const fetchMonitoringData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      const response = await fetch(`/api/veriff/webhook-monitor?hours=${timePeriod}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch monitoring data');
      }

      const responseData = await response.json();
      console.log('🔍 Webhook Monitoring API Response:', responseData);
      
      const metrics = responseData.data?.metrics || null;
      const alerts = responseData.data?.alerts || [];
      const failedWebhooks = responseData.data?.failedWebhooks || [];
      
      console.log('🔍 Parsed Data:', { metrics, alerts: alerts.length, failedWebhooks: failedWebhooks.length });
      
      setMetrics(metrics);
      setAlerts(alerts);
      setFailedWebhooks(failedWebhooks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      toast.error('Failed to fetch monitoring data');
    } finally {
      setLoading(false);
    }
  };

  const handleRetryWebhook = async (eventId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/veriff/webhook-monitor', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'retry',
          eventId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to retry webhook');
      }

      toast.success('Webhook retry initiated');
      fetchMonitoringData(); // Refresh data
    } catch (err) {
      toast.error('Failed to retry webhook');
    }
  };

  useEffect(() => {
    fetchMonitoringData();
  }, [timePeriod]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Success</Badge>;
      case 'error':
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Error</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getAlertSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Critical</Badge>;
      case 'high':
        return <Badge variant="destructive" className="bg-red-100 text-red-800"><AlertTriangle className="h-3 w-3 mr-1" />High</Badge>;
      case 'medium':
        return <Badge variant="default" className="bg-yellow-100 text-yellow-800"><AlertTriangle className="h-3 w-3 mr-1" />Medium</Badge>;
      case 'low':
        return <Badge variant="secondary"><Eye className="h-3 w-3 mr-1" />Low</Badge>;
      default:
        return <Badge variant="outline">{severity}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        Loading monitoring data...
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Webhook Monitoring</h2>
          <p className="text-muted-foreground">
            Monitor Veriff webhook processing and system health
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">Time Period:</span>
            <Select value={timePeriod.toString()} onValueChange={(value) => setTimePeriod(parseInt(value))}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">All Time</SelectItem>
                <SelectItem value="1">Last Hour</SelectItem>
                <SelectItem value="24">Last 24 Hours</SelectItem>
                <SelectItem value="168">Last 7 Days</SelectItem>
                <SelectItem value="720">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={fetchMonitoringData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="failed">Failed Webhooks</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Time Period Summary */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Statistics Summary</h3>
                  <p className="text-sm text-muted-foreground">
                    {timePeriod === 0 ? 'All-time statistics' : 
                     timePeriod === 1 ? 'Last hour statistics' :
                     timePeriod === 24 ? 'Last 24 hours statistics' :
                     timePeriod === 168 ? 'Last 7 days statistics' :
                     timePeriod === 720 ? 'Last 30 days statistics' :
                     `Last ${timePeriod} hours statistics`}
                  </p>
                </div>
                <Badge variant="outline">
                  {timePeriod === 0 ? 'All Time' : 
                   timePeriod === 1 ? '1 Hour' :
                   timePeriod === 24 ? '24 Hours' :
                   timePeriod === 168 ? '7 Days' :
                   timePeriod === 720 ? '30 Days' :
                   `${timePeriod} Hours`}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Webhooks</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics?.total ?? 0}</div>
                <p className="text-xs text-muted-foreground">
                  All time webhook events
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(metrics?.successRate ?? 0).toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">
                  {metrics?.successful ?? 0} successful / {metrics?.total ?? 0} total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Failed</CardTitle>
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{metrics?.failed ?? 0}</div>
                <p className="text-xs text-muted-foreground">
                  Failed webhook events
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Processing</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(() => {
                    const time = metrics?.averageProcessingTime ?? 0;
                    if (time < 1) return '< 1s';
                    if (time < 60) return `${time.toFixed(1)}s`;
                    return `${(time / 60).toFixed(1)}m`;
                  })()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Average processing time
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Webhook Type Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Webhook Type Breakdown</CardTitle>
              <CardDescription>
                Distribution of webhook types processed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{metrics?.webhookTypeBreakdown?.submitted ?? 0}</div>
                  <div className="text-sm text-muted-foreground">Submitted</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{metrics?.webhookTypeBreakdown?.approved ?? 0}</div>
                  <div className="text-sm text-muted-foreground">Approved</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{metrics?.webhookTypeBreakdown?.declined ?? 0}</div>
                  <div className="text-sm text-muted-foreground">Declined</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600">{metrics?.webhookTypeBreakdown?.unknown ?? 0}</div>
                  <div className="text-sm text-muted-foreground">Unknown</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Status */}
          <Card>
            <CardHeader>
              <CardTitle>System Status</CardTitle>
              <CardDescription>
                Current webhook processing system health
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Shield className="h-4 w-4 text-green-600" />
                    <span>Webhook Endpoint</span>
                  </div>
                  <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-green-600" />
                    <span>Data Extraction</span>
                  </div>
                  <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-green-600" />
                    <span>Database Updates</span>
                  </div>
                  <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Activity className="h-4 w-4 text-green-600" />
                    <span>Monitoring</span>
                  </div>
                  <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>System Alerts</CardTitle>
              <CardDescription>
                Active alerts and system notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(alerts || []).length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <p className="text-muted-foreground">No active alerts</p>
                  <p className="text-sm text-muted-foreground">All systems are operating normally</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(alerts || []).map((alert) => (
                    <Alert key={alert.id} variant={alert.severity === 'critical' ? 'destructive' : 'default'}>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center space-x-2 mb-1">
                              {getAlertSeverityBadge(alert.severity)}
                              <span className="font-medium">{alert.message}</span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {new Date(alert.createdAt).toLocaleString()}
                            </p>
                          </div>
                          {!alert.resolved && (
                            <Button size="sm" variant="outline">
                              Resolve
                            </Button>
                          )}
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="failed" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Failed Webhooks</CardTitle>
              <CardDescription>
                Webhook events that failed to process
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(failedWebhooks || []).length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <p className="text-muted-foreground">No failed webhooks</p>
                  <p className="text-sm text-muted-foreground">All webhooks processed successfully</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Session ID</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Error</TableHead>
                      <TableHead>Retries</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(failedWebhooks || []).map((webhook) => (
                      <TableRow key={webhook.id}>
                        <TableCell className="font-mono text-sm">
                          {webhook.sessionId?.substring(0, 8)}...
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{webhook.webhookType}</Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(webhook.status)}</TableCell>
                        <TableCell className="max-w-xs truncate" title={webhook.error}>
                          {webhook.error}
                        </TableCell>
                        <TableCell>{webhook.retryCount}</TableCell>
                        <TableCell>
                          {new Date(webhook.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRetryWebhook(webhook.id)}
                          >
                            Retry
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Monitoring Details</CardTitle>
              <CardDescription>
                Technical details about the webhook monitoring system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Automatic Data Extraction</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    The system automatically extracts and stores the following data from Veriff webhooks:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <h5 className="font-medium text-green-600">Personal Information</h5>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1">
                        <li>Full Name (Given + Last)</li>
                        <li>ID Number/CNP</li>
                        <li>Date of Birth</li>
                        <li>Gender & Nationality</li>
                        <li>Address (Full, City, Postal Code)</li>
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-medium text-blue-600">Document Information</h5>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1">
                        <li>Document Type</li>
                        <li>Document Number</li>
                        <li>Document Country</li>
                        <li>Valid From/Until dates</li>
                        <li>Issuing Authority</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Verification Results</h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Face Match Status & Similarity</li>
                    <li>Decision Score</li>
                    <li>Quality Score</li>
                    <li>Flags & Context</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Monitoring Features</h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Real-time webhook event tracking</li>
                    <li>Automatic error detection and alerting</li>
                    <li>Retry mechanism for failed webhooks</li>
                    <li>Performance metrics and success rates</li>
                    <li>Activity logging for audit trails</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 