'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { NewSidebar } from '@/components/NewSidebar';
import { UserMenu } from '@/components/UserMenu';
import { useNotificationCount } from '@/hooks/use-notification-count';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  userRoles: Array<{
    roles: {
      id: string;
      name: string;
    };
  }>;
  status: string;
}

interface AppLayoutProps {
  children: React.ReactNode;
  pageTitle?: string;
}

export function AppLayout({ children, pageTitle }: AppLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);
  const { count: notificationCount } = useNotificationCount();

  // Handle hydration state
  useEffect(() => {
    setIsHydrated(true);
  }, []);

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
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        } else {
          router.push('/login');
          return;
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
        router.push('/login');
        return;
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Clear cookie for middleware
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict';
    
    // Dispatch auth-change event to notify other components
    window.dispatchEvent(new Event('auth-change'));
    
    router.push('/login');
  };

  // Get page title from pathname if not provided
  const getPageTitle = useMemo(() => {
    if (pageTitle) return pageTitle;
    
    const path = pathname.split('/')[1];
    switch (path) {
      case 'dashboard':
        return 'Dashboard';
      case 'users':
        return 'Users';
      case 'airfields':
        return 'Airfields';
      case 'bases':
        return 'Bases';
      case 'fleet':
        return 'Fleet';
      case 'flight-logs':
        return 'Flight Logs';
      case 'scheduling':
        return 'Scheduling';
      case 'accounting':
        return 'Accounting';
      case 'packages':
        return 'Buy Flight Hours';
      case 'usage':
        return 'Usage';
      case 'community-board':
        return 'Community Board';
      case 'reports':
        return 'Reports';
      case 'billing':
        return 'Billing';
      case 'role-management':
        return 'Role Management';
      default:
        return 'Dashboard';
    }
  }, [pageTitle, pathname]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900">
      {isHydrated && <NewSidebar user={user} onLogout={handleLogout} />}
      
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0 sticky-container">
        <header 
          className="sticky-header px-4 sm:px-6 flex items-center"
          data-hydrating={!isHydrated}
          data-hydrated={isHydrated}
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-4">
              <div className="lg:ml-0 ml-12">
                {!isHydrated ? (
                  <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                ) : (
                  <h1 className="text-xl sm:text-2xl font-semibold text-card-foreground">
                    {getPageTitle}
                  </h1>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {isHydrated && <UserMenu user={user} onLogout={handleLogout} notificationCount={notificationCount} />}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto pt-8 pb-4 px-4 sm:pt-10 sm:pb-6 sm:px-6 bg-white dark:bg-gray-900 content-with-sticky-header announcement-offset">
          {children}
        </main>
      </div>
    </div>
  );
} 