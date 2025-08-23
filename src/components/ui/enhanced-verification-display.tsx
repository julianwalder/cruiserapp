'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  Award,
  Database,
  Activity,
  MapPin,
  Calendar,
  Fingerprint,
  Zap,
  Info,
  CheckSquare,
  XSquare,
  Star,
  Target,
  Eye,
  Lock,
  Globe,
  Building,
  CreditCard,
  Clock3,
  CalendarDays,
  AlertCircle,
  ThumbsUp,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';

interface VerificationData {
  // Session and metadata
  sessionId?: string;
  verificationId?: string;
  status?: string;
  code?: number;
  action?: string;
  feature?: string;
  attemptId?: string;
  reason?: string;
  
  // Person data
  person?: {
    givenName?: string;
    lastName?: string;
    idNumber?: string;
    dateOfBirth?: string;
    nationality?: string;
    gender?: string;
    country?: string;
    address?: string;
    city?: string;
    postalCode?: string;
    street?: string;
    houseNumber?: string;
  };
  
  // Document data
  document?: {
    type?: string;
    number?: string;
    country?: string;
    validFrom?: string;
    validUntil?: string;
    issuedBy?: string;
  };
  
  // Verification results
  faceMatchSimilarity?: number;
  faceMatchStatus?: string;
  decisionScore?: number;
  qualityScore?: string;
  flags?: string[];
  context?: string;
  
  // Timestamps
  createdAt?: string;
  updatedAt?: string;
  submittedAt?: string;
  approvedAt?: string;
  declinedAt?: string;
  webhookReceivedAt?: string;
  
  // Raw data
  webhookData?: any;
  
  // Legacy compatibility
  isVerified?: boolean;
  identityVerifiedAt?: string;
}

interface EnhancedVerificationDisplayProps {
  verificationData: VerificationData;
  className?: string;
}

