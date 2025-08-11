'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { OptimizedAvatar } from '@/components/ui/optimized-avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Plane, 
  Users, 
  Calendar, 
  FileText,
  Home,
  Shield,
  MapPin,
  DollarSign,
  ChevronLeft,
  Menu,
  X,
  Clock,
  ShoppingCart,
  MessageSquare
} from 'lucide-react';
import { Logo } from '@/components/ui/logo';

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

interface NewSidebarProps {
  user: User | null;
  onLogout: () => void;
}

const navigationItems = [
  {
    title: 'Overview',
    url: '/dashboard',
    icon: Home,
    description: 'Dashboard overview'
  },
  {
    title: 'Users',
    url: '/users',
    icon: Users,
    description: 'Manage users and roles'
  },
  {
    title: 'Airfields',
    url: '/airfields',
    icon: MapPin,
    description: 'Airfield management'
  },
  {
    title: 'Bases',
    url: '/bases',
    icon: Shield,
    description: 'Base operations'
  },
  {
    title: 'Fleet',
    url: '/fleet',
    icon: Plane,
    description: 'Aircraft fleet management'
  },
  {
    title: 'Flight Logs',
    url: '/flight-logs',
    icon: Clock,
    description: 'View flight logs'
  },
  {
    title: 'Scheduling',
    url: '/scheduling',
    icon: Calendar,
    description: 'Flight scheduling'
  },
  {
    title: 'Accounting',
    url: '/accounting',
    icon: DollarSign,
    description: 'Financial management'
  },
  {
    title: 'Buy Flight Hours',
    url: '/packages',
    icon: ShoppingCart,
    description: 'Purchase flight hour packages'
  },
  {
    title: 'Usage',
    url: '/usage',
    icon: Clock,
    description: 'Hour packages and usage tracking'
  },
  {
    title: 'Community Board',
    url: '/community-board',
    icon: MessageSquare,
    description: 'Ask for help and offer support'
  },
  {
    title: 'Reports',
    url: '/reports',
    icon: FileText,
    description: 'Analytics and reports'
  },

];

