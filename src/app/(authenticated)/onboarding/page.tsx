'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { OnboardingFlow } from '@/components/OnboardingFlow';

export default function OnboardingPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/login');
          return;
        }

        const response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch user data');
        }

        const userData = await response.json();
        setUser(userData);

      } catch (error) {
        console.error('Error fetching user:', error);
        toast.error('Failed to load user data');
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [router]);

  const handleOnboardingComplete = () => {
    toast.success('Onboarding completed! Welcome to Cruiser Aviation!');
    // Redirect to dashboard after successful onboarding
    router.push('/dashboard');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6 mt-6">

      {/* Onboarding Flow - Always visible for prospects */}
      {user && (
        <OnboardingFlow
          onComplete={handleOnboardingComplete}
          userId={user.id}
          userData={{
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            email: user.email || '',
          }}
        />
      )}
    </div>
  );
}