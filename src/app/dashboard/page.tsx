'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { NewSidebar } from '@/components/NewSidebar';
import UserManagement from '@/components/UserManagement';
import AirfieldsManagement from '@/components/AirfieldsManagement';
import OperationalAreaManagement from '@/components/OperationalAreaManagement';
import RoleManagement from '@/components/RoleManagement';
import BaseManagement from '@/components/BaseManagement';
import FleetManagement from '@/components/FleetManagement';
import FlightLogs from '@/components/FlightLogs';
import Reports from '@/components/Reports';
import Settings from '@/components/Settings';
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
  Clock
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  userRoles: Array<{
    role: {
      id: string;
      name: string;
    };
  }>;
  status: string;
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
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

  useEffect(() => {
    const tab = searchParams.get('tab') || 'dashboard';
    setActiveTab(tab);
  }, [searchParams]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/login');
          return;
        }

        const response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData.user);
        } else {
          router.push('/login');
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
        router.push('/login');
      }
    };

    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/dashboard/stats', {
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

    fetchUser();
    fetchStats();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  const handleTabChange = (tab: string) => {
    router.push(`/dashboard?tab=${tab}`);
  };

  const getTabTitle = (tab: string) => {
    switch (tab) {
      case 'dashboard':
        return 'Dashboard';
      case 'users':
        return 'User Management';
      case 'airfields':
        return 'Airfields Management';
      case 'operational-areas':
        return 'Operational Areas';
      case 'role-management':
        return 'Role Management';
      case 'base-management':
        return 'Base Management';
      case 'fleet':
        return 'Fleet Management';
      case 'flight-logs':
        return 'Flight Logs';
      case 'scheduling':
        return 'Scheduling';
      case 'accounting':
        return 'Accounting';
      case 'reports':
        return 'Reports';
      case 'settings':
        return 'Settings';
      default:
        return 'Dashboard';
    }
  };

  const getTabDescription = (tab: string) => {
    switch (tab) {
      case 'dashboard':
        return 'Overview of your flight school operations';
      case 'users':
        return 'Manage users, roles, and permissions';
      case 'airfields':
        return 'Manage airfields and operational areas';
      case 'operational-areas':
        return 'Configure operational areas and bases';
      case 'role-management':
        return 'Manage user roles and permissions';
      case 'base-management':
        return 'Manage base operations and assignments';
      case 'fleet':
        return 'Manage aircraft fleet and operations';
      case 'flight-logs':
        return 'View and manage flight logs and hours';
      case 'scheduling':
        return 'Schedule flights and manage bookings';
      case 'accounting':
        return 'Financial management and billing';
      case 'reports':
        return 'Analytics and reporting';
      case 'settings':
        return 'System configuration and preferences';
      default:
        return 'Overview of your flight school operations';
    }
  };

  const recentActivity = [
    { title: 'New user registered', description: 'John Doe registered as a pilot', time: '2 minutes ago' },
    { title: 'Flight scheduled', description: 'Flight C172-001 scheduled for tomorrow', time: '15 minutes ago' },
    { title: 'Maintenance due', description: 'Aircraft C172-002 requires maintenance', time: '1 hour ago' },
    { title: 'Role updated', description: 'Jane Smith promoted to Flight Instructor', time: '2 hours ago' },
  ];

  const hasRole = (roleName: string) => {
    return user?.userRoles.some(userRole => userRole.role.name === roleName) || false;
  };

  const canAccessFleet = () => {
    return hasRole('SUPER_ADMIN') || hasRole('ADMIN');
  };

  const canAccessBaseManagement = () => {
    return hasRole('SUPER_ADMIN') || hasRole('ADMIN') || hasRole('BASE_MANAGER') || hasRole('PILOT');
  };

  const canEditBaseManagement = () => {
    return hasRole('SUPER_ADMIN') || hasRole('ADMIN') || hasRole('BASE_MANAGER');
  };

  return (
    <div className="flex h-screen bg-background">
      <NewSidebar 
        user={user}
        onLogout={handleLogout}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        <header className="bg-card shadow-sm border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="lg:ml-0 ml-12">
                <h1 className="text-xl sm:text-2xl font-semibold text-card-foreground">
                  {getTabTitle(activeTab)}
                </h1>
                <p className="text-sm text-muted-foreground mt-1 hidden sm:block">
                  {getTabDescription(activeTab)}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-card-foreground">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-primary-foreground">
                  {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                </span>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-background">
          {activeTab === 'dashboard' && (
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Button 
                      variant="outline" 
                      className="h-20 flex flex-col items-center justify-center space-y-2 hover:bg-accent"
                      onClick={() => handleTabChange('users')}
                    >
                      <Users className="h-6 w-6" />
                      <span>Manage Users</span>
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="h-20 flex flex-col items-center justify-center space-y-2 hover:bg-accent"
                      onClick={() => handleTabChange('airfields')}
                    >
                      <Plane className="h-6 w-6" />
                      <span>View Airfields</span>
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="h-20 flex flex-col items-center justify-center space-y-2 hover:bg-accent"
                      onClick={() => handleTabChange('settings')}
                    >
                      <SettingsIcon className="h-6 w-6" />
                      <span>System Settings</span>
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

          {activeTab === 'users' && <UserManagement />}
          {activeTab === 'airfields' && <AirfieldsManagement />}
          {activeTab === 'operational-areas' && <OperationalAreaManagement />}
          {activeTab === 'role-management' && <RoleManagement />}
          {activeTab === 'base-management' && canAccessBaseManagement() && (
            <BaseManagement canEdit={canEditBaseManagement()} />
          )}
          {activeTab === 'base-management' && !canAccessBaseManagement() && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-card-foreground mb-2">Access Denied</h3>
                <p className="text-muted-foreground">You don't have permission to access base management.</p>
              </div>
            </div>
          )}
          {activeTab === 'fleet' && canAccessFleet() && <FleetManagement />}
          {activeTab === 'fleet' && !canAccessFleet() && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Plane className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-card-foreground mb-2">Access Denied</h3>
                <p className="text-muted-foreground">You don't have permission to access fleet management.</p>
              </div>
            </div>
          )}
          {activeTab === 'flight-logs' && <FlightLogs />}
          {activeTab === 'scheduling' && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-card-foreground mb-2">Scheduling</h3>
                <p className="text-muted-foreground">Flight scheduling features coming soon.</p>
              </div>
            </div>
          )}
          {activeTab === 'accounting' && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-card-foreground mb-2">Accounting</h3>
                <p className="text-muted-foreground">Financial management and accounting features coming soon.</p>
                <div className="mt-6 max-w-md mx-auto">
                  <div className="bg-primary/5 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <h4 className="font-medium text-primary mb-2">Planned Features</h4>
                    <ul className="text-sm text-primary/80 space-y-1">
                      <li>• Student billing and payment tracking</li>
                      <li>• Instructor payroll management</li>
                      <li>• Aircraft maintenance cost tracking</li>
                      <li>• Financial reporting and analytics</li>
                      <li>• Invoice generation and management</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'reports' && <Reports />}
          {activeTab === 'settings' && <Settings />}
        </main>
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DashboardContent />
    </Suspense>
  );
} 