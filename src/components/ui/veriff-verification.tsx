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
import { useVeriffData } from '@/hooks/use-veriff-data';

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



export function VeriffVerification({ 
  userId, 
  userData, 
  onStatusChange,
  className 
}: VeriffVerificationProps) {

  // Use the new robust Veriff data hook
  const {
    veriffData,
    veriffStatus,
    loading,
    error,
    fetchVerificationData,
    fetchVeriffStatus,
    createVerificationSession: hookCreateSession,
    refresh,
    isVerified,
    needsVerification,
    hasSession,
    sessionUrl,
    status: veriffStatusString,
    getStatusText: hookGetStatusText,
    getStatusColor: hookGetStatusColor
  } = useVeriffData(userId);

  const [creatingSession, setCreatingSession] = useState(false);

  // Check for URL parameters indicating verification completion
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const veriffStatus = urlParams.get('veriff_status');
    const sessionId = urlParams.get('session_id');
    
    if (veriffStatus === 'completed') {
      console.log('Veriff completion detected:', { veriffStatus, sessionId });
      
      // Show a success message
      toast.success('Verification completed! Checking status...');
      
      // Refresh status multiple times to ensure we get the updated status
      const refreshStatus = () => {
        refresh();
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
  }, [refresh]);

  // Notify parent component of status changes
  useEffect(() => {
    if (veriffStatusString) {
      onStatusChange?.(veriffStatusString);
    }
  }, [veriffStatusString, onStatusChange]);

  const handleCreateVerificationSession = async () => {
    setCreatingSession(true);
    try {
      const session = await hookCreateSession(userData);
      if (session) {
        toast.success('Verification session created successfully');
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
    if (!veriffStatus) return <Shield className="h-5 w-5 text-gray-400" />;
    
    if (isVerified) return <ShieldCheck className="h-5 w-5 text-green-600" />;
    if (veriffStatusString === 'approved') return <CheckCircle className="h-5 w-5 text-green-600" />;
    if (veriffStatusString === 'declined') return <XCircle className="h-5 w-5 text-red-600" />;
    if (veriffStatusString === 'submitted') return <Clock className="h-5 w-5 text-amber-600" />;
    if (veriffStatusString === 'created') return <ShieldAlert className="h-5 w-5 text-blue-600" />;
    
    return <Shield className="h-5 w-5 text-gray-400" />;
  };

  const getStatusText = () => {
    if (!veriffStatus) return 'Not Started';
    
    if (isVerified) return 'Verified';
    if (veriffStatusString === 'approved') return 'Approved';
    if (veriffStatusString === 'declined') return 'Declined';
    if (veriffStatusString === 'submitted') return 'Under Review';
    if (veriffStatusString === 'created') return 'Session Created';
    if (veriffStatusString === 'abandoned') return 'Abandoned';
    if (veriffStatusString === 'expired') return 'Expired';
    
    return 'Not Started';
  };

  const getStatusColor = () => {
    if (!veriffStatus) return 'outline';
    
    if (isVerified || veriffStatusString === 'approved') return 'default';
    if (veriffStatusString === 'declined') return 'destructive';
    if (veriffStatusString === 'submitted') return 'secondary';
    if (veriffStatusString === 'created') return 'default';
    
    return 'outline';
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {getStatusIcon()}
                Identity Verification
              </CardTitle>
              <CardDescription className="mt-2">
                <Badge 
                  variant={getStatusColor()}
                  className={getStatusText() === 'Not Started' ? 'bg-orange-100 text-orange-800 border-orange-200' : ''}
                >
                  {getStatusText()}
                </Badge>
              </CardDescription>
            </div>
            
            {/* Action Button in Header */}
            {!isVerified && (
              <div>
                {(() => {
                  if (veriffStatus?.needsNewSession) {
                    return (
                      <Button 
                        onClick={handleCreateVerificationSession} 
                        disabled={creatingSession}
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
                    );
                  }
                  
                  if (!hasSession) {
                    return (
                      <Button 
                        onClick={handleCreateVerificationSession} 
                        disabled={creatingSession}
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
                  } else if (veriffStatusString === 'created') {
                    if (sessionUrl) {
                      return (
                        <Button 
                          onClick={openVerificationSession}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Continue Verification
                        </Button>
                      );
                    } else {
                      return (
                        <div className="flex gap-2">
                          <Button 
                            onClick={handleCreateVerificationSession}
                            disabled={creatingSession}
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
                          <Button 
                            onClick={refresh}
                            variant="outline"
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Check Status
                          </Button>
                        </div>
                      );
                    }
                  } else {
                    return (
                      <Button 
                        onClick={refresh}
                        variant="outline"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Check Status
                      </Button>
                    );
                  }
                })()}
              </div>
            )}
          </div>
        </CardHeader>
      
      <CardContent className="space-y-4">

        {/* Verification Details */}
        {veriffData && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Verification Details:</h4>
            <div className="text-xs text-muted-foreground space-y-1">
              <div>Document: {veriffData.document?.type} - {veriffData.document?.number}</div>
              <div>Country: {veriffData.document?.country}</div>
              {veriffData.faceMatchStatus && (
                <div>Face Match: {veriffData.faceMatchStatus}</div>
              )}
            </div>
          </div>
        )}

        {/* Information Alert - Only show when not verified */}
        {!isVerified && veriffStatusString !== 'approved' && (
          <Alert className="bg-blue-50 border-blue-200">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-700">
              You'll need a government-issued ID (passport or national ID) and a device with a camera to complete the verification.
            </AlertDescription>
          </Alert>
        )}

        {/* Status-specific messages */}
        {veriffStatusString === 'created' && (
          <Alert className="bg-amber-50 border-amber-200">
            <Clock className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-700">
              A verification session was created but may have expired. You can start a new verification session or check if your previous session is still active.
            </AlertDescription>
          </Alert>
        )}

        {veriffStatusString === 'declined' && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              Your verification was declined. Please contact support for assistance.
            </AlertDescription>
          </Alert>
        )}

        {veriffStatusString === 'submitted' && (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              Your verification is under review. This usually takes 1-2 business days.
            </AlertDescription>
          </Alert>
        )}

        {isVerified && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Your identity has been successfully verified. You can now access all features.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>


    
  </div>
  );
} 