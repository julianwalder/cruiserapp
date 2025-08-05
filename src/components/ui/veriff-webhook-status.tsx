'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Webhook, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Info,
  RefreshCw
} from 'lucide-react';

interface VeriffWebhookStatusProps {
  veriffData: {
    sessionId?: string;
    attemptId?: string;
    feature?: string;
    action?: string;
    code?: number;
    submittedAt?: string;
    webhookReceivedAt?: string;
  };
}

export function VeriffWebhookStatus({ veriffData }: VeriffWebhookStatusProps) {
  const getStatusIcon = () => {
    if (veriffData.action === 'submitted') {
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    }
    return <Clock className="h-5 w-5 text-yellow-600" />;
  };

  const getStatusColor = () => {
    if (veriffData.action === 'submitted') {
      return 'bg-green-100 text-green-800';
    }
    return 'bg-yellow-100 text-yellow-800';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const getCodeDescription = (code?: number) => {
    switch (code) {
      case 7002:
        return 'SelfID submission completed';
      case 7001:
        return 'SelfID session started';
      default:
        return `Code: ${code}`;
    }
  };

  if (!veriffData || !veriffData.sessionId) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Webhook className="h-5 w-5" />
          <CardTitle>Webhook Status</CardTitle>
        </div>
        <CardDescription>
          Real-time verification status from Veriff
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <Badge className={getStatusColor()}>
            {veriffData.action?.toUpperCase() || 'UNKNOWN'}
          </Badge>
          {veriffData.code && (
            <Badge variant="outline">
              {getCodeDescription(veriffData.code)}
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-500">Session ID</label>
            <p className="text-sm font-mono">{veriffData.sessionId}</p>
          </div>
          {veriffData.attemptId && (
            <div>
              <label className="text-sm font-medium text-gray-500">Attempt ID</label>
              <p className="text-sm font-mono">{veriffData.attemptId}</p>
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-gray-500">Feature</label>
            <p className="text-sm">{veriffData.feature || 'N/A'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Action</label>
            <p className="text-sm">{veriffData.action || 'N/A'}</p>
          </div>
          {veriffData.submittedAt && (
            <div>
              <label className="text-sm font-medium text-gray-500">Submitted At</label>
              <p className="text-sm">{formatDate(veriffData.submittedAt)}</p>
            </div>
          )}
          {veriffData.webhookReceivedAt && (
            <div>
              <label className="text-sm font-medium text-gray-500">Webhook Received</label>
              <p className="text-sm">{formatDate(veriffData.webhookReceivedAt)}</p>
            </div>
          )}
        </div>

        {veriffData.action === 'submitted' && (
          <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm text-green-800">
              Verification submitted successfully. Processing may take a few minutes.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 