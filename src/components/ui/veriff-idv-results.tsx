'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  FileText, 
  Shield, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Info
} from 'lucide-react';

interface VeriffIDVResultsProps {
  veriffData: {
    // Legacy structure (from webhook)
    status?: string;
    person?: {
      givenName: string;
      lastName: string;
      idNumber?: string;
      dateOfBirth?: string;
      nationality?: string;
      gender?: string;
      country?: string;
    };
    document?: {
      type: string;
      number: string;
      country: string;
      validFrom?: string;
      validUntil?: string;
      issuedBy?: string;
    };
    additionalVerification?: {
      faceMatch: {
        similarity: number;
        status: 'approved' | 'declined';
      };
    };
    decisionScore?: number;
    insights?: {
      quality?: string;
      flags?: string[];
      context?: string;
    };
    // New structure (from database)
    code?: number;
    action?: string;
    feature?: string;
    attemptId?: string;
    sessionId?: string;
    submittedAt?: string;
    webhookReceivedAt?: string;
    // Database fields
    veriffStatus?: string;
    veriffPersonGivenName?: string;
    veriffPersonLastName?: string;
    veriffDocumentType?: string;
    veriffDecisionScore?: number;
    veriffFaceMatchSimilarity?: number;
    veriffFaceMatchStatus?: string;
    veriffQualityScore?: string;
  };
}

export function VeriffIDVResults({ veriffData }: VeriffIDVResultsProps) {
  // Determine the actual status from various possible sources
  const getActualStatus = () => {
    if (veriffData.status) return veriffData.status;
    if (veriffData.veriffStatus) return veriffData.veriffStatus;
    if (veriffData.action) return veriffData.action;
    return 'unknown';
  };

  const getStatusIcon = () => {
    const status = getActualStatus();
    switch (status.toLowerCase()) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'declined':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'submitted':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      default:
        return <Info className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = () => {
    const status = getActualStatus();
    switch (status.toLowerCase()) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'declined':
        return 'bg-red-100 text-red-800';
      case 'submitted':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'Invalid Date';
    }
  };

  const formatDecisionScore = (score?: number) => {
    if (!score) return 'N/A';
    return `${(score * 100).toFixed(1)}%`;
  };

  // Get person information from various sources
  const getPersonInfo = () => {
    if (veriffData.person) {
      return veriffData.person;
    }
    // Fallback to database fields
    return {
      givenName: veriffData.veriffPersonGivenName || 'N/A',
      lastName: veriffData.veriffPersonLastName || 'N/A',
      idNumber: undefined,
      dateOfBirth: undefined,
      nationality: undefined,
      gender: undefined,
      country: undefined,
    };
  };

  // Get document information from various sources
  const getDocumentInfo = () => {
    if (veriffData.document) {
      return veriffData.document;
    }
    // Fallback to database fields
    return {
      type: veriffData.veriffDocumentType || 'N/A',
      number: 'N/A',
      country: 'N/A',
      validFrom: undefined,
      validUntil: undefined,
      issuedBy: undefined,
    };
  };

  const personInfo = getPersonInfo();
  const documentInfo = getDocumentInfo();
  const actualStatus = getActualStatus();

  return (
    <div className="space-y-6">
      {/* Status Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            {getStatusIcon()}
            <div>
              <CardTitle className="text-lg">Verification Results</CardTitle>
              <CardDescription>
                AI-powered identity verification completed
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className={getStatusColor()}>
              {actualStatus.toUpperCase()}
            </Badge>
            {(veriffData.decisionScore || veriffData.veriffDecisionScore) && (
              <Badge variant="outline">
                Confidence: {formatDecisionScore(veriffData.decisionScore || veriffData.veriffDecisionScore)}
              </Badge>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Session Information */}
      {(veriffData.sessionId || veriffData.code || veriffData.submittedAt) && (
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Info className="h-5 w-5" />
              <CardTitle>Session Information</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {veriffData.sessionId && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Session ID</label>
                  <p className="text-lg font-mono text-sm">{veriffData.sessionId}</p>
                </div>
              )}
              {veriffData.code && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Code</label>
                  <p className="text-lg">{veriffData.code}</p>
                </div>
              )}
              {veriffData.action && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Action</label>
                  <p className="text-lg">{veriffData.action}</p>
                </div>
              )}
              {veriffData.feature && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Feature</label>
                  <p className="text-lg">{veriffData.feature}</p>
                </div>
              )}
              {veriffData.submittedAt && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Submitted At</label>
                  <p className="text-lg">{formatDate(veriffData.submittedAt)}</p>
                </div>
              )}
              {veriffData.webhookReceivedAt && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Webhook Received</label>
                  <p className="text-lg">{formatDate(veriffData.webhookReceivedAt)}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Person Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <CardTitle>Personal Information</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Full Name</label>
              <p className="text-lg font-semibold">
                {personInfo.givenName} {personInfo.lastName}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Date of Birth</label>
              <p className="text-lg">{formatDate(personInfo.dateOfBirth)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Nationality</label>
              <p className="text-lg">{personInfo.nationality || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Gender</label>
              <p className="text-lg">{personInfo.gender || 'N/A'}</p>
            </div>
            {personInfo.idNumber && (
              <div>
                <label className="text-sm font-medium text-gray-500">ID Number</label>
                <p className="text-lg font-mono">{personInfo.idNumber}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Document Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <CardTitle>Document Information</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Document Type</label>
              <p className="text-lg font-semibold">{documentInfo.type}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Document Number</label>
              <p className="text-lg font-mono">{documentInfo.number}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Issuing Country</label>
              <p className="text-lg">{documentInfo.country}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Issued By</label>
              <p className="text-lg">{documentInfo.issuedBy || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Valid From</label>
              <p className="text-lg">{formatDate(documentInfo.validFrom)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Valid Until</label>
              <p className="text-lg">{formatDate(documentInfo.validUntil)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Face Match Results */}
      {(veriffData.additionalVerification?.faceMatch || veriffData.veriffFaceMatchStatus) && (
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <CardTitle>Face Match Verification</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-500">Status</label>
                <div className="flex items-center space-x-2">
                  {veriffData.additionalVerification?.faceMatch?.status === 'approved' || veriffData.veriffFaceMatchStatus === 'approved' ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  <p className="text-lg font-semibold">
                    {(veriffData.additionalVerification?.faceMatch?.status || veriffData.veriffFaceMatchStatus || 'unknown').toUpperCase()}
                  </p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Similarity Score</label>
                <p className="text-lg font-semibold">
                  {formatDecisionScore(veriffData.additionalVerification?.faceMatch?.similarity || veriffData.veriffFaceMatchSimilarity)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Insights */}
      {(veriffData.insights || veriffData.veriffQualityScore) && (
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Info className="h-5 w-5" />
              <CardTitle>Verification Insights</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {(veriffData.insights?.quality || veriffData.veriffQualityScore) && (
              <div>
                <label className="text-sm font-medium text-gray-500">Quality Assessment</label>
                <p className="text-lg">{veriffData.insights?.quality || veriffData.veriffQualityScore}</p>
              </div>
            )}
            {veriffData.insights?.flags && veriffData.insights.flags.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-500">Quality Flags</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {veriffData.insights.flags.map((flag, index) => (
                    <Badge key={index} variant="outline" className="text-orange-600 border-orange-200">
                      {flag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {veriffData.insights?.context && (
              <div>
                <label className="text-sm font-medium text-gray-500">Context</label>
                <p className="text-lg">{veriffData.insights.context}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
} 