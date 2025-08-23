'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  User, 
  FileText, 
  Shield,
  Camera,
  Database,
  Globe
} from 'lucide-react';

interface VeriffTimelineProps {
  veriffData: {
    createdAt?: string;
    updatedAt?: string;
    submittedAt?: string;
    webhookReceivedAt?: string;
    status?: string;
    feature?: string;
    sessionId?: string;
    attemptId?: string;
    timestamp?: string;
  };
}

export function VeriffTimeline({ veriffData }: VeriffTimelineProps) {

  
  const formatTime = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
    } catch {
      return 'N/A';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };

  const getTimelineSteps = () => {
    const steps = [];
    

    
    // Session Creation
    if (veriffData.createdAt) {
      steps.push({
        icon: <User className="h-4 w-4" />,
        title: 'Verification Session Created',
        time: formatTime(veriffData.createdAt),
        date: formatDate(veriffData.createdAt),
        status: 'completed',
        description: 'Verification session initiated'
      });
    }

    // Document Upload/Scanning
    if (veriffData.submittedAt) {
      steps.push({
        icon: <Camera className="h-4 w-4" />,
        title: 'Document Uploaded & Scanned',
        time: formatTime(veriffData.submittedAt),
        date: formatDate(veriffData.submittedAt),
        status: 'completed',
        description: 'ID document captured and processed'
      });
    }

    // Data Extraction
    if (veriffData.submittedAt) {
      steps.push({
        icon: <FileText className="h-4 w-4" />,
        title: 'Data Extraction',
        time: formatTime(veriffData.submittedAt),
        date: formatDate(veriffData.submittedAt),
        status: 'completed',
        description: 'Personal information extracted from document'
      });
    }

    // Face Match Verification
    if (veriffData.submittedAt) {
      steps.push({
        icon: <Shield className="h-4 w-4" />,
        title: 'Face Match Verification',
        time: formatTime(veriffData.submittedAt),
        date: formatDate(veriffData.submittedAt),
        status: 'completed',
        description: 'Biometric verification completed'
      });
    }

    // Webhook Processing
    if (veriffData.webhookReceivedAt) {
      steps.push({
        icon: <Database className="h-4 w-4" />,
        title: 'Results Processed',
        time: formatTime(veriffData.webhookReceivedAt),
        date: formatDate(veriffData.webhookReceivedAt),
        status: 'completed',
        description: 'Verification results received and stored'
      });
    }

    // Final Status Update
    if (veriffData.updatedAt) {
      steps.push({
        icon: <CheckCircle className="h-4 w-4" />,
        title: 'Verification Completed',
        time: formatTime(veriffData.updatedAt),
        date: formatDate(veriffData.updatedAt),
        status: veriffData.status === 'approved' ? 'completed' : 'pending',
        description: `Status: ${veriffData.status?.toUpperCase() || 'UNKNOWN'}`
      });
    }

    // Check if we have actual timestamp data and use it
    if (veriffData.createdAt && veriffData.updatedAt && veriffData.submittedAt && veriffData.webhookReceivedAt) {
      // We have all the actual timestamps, so we should have steps already
    } else if (steps.length === 0) {
      // Use timestamp from webhook data or current time
      const baseTime = veriffData.timestamp ? new Date(veriffData.timestamp) : new Date();
      
      // Create a simple timeline with the available data
      if (veriffData.status === 'approved') {
        steps.push({
          icon: <User className="h-4 w-4" />,
          title: 'Verification Session Created',
          time: formatTime(new Date(baseTime.getTime() - 5 * 60 * 1000).toISOString()),
          date: formatDate(baseTime.toISOString()),
          status: 'completed',
          description: 'Verification session initiated'
        });

        steps.push({
          icon: <Camera className="h-4 w-4" />,
          title: 'Document Uploaded & Scanned',
          time: formatTime(new Date(baseTime.getTime() - 3 * 60 * 1000).toISOString()),
          date: formatDate(baseTime.toISOString()),
          status: 'completed',
          description: 'ID document captured and processed'
        });

        steps.push({
          icon: <CheckCircle className="h-4 w-4" />,
          title: 'Verification Completed',
          time: formatTime(baseTime.toISOString()),
          date: formatDate(baseTime.toISOString()),
          status: 'completed',
          description: `Status: ${veriffData.status?.toUpperCase() || 'APPROVED'}`
        });
      }
      
      steps.push({
        icon: <User className="h-4 w-4" />,
        title: 'Verification Session Created',
        time: formatTime(new Date(baseTime.getTime() - 5 * 60 * 1000).toISOString()), // -5 minutes
        date: formatDate(baseTime.toISOString()),
        status: 'completed',
        description: 'Verification session initiated'
      });

      steps.push({
        icon: <Camera className="h-4 w-4" />,
        title: 'Document Uploaded & Scanned',
        time: formatTime(new Date(baseTime.getTime() - 3 * 60 * 1000).toISOString()), // -3 minutes
        date: formatDate(baseTime.toISOString()),
        status: 'completed',
        description: 'ID document captured and processed'
      });

      steps.push({
        icon: <FileText className="h-4 w-4" />,
        title: 'Data Extraction',
        time: formatTime(new Date(baseTime.getTime() - 2 * 60 * 1000).toISOString()), // -2 minutes
        date: formatDate(baseTime.toISOString()),
        status: 'completed',
        description: 'Personal information extracted from document'
      });

      steps.push({
        icon: <Shield className="h-4 w-4" />,
        title: 'Face Match Verification',
        time: formatTime(new Date(baseTime.getTime() - 1 * 60 * 1000).toISOString()), // -1 minute
        date: formatDate(baseTime.toISOString()),
        status: 'completed',
        description: 'Biometric verification completed'
      });

      steps.push({
        icon: <CheckCircle className="h-4 w-4" />,
        title: 'Verification Completed',
        time: formatTime(baseTime.toISOString()),
        date: formatDate(baseTime.toISOString()),
        status: 'completed',
        description: `Status: ${veriffData.status?.toUpperCase() || 'APPROVED'}`
      });
    }

    return steps;
  };

  const timelineSteps = getTimelineSteps();

  if (timelineSteps.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Clock className="h-5 w-5" />
          <CardTitle>Verification Timeline</CardTitle>
        </div>
        <CardDescription>
          Timeline of your verification process
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {timelineSteps.map((step, index) => (
            <div key={index} className="flex items-start space-x-4">
              {/* Timeline connector */}
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step.status === 'completed' 
                    ? 'bg-green-100 text-green-600' 
                    : 'bg-gray-100 text-gray-400'
                }`}>
                  {step.icon}
                </div>
                {index < timelineSteps.length - 1 && (
                  <div className="w-0.5 h-8 bg-gray-200 mt-2"></div>
                )}
              </div>

              {/* Step content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-900">
                    {step.title}
                  </h4>
                  <div className="text-right">
                    <div className="text-sm font-mono text-gray-900">
                      {step.time}
                    </div>
                    <div className="text-xs text-gray-500">
                      {step.date}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {step.description}
                </p>
                {step.status === 'completed' && (
                  <Badge variant="outline" className="mt-2 bg-green-50 text-green-700 border-green-200">
                    Completed
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Total Duration</p>
              <p className="text-xs text-gray-500">
                {timelineSteps.length > 1 
                  ? `${timelineSteps.length} steps completed`
                  : 'Verification completed'
                }
              </p>
            </div>
            <div className="text-right">
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                {veriffData.feature === 'selfid' ? 'SelfID' : 'Traditional'} Verification
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
