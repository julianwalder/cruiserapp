'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2 } from 'lucide-react';

export default function VeriffCompletePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isRedirecting, setIsRedirecting] = useState(false);
  
  const veriffStatus = searchParams.get('veriff_status');
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    // Auto-redirect after 3 seconds
    const timer = setTimeout(() => {
      setIsRedirecting(true);
      router.push('/my-account?veriff_status=' + (veriffStatus || 'completed') + '&session_id=' + (sessionId || ''));
    }, 3000);

    return () => clearTimeout(timer);
  }, [router, veriffStatus, sessionId]);

  const handleManualRedirect = () => {
    setIsRedirecting(true);
    router.push('/my-account?veriff_status=' + (veriffStatus || 'completed') + '&session_id=' + (sessionId || ''));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle className="text-xl">Verification Complete!</CardTitle>
          <CardDescription>
            Your identity verification has been completed successfully.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          {isRedirecting ? (
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Redirecting to your account...</span>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                You will be automatically redirected to your account page in a few seconds.
              </p>
              <Button onClick={handleManualRedirect} className="w-full">
                Go to My Account
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 