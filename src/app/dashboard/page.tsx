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

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
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
          const userRoles = userData.userRoles?.map((ur: any) => ur.roles?.name) || [];
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

  const recentActivity = [
    { title: 'New user registered', description: 'John Doe registered as a pilot', time: '2 minutes ago' },
    { title: 'Flight scheduled', description: 'Flight C172-001 scheduled for tomorrow', time: '15 minutes ago' },
    { title: 'Maintenance due', description: 'Aircraft C172-002 requires maintenance', time: '1 hour ago' },
    { title: 'Role updated', description: 'Jane Smith promoted to Flight Instructor', time: '2 hours ago' },
  ];

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
                    {recentActivity.map((activity, index) => (
                      <div key={index} className="flex items-center space-x-4">
                        <div className="h-2 w-2 bg-primary rounded-full"></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-card-foreground">{activity.title}</p>
                          <p className="text-xs text-muted-foreground">{activity.description}</p>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {activity.time}
                        </Badge>
                      </div>
                    ))}
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