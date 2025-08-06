'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { 
  User, 
  FileText, 
  Bell, 
  Sun, 
  Moon, 
  LogOut,
  Settings,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { OptimizedAvatar } from '@/components/ui/optimized-avatar';
import { useDateFormatUtils } from '@/hooks/use-date-format';
import { formatVersion } from '@/lib/version';

interface UserMenuProps {
  user: {
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
  } | null;
  onLogout: () => void;
  notificationCount?: number;
}

export function UserMenu({ user, onLogout, notificationCount = 0 }: UserMenuProps) {
  const router = useRouter();
  const { setTheme, theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const { formatDate } = useDateFormatUtils();

  if (!user) {
    return null;
  }

  const handleNavigate = (path: string) => {
    router.push(path);
    setIsOpen(false);
  };

  const handleLogout = () => {
    onLogout();
    setIsOpen(false);
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-12 w-12 p-0 hover:bg-accent transition-colors rounded-full"
        >
          <div className="relative">
            <OptimizedAvatar
              src={user.avatarUrl}
              alt={`${user.firstName} ${user.lastName}`}
              fallback={`${user.firstName} ${user.lastName}`}
              size="md"
            />
            {notificationCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
              >
                {notificationCount > 9 ? '9+' : notificationCount}
              </Badge>
            )}
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex items-center space-x-2">
          <OptimizedAvatar
            src={user.avatarUrl}
            alt={`${user.firstName} ${user.lastName}`}
            fallback={`${user.firstName} ${user.lastName}`}
            size="sm"
          />
          <div className="flex flex-col">
            <span className="text-sm font-medium">
              {user.firstName} {user.lastName}
            </span>
            <span className="text-xs text-muted-foreground">
              {user.email}
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={() => handleNavigate('/my-account')}>
          <User className="mr-2 h-4 w-4" />
          <span>My Account</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => handleNavigate('/billing')}>
          <FileText className="mr-2 h-4 w-4" />
          <span>Invoices</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => handleNavigate('/notifications')}>
          <Bell className="mr-2 h-4 w-4" />
          <span>Notifications</span>
          {notificationCount > 0 && (
            <Badge variant="secondary" className="ml-auto text-xs">
              {notificationCount}
            </Badge>
          )}
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => handleNavigate('/settings')}>
          <Settings className="mr-2 h-4 w-4" />
          <span>System Settings</span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => setTheme('light')}>
          <Sun className="mr-2 h-4 w-4" />
          <span>Light</span>
          {theme === 'light' && (
            <Badge variant="secondary" className="ml-auto text-xs">
              Active
            </Badge>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>
          <Moon className="mr-2 h-4 w-4" />
          <span>Dark</span>
          {theme === 'dark' && (
            <Badge variant="secondary" className="ml-auto text-xs">
              Active
            </Badge>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>
          <Settings className="mr-2 h-4 w-4" />
          <span>System</span>
          {theme === 'system' && (
            <Badge variant="secondary" className="ml-auto text-xs">
              Active
            </Badge>
          )}
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleLogout} className="text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Logout</span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <div className="px-2 py-1.5">
          <div className="text-xs text-muted-foreground text-center">
            <div>Version {formatVersion()}</div>
            <div>Last updated: {formatDate(new Date())}</div>
            <div className="mt-1 opacity-60">
              {formatVersion(false, true)}
            </div>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 