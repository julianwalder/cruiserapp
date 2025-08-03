'use client';

import { AppLayout } from '@/components/AppLayout';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  Plane, 
  Calendar, 
  Settings as SettingsIcon, 
  FileText,
  Home,
  Shield,
  MapPin,
  DollarSign,
  Clock,
  Upload
} from 'lucide-react';
import PilotOverview from '@/components/PilotOverview';

import { User } from "@/types/uuid-types";
import { cn } from "@/lib/utils";

// Extended User interface for dashboard with userRoles
interface DashboardUser extends User {
  userRoles: Array<{
    roles: {
      id: string;
      name: string;
    };
  }>;
}

export default function DashboardPage() {
  const [user, setUser] = useState<DashboardUser | null>(null);
  const [viewMode, setViewMode] = useState<'personal' | 'company'>('company');
  const [stats, setStats] = useState({
    totalUsers: 0,
    newUsersThisMonth: 0,
    totalAirfields: 0,
    importedAirfields: 0,
    totalOperationalAreas: 0,
    totalBases: 0,
    activeSessions: 0,
    sessionsToday: 0,
  });

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/dashboard/stats?viewMode=${viewMode}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
  
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    }
  };

  const fetchRecentActivity = async (page = 1) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/activity?page=${page}&limit=${activityPagination.limit}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setRecentActivity(data.activities || []);
        setActivityPagination(data.pagination || {
          page: 1,
          limit: 10,
          total: 0,
          pages: 0,
          hasNext: false,
          hasPrev: false
        });
      }
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    }
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          
          // Set appropriate view mode based on user role
          const userRoles = userData.userRoles?.map((ur: { roles: { name: string } }) => ur.roles?.name) || [];
          const isPilot = userRoles.includes('PILOT');
          const isStudent = userRoles.includes('STUDENT');
          const isInstructor = userRoles.includes('INSTRUCTOR');
          const isAdmin = userRoles.includes('ADMIN') || userRoles.includes('SUPER_ADMIN');
          const isBaseManager = userRoles.includes('BASE_MANAGER');
          
          // Admins, instructors, and base managers should default to company view (priority over pilot/student)
          if (isAdmin || isInstructor || isBaseManager) {
            setViewMode('company');
          }
          // Pilots and students should ONLY see personal view
          else if (isPilot || isStudent) {
            setViewMode('personal');
          }
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
      }
    };

    fetchUser();
    fetchStats();
    fetchRecentActivity();
  }, []);

  // Refetch stats when viewMode changes
  useEffect(() => {
    if (user && isAdminOrManager()) {
      fetchStats();
    }
  }, [viewMode, user]);

  const hasRole = (roleName: string) => {
    return user?.userRoles.some(userRole => userRole.roles.name === roleName) || false;
  };

  const isPilotOrStudent = () => {
    return hasRole('PILOT') || hasRole('STUDENT');
  };

  const isAdminOrManager = () => {
    return hasRole('SUPER_ADMIN') || hasRole('ADMIN') || hasRole('BASE_MANAGER') || hasRole('INSTRUCTOR');
  };

  const [recentActivity, setRecentActivity] = useState<Array<{
    id: string;
    title: string;
    description: string;
    time: string;
    type: string;
    entityType: string;
    entityId?: string;
    user?: {
      id: string;
      name: string;
      email: string;
    } | null;
    metadata?: Record<string, any>;
  }>>([]);

  const [activityPagination, setActivityPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
    hasNext: false,
    hasPrev: false
  });

  return (
    <AppLayout>
      {isPilotOrStudent() && !isAdminOrManager() && (
        <PilotOverview />
      )}
      
      {isAdminOrManager() && (
        <div className="space-y-6">
          {/* View Mode Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-card-foreground">
                {viewMode === 'personal' ? 'Personal Overview' : 'Company Overview'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {viewMode === 'personal' 
                  ? 'Your personal statistics and activities' 
                  : 'Company-wide statistics and overview'
                }
              </p>
            </div>
            <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'personal' | 'company')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="personal" className="text-xs">Personal</TabsTrigger>
                <TabsTrigger value="company" className="text-xs">Company</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          {/* Content based on view mode */}
          {viewMode === 'personal' && (
            <PilotOverview />
          )}
          
          {viewMode === 'company' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <Card className="card-hover">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalUsers}</div>
                    <p className="text-xs text-muted-foreground">
                      +{stats.newUsersThisMonth} this month
                    </p>
                  </CardContent>
                </Card>

                <Card className="card-hover">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Airfields</CardTitle>
                    <Plane className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalAirfields}</div>
                    <p className="text-xs text-muted-foreground">
                      {stats.importedAirfields} imported
                    </p>
                  </CardContent>
                </Card>

                <Card className="card-hover">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Operational Areas</CardTitle>
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalOperationalAreas}</div>
                    <p className="text-xs text-muted-foreground">
                      {stats.totalBases} bases configured
                    </p>
                  </CardContent>
                </Card>

                <Card className="card-hover">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.activeSessions}</div>
                    <p className="text-xs text-muted-foreground">
                      {stats.sessionsToday} today
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card className="card-hover">
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>
                    Common tasks and shortcuts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Button 
                      variant="outline" 
                      className="h-20 flex flex-col items-center justify-center space-y-2 hover:bg-accent"
                      asChild
                    >
                      <a href="/users">
                        <Users className="h-6 w-6" />
                        <span>Manage Users</span>
                      </a>
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="h-20 flex flex-col items-center justify-center space-y-2 hover:bg-accent"
                      asChild
                    >
                      <a href="/airfields">
                        <Plane className="h-6 w-6" />
                        <span>View Airfields</span>
                      </a>
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="h-20 flex flex-col items-center justify-center space-y-2 hover:bg-accent"
                      asChild
                    >
                      <a href="/settings">
                        <SettingsIcon className="h-6 w-6" />
                        <span>System Settings</span>
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-hover">
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>
                    Latest system events and updates
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentActivity.length > 0 ? (
                      <>
                        {recentActivity.map((activity) => (
                          <div key={activity.id} className="flex items-center space-x-4">
                            <div className={cn(
                              "h-2 w-2 rounded-full",
                              activity.type.includes('USER_') ? "bg-blue-500" :
                              activity.type.includes('FLIGHT_') ? "bg-green-500" :
                              activity.type.includes('AIRCRAFT_') ? "bg-orange-500" :
                              activity.type.includes('AIRFIELD_') ? "bg-purple-500" :
                              activity.type.includes('INVOICE_') ? "bg-yellow-500" :
                              activity.type.includes('SYSTEM_') ? "bg-gray-500" :
                              "bg-primary"
                            )}></div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-card-foreground truncate">{activity.title}</p>
                              <p className="text-xs text-muted-foreground truncate">{activity.description}</p>
                              {activity.user && (
                                <p className="text-xs text-muted-foreground">by {activity.user.name}</p>
                              )}
                            </div>
                            <Badge variant="secondary" className="text-xs whitespace-nowrap">
                              {activity.time}
                            </Badge>
                          </div>
                        ))}
                        
                        {/* Pagination Controls */}
                        {activityPagination.pages > 1 && (
                          <div className="flex items-center justify-between pt-4 border-t">
                            <div className="text-xs text-muted-foreground">
                              Showing {((activityPagination.page - 1) * activityPagination.limit) + 1} to {Math.min(activityPagination.page * activityPagination.limit, activityPagination.total)} of {activityPagination.total} activities
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => fetchRecentActivity(activityPagination.page - 1)}
                                disabled={!activityPagination.hasPrev}
                              >
                                Previous
                              </Button>
                              <span className="text-xs text-muted-foreground">
                                Page {activityPagination.page} of {activityPagination.pages}
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => fetchRecentActivity(activityPagination.page + 1)}
                                disabled={!activityPagination.hasNext}
                              >
                                Next
                              </Button>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <div className="text-muted-foreground text-sm">
                          No recent activity
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Activity will appear here as users interact with the system
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </AppLayout>
  );
} 