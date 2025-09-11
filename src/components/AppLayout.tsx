'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { NewSidebar } from '@/components/NewSidebar';
import { UserMenu } from '@/components/UserMenu';
import { User } from '@/types/uuid-types';
import { useNotificationCount } from '@/hooks/use-notification-count';
import { AuthService } from '@/lib/auth';

interface AuthenticatedUser extends User {
  userRoles: Array<{
    roles: {
      id: string;
      name: string;
    };
  }>;
  isImpersonation?: boolean;
  originalUserId?: string;
}

interface AppLayoutProps {
  children: React.ReactNode;
  pageTitle?: string;
}

export function AppLayout({ children, pageTitle }: AppLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { count: notificationCount } = useNotificationCount();

  // Handle hydration state
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    const fetchUser = async (retryCount = 0) => {
      try {
        // Ensure token consistency between localStorage and cookies
        AuthService.ensureTokenConsistency();
        
        // Check for impersonation token first, then fall back to regular token
        const impersonationToken = localStorage.getItem('impersonationToken');
        const token = impersonationToken || AuthService.getToken();
        
        console.log('🔍 AppLayout - Token check:', {
          hasImpersonationToken: !!impersonationToken,
          hasRegularToken: !!AuthService.getToken(),
          usingImpersonationToken: !!impersonationToken,
          impersonationTokenPreview: impersonationToken ? impersonationToken.substring(0, 20) + '...' : 'none',
          regularTokenPreview: AuthService.getToken() ? AuthService.getToken()?.substring(0, 20) + '...' : 'none',
          retryCount
        });
        
        if (!token) {
          console.log('🔍 AppLayout - No token found, redirecting to login');
          router.push('/login');
          return;
        }

        // Ensure cookie is set if we have a token in localStorage
        if (token && !document.cookie.includes('token=')) {
          console.log('🔍 AppLayout - Token in localStorage but not in cookie, setting cookie');
          AuthService.syncTokenToCookie(token);
        }

        console.log('🔍 AppLayout - Making /api/auth/me request with token:', token.substring(0, 20) + '...');
        
        const response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const userData = await response.json();
          console.log('🔍 AppLayout - User data fetched successfully:', userData.email);
          setUser(userData);
        } else {
          console.log('🔍 AppLayout - API call failed, status:', response.status);
          
          // If it's a 401 and we have a token, try to refresh or retry once
          if (response.status === 401 && retryCount < 1) {
            console.log('🔍 AppLayout - 401 error, retrying once...');
            // Small delay before retry
            await new Promise(resolve => setTimeout(resolve, 500));
            return fetchUser(retryCount + 1);
          }
          
          router.push('/login');
          return;
        }
      } catch (error) {
        console.error('🔍 AppLayout - Failed to fetch user:', error);
        
        // Retry once on network errors
        if (retryCount < 1) {
          console.log('🔍 AppLayout - Network error, retrying once...');
          await new Promise(resolve => setTimeout(resolve, 500));
          return fetchUser(retryCount + 1);
        }
        
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
    localStorage.removeItem('impersonationToken');
    localStorage.removeItem('originalToken');
    
    // Clear cookie for middleware
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict';
    
    // Dispatch auth-change event to notify other components
    window.dispatchEvent(new Event('auth-change'));
    
    router.push('/login');
  };

  const handleSidebarStateChange = (collapsed: boolean) => {
    setIsSidebarCollapsed(collapsed);
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
      {isHydrated && <NewSidebar user={user} onLogout={handleLogout} onSidebarStateChange={handleSidebarStateChange} />}
      
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        <header 
          className={`sticky-header px-4 sm:px-6 flex items-center transition-all duration-300 ${
            isSidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
          }`}
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

        <main className="flex-1 overflow-y-auto pb-4 px-4 sm:pb-6 sm:px-6 bg-white dark:bg-gray-900 content-with-sticky-header">
          {children}
        </main>
      </div>
    </div>
  );
} 