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
import SmartBillInvoices from '@/components/SmartBillInvoices';
import ImportedXMLInvoices from '@/components/ImportedXMLInvoices';

import SmartBillStatus from '@/components/SmartBillStatus';
import PilotOverview from '@/components/PilotOverview';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ThemeToggle';
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

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
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

  useEffect(() => {
    const tab = searchParams.get('tab') || 'dashboard';
    setActiveTab(tab);
  }, [searchParams]);

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
          setUser(userData);
          
          // Set appropriate view mode based on user role
          const userRoles = userData.userRoles?.map((ur: any) => ur.roles?.name) || [];
          const isPilot = userRoles.includes('PILOT');
          const isStudent = userRoles.includes('STUDENT');
          const isInstructor = userRoles.includes('INSTRUCTOR');
          const isAdmin = userRoles.includes('ADMIN') || userRoles.includes('SUPER_ADMIN');
          const isBaseManager = userRoles.includes('BASE_MANAGER');
          
          console.log('🔍 Dashboard: User roles detected:', {
            userRoles,
            isPilot,
            isStudent,
            isInstructor,
            isAdmin,
            isBaseManager
          });
          
          // Admins, instructors, and base managers should default to company view (priority over pilot/student)
          if (isAdmin || isInstructor || isBaseManager) {
            console.log('🔍 Dashboard: Setting view mode to company (admin/instructor/base_manager)');
            setViewMode('company');
          }
          // Pilots and students should ONLY see personal view
          else if (isPilot || isStudent) {
            console.log('🔍 Dashboard: Setting view mode to personal (pilot/student)');
            setViewMode('personal');
          }
        } else {
          router.push('/login');
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
        router.push('/login');
      }
    };

    fetchUser();
    fetchStats();
  }, [router]);

  // Refetch stats when viewMode changes
  useEffect(() => {
    if (user && activeTab === 'dashboard' && isAdminOrManager()) {
      fetchStats();
    }
  }, [viewMode, user, activeTab]);

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



  const recentActivity = [
    { title: 'New user registered', description: 'John Doe registered as a pilot', time: '2 minutes ago' },
    { title: 'Flight scheduled', description: 'Flight C172-001 scheduled for tomorrow', time: '15 minutes ago' },
    { title: 'Maintenance due', description: 'Aircraft C172-002 requires maintenance', time: '1 hour ago' },
    { title: 'Role updated', description: 'Jane Smith promoted to Flight Instructor', time: '2 hours ago' },
  ];

  const hasRole = (roleName: string) => {
    return user?.userRoles.some(userRole => userRole.roles.name === roleName) || false;
  };

  const canAccessFleet = () => {
    return hasRole('SUPER_ADMIN') || hasRole('ADMIN') || hasRole('BASE_MANAGER') || hasRole('PILOT') || hasRole('STUDENT') || hasRole('INSTRUCTOR') || hasRole('PROSPECT');
  };

  const canEditFleet = () => {
    return hasRole('SUPER_ADMIN') || hasRole('ADMIN');
  };

  const canAccessBaseManagement = () => {
    return hasRole('SUPER_ADMIN') || hasRole('ADMIN') || hasRole('BASE_MANAGER') || hasRole('PILOT') || hasRole('STUDENT') || hasRole('INSTRUCTOR') || hasRole('PROSPECT');
  };

  const canEditBaseManagement = () => {
    return hasRole('SUPER_ADMIN') || hasRole('ADMIN');
  };

  const canAccessReports = () => {
    return hasRole('SUPER_ADMIN') || hasRole('ADMIN') || hasRole('BASE_MANAGER');
  };

  const canAccessAccounting = () => {
    return hasRole('SUPER_ADMIN') || hasRole('ADMIN');
  };

  const canAccessAirfields = () => {
    return true; // Allow all users to access airfields
  };

  const isPilotOrStudent = () => {
    return hasRole('PILOT') || hasRole('STUDENT');
  };

  const isAdminOrManager = () => {
    return hasRole('SUPER_ADMIN') || hasRole('ADMIN') || hasRole('BASE_MANAGER') || hasRole('INSTRUCTOR');
  };

  return (
          <div className="flex h-screen bg-white dark:bg-gray-900">
      <NewSidebar 
        user={user}
        onLogout={handleLogout}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        <header className="bg-card shadow-sm border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 h-16 flex items-center">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-4">
              <div className="lg:ml-0 ml-12">
                <h1 className="text-xl sm:text-2xl font-semibold text-card-foreground">
                  {getTabTitle(activeTab)}
                </h1>
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
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-white dark:bg-gray-900">
          {activeTab === 'dashboard' && isPilotOrStudent() && !isAdminOrManager() && (
            <PilotOverview />
          )}
          
          {activeTab === 'dashboard' && isAdminOrManager() && (
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
          {activeTab === 'airfields' && canAccessAirfields() && <AirfieldsManagement />}
          {activeTab === 'airfields' && !canAccessAirfields() && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-card-foreground mb-2">Access Denied</h3>
                <p className="text-muted-foreground">You don't have permission to access airfield management.</p>
              </div>
            </div>
          )}
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
          {activeTab === 'fleet' && canAccessFleet() && <FleetManagement canEdit={canEditFleet()} />}
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
          {activeTab === 'accounting' && canAccessAccounting() && (
                          <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-card-foreground">Accounting & Invoicing</h2>
                    <p className="text-muted-foreground">Manage your SmartBill invoices and financial data</p>
                  </div>
                </div>
                
                <SmartBillStatus />
                
                <ImportedXMLInvoices />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="card-hover">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Planned Features
                    </CardTitle>
                    <CardDescription>
                      Upcoming financial management capabilities
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-sm space-y-2">
                      <li className="flex items-center gap-2">
                        <div className="h-2 w-2 bg-primary rounded-full"></div>
                        Student billing and payment tracking
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="h-2 w-2 bg-primary rounded-full"></div>
                        Instructor payroll management
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="h-2 w-2 bg-primary rounded-full"></div>
                        Aircraft maintenance cost tracking
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="h-2 w-2 bg-primary rounded-full"></div>
                        Financial reporting and analytics
                      </li>
                    </ul>
                  </CardContent>
                </Card>
                
                <Card className="card-hover">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      SmartBill Integration
                    </CardTitle>
                    <CardDescription>
                      Connected invoice management system
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">API Status</span>
                        <Badge variant="outline" className="text-xs">
                          Connected
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Last Sync</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date().toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Total Invoices</span>
                        <span className="text-xs font-medium">-</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="card-hover">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Upload className="h-5 w-5" />
                      XML Import Available
                    </CardTitle>
                    <CardDescription>
                      Import SmartBill XML invoices manually
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Import XML invoices while waiting for API activation.
                      </p>
                      <Button asChild className="w-full">
                        <a href="/xml-import">
                          Import XML Invoices
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                  </div>
                </div>
              )}
            </div>
          )}
          {activeTab === 'accounting' && !canAccessAccounting() && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-card-foreground mb-2">Access Denied</h3>
                <p className="text-muted-foreground">You don't have permission to access accounting features.</p>
              </div>
            </div>
          )}

          {activeTab === 'reports' && canAccessReports() && <Reports />}
          {activeTab === 'reports' && !canAccessReports() && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-card-foreground mb-2">Access Denied</h3>
                <p className="text-muted-foreground">You don't have permission to access reports.</p>
              </div>
            </div>
          )}
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