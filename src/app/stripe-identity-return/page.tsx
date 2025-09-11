'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function StripeIdentityReturnPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'processing'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleReturn = async () => {
      try {
        const sessionId = searchParams.get('session_id');
        const userId = searchParams.get('user_id');
        
        if (!sessionId || !userId) {
          setStatus('error');
          setMessage('Missing required parameters');
          return;
        }

        // Check verification status
        const token = localStorage.getItem('token');
        if (!token) {
          setStatus('error');
          setMessage('Authentication required');
          return;
        }

        // Check verification status multiple times to catch webhook updates
        const checkStatus = async () => {
          const response = await fetch('/api/stripe-identity/status', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            throw new Error('Failed to check verification status');
          }

          return response.json();
        };

        // Initial status check
        let data = await checkStatus();
        
        if (data.isVerified) {
          setStatus('success');
          setMessage('Identity verification completed successfully!');
          toast.success('Verification completed successfully!');
          
          // Notify parent window if opened in popup
          if (window.opener) {
            window.opener.postMessage({
              type: 'STRIPE_IDENTITY_VERIFIED',
              sessionId,
              userId
            }, '*');
          }
        } else if (data.status === 'processing') {
          setStatus('processing');
          setMessage('Your verification is being processed. This may take a few minutes.');
          
          // Poll for status updates every 3 seconds for up to 2 minutes
          let attempts = 0;
          const maxAttempts = 40; // 2 minutes
          
          const pollStatus = setInterval(async () => {
            try {
              attempts++;
              data = await checkStatus();
              
              if (data.isVerified) {
                clearInterval(pollStatus);
                setStatus('success');
                setMessage('Identity verification completed successfully!');
                toast.success('Verification completed successfully!');
                
                // Notify parent window if opened in popup
                if (window.opener) {
                  window.opener.postMessage({
                    type: 'STRIPE_IDENTITY_VERIFIED',
                    sessionId,
                    userId
                  }, '*');
                }
              } else if (data.status === 'canceled' || data.status === 'requires_input') {
                clearInterval(pollStatus);
                setStatus('error');
                setMessage('Verification was not completed successfully.');
              } else if (attempts >= maxAttempts) {
                clearInterval(pollStatus);
                setStatus('processing');
                setMessage('Verification is taking longer than expected. Please check back later.');
              }
            } catch (error) {
              console.error('Error polling verification status:', error);
              if (attempts >= maxAttempts) {
                clearInterval(pollStatus);
                setStatus('error');
                setMessage('Failed to check verification status.');
              }
            }
          }, 3000);
          
        } else if (data.status === 'canceled') {
          setStatus('error');
          setMessage('Verification was canceled.');
        } else {
          setStatus('error');
          setMessage('Verification was not completed successfully.');
        }

      } catch (error) {
        console.error('Error handling Stripe Identity return:', error);
        setStatus('error');
        setMessage('An error occurred while processing your verification.');
        toast.error('Failed to process verification');
      }
    };

    handleReturn();
  }, [searchParams]);

  const getStatusIcon = () => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-12 w-12 text-green-600" />;
      case 'error':
        return <XCircle className="h-12 w-12 text-red-600" />;
      case 'processing':
        return <Clock className="h-12 w-12 text-amber-600" />;
      default:
        return <RefreshCw className="h-12 w-12 text-blue-600 animate-spin" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'processing':
        return 'text-amber-600';
      default:
        return 'text-blue-600';
    }
  };

  const handleClose = () => {
    // Close the window if it was opened in a popup
    if (window.opener) {
      window.close();
    } else {
      // Redirect to the main app
      window.location.href = '/my-account';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {getStatusIcon()}
          </div>
          <CardTitle className={getStatusColor()}>
            {status === 'loading' && 'Processing Verification...'}
            {status === 'success' && 'Verification Complete'}
            {status === 'error' && 'Verification Failed'}
            {status === 'processing' && 'Verification Processing'}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            {message}
          </p>
          
          {status === 'processing' && (
            <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Your documents are being reviewed. You'll receive an email notification once the verification is complete.
              </p>
            </div>
          )}
          
          <div className="flex gap-2 justify-center">
            <Button onClick={handleClose} variant="outline">
              {window.opener ? 'Close Window' : 'Return to Account'}
            </Button>
            
            {status === 'processing' && (
              <Button onClick={() => window.location.reload()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Status
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
