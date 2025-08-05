'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  Clock, 
  CheckCircle, 
  XCircle, 
  ExternalLink,
  RefreshCw,
  Info,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { VeriffIDVResults } from './veriff-idv-results';
import { VeriffWebhookStatus } from './veriff-webhook-status';

interface VeriffVerificationProps {
  userId: string;
  userData: {
    firstName: string;
    lastName: string;
    email: string;
  };
  onStatusChange?: (status: string) => void;
  className?: string;
}

interface VeriffStatus {
  isVerified: boolean;
  sessionId?: string;
  sessionUrl?: string;
  veriffStatus?: string;
  veriffData?: any;
  needsVerification: boolean;
  needsNewSession?: boolean;
}

export function VeriffVerification({ 
  userId, 
  userData, 
  onStatusChange,
  className 
}: VeriffVerificationProps) {
  const [status, setStatus] = useState<VeriffStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [creatingSession, setCreatingSession] = useState(false);
  const [sessionUrl, setSessionUrl] = useState<string | null>(null);

  // Fetch current status on mount and check for URL parameters
  useEffect(() => {
    fetchStatus();
    
    // Check for URL parameters indicating verification completion
    const urlParams = new URLSearchParams(window.location.search);
    const veriffStatus = urlParams.get('veriff_status');
    const sessionId = urlParams.get('session_id');
    
    if (veriffStatus === 'completed') {
      console.log('Veriff completion detected:', { veriffStatus, sessionId });
      
      // Show a success message
      toast.success('Verification completed! Checking status...');
      
      // Refresh status multiple times to ensure we get the updated status
      const refreshStatus = () => {
        fetchStatus();
      };
      
      // Refresh immediately, then after 2s, 5s, and 10s to catch webhook updates
      refreshStatus();
      setTimeout(refreshStatus, 2000);
      setTimeout(refreshStatus, 5000);
      setTimeout(refreshStatus, 10000);
      
      // Clear URL parameters
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('veriff_status');
      newUrl.searchParams.delete('session_id');
      window.history.replaceState({}, '', newUrl.toString());
    }
  }, [userId]);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      console.log('Fetching Veriff status...');
      const response = await fetch('/api/veriff/status', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Veriff status response:', data);
        setStatus(data.status);
        
        // If there's a session URL, set it
        if (data.status.sessionUrl) {
          setSessionUrl(data.status.sessionUrl);
        } else if (data.status.sessionId && data.status.veriffStatus === 'created') {
          // Fallback: construct the URL from session ID if sessionUrl is not available
          const sessionUrl = `https://magic.veriff.me/v/${data.status.sessionId}`;
          setSessionUrl(sessionUrl);
        }
        
        onStatusChange?.(data.status.veriffStatus || 'none');
        toast.success('Status updated');
      } else {
        const error = await response.json();
        console.error('Veriff status error:', error);
        toast.error(error.error || 'Failed to fetch verification status');
      }
    } catch (error) {
      console.error('Error fetching Veriff status:', error);
      toast.error('Failed to fetch verification status');
    } finally {
      setLoading(false);
    }
  };

  const createVerificationSession = async () => {
    setCreatingSession(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      const response = await fetch('/api/veriff/create-session', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (response.ok) {
        setSessionUrl(data.session.url);
        setStatus(prev => prev ? {
          ...prev,
          sessionId: data.session.id,
          veriffStatus: 'created',
        } : null);
        toast.success('Verification session created successfully');
      } else {
        if (data.status === 'verified') {
          toast.info('You are already verified');
          fetchStatus(); // Refresh status
        } else if (data.status === 'pending') {
          toast.info('Verification session already exists');
          // You might want to redirect to the existing session
        } else {
          toast.error(data.error || 'Failed to create verification session');
        }
      }
    } catch (error) {
      console.error('Error creating Veriff session:', error);
      toast.error('Failed to create verification session');
    } finally {
      setCreatingSession(false);
    }
  };

  const openVerificationSession = () => {
    if (sessionUrl) {
      window.open(sessionUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const getStatusIcon = () => {
    if (!status) return <Shield className="h-5 w-5" />;
    
    if (status.isVerified) return <ShieldCheck className="h-5 w-5 text-green-600" />;
    if (status.veriffStatus === 'approved') return <CheckCircle className="h-5 w-5 text-green-600" />;
    if (status.veriffStatus === 'declined') return <XCircle className="h-5 w-5 text-red-600" />;
    if (status.veriffStatus === 'submitted') return <Clock className="h-5 w-5 text-amber-600" />;
    if (status.veriffStatus === 'created') return <ShieldAlert className="h-5 w-5 text-blue-600" />;
    
    return <Shield className="h-5 w-5" />;
  };

  const getStatusText = () => {
    if (!status) return 'Unknown';
    
    if (status.isVerified) return 'Verified';
    if (status.veriffStatus === 'approved') return 'Approved';
    if (status.veriffStatus === 'declined') return 'Declined';
    if (status.veriffStatus === 'submitted') return 'Under Review';
    if (status.veriffStatus === 'created') return 'Session Created';
    if (status.veriffStatus === 'abandoned') return 'Abandoned';
    if (status.veriffStatus === 'expired') return 'Expired';
    
    return 'Not Started';
  };

  const getStatusColor = () => {
    if (!status) return 'secondary';
    
    if (status.isVerified || status.veriffStatus === 'approved') return 'default';
    if (status.veriffStatus === 'declined') return 'destructive';
    if (status.veriffStatus === 'submitted') return 'secondary';
    if (status.veriffStatus === 'created') return 'default';
    
    return 'secondary';
  };

  if (loading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="flex items-center justify-center p-6">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading verification status...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getStatusIcon()}
          Identity Verification
        </CardTitle>
        <CardDescription>
          Verify your identity using Veriff's secure verification process
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Display */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Status:</span>
          <Badge variant={getStatusColor()}>
            {getStatusText()}
          </Badge>
        </div>

        {/* Verification Details */}
        {status?.veriffData && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Verification Details:</h4>
            <div className="text-xs text-muted-foreground space-y-1">
              <div>Document: {status.veriffData.document?.type} - {status.veriffData.document?.number}</div>
              <div>Country: {status.veriffData.document?.country}</div>
              {status.veriffData.additionalVerification?.faceMatch && (
                <div>Face Match: {status.veriffData.additionalVerification.faceMatch.status}</div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {!status?.isVerified && (
          <div className="space-y-2">
            {(() => {
              console.log('Current status for button logic:', {
                isVerified: status?.isVerified,
                sessionId: status?.sessionId,
                veriffStatus: status?.veriffStatus,
                sessionUrl: sessionUrl,
                needsNewSession: status?.needsNewSession
              });
              
              // If session expired, show message and create new session button
              if (status?.needsNewSession) {
                return (
                  <div className="space-y-3">
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        <span className="text-sm text-yellow-800">
                          Your previous verification session has expired. Please start a new verification.
                        </span>
                      </div>
                    </div>
                    <Button 
                      onClick={createVerificationSession} 
                      disabled={creatingSession}
                      className="w-full"
                    >
                      {creatingSession ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Creating New Session...
                        </>
                      ) : (
                        <>
                          <Shield className="h-4 w-4 mr-2" />
                          Start New Verification
                        </>
                      )}
                    </Button>
                  </div>
                );
              }
              
              if (!status?.sessionId) {
                return (
                  <Button 
                    onClick={createVerificationSession} 
                    disabled={creatingSession}
                    className="w-full"
                  >
                    {creatingSession ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Creating Session...
                      </>
                    ) : (
                      <>
                        <Shield className="h-4 w-4 mr-2" />
                        Start Verification
                      </>
                    )}
                  </Button>
                );
              } else if (status?.veriffStatus === 'created' && sessionUrl) {
                return (
                  <Button 
                    onClick={openVerificationSession}
                    className="w-full"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Continue Verification
                  </Button>
                );
              } else {
                return (
                  <Button 
                    onClick={fetchStatus}
                    variant="outline"
                    className="w-full"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Check Status
                  </Button>
                );
              }
            })()}
          </div>
        )}

        {/* Information Alert */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            You'll need a government-issued ID (passport or national ID) and a device with a camera to complete the verification.
          </AlertDescription>
        </Alert>

        {/* Status-specific messages */}
        {status?.veriffStatus === 'declined' && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              Your verification was declined. Please contact support for assistance.
            </AlertDescription>
          </Alert>
        )}

        {status?.veriffStatus === 'submitted' && (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              Your verification is under review. This usually takes 1-2 business days.
            </AlertDescription>
          </Alert>
        )}

        {status?.isVerified && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Your identity has been successfully verified. You can now access all features.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>

    {/* Webhook Status */}
    {status?.veriffData && (
      <div className="mt-6">
        <VeriffWebhookStatus veriffData={status.veriffData} />
      </div>
    )}
    
    {/* Debug Info */}
    {process.env.NODE_ENV === 'development' && (
      <div className="mt-4 p-4 bg-gray-100 rounded-lg text-xs">
        <h4 className="font-bold mb-2">Debug Info:</h4>
        <pre>{JSON.stringify({
          hasVeriffData: !!status?.veriffData,
          veriffDataKeys: status?.veriffData ? Object.keys(status.veriffData) : [],
          sessionId: status?.veriffData?.sessionId,
          status: status?.veriffStatus,
          isVerified: status?.isVerified
        }, null, 2)}</pre>
      </div>
    )}

    {/* Full Auto IDV Results */}
    {status?.isVerified && status?.veriffData && (
      <div className="mt-6">
        <VeriffIDVResults veriffData={status.veriffData} />
      </div>
    )}
  </div>
  );
} 