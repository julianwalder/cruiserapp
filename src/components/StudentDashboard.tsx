'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Plane,
  FileText,
  Cloud,
  Clock,
  Calendar,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { WeatherPopup } from '@/components/WeatherPopup';

interface UsageStats {
  totalPurchasedHours: number;
  totalUsedHours: number;
  totalCharteredHours: number;
  remainingHours: number;
  flightCount: number;
  packages: Array<{
    id: string;
    totalHours: number;
    usedHours: number;
    remainingHours: number;
    status: string;
  }>;
  statistics: {
    flownHours: {
      regular: number;
      regularCount: number;
    };
    charteredHours: {
      total: number;
      count: number;
    };
    demoHours: {
      total: number;
      count: number;
    };
    ferryHours: {
      total: number;
      count: number;
    };
    pilotCharterHours: {
      total: number;
      count: number;
    };
  };
}

export default function StudentDashboard() {
  const router = useRouter();
  const [showWeatherPopup, setShowWeatherPopup] = useState(false);
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserAndStats = async () => {
      try {
        // Check for impersonation token first, fallback to regular token
        const impersonationToken = localStorage.getItem('impersonationToken');
        const token = impersonationToken || localStorage.getItem('token');
        if (!token) {
          setError('No authentication token found');
          setLoading(false);
          return;
        }

        // First get the current user's ID
        const userResponse = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!userResponse.ok) {
          throw new Error('Failed to fetch user information');
        }

        const userData = await userResponse.json();
        setUserId(userData.id);

        // Then fetch their usage stats
        const statsResponse = await fetch(`/api/usage/${userData.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!statsResponse.ok) {
          throw new Error('Failed to fetch usage statistics');
        }

        const statsData = await statsResponse.json();
        setStats(statsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndStats();
  }, []);

  const formatHours = (hours: number): string => {
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return `${wholeHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-red-500';
    if (percentage >= 60) return 'bg-yellow-500';
    if (percentage >= 40) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getProgressBarTextColor = (percentage: number) => {
    if (percentage >= 80) return 'text-red-600';
    if (percentage >= 60) return 'text-yellow-600';
    if (percentage >= 40) return 'text-blue-600';
    return 'text-green-600';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Stats Cards */}
      {stats && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hours Purchased</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatHours(stats.totalPurchasedHours)}</div>
              <p className="text-xs text-muted-foreground">
                {stats.packages.length} package{stats.packages.length !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hours Used</CardTitle>
              <Plane className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatHours(stats.totalUsedHours)}</div>
              <p className="text-xs text-muted-foreground">
                {stats.statistics.flownHours.regularCount} flight{stats.statistics.flownHours.regularCount !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hours Remaining</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stats.remainingHours < 0 ? 'text-red-600' : ''}`}>
                {formatHours(Math.abs(stats.remainingHours))}
              </div>
              <p className={`text-xs ${stats.remainingHours < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                {stats.remainingHours < 0 ? 'Hours over limit' : 'Available to use'}
              </p>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Flights</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.flightCount}</div>
              <p className="text-xs text-muted-foreground">
                all time
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Hour Usage Progress */}
      {stats && !error && (
        <Card>
          <CardHeader>
            <CardTitle>Hour Package Usage</CardTitle>
            <CardDescription>
              Track your flight hour consumption
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Hours Used / Bought</span>
                <span className={`text-sm font-medium ${getProgressBarTextColor((stats.totalUsedHours / Math.max(stats.totalPurchasedHours, 1)) * 100)}`}>
                  {formatHours(stats.totalUsedHours)} / {formatHours(stats.totalPurchasedHours)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 relative overflow-hidden">
                {/* Used hours - black */}
                <div
                  className="h-2 transition-all duration-300 bg-black"
                  style={{
                    width: `${Math.min((stats.totalUsedHours / Math.max(stats.totalPurchasedHours, 1)) * 100, 100)}%`,
                    borderRadius: stats.totalUsedHours > 0 ? '0.25rem 0 0 0.25rem' : '0.25rem'
                  }}
                ></div>
                {/* Remaining hours - color coded */}
                <div
                  className={`h-2 transition-all duration-300 absolute top-0 ${getProgressBarColor((stats.totalUsedHours / Math.max(stats.totalPurchasedHours, 1)) * 100)}`}
                  style={{
                    left: `${Math.min((stats.totalUsedHours / Math.max(stats.totalPurchasedHours, 1)) * 100, 100)}%`,
                    width: `${Math.max(0, 100 - Math.min((stats.totalUsedHours / Math.max(stats.totalPurchasedHours, 1)) * 100, 100))}%`,
                    borderRadius: stats.totalUsedHours < stats.totalPurchasedHours ? '0 0.25rem 0.25rem 0' : '0.25rem'
                  }}
                ></div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Ferry Hours:</span>
                <span className="ml-2 font-medium">{formatHours(stats.statistics.ferryHours.total)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Chartered:</span>
                <span className="ml-2 font-medium">{formatHours(stats.statistics.charteredHours.total)}</span>
              </div>
            </div>

            <Button
              variant="default"
              className="w-full"
              onClick={() => router.push(`/usage/${userId}`)}
            >
              View Detailed Usage
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
              <p className="font-medium">Unable to load statistics</p>
              <p className="text-sm mt-2">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common tasks and shortcuts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="default"
              className="justify-start h-16 bg-black hover:bg-gray-800 text-white"
              onClick={() => router.push('/flight-logs?create=true')}
            >
              <Plane className="h-5 w-5 mr-2" />
              Log New Flight
            </Button>

            <Button
              variant="outline"
              className="justify-start h-16"
              onClick={() => router.push('/flight-logs')}
            >
              <FileText className="h-5 w-5 mr-2" />
              View Flight Logs
            </Button>

            <Button
              variant="outline"
              className="justify-start h-16"
              onClick={() => setShowWeatherPopup(true)}
            >
              <Cloud className="h-5 w-5 mr-2" />
              Check Weather
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Weather Popup */}
      <WeatherPopup
        open={showWeatherPopup}
        onOpenChange={setShowWeatherPopup}
      />
    </div>
  );
}