export function NewSidebar({ user, onLogout }: NewSidebarProps) {
  // Debug log removed - user authentication is working correctly
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);



  const hasRole = (roleName: string) => {
    return user?.userRoles.some(userRole => userRole.roles.name === roleName) || false;
  };

  const canAccessBaseManagement = () => {
    return hasRole('SUPER_ADMIN') || hasRole('ADMIN') || hasRole('BASE_MANAGER') || hasRole('PILOT') || hasRole('STUDENT') || hasRole('INSTRUCTOR') || hasRole('PROSPECT');
  };

  const canAccessFleet = () => {
    return hasRole('SUPER_ADMIN') || hasRole('ADMIN') || hasRole('BASE_MANAGER') || hasRole('PILOT') || hasRole('STUDENT') || hasRole('INSTRUCTOR') || hasRole('PROSPECT');
  };

  const canAccessUsers = () => {
    return hasRole('SUPER_ADMIN') || hasRole('ADMIN') || hasRole('BASE_MANAGER');
  };

  const canAccessSettings = () => {
    return hasRole('SUPER_ADMIN') || hasRole('ADMIN');
  };

  const canAccessReports = () => {
    return hasRole('SUPER_ADMIN') || hasRole('ADMIN') || hasRole('BASE_MANAGER');
  };

  const canAccessAccounting = () => {
    return hasRole('SUPER_ADMIN') || hasRole('ADMIN');
  };

  const canAccessAirfields = () => {
    return true; // Allow all users to access airfields
  };

  const canAccessUsage = () => {
    return hasRole('SUPER_ADMIN') || hasRole('ADMIN') || hasRole('BASE_MANAGER') || hasRole('PILOT') || hasRole('STUDENT');
  };

  // Filter navigation items based on user permissions
  const filteredNavigationItems = navigationItems.filter(item => {
    let hasAccess = true;
    switch (item.title) {
      case 'Users':
        hasAccess = canAccessUsers();
        break;
      case 'Airfields':
        hasAccess = canAccessAirfields();
        break;
      case 'Bases':
        hasAccess = canAccessBaseManagement();
        break;
      case 'Fleet':
        hasAccess = canAccessFleet();
        break;
      case 'Settings':
        hasAccess = canAccessSettings();
        break;
      case 'Reports':
        hasAccess = canAccessReports();
        break;
      case 'Accounting':
        hasAccess = canAccessAccounting();
        break;
      case 'Usage':
        hasAccess = canAccessUsage();
        break;
      default:
        hasAccess = true; // Show other items to all users
    }
    
    return hasAccess;
  });

  // Debug logs removed - navigation filtering is working correctly

  const isActive = (url: string) => {
    if (url === '/dashboard') {
      const currentTab = searchParams.get('tab');
      return pathname === '/dashboard' && (!currentTab || currentTab === 'overview');
    }
    
    // For dashboard tabs, check if the tab matches
    if (url.startsWith('/dashboard?tab=')) {
      const expectedTab = url.split('=')[1];
      const currentTab = searchParams.get('tab');
      return pathname === '/dashboard' && currentTab === expectedTab;
    }
    
    // For other pages, check if the pathname matches
    return pathname === url;
  };

  const handleNavigation = (url: string) => {
    router.push(url);
    setIsMobileOpen(false);
  };

  // Handle escape key to close mobile sidebar
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isMobileOpen) {
        setIsMobileOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isMobileOpen]);

  // Auto-close mobile sidebar on window resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024 && isMobileOpen) {
        setIsMobileOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobileOpen]);

  // Swipe-to-close functionality
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50; // Minimum swipe distance
    
    if (isLeftSwipe && isMobileOpen) {
      setIsMobileOpen(false);
    }
    
    setTouchStart(null);
    setTouchEnd(null);
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-[calc(env(safe-area-inset-top)+var(--announcement-height,0px))] left-4 z-[60] sticky-container h-16 flex items-center">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="bg-background border-border shadow-lg"
        >
          {isMobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div 
        className={`
          fixed top-[calc(env(safe-area-inset-top)+var(--announcement-height,0px))] left-0 h-[calc(100vh-env(safe-area-inset-top)-var(--announcement-height,0px))] bg-sidebar border-r border-sidebar-border shadow-xl z-50 transition-all duration-300 ease-in-out flex flex-col sticky-container
          ${isCollapsed ? 'w-16' : 'w-64'}
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Fixed Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border flex-shrink-0">
          <div className="flex items-center relative z-10">
            {!isCollapsed ? (
              <Logo width={120} height={28} className="h-7 w-auto lg:ml-0 ml-12" />
            ) : (
              <Logo width={28} height={28} className="h-7 w-7 lg:ml-0 ml-12" />
            )}
          </div>
          
          {/* Collapse Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex h-8 w-8 p-0 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <ChevronLeft className={`h-4 w-4 transition-transform ${isCollapsed ? 'rotate-180' : ''}`} />
          </Button>
        </div>



        {/* Scrollable Navigation */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            
            <nav className="space-y-1">

              {filteredNavigationItems.map((item) => {
                const active = isActive(item.url);
                return (
                  <Button
                    key={item.title}
                    variant="ghost"
                    className={`
                      w-full justify-start h-11 px-3 text-sm font-medium transition-all duration-200
                      ${active 
                        ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm' 
                        : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                      }
                      ${isCollapsed ? 'justify-center px-2' : ''}
                    `}
                    onClick={() => handleNavigation(item.url)}
                  >
                    <item.icon className={`h-4 w-4 ${isCollapsed ? '' : 'mr-3'}`} />
                    {!isCollapsed && <span>{item.title}</span>}
                  </Button>
                );
              })}
              

              
              {/* Role Management for Super Admin */}
              {user?.userRoles.some(userRole => userRole.roles.name === 'SUPER_ADMIN') && (
                <Button
                  variant="ghost"
                  className={`
                    w-full justify-start h-11 px-3 text-sm font-medium transition-all duration-200
                    ${isActive('/dashboard?tab=roles') 
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm' 
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                    }
                    ${isCollapsed ? 'justify-center px-2' : ''}
                  `}
                  onClick={() => handleNavigation('/dashboard?tab=roles')}
                >
                  <Shield className={`h-4 w-4 ${isCollapsed ? '' : 'mr-3'}`} />
                  {!isCollapsed && <span>Role Management</span>}
                </Button>
              )}
            </nav>
          </div>
        </div>

        {/* Fixed Footer - Removed user profile section as it's now in the header */}
      </div>

      {/* Main Content Spacer */}
      <div className={`hidden lg:block transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'}`} />
    </>
  );
} 