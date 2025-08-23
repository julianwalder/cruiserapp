import { useState, useEffect, useCallback } from 'react';
import { useAuthToken } from './use-auth-token';

export interface VeriffData {
  // Session and metadata
  sessionId?: string;
  verificationId?: string;
  status?: string;
  feature?: string;
  code?: number;
  reason?: string;
  action?: string;

  // Person data
  person?: {
    givenName?: string;
    lastName?: string;
    idNumber?: string;
    dateOfBirth?: string;
    nationality?: string;
    gender?: string;
    country?: string;
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

  // Legacy fields
  isVerified?: boolean;
  identityVerifiedAt?: string;
}

export interface VeriffStatus {
  isVerified: boolean;
  sessionId?: string;
  sessionUrl?: string;
  veriffStatus?: string;
  veriffData?: VeriffData;
  needsVerification: boolean;
  needsNewSession?: boolean;
}

export function useVeriffData(userId?: string) {
  const [veriffData, setVeriffData] = useState<VeriffData | null>(null);
  const [veriffStatus, setVeriffStatus] = useState<VeriffStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getAuthHeaders } = useAuthToken();

  // Fetch comprehensive verification data
  const fetchVerificationData = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/veriff/verification-data/${userId}`, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const result = await response.json();
        setVeriffData(result.data);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to fetch verification data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch verification data');
    } finally {
      setLoading(false);
    }
  }, [userId, getAuthHeaders]);

  // Fetch current Veriff status using the new robust system
  const fetchVeriffStatus = useCallback(async (showLoading = true) => {
    if (!userId) return;

    try {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);

      // Use the new enhanced verification data endpoint
      const response = await fetch(`/api/veriff/verification-data/${userId}`, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const result = await response.json();
        // Transform the data to match the expected format
        const verificationData = result.data;
        const statusData = {
          isVerified: verificationData.isVerified || false,
          sessionId: verificationData.sessionId,
          veriffStatus: verificationData.status,
          veriffData: verificationData,
          needsVerification: !verificationData.isVerified,
          needsNewSession: !verificationData.sessionId && !verificationData.isVerified
        };
        setVeriffStatus(statusData);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to fetch Veriff status');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch Veriff status');
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [userId, getAuthHeaders]);

  // Create new verification session
  const createVerificationSession = useCallback(async (userData: {
    firstName: string;
    lastName: string;
    email: string;
  }) => {
    if (!userId) return null;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/veriff/create-session', {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (response.ok) {
        // Refresh status after creating session
        await fetchVeriffStatus();
        return data.session;
      } else {
        setError(data.error || 'Failed to create verification session');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create verification session');
      return null;
    } finally {
      setLoading(false);
    }
  }, [userId, getAuthHeaders, fetchVeriffStatus]);

  // Refresh all data
  const refresh = useCallback(async () => {
    await fetchVeriffStatus(); // This now fetches both status and data
  }, [fetchVeriffStatus]);

  // Auto-refresh on mount and when userId changes
  useEffect(() => {
    if (userId) {
      fetchVeriffStatus();
    }
  }, [userId]); // Remove fetchVeriffStatus from dependencies to prevent infinite loops

  // Set up real-time updates (polling)
  useEffect(() => {
    if (!userId) return;

    // Only poll if verification is in progress and we have a session
    const isInProgress = veriffStatus?.veriffStatus === 'created' || 
                        veriffStatus?.veriffStatus === 'submitted';

    // Don't poll if verification is complete, declined, or no session exists
    if (!isInProgress || !veriffStatus?.sessionId || veriffStatus?.isVerified) {
      return;
    }

    const interval = setInterval(() => {
      fetchVeriffStatus(false); // Don't show loading during background polling
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(interval);
  }, [userId, veriffStatus?.sessionId, veriffStatus?.veriffStatus, veriffStatus?.isVerified]); // Remove fetchVeriffStatus from dependencies

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setVeriffData(null);
      setVeriffStatus(null);
      setError(null);
    };
  }, []);

  return {
    // Data
    veriffData: veriffStatus?.veriffData || null,
    veriffStatus,
    
    // State
    loading,
    error,
    
    // Actions
    fetchVerificationData,
    fetchVeriffStatus,
    createVerificationSession,
    refresh,
    
    // Computed values
    isVerified: veriffStatus?.isVerified || false,
    needsVerification: !veriffStatus?.isVerified,
    hasSession: !!veriffStatus?.sessionId,
    sessionUrl: veriffStatus?.sessionUrl,
    status: veriffStatus?.veriffStatus,
    
    // Helper functions
    getStatusText: () => {
      if (!veriffStatus) return 'Unknown';
      if (veriffStatus.isVerified) return 'Verified';
      if (veriffStatus.veriffStatus === 'approved') return 'Approved';
      if (veriffStatus.veriffStatus === 'declined') return 'Declined';
      if (veriffStatus.veriffStatus === 'submitted') return 'Under Review';
      if (veriffStatus.veriffStatus === 'created') return 'Session Created';
      return 'Not Started';
    },
    
    getStatusColor: () => {
      if (!veriffStatus) return 'outline';
      if (veriffStatus.isVerified || veriffStatus.veriffStatus === 'approved') return 'default';
      if (veriffStatus.veriffStatus === 'declined') return 'destructive';
      if (veriffStatus.veriffStatus === 'submitted') return 'secondary';
      if (veriffStatus.veriffStatus === 'created') return 'default';
      return 'outline';
    }
  };
}
