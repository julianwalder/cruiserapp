'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { GreetingCard } from "@/components/GreetingCard";

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
  const [recentActivity, setRecentActivity] = useState([]);
  const [activityPagination, setActivityPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
    hasNext: false,
    hasPrev: false
  });

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/dashboard/stats?viewMode=company`, {
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
          console.log('🔍 Dashboard: User data loaded:', userData);
          console.log('🔍 Dashboard: User roles:', userData.userRoles);
          setUser(userData);
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
      }
    };

    fetchUser();
    fetchStats();
    fetchRecentActivity();
  }, []);

  const hasRole = (roleName: string) => {
    return user?.userRoles?.some(userRole => userRole.roles.name === roleName) || false;
  };

  const isPilotOrStudent = () => {
    return hasRole('PILOT') || hasRole('STUDENT');
  };

  const isAdminOrManager = () => {
    return hasRole('ADMIN') || hasRole('SUPER_ADMIN') || hasRole('BASE_MANAGER');
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 mt-6">
      {/* Greeting Card for Pilots, Students, Instructors, and Prospects */}
      {(() => {
        const shouldShowGreeting = user?.userRoles?.some(userRole => 
          ['PILOT', 'STUDENT', 'INSTRUCTOR', 'PROSPECT'].includes(userRole.roles.name)
        );
        console.log('🔍 Dashboard: Should show greeting card:', shouldShowGreeting);
        console.log('🔍 Dashboard: User roles for greeting check:', user?.userRoles);
        return shouldShowGreeting && <GreetingCard user={user} />;
      })()}
      
      {/* Content based on user role */}
      {isPilotOrStudent() && !isAdminOrManager() && (
        <PilotOverview />
      )}
      
      {isAdminOrManager() && (
        <div className="space-y-6">
          {/* Stats Grid */}
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

          {/* Recent Activity */}
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Activity
              </CardTitle>
              <CardDescription>
                Latest system activities and updates
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentActivity.length > 0 ? (
                <div className="space-y-4">
                  {recentActivity.map((activity: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                        <div>
                          <p className="text-sm font-medium">{activity.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {activity.user?.name || 'System'} • {activity.time}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No recent activity</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
} 