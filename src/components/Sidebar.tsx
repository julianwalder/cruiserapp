'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Plane, 
  Users, 
  Calendar, 
  Settings, 
  LogOut, 
  BarChart3,
  FileText,
  Menu,
  X,
  Home,
  User as UserIcon,
  Shield,
  MapPin
} from 'lucide-react';

import { User } from "@/types/uuid-types";

// Extended User interface for sidebar with roles
interface SidebarUser extends User {
  roles: string[];
}

interface SidebarProps {
  user: SidebarUser | null;
  onLogout: () => void;
  onSidebarStateChange?: (isCollapsed: boolean) => void;
}

const navigationItems = [
  {
    name: 'Overview',
    href: '/dashboard',
    icon: Home,
    description: 'Dashboard overview'
  },
  {
    name: 'Users',
    href: '/dashboard?tab=users',
    icon: Users,
    description: 'Manage users and roles'
  },
  {
    name: 'Aircraft',
    href: '/dashboard?tab=aircraft',
    icon: Plane,
    description: 'Aircraft management'
  },
  {
    name: 'Airfields',
    href: '/dashboard?tab=airfields',
    icon: MapPin,
    description: 'Airfield management'
  },
  {
    name: 'Bases',
    href: '/dashboard?tab=base-management',
    icon: Shield,
    description: 'Designate and manage bases'
  },
  {
    name: 'Scheduling',
    href: '/dashboard?tab=scheduling',
    icon: Calendar,
    description: 'Flight scheduling'
  },
  {
    name: 'Reports',
    href: '/dashboard?tab=reports',
    icon: FileText,
    description: 'Analytics and reports'
  },
  {
    name: 'Settings',
    href: '/dashboard?tab=settings',
    icon: Settings,
    description: 'System settings'
  },
];

export default function Sidebar({ user, onLogout, onSidebarStateChange }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Notify parent component when sidebar state changes
  useEffect(() => {
    onSidebarStateChange?.(isCollapsed);
  }, [isCollapsed, onSidebarStateChange]);

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
        return 'bg-muted text-muted-foreground border border-gray-200 dark:border-gray-700';
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

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const handleNavigation = (href: string) => {
    router.push(href);
    setIsMobileOpen(false);
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      // Overview is active when we're on dashboard with no tab or tab=overview
      const currentTab = searchParams.get('tab');
      return pathname === '/dashboard' && (!currentTab || currentTab === 'overview');
    }
    // For other items, check if the tab matches
    const expectedTab = href.split('=')[1];
    const currentTab = searchParams.get('tab');
    return pathname === '/dashboard' && currentTab === expectedTab;
  };

  const handleToggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="bg-white dark:bg-gray-900 shadow-md"
        >
          {isMobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-white/80 dark:bg-gray-900/80 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed top-0 left-0 h-full bg-white dark:bg-gray-900 shadow-lg z-30 transition-all duration-300
        ${isCollapsed ? 'w-16' : 'w-64'}
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          {!isCollapsed && (
            <div className="flex items-center space-x-2">
                      <Plane className="h-8 w-8 text-primary" />
        <div>
          <h1 className="font-bold text-lg text-card-foreground">Cruiser Aviation</h1>
          <p className="text-xs text-muted-foreground">Management System</p>
        </div>
            </div>
          )}
          {isCollapsed && (
            <div className="flex justify-center w-full">
              <Plane className="h-8 w-8 text-primary" />
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleCollapse}
            className="hidden lg:flex"
          >
            {isCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
          </Button>
        </div>

        {/* User Profile */}
        {user && (
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <Avatar>
                <AvatarFallback>
                  {getInitials(user.firstName, user.lastName)}
                </AvatarFallback>
              </Avatar>
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col space-y-2">
                    <div className="font-medium text-sm">
                      {user.firstName} {user.lastName}
                    </div>
                    <div className="text-xs text-muted-foreground">{user.email}</div>
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((role) => (
                        <Badge key={role} className={`text-xs ${getRoleBadgeColor(role)}`}>
                          {getRoleDisplayName(role)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            
            return (
              <Button
                key={item.name}
                variant={active ? "default" : "ghost"}
                className={`
                  w-full justify-start h-12
                  ${active ? 'bg-primary text-primary-foreground' : 'text-card-foreground hover:bg-accent'}
                  ${isCollapsed ? 'px-2' : 'px-4'}
                `}
                onClick={() => handleNavigation(item.href)}
              >
                <Icon className={`h-5 w-5 ${isCollapsed ? 'mx-auto' : 'mr-3'}`} />
                {!isCollapsed && (
                  <div className="text-left">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs opacity-75">{item.description}</div>
                  </div>
                )}
              </Button>
            );
          })}
          {/* Conditionally render Role Management for superadmin */}
          {user?.roles.includes('SUPER_ADMIN') && (
            <Button
              variant="ghost"
              className={`
                        w-full justify-start h-12 text-card-foreground hover:bg-accent
        ${isActive('/dashboard?tab=roles') ? 'bg-primary text-primary-foreground' : ''}
                ${isCollapsed ? 'px-2' : 'px-4'}
              `}
              onClick={() => handleNavigation('/dashboard?tab=roles')}
            >
              <Shield className={`h-5 w-5 ${isCollapsed ? 'mx-auto' : 'mr-3'}`} />
              {!isCollapsed && <span>Role Management</span>}
            </Button>
          )}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t">
          <Button
            variant="ghost"
                            className={`w-full justify-start h-12 text-destructive hover:bg-destructive-10 hover:text-destructive-80 ${
              isCollapsed ? 'px-2' : 'px-4'
            }`}
            onClick={onLogout}
          >
            <LogOut className={`h-5 w-5 ${isCollapsed ? 'mx-auto' : 'mr-3'}`} />
            {!isCollapsed && <span>Logout</span>}
          </Button>
        </div>
      </div>

      {/* Mobile header */}
              <div className="lg:hidden h-16 bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700 flex items-center px-4 fixed top-0 left-0 right-0 z-20">
        <div className="flex items-center space-x-2">
                  <Plane className="h-6 w-6 text-primary" />
        <h1 className="font-bold text-lg text-card-foreground">Cruiser Aviation</h1>
        </div>
      </div>
    </>
  );
} 