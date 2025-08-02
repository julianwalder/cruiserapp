'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';

// Mock notification data
const mockNotifications = [
  {
    id: 1,
    type: 'flight',
    title: 'Flight Log Approved',
    message: 'Your flight log from yesterday has been approved by the instructor.',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    read: false,
    avatar: 'FL'
  },
  {
    id: 2,
    type: 'system',
    title: 'System Maintenance',
    message: 'Scheduled maintenance will occur tonight at 2:00 AM. Expect brief downtime.',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
    read: false,
    avatar: 'SM'
  },
  {
    id: 3,
    type: 'billing',
    title: 'Payment Received',
    message: 'Payment of €150.00 for flight hours package has been received.',
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    read: true,
    avatar: 'PR'
  },
  {
    id: 4,
    type: 'fleet',
    title: 'Aircraft Available',
    message: 'Aircraft C-152 (D-EFGH) is now available for booking.',
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    read: true,
    avatar: 'AA'
  },
  {
    id: 5,
    type: 'weather',
    title: 'Weather Alert',
    message: 'Strong winds expected in the area. Check weather conditions before flight.',
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    read: true,
    avatar: 'WA'
  }
];

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'flight':
      return '✈️';
    case 'system':
      return '⚙️';
    case 'billing':
      return '💰';
    case 'fleet':
      return '🛩️';
    case 'weather':
      return '🌤️';
    default:
      return '📢';
  }
};

const getNotificationColor = (type: string) => {
  switch (type) {
    case 'flight':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'system':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
    case 'billing':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'fleet':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    case 'weather':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  }
};

export function NotificationBadge() {
  const router = useRouter();
  const [notifications] = useState(mockNotifications);
  const unreadCount = notifications.filter(n => !n.read).length;

  const handleViewAllNotifications = () => {
    router.push('/notifications');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative h-9 w-9 p-0 hover:bg-accent"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {unreadCount} new
            </Badge>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No notifications</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              className={`p-3 cursor-pointer ${!notification.read ? 'bg-accent/50' : ''}`}
            >
              <div className="flex items-start space-x-3 w-full">
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarFallback className={`text-xs ${getNotificationColor(notification.type)}`}>
                    {notification.avatar}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-sm">{getNotificationIcon(notification.type)}</span>
                    <p className={`text-sm font-medium ${!notification.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {notification.title}
                    </p>
                    {!notification.read && (
                      <div className="h-2 w-2 bg-primary rounded-full flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-1 line-clamp-2">
                    {notification.message}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                  </p>
                </div>
              </div>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          className="text-center text-primary font-medium"
          onClick={handleViewAllNotifications}
        >
          View all notifications
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 