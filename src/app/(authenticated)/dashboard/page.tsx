'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Users, 
  MapPin,
  Plane,
  UserCheck
} from 'lucide-react';
import PilotOverview from '@/components/PilotOverview';
import StudentDashboard from '@/components/StudentDashboard';
import FleetStatus from '@/components/FleetStatus';
import { StudentsStatus } from '@/components/StudentsStatus';
import { User } from "@/types/uuid-types";
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
  const router = useRouter();
  const [user, setUser] = useState<DashboardUser | null>(null);
  const [stats, setStats] = useState({
    users: {
      total: 0,
      active: 0,
      pendingApprovals: 0,
    },
    airfields: {
      total: 0,
      active: 0,
    },
    flights: {
      today: 0,
      scheduled: 0,
    },
    aircraft: {
      total: 0,
      active: 0,
    },
    fleetStatus: [],
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

  useEffect(() => {
    const fetchUser = async () => {
      try {
        // Check for impersonation token first, then fall back to regular token
        const impersonationToken = localStorage.getItem('impersonationToken');
        const token = impersonationToken || localStorage.getItem('token');
        if (!token) return;

        const response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
      }
    };

    fetchUser();
    fetchStats();
  }, [router]);

  const hasRole = (roleName: string) => {
    return user?.userRoles?.some(userRole => userRole.roles.name === roleName) || false;
  };

  const isAdminOrManager = () => hasRole('ADMIN') || hasRole('SUPER_ADMIN') || hasRole('BASE_MANAGER');

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
      {user?.userRoles?.some(userRole => 
        ['PILOT', 'STUDENT', 'INSTRUCTOR', 'PROSPECT'].includes(userRole.roles.name)
      ) && <GreetingCard user={user} />}
      
      {/* Content based on user role */}
      {hasRole('PILOT') && !isAdminOrManager() && (
        <PilotOverview />
      )}

      {hasRole('STUDENT') && !hasRole('PILOT') && !isAdminOrManager() && (
        <StudentDashboard />
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
                <div className="text-2xl font-bold">{stats.users?.total || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.users?.active || 0} active
                </p>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Airfields</CardTitle>
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.airfields?.total || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.airfields?.active || 0} active
                </p>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Aircraft</CardTitle>
                <Plane className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.aircraft?.total || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.aircraft?.active || 0} active
                </p>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.users?.pendingApprovals || 0}</div>
                <p className="text-xs text-muted-foreground">
                  users awaiting approval
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Fleet Status Section */}
          <FleetStatus fleetStatus={stats.fleetStatus} />

          {/* Students Status Section */}
          <StudentsStatus />
        </div>
      )}

    </div>
  );
} 