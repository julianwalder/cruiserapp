import { useCallback } from 'react';

export function useAuthToken() {
  const getAuthToken = useCallback(() => {
    // Check for impersonation token first, then fall back to regular token
    const impersonationToken = localStorage.getItem('impersonationToken');
    const regularToken = localStorage.getItem('token');
    
    return impersonationToken || regularToken;
  }, []);

  const getAuthHeaders = useCallback(() => {
    const token = getAuthToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }, [getAuthToken]);

  return {
    getAuthToken,
    getAuthHeaders,
  };
}
