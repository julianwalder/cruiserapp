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
    status: string;
    person: {
      givenName: string;
      lastName: string;
      idNumber?: string;
      dateOfBirth?: string;
      nationality?: string;
      gender?: string;
      country?: string;
    };
    document: {
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
  };
}

export function VeriffIDVResults({ veriffData }: VeriffIDVResultsProps) {
  const getStatusIcon = () => {
    switch (veriffData.status) {
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
    switch (veriffData.status) {
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
    return new Date(dateString).toLocaleDateString();
  };

  const formatDecisionScore = (score?: number) => {
    if (!score) return 'N/A';
    return `${(score * 100).toFixed(1)}%`;
  };

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
              {veriffData.status.toUpperCase()}
            </Badge>
            {veriffData.decisionScore && (
              <Badge variant="outline">
                Confidence: {formatDecisionScore(veriffData.decisionScore)}
              </Badge>
            )}
          </div>
        </CardHeader>
      </Card>

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
                {veriffData.person.givenName} {veriffData.person.lastName}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Date of Birth</label>
              <p className="text-lg">{formatDate(veriffData.person.dateOfBirth)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Nationality</label>
              <p className="text-lg">{veriffData.person.nationality || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Gender</label>
              <p className="text-lg">{veriffData.person.gender || 'N/A'}</p>
            </div>
            {veriffData.person.idNumber && (
              <div>
                <label className="text-sm font-medium text-gray-500">ID Number</label>
                <p className="text-lg font-mono">{veriffData.person.idNumber}</p>
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
              <p className="text-lg font-semibold">{veriffData.document.type}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Document Number</label>
              <p className="text-lg font-mono">{veriffData.document.number}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Issuing Country</label>
              <p className="text-lg">{veriffData.document.country}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Issued By</label>
              <p className="text-lg">{veriffData.document.issuedBy || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Valid From</label>
              <p className="text-lg">{formatDate(veriffData.document.validFrom)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Valid Until</label>
              <p className="text-lg">{formatDate(veriffData.document.validUntil)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Face Match Results */}
      {veriffData.additionalVerification?.faceMatch && (
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
                  {veriffData.additionalVerification.faceMatch.status === 'approved' ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  <p className="text-lg font-semibold">
                    {veriffData.additionalVerification.faceMatch.status.toUpperCase()}
                  </p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Similarity Score</label>
                <p className="text-lg font-semibold">
                  {formatDecisionScore(veriffData.additionalVerification.faceMatch.similarity)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Insights */}
      {veriffData.insights && (
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Info className="h-5 w-5" />
              <CardTitle>Verification Insights</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {veriffData.insights.quality && (
              <div>
                <label className="text-sm font-medium text-gray-500">Quality Assessment</label>
                <p className="text-lg">{veriffData.insights.quality}</p>
              </div>
            )}
            {veriffData.insights.flags && veriffData.insights.flags.length > 0 && (
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
            {veriffData.insights.context && (
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