'use client';

import { AppLayout } from '@/components/AppLayout';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Bell, 
  Search, 
  Filter, 
  CheckCircle, 
  Circle,
  Trash2,
  Archive,
  Settings
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// Mock notification data (same as in NotificationBadge)
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
  },
  {
    id: 6,
    type: 'flight',
    title: 'New Training Session',
    message: 'A new training session has been scheduled for next week.',
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    read: true,
    avatar: 'TS'
  },
  {
    id: 7,
    type: 'billing',
    title: 'Invoice Generated',
    message: 'Your monthly invoice has been generated and is ready for review.',
    timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
    read: true,
    avatar: 'IG'
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

const getTypeLabel = (type: string) => {
  switch (type) {
    case 'flight':
      return 'Flight';
    case 'system':
      return 'System';
    case 'billing':
      return 'Billing';
    case 'fleet':
      return 'Fleet';
    case 'weather':
      return 'Weather';
    default:
      return 'Other';
  }
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState(mockNotifications);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('all');

  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         notification.message.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = selectedTypes.length === 0 || selectedTypes.includes(notification.type);
    
    const matchesTab = activeTab === 'all' || 
                      (activeTab === 'unread' && !notification.read) ||
                      (activeTab === 'read' && notification.read);

    return matchesSearch && matchesType && matchesTab;
  });

  const unreadCount = notifications.filter(n => !n.read).length;
  const readCount = notifications.filter(n => n.read).length;

  const markAsRead = (id: number) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, read: true }))
    );
  };

  const deleteNotification = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const toggleTypeFilter = (type: string) => {
    setSelectedTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const notificationTypes = ['flight', 'system', 'billing', 'fleet', 'weather'];

  return (
    <AppLayout pageTitle="Notifications">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-end">
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={markAllAsRead}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark all as read
            </Button>
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between space-x-4">
              <div className="flex items-center space-x-2 flex-1">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search notifications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>
              
              <div className="flex flex-wrap gap-2">
                {notificationTypes.map(type => (
                  <Button
                    key={type}
                    variant={selectedTypes.includes(type) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleTypeFilter(type)}
                  >
                    {getNotificationIcon(type)} {getTypeLabel(type)}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications List */}
        <Card>
          <CardHeader>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="all">All ({notifications.length})</TabsTrigger>
                <TabsTrigger value="unread">Unread ({unreadCount})</TabsTrigger>
                <TabsTrigger value="read">Read ({readCount})</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            {filteredNotifications.length === 0 ? (
              <div className="text-center py-8">
                <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No notifications found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`flex items-start space-x-4 p-4 rounded-lg border ${
                      !notification.read ? 'bg-accent/50' : ''
                    }`}
                  >
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarFallback className={`text-sm ${getNotificationColor(notification.type)}`}>
                        {notification.avatar}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-sm">{getNotificationIcon(notification.type)}</span>
                        <h3 className={`text-sm font-medium ${!notification.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {notification.title}
                        </h3>
                        {!notification.read && (
                          <Badge variant="secondary" className="text-xs">
                            New
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {getTypeLabel(notification.type)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsRead(notification.id)}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteNotification(notification.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
} 