'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Plane, 
  Users, 
  Calendar, 
  Settings, 
  LogOut, 
  FileText,
  Home,
  Shield,
  MapPin,
  DollarSign,
  ChevronLeft,
  Menu,
  X,
  Clock,
  MoreVertical,
  User
} from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Logo } from '@/components/ui/logo';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

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
    url: '/dashboard?tab=users',
    icon: Users,
    description: 'Manage users and roles'
  },
  {
    title: 'Airfields',
    url: '/dashboard?tab=airfields',
    icon: MapPin,
    description: 'Airfield management'
  },
  {
    title: 'Bases',
    url: '/dashboard?tab=base-management',
    icon: Shield,
    description: 'Base operations'
  },
  {
    title: 'Fleet',
    url: '/dashboard?tab=fleet',
    icon: Plane,
    description: 'Aircraft fleet management'
  },
  {
    title: 'Flight Logs',
    url: '/dashboard?tab=flight-logs',
    icon: Clock,
    description: 'View flight logs'
  },
  {
    title: 'Scheduling',
    url: '/dashboard?tab=scheduling',
    icon: Calendar,
    description: 'Flight scheduling'
  },
  {
    title: 'Accounting',
    url: '/dashboard?tab=accounting',
    icon: DollarSign,
    description: 'Financial management'
  },
  {
    title: 'Reports',
    url: '/dashboard?tab=reports',
    icon: FileText,
    description: 'Analytics and reports'
  },
  {
    title: 'Settings',
    url: '/dashboard?tab=settings',
    icon: Settings,
    description: 'System configuration'
  },
];

export function NewSidebar({ user, onLogout }: NewSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-destructive-10 text-destructive border-destructive-20';
      case 'ADMIN':
        return 'bg-secondary-10 text-secondary-foreground border-secondary-20';
      case 'INSTRUCTOR':
        return 'bg-primary-10 text-primary border-primary-20';
      case 'PILOT':
        return 'bg-success-10 text-success border-success-20';
      case 'STUDENT':
        return 'bg-warning-10 text-warning border-warning-20';
      case 'BASE_MANAGER':
        return 'bg-primary-20 text-primary border-primary-20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'Super Admin';
      case 'ADMIN':
        return 'Admin';
      case 'INSTRUCTOR':
        return 'Instructor';
      case 'PILOT':
        return 'Pilot';
      case 'STUDENT':
        return 'Student';
      case 'BASE_MANAGER':
        return 'Base Manager';
      default:
        return role;
    }
  };

  const getInitials = (firstName: string | undefined | null, lastName: string | undefined | null) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  const hasRole = (roleName: string) => {
    return user?.userRoles.some(userRole => userRole.roles.name === roleName) || false;
  };

  const canAccessBaseManagement = () => {
    return hasRole('SUPER_ADMIN') || hasRole('ADMIN') || hasRole('BASE_MANAGER') || hasRole('PILOT') || hasRole('PROSPECT') || hasRole('INSTRUCTOR');
  };

  const canAccessFleet = () => {
    return hasRole('SUPER_ADMIN') || hasRole('ADMIN') || hasRole('BASE_MANAGER') || hasRole('PILOT') || hasRole('PROSPECT') || hasRole('INSTRUCTOR');
  };

  const canAccessUsers = () => {
    return hasRole('SUPER_ADMIN') || hasRole('ADMIN');
  };

  const canAccessSettings = () => {
    return hasRole('SUPER_ADMIN') || hasRole('ADMIN');
  };

  const canAccessReports = () => {
    return hasRole('SUPER_ADMIN') || hasRole('ADMIN') || hasRole('BASE_MANAGER');
  };

  // Filter navigation items based on user permissions
  const filteredNavigationItems = navigationItems.filter(item => {
    switch (item.title) {
      case 'Users':
        return canAccessUsers();
      case 'Bases':
        return canAccessBaseManagement();
      case 'Fleet':
        return canAccessFleet();
      case 'Settings':
        return canAccessSettings();
      case 'Reports':
        return canAccessReports();
      default:
        return true; // Show other items to all users
    }
  });

  const isActive = (url: string) => {
    if (url === '/dashboard') {
      const currentTab = searchParams.get('tab');
      return pathname === '/dashboard' && (!currentTab || currentTab === 'overview');
    }
    const expectedTab = url.split('=')[1];
    const currentTab = searchParams.get('tab');
    return pathname === '/dashboard' && currentTab === expectedTab;
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
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="bg-background/80 border-border shadow-lg"
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
          fixed top-0 left-0 h-full bg-sidebar border-r border-sidebar-border shadow-xl z-50 transition-all duration-300 ease-in-out flex flex-col
          ${isCollapsed ? 'w-16' : 'w-64'}
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Fixed Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border flex-shrink-0">
          <div className="flex items-center">
            {!isCollapsed ? (
              <Logo width={140} height={32} className="h-8 w-auto" />
            ) : (
              <Logo width={32} height={32} className="h-8 w-8" />
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

        {/* Fixed Footer with User Profile and Actions */}
        <div className="flex-shrink-0 border-t border-sidebar-border">
          {/* User Profile with Menu */}
          {user && (
            <div className="p-4">
              <div className="flex items-center space-x-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-sm font-medium">
                    {getInitials(user.firstName, user.lastName)}
                  </AvatarFallback>
                </Avatar>
                {!isCollapsed && (
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-sidebar-foreground truncate">
                      {user.firstName} {user.lastName}
                    </div>
                    <div className="text-xs text-sidebar-foreground/60 truncate">{user.email}</div>
                    <div className="flex gap-0.5 mt-1">
                      {user.userRoles?.slice(0, 2).map((userRole, index) => (
                        <Badge key={`${userRole.roles.name}-${index}`} className={`text-xs px-0.5 py-0 border flex-shrink-0 ${getRoleBadgeColor(userRole.roles.name)}`}>
                          {getRoleDisplayName(userRole.roles.name)}
                        </Badge>
                      ))}
                      {user.userRoles?.length > 2 && (
                        <Badge variant="outline" className="text-xs px-0.5 py-0 flex-shrink-0">
                          +{user.userRoles.length - 2}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-2 py-1.5">
                      <div className="flex items-center space-x-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs font-medium">
                            {getInitials(user.firstName, user.lastName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-foreground truncate">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                        </div>
                      </div>
                    </div>
                    <div className="h-px bg-gray-300 dark:bg-gray-600 mx-2" />
                    <DropdownMenuItem>
                      <User className="mr-2 h-4 w-4" />
                      Account
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <DollarSign className="mr-2 h-4 w-4" />
                      Billing
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <FileText className="mr-2 h-4 w-4" />
                      Notifications
                    </DropdownMenuItem>
                    <div className="h-px bg-border my-1" />
                    <DropdownMenuItem onClick={onLogout} className="text-destructive">
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Spacer */}
      <div className={`hidden lg:block transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'}`} />
    </>
  );
} 