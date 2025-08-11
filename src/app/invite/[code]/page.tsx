'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Users, Plane, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface InvitePageProps {
  params: Promise<{
    code: string;
  }>;
}

export default function InvitePage({ params }: InvitePageProps) {
  const router = useRouter();
  const { code } = use(params);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [inviteValid, setInviteValid] = useState(false);
  const [inviteData, setInviteData] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    validateInviteCode();
  }, [code]);

  const validateInviteCode = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/community-board/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inviteCode: code,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setInviteValid(true);
        setInviteData(data);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Invalid invite code');
        setInviteValid(false);
      }
    } catch (error) {
      console.error('Error validating invite code:', error);
      setError('Failed to validate invite code');
      setInviteValid(false);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinCommunity = () => {
    // Store invite data in localStorage for registration
    if (inviteData) {
      localStorage.setItem('inviteData', JSON.stringify(inviteData));
    }
    router.push('/register');
  };

  const handleSignIn = () => {
    // Store invite data in localStorage for after login
    if (inviteData) {
      localStorage.setItem('inviteData', JSON.stringify(inviteData));
    }
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Validating invite code...</p>
        </div>
      </div>
    );
  }

  if (!inviteValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
              <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle className="text-xl">Invalid Invite</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              {error || 'This invite link is invalid or has expired.'}
            </p>
            <Button onClick={() => router.push('/')} className="w-full">
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
            <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-xl">You're Invited!</CardTitle>
          <p className="text-gray-600 dark:text-gray-400">
            Join our aviation community
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Community Features */}
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900 dark:text-white">
              What you can do:
            </h3>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <Plane className="h-4 w-4 text-blue-600" />
                <span>Ask for help with flights and training</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-green-600" />
                <span>Offer support to fellow pilots</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-purple-600" />
                <span>Connect with the aviation community</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button onClick={handleJoinCommunity} className="w-full" size="lg">
              Join Community
            </Button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-300 dark:border-gray-600" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-gray-900 px-2 text-gray-500">
                  Or
                </span>
              </div>
            </div>
            <Button 
              onClick={handleSignIn} 
              variant="outline" 
              className="w-full"
            >
              Sign In
            </Button>
          </div>

          {/* Invite Code Display */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Invite Code
            </p>
            <p className="font-mono text-sm font-medium text-gray-900 dark:text-white">
              {code}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
