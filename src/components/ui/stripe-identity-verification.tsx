'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  CheckCircle, 
  XCircle, 
  Clock, 
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface StripeIdentityVerificationProps {
  userId: string;
  userData: {
    firstName: string;
    lastName: string;
    email: string;
  };
  onStatusChange?: (status: string) => void;
  className?: string;
}

interface StripeIdentityStatus {
  isVerified: boolean;
  sessionId: string | null;
  status: string | null;
  verifiedData?: any;
}

export function StripeIdentityVerification({ 
  userId, 
  userData, 
  onStatusChange,
  className 
}: StripeIdentityVerificationProps) {
  const [status, setStatus] = useState<StripeIdentityStatus>({
    isVerified: false,
    sessionId: null,
    status: null
  });
  const [loading, setLoading] = useState(true);
  const [creatingSession, setCreatingSession] = useState(false);
  const [hasInitialFetch, setHasInitialFetch] = useState(false);

  // Fetch verification status
  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      
      // Check if we're in a browser environment
      if (typeof window === 'undefined') {
        console.log('Not in browser environment, skipping fetch');
        return;
      }
      
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No authentication token found - this is expected for test page');
        setStatus({
          isVerified: false,
          sessionId: null,
          status: 'not_authenticated'
        });
        return;
      }

      const response = await fetch('/api/stripe-identity/status', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.log('Authentication failed - token may be invalid');
          setStatus({
            isVerified: false,
            sessionId: null,
            status: 'authentication_failed'
          });
          return;
        }
        throw new Error(`Failed to fetch verification status: ${response.status}`);
      }

      const data = await response.json();
      setStatus(data);
      setHasInitialFetch(true);
      
      if (onStatusChange) {
        console.log('Calling onStatusChange with:', data.status || 'not_started');
        // Only call onStatusChange if the status has actually changed
        if (data.status !== status.status) {
          onStatusChange(data.status || 'not_started');
        }
      }

    } catch (error) {
      console.error('Error fetching Stripe Identity status:', error);
      setStatus({
        isVerified: false,
        sessionId: null,
        status: 'error'
      });
      // Only show toast error if we have a token (user is logged in)
      if (typeof window !== 'undefined' && localStorage.getItem('token')) {
        toast.error('Failed to load verification status');
      }
    } finally {
      setLoading(false);
    }
  }, [onStatusChange]);

  // Create verification session
  const createSession = async () => {
    try {
      setCreatingSession(true);
      
      // Check if we're in a browser environment
      if (typeof window === 'undefined') {
        console.log('Not in browser environment, cannot create session');
        return;
      }
      
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please log in to start identity verification');
        return;
      }

      const response = await fetch('/api/stripe-identity/create-session', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create verification session');
      }

      if (data.sessionUrl) {
        // Open Stripe Identity verification in new window
        window.open(data.sessionUrl, '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
        
        toast.success('Verification session created! Please complete the verification in the new window.');
        
        // Refresh status after a short delay
        setTimeout(() => {
          fetchStatus();
        }, 2000);
      }

    } catch (error) {
      console.error('Error creating Stripe Identity session:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create verification session');
    } finally {
      setCreatingSession(false);
    }
  };

  // Check for URL parameters indicating verification completion
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const stripeStatus = urlParams.get('stripe_identity_status');
    const sessionId = urlParams.get('session_id');
    
    if (stripeStatus === 'completed' && sessionId) {
      console.log('Stripe Identity completion detected:', { stripeStatus, sessionId });
      
      toast.success('Verification completed! Checking status...');
      
      // Only refresh if we're not already verified
      if (!status.isVerified && status.status !== 'verified') {
        // Refresh status multiple times to ensure we get the updated status
        const refreshStatus = () => {
          fetchStatus();
        };
        
        // Refresh immediately, then after 2s, 5s, and 10s to catch webhook updates
        refreshStatus();
        setTimeout(refreshStatus, 2000);
        setTimeout(refreshStatus, 5000);
        setTimeout(refreshStatus, 10000);
      }
      
      // Clear URL parameters
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('stripe_identity_status');
      newUrl.searchParams.delete('session_id');
      window.history.replaceState({}, '', newUrl.toString());
    }
  }, [fetchStatus, status.isVerified, status.status]);

  // Listen for messages from popup window
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'STRIPE_IDENTITY_VERIFIED') {
        console.log('Received verification completion message from popup:', event.data);
        toast.success('Verification completed successfully!');
        
        // Only refresh status if we're not already verified
        if (!status.isVerified && status.status !== 'verified') {
          fetchStatus();
        }
        
        // Call the onStatusChange callback if provided
        if (onStatusChange) {
          onStatusChange({
            isVerified: true,
            sessionId: event.data.sessionId,
            status: 'verified'
          });
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [fetchStatus, onStatusChange]);

  // Initial status fetch - only fetch once and if not already verified
  useEffect(() => {
    // Only fetch status if we haven't fetched yet and don't already have a verified status
    if (!hasInitialFetch && !status.isVerified && status.status !== 'verified') {
      fetchStatus();
    }
  }, [fetchStatus, hasInitialFetch, status.isVerified, status.status]);

  const getStatusIcon = () => {
    if (status.isVerified) return <ShieldCheck className="h-5 w-5 text-green-600" />;
    if (status.status === 'verified') return <CheckCircle className="h-5 w-5 text-green-600" />;
    if (status.status === 'canceled') return <XCircle className="h-5 w-5 text-red-600" />;
    if (status.status === 'processing') return <Clock className="h-5 w-5 text-amber-600" />;
    if (status.status === 'requires_input') return <ShieldAlert className="h-5 w-5 text-blue-600" />;
    
    return <Shield className="h-5 w-5 text-gray-400" />;
  };

  const getStatusText = () => {
    if (!status.status) return 'Not Started';
    
    if (status.isVerified) return 'Verified';
    if (status.status === 'verified') return 'Verified';
    if (status.status === 'canceled') return 'Canceled';
    if (status.status === 'processing') return 'Processing';
    if (status.status === 'requires_input') return 'Requires Input';
    if (status.status === 'requires_action') return 'Requires Action';
    if (status.status === 'not_authenticated') return 'Not Authenticated';
    if (status.status === 'authentication_failed') return 'Authentication Failed';
    if (status.status === 'error') return 'Error';
    
    return 'Not Started';
  };

  const getStatusColor = () => {
    if (!status.status) return 'outline';
    
    if (status.isVerified || status.status === 'verified') return 'default';
    if (status.status === 'canceled') return 'destructive';
    if (status.status === 'processing') return 'secondary';
    if (status.status === 'requires_input') return 'default';
    if (status.status === 'not_authenticated' || status.status === 'authentication_failed') return 'secondary';
    if (status.status === 'error') return 'destructive';
    
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
              <p className="text-sm text-muted-foreground mt-1">
                Verify your identity securely
              </p>
            </div>
            <Badge variant={getStatusColor()}>
              {getStatusText()}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {status.isVerified ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Identity verified successfully</span>
              </div>
              
              {status.verifiedData && (
                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                  <h4 className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
                    Verified Information
                  </h4>
                  <div className="text-xs text-green-700 dark:text-green-300 space-y-1">
                    {status.verifiedData.firstName && status.verifiedData.lastName && (
                      <div>Name: {status.verifiedData.firstName} {status.verifiedData.lastName}</div>
                    )}
                    {status.verifiedData.idNumber && (
                      <div>ID Number: {status.verifiedData.idNumber}</div>
                    )}
                    {status.verifiedData.country && (
                      <div>Country: {status.verifiedData.country}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                {status.status === 'requires_input' ? (
                  <p>Your verification session is ready. Click below to complete your identity verification.</p>
                ) : status.status === 'processing' ? (
                  <p>Your verification is being processed. Please wait while we review your documents.</p>
                ) : status.status === 'not_authenticated' ? (
                  <p>Please log in to your account to start identity verification.</p>
                ) : status.status === 'authentication_failed' ? (
                  <p>Authentication failed. Please log in again to start identity verification.</p>
                ) : status.status === 'error' ? (
                  <p>An error occurred while loading verification status. Please try again.</p>
                ) : (
                  <p>Start the identity verification process by clicking the button below.</p>
                )}
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={createSession}
                  disabled={creatingSession || status.status === 'not_authenticated' || status.status === 'authentication_failed'}
                  className="flex items-center gap-2"
                >
                  {creatingSession ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <ExternalLink className="h-4 w-4" />
                  )}
                  {creatingSession ? 'Creating Session...' : 
                   status.status === 'not_authenticated' || status.status === 'authentication_failed' ? 
                   'Please Log In First' : 'Start Verification'}
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={fetchStatus}
                  disabled={loading}
                >
                  <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
