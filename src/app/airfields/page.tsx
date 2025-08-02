'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { NewSidebar } from '@/components/NewSidebar';
import AirfieldsManagement from '@/components/AirfieldsManagement';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function AirfieldsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem('token');
        console.log('Airfields page - Token:', token ? 'exists' : 'missing');
        
        if (!token) {
          console.log('Airfields page - No token, redirecting to login');
          router.push('/login');
          return;
        }

        const response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        console.log('Airfields page - Auth response status:', response.status);
        
        if (response.ok) {
          const userData = await response.json();
          console.log('Airfields page - User data:', userData);
          
          if (!userData) {
            console.log('Airfields page - No user data, redirecting to login');
            router.push('/login');
            return;
          }
          
          setUser(userData);
          setLoading(false);
        } else {
          console.log('Airfields page - Auth failed, redirecting to login');
          router.push('/login');
        }
      } catch (error) {
        console.error('Airfields page - Error fetching user:', error);
        router.push('/login');
      }
    };

    fetchUser();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };



  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900">
      <NewSidebar user={user} onLogout={handleLogout} />
      
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        <header className="bg-card shadow-sm border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 h-16 flex items-center">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-4">
              <div className="lg:ml-0 ml-12">
                <h1 className="text-xl sm:text-2xl font-semibold text-card-foreground">
                  Airfield Management
                </h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-card-foreground">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-primary-foreground">
                  {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                </span>
              </div>
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-white dark:bg-gray-900">
          <AirfieldsManagement />
        </main>
      </div>
    </div>
  );
} 