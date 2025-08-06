'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  User, 
  FileText, 
  Camera, 
  Shield, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Download,
  RefreshCw
} from 'lucide-react';

interface VerificationData {
  id: string;
  firstName: string;
  lastName: string;
  veriffStatus?: string;
  identityVerified?: boolean;
  identityVerifiedAt?: string;
  veriffSessionId?: string;
  veriffVerificationId?: string;
  veriffWebhookData?: any;
  veriffWebhookReceivedAt?: string;
  
  // Person data
  veriffPersonGivenName?: string;
  veriffPersonLastName?: string;
  veriffPersonIdNumber?: string;
  veriffPersonDateOfBirth?: string;
  veriffPersonNationality?: string;
  veriffPersonGender?: string;
  veriffPersonCountry?: string;
  
  // Document data
  veriffDocumentType?: string;
  veriffDocumentNumber?: string;
  veriffDocumentCountry?: string;
  veriffDocumentValidFrom?: string;
  veriffDocumentValidUntil?: string;
  veriffDocumentIssuedBy?: string;
  
  // Face verification data
  veriffFaceMatchSimilarity?: number;
  veriffFaceMatchStatus?: string;
  
  // Decision and insights
  veriffDecisionScore?: number;
  veriffQualityScore?: string;
  veriffFlags?: string[];
  veriffContext?: string;
  
  // Metadata
  veriffAttemptId?: string;
  veriffFeature?: string;
  veriffCode?: number;
  veriffReason?: string;
  
  // Timestamps
  veriffCreatedAt?: string;
  veriffUpdatedAt?: string;
  veriffSubmittedAt?: string;
  veriffApprovedAt?: string;
  veriffDeclinedAt?: string;
}

interface VerificationDataDisplayProps {
  userId: string;
  onRefresh?: () => void;
}

export function VerificationDataDisplay({ userId, onRefresh }: VerificationDataDisplayProps) {
  const [data, setData] = useState<VerificationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      if (!token) {
        setError('No authentication token found');
        return;
      }

      const response = await fetch(`/api/veriff/verification-data/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch verification data');
      }

      const result = await response.json();
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userId]);

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'declined':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'submitted':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="default" className="bg-green-500">Approved</Badge>;
      case 'declined':
        return <Badge variant="destructive">Declined</Badge>;
      case 'submitted':
        return <Badge variant="secondary">Submitted</Badge>;
      case 'created':
        return <Badge variant="outline">Created</Badge>;
      default:
        return <Badge variant="outline">{status || 'Unknown'}</Badge>;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not available';
    return new Date(dateString).toLocaleString();
  };

  const formatScore = (score?: number) => {
    if (score === undefined || score === null) return 'Not available';
    return `${(score * 100).toFixed(1)}%`;
  };

  const downloadWebhookData = () => {
    if (!data?.veriffWebhookData) return;
    
    const blob = new Blob([JSON.stringify(data.veriffWebhookData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `veriff-webhook-${userId}-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading verification data...</span>
        </CardContent>
      </Card>
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

  if (!data) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>No verification data found for this user.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Verification Data</h2>
          <p className="text-muted-foreground">
            Comprehensive verification information for {data.firstName} {data.lastName}
          </p>
        </div>
        <div className="flex gap-2">
          {data.veriffWebhookData && (
            <Button variant="outline" size="sm" onClick={downloadWebhookData}>
              <Download className="h-4 w-4 mr-2" />
              Download Raw Data
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Verification Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              {getStatusIcon(data.veriffStatus)}
              <span className="font-medium">Status:</span>
              {getStatusBadge(data.veriffStatus)}
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className={`h-4 w-4 ${data.identityVerified ? 'text-green-500' : 'text-gray-400'}`} />
              <span className="font-medium">Identity Verified:</span>
              <Badge variant={data.identityVerified ? 'default' : 'secondary'}>
                {data.identityVerified ? 'Yes' : 'No'}
              </Badge>
            </div>
            {data.veriffDecisionScore !== undefined && (
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span className="font-medium">Decision Score:</span>
                <Badge variant="outline">{formatScore(data.veriffDecisionScore)}</Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Information */}
      <Tabs defaultValue="person" className="space-y-4">
        <TabsList>
          <TabsTrigger value="person">Person Data</TabsTrigger>
          <TabsTrigger value="document">Document</TabsTrigger>
          <TabsTrigger value="face">Face Verification</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="person">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Person Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Given Name</label>
                  <p>{data.veriffPersonGivenName || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Last Name</label>
                  <p>{data.veriffPersonLastName || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">ID Number</label>
                  <p>{data.veriffPersonIdNumber || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Date of Birth</label>
                  <p>{data.veriffPersonDateOfBirth ? formatDate(data.veriffPersonDateOfBirth) : 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Nationality</label>
                  <p>{data.veriffPersonNationality || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Gender</label>
                  <p>{data.veriffPersonGender || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Country</label>
                  <p>{data.veriffPersonCountry || 'Not provided'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="document">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Document Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Document Type</label>
                  <p>{data.veriffDocumentType || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Document Number</label>
                  <p>{data.veriffDocumentNumber || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Country</label>
                  <p>{data.veriffDocumentCountry || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Issued By</label>
                  <p>{data.veriffDocumentIssuedBy || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Valid From</label>
                  <p>{data.veriffDocumentValidFrom ? formatDate(data.veriffDocumentValidFrom) : 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Valid Until</label>
                  <p>{data.veriffDocumentValidUntil ? formatDate(data.veriffDocumentValidUntil) : 'Not provided'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="face">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Face Verification
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Face Match Similarity</label>
                  <p>{formatScore(data.veriffFaceMatchSimilarity)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Face Match Status</label>
                  <p>{data.veriffFaceMatchStatus ? getStatusBadge(data.veriffFaceMatchStatus) : 'Not available'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Quality Score</label>
                  <p>{data.veriffQualityScore || 'Not available'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Context</label>
                  <p>{data.veriffContext || 'Not available'}</p>
                </div>
              </div>
              
              {data.veriffFlags && data.veriffFlags.length > 0 && (
                <div className="mt-4">
                  <label className="text-sm font-medium text-muted-foreground">Flags</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {data.veriffFlags.map((flag, index) => (
                      <Badge key={index} variant="outline" className="text-orange-600 border-orange-600">
                        {flag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Verification Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Session Created</label>
                    <p>{formatDate(data.veriffCreatedAt)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                    <p>{formatDate(data.veriffUpdatedAt)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Submitted</label>
                    <p>{formatDate(data.veriffSubmittedAt)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Approved</label>
                    <p>{formatDate(data.veriffApprovedAt)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Declined</label>
                    <p>{formatDate(data.veriffDeclinedAt)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Webhook Received</label>
                    <p>{formatDate(data.veriffWebhookReceivedAt)}</p>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Session ID</label>
                  <p className="font-mono text-sm">{data.veriffSessionId || 'Not available'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Verification ID</label>
                  <p className="font-mono text-sm">{data.veriffVerificationId || 'Not available'}</p>
                </div>
                {data.veriffAttemptId && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Attempt ID</label>
                    <p className="font-mono text-sm">{data.veriffAttemptId}</p>
                  </div>
                )}
                {data.veriffReason && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Reason</label>
                    <p className="text-sm text-red-600">{data.veriffReason}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 