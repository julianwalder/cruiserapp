'use client';

import { useState, useEffect } from 'react';
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

// Interface for activity data from API
interface ActivityData {
  id: string;
  title: string;
  description: string;
  time: string;
  type: string;
  entityType: string;
  entityId: string;
  user: {
    id: string;
    name: string;
    email: string;
  } | null;
  metadata: any;
}

// Convert activity data to notification format
const convertActivityToNotification = (activity: ActivityData) => {
  const getTypeFromAction = (action: string) => {
    if (action.includes('FLIGHT')) return 'flight';
    if (action.includes('USER')) return 'system';
    if (action.includes('INVOICE') || action.includes('BILLING')) return 'billing';
    if (action.includes('AIRCRAFT') || action.includes('FLEET')) return 'fleet';
    if (action.includes('AIRFIELD')) return 'system';
    return 'system';
  };

  const getAvatar = (user: { name: string } | null) => {
    if (!user) return 'SYS';
    return user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return {
    id: activity.id,
    type: getTypeFromAction(activity.type),
    title: activity.title,
    message: activity.description || `${activity.title} performed by ${activity.user?.name || 'System'}`,
    timestamp: new Date(), // We'll use the time string for display
    timeString: activity.time,
    read: false, // All activities are considered unread initially
    avatar: getAvatar(activity.user),
    user: activity.user
  };
};

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
      return '🔔';
  }
};

const getNotificationColor = (type: string) => {
  switch (type) {
    case 'flight':
      return 'bg-blue-100 text-blue-600';
    case 'system':
      return 'bg-gray-100 text-gray-600';
    case 'billing':
      return 'bg-green-100 text-green-600';
    case 'fleet':
      return 'bg-purple-100 text-purple-600';
    case 'weather':
      return 'bg-yellow-100 text-yellow-600';
    default:
      return 'bg-gray-100 text-gray-600';
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
      return 'Notification';
  }
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('all');

  // Fetch real activity data
  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        if (!token) {
          setError('No authentication token found');
          return;
        }

        const response = await fetch('/api/activity?page=1&limit=50', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch activities');
        }

        const data = await response.json();
        const convertedNotifications = data.activities.map(convertActivityToNotification);
        setNotifications(convertedNotifications);
      } catch (err) {
        console.error('Error fetching activities:', err);
        setError(err instanceof Error ? err.message : 'Failed to load notifications');
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, []);

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
    <div className="space-y-6 mt-6">
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
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading notifications...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Error loading notifications</p>
              <p className="text-xs text-muted-foreground mt-2">{error}</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
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
                        {notification.user?.name ? `${notification.user.name} - ${notification.title}` : notification.title}
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
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        {notification.user?.name || 'System'} • {notification.timeString}
                      </p>
                    </div>
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
  );
} 