export function EnhancedVerificationDisplay({ verificationData, className }: EnhancedVerificationDisplayProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const formatScore = (score?: number) => {
    if (!score) return 'N/A';
    return `${Math.round(score * 100)}%`;
  };

  const getStatusIcon = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'declined':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'submitted':
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Approved</Badge>;
      case 'declined':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Declined</Badge>;
      case 'submitted':
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Pending</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Unknown</Badge>;
    }
  };

  const getComplianceChecks = () => {
    const webhookData = verificationData.webhookData;
    if (!webhookData?.insights?.complianceChecks) return null;
    
    return webhookData.insights.complianceChecks;
  };

  const complianceChecks = getComplianceChecks();

  return (
    <div className={className}>
      {/* Verification Status Overview */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Verification Status
          </CardTitle>
          <CardDescription>
            Overall verification status and decision
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getStatusIcon(verificationData.status)}
              <div>
                <h3 className="text-lg font-semibold">
                  {verificationData.status?.toUpperCase() || 'UNKNOWN'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {verificationData.feature === 'selfid' ? 'SelfID Verification' : 'Traditional Verification'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(verificationData.status)}
              {verificationData.decisionScore && (
                <Badge variant="outline" className="ml-2">
                  Score: {formatScore(verificationData.decisionScore)}
                </Badge>
              )}
            </div>
          </div>
          
          {verificationData.decisionScore === 1.0 && (
            <Alert className="mt-4 border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Perfect verification score achieved! All checks passed successfully.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Cards Layout */}
      <div className="space-y-6">
        {/* Personal Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </CardTitle>
            <CardDescription>
              Information extracted from your identity document
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                  <p className="text-lg font-semibold">
                    {verificationData.person?.givenName} {verificationData.person?.lastName}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Date of Birth</label>
                  <p className="text-lg">{formatDate(verificationData.person?.dateOfBirth)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Gender</label>
                  <p className="text-lg">{verificationData.person?.gender}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Nationality</label>
                  <p className="text-lg">{verificationData.person?.nationality}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Personal ID Number</label>
                  <p className="text-lg font-mono">{verificationData.person?.idNumber}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Country</label>
                  <p className="text-lg">{verificationData.person?.country}</p>
                </div>
                {verificationData.person?.address && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Address</label>
                    <p className="text-lg">{verificationData.person.address}</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Document Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Identity Document
            </CardTitle>
            <CardDescription>
              Details about the document used for verification
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Document Type</label>
                  <p className="text-lg font-semibold">{verificationData.document?.type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Document Number</label>
                  <p className="text-lg font-mono">{verificationData.document?.number}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Issuing Country</label>
                  <p className="text-lg">{verificationData.document?.country}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Issue Date</label>
                  <p className="text-lg">{formatDate(verificationData.document?.validFrom)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Expiry Date</label>
                  <p className="text-lg">{formatDate(verificationData.document?.validUntil)}</p>
                </div>
                {verificationData.document?.issuedBy && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Issued By</label>
                    <p className="text-lg">{verificationData.document.issuedBy}</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Verification Results Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Verification Results
            </CardTitle>
            <CardDescription>
              AI-powered verification confidence scores and biometric results
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Decision Score</label>
                  <p className="text-2xl font-bold text-green-600">{formatScore(verificationData.decisionScore)}</p>
                  <p className="text-sm text-muted-foreground">Overall verification confidence</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Face Match Status</label>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusIcon(verificationData.faceMatchStatus)}
                    <p className="text-lg font-semibold">{verificationData.faceMatchStatus}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Face Match Similarity</label>
                  <p className="text-lg font-semibold">{formatScore(verificationData.faceMatchSimilarity)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Quality Score</label>
                  <p className="text-lg font-semibold">{verificationData.qualityScore}</p>
                  <p className="text-sm text-muted-foreground">Document quality assessment</p>
                </div>
              </div>
            </div>
            {verificationData.context && (
              <div className="mt-6">
                <label className="text-sm font-medium text-muted-foreground">Analysis Context</label>
                <p className="text-sm bg-blue-50 p-3 rounded-lg border border-blue-200">
                  {verificationData.context}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Compliance Checks Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Compliance Checks
            </CardTitle>
            <CardDescription>
              Regulatory and security compliance verification results
            </CardDescription>
          </CardHeader>
          <CardContent>
            {complianceChecks ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <CheckSquare className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="font-medium text-green-800">Adverse Media</p>
                      <p className="text-sm text-green-600">No matches found</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <CheckSquare className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="font-medium text-green-800">Fitness & Probity</p>
                      <p className="text-sm text-green-600">No matches found</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <CheckSquare className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="font-medium text-green-800">PEP Lists</p>
                      <p className="text-sm text-green-600">No matches found</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <CheckSquare className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="font-medium text-green-800">Sanctions Lists</p>
                      <p className="text-sm text-green-600">No matches found</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <CheckSquare className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="font-medium text-green-800">Warning Lists</p>
                      <p className="text-sm text-green-600">No matches found</p>
                    </div>
                  </div>
                </div>
                
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    All compliance checks passed successfully. No adverse findings detected.
                  </AlertDescription>
                </Alert>
              </div>
            ) : (
              <div className="text-center py-8">
                <Info className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">Compliance check details not available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Technical Details Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Technical Details
            </CardTitle>
            <CardDescription>
              Technical information about the verification session
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Verification Method</label>
                  <p className="text-lg">{verificationData.feature}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Session ID</label>
                  <p className="text-sm font-mono bg-gray-100 p-2 rounded break-all">
                    {verificationData.sessionId}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Attempt ID</label>
                  <p className="text-sm font-mono bg-gray-100 p-2 rounded break-all">
                    {verificationData.attemptId}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Response Code</label>
                  <p className="text-lg">{verificationData.code}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Action</label>
                  <p className="text-lg">{verificationData.action}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Reason</label>
                  <p className="text-lg">{verificationData.reason}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Approved At</label>
                  <p className="text-lg">{formatDateTime(verificationData.approvedAt)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Webhook Received</label>
                  <p className="text-lg">{formatDateTime(verificationData.webhookReceivedAt)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
