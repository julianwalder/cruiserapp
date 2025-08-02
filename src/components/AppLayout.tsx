'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { NewSidebar } from '@/components/NewSidebar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { NotificationBadge } from '@/components/NotificationBadge';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
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
    router.push('/login');
  };

  // Get page title from pathname if not provided
  const getPageTitle = () => {
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
      case 'reports':
        return 'Reports';
      case 'billing':
        return 'Billing';
      case 'client-hours':
        return 'Client Hours';
      default:
        return 'Dashboard';
    }
  };

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
      <NewSidebar user={user} onLogout={handleLogout} />
      
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        <header className="bg-card shadow-sm border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 h-16 flex items-center">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-4">
              <div className="lg:ml-0 ml-12">
                <h1 className="text-xl sm:text-2xl font-semibold text-card-foreground">
                  {getPageTitle()}
                </h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <NotificationBadge />
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-white dark:bg-gray-900">
          {children}
        </main>
      </div>
    </div>
  );
} 