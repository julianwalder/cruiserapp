'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  MapPin, 
  Users, 
  TrendingUp, 
  BarChart3, 
  PieChart,
  Building2,
  UserCheck,
  UserX
} from 'lucide-react';
import { toast } from 'sonner';

interface HomebaseStats {
  name: string;
  icao: string;
  city: string;
  country: string;
  count: number;
}

interface Statistics {
  totalUsersWithHomebase: number;
  totalUsers: number;
  usersWithoutHomebase: number;
  homebaseDistribution: Record<string, HomebaseStats>;
  roleDistribution: Record<string, number>;
  homebaseByRole: Record<string, Record<string, number>>;
}

interface Summary {
  mostPopularHomebase: [string, HomebaseStats] | null;
  leastPopularHomebase: [string, HomebaseStats] | null;
  homebaseCoverage: number;
}

interface HomebaseStatisticsProps {
  className?: string;
}

export function HomebaseStatistics({ className }: HomebaseStatisticsProps) {
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      const response = await fetch('/api/statistics/homebase', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch statistics');
      }

      setStatistics(data.statistics);
      setSummary(data.summary);
    } catch (error) {
      console.error('Error fetching homebase statistics:', error);
      toast.error('Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'STUDENT':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'PILOT':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'INSTRUCTOR':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'BASE_MANAGER':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'ADMIN':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'SUPER_ADMIN':
        return 'bg-red-200 text-red-900 border-red-300';
      case 'PROSPECT':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'PROSPECT':
        return 'Prospect';
      case 'STUDENT':
        return 'Student';
      case 'PILOT':
        return 'Pilot';
      case 'INSTRUCTOR':
        return 'Instructor';
      case 'BASE_MANAGER':
        return 'Base Manager';
      case 'ADMIN':
        return 'Admin';
      case 'SUPER_ADMIN':
        return 'Super Admin';
      default:
        return role;
    }
  };

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <div className="text-muted-foreground">Loading homebase statistics...</div>
        </div>
      </div>
    );
  }

  if (!statistics || !summary) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-muted-foreground">No statistics available</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const sortedHomebases = Object.entries(statistics.homebaseDistribution)
    .sort(([,a], [,b]) => b.count - a.count);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              Registered users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">With Homebase</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.totalUsersWithHomebase}</div>
            <p className="text-xs text-muted-foreground">
              {summary.homebaseCoverage}% coverage
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Without Homebase</CardTitle>
            <UserX className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.usersWithoutHomebase}</div>
            <p className="text-xs text-muted-foreground">
              Need homebase selection
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Homebases</CardTitle>
            <Building2 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sortedHomebases.length}</div>
            <p className="text-xs text-muted-foreground">
              Different locations
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Homebase Coverage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Homebase Coverage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Users with assigned homebase</span>
              <span className="text-sm text-muted-foreground">
                {statistics.totalUsersWithHomebase} / {statistics.totalUsers}
              </span>
            </div>
            <Progress value={summary.homebaseCoverage} className="h-2" />
            <div className="text-center text-sm text-muted-foreground">
              {summary.homebaseCoverage}% of users have a homebase assigned
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Homebase Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Homebase Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sortedHomebases.map(([key, homebase]) => {
              const percentage = Math.round((homebase.count / statistics.totalUsersWithHomebase) * 100);
              return (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{homebase.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {homebase.icao}
                      </Badge>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {homebase.count} users ({percentage}%)
                    </span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                  <div className="text-xs text-muted-foreground">
                    {homebase.city}, {homebase.country}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Role Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Role Distribution by Homebase
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {Object.entries(statistics.roleDistribution)
              .sort(([,a], [,b]) => b - a)
              .map(([role, count]) => {
                const roleHomebases = statistics.homebaseByRole[role] || {};
                const totalWithHomebase = Object.values(roleHomebases).reduce((sum, val) => sum + val, 0);
                const percentage = statistics.totalUsersWithHomebase > 0 
                  ? Math.round((totalWithHomebase / statistics.totalUsersWithHomebase) * 100)
                  : 0;

                return (
                  <div key={role} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className={`text-xs ${getRoleColor(role)}`}>
                          {getRoleDisplayName(role)}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {totalWithHomebase} with homebase
                        </span>
                      </div>
                      <span className="text-sm font-medium">{count} total</span>
                    </div>
                    
                    {Object.keys(roleHomebases).length > 0 && (
                      <div className="ml-4 space-y-2">
                        {Object.entries(roleHomebases)
                          .sort(([,a], [,b]) => b - a)
                          .map(([homebaseKey, homebaseCount]) => {
                            const homebase = statistics.homebaseDistribution[homebaseKey];
                            if (!homebase) return null;
                            
                            return (
                              <div key={homebaseKey} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-3 w-3 text-muted-foreground" />
                                  <span>{homebase.name}</span>
                                  <Badge variant="outline" className="text-xs px-1 py-0">
                                    {homebase.icao}
                                  </Badge>
                                </div>
                                <span className="text-muted-foreground">{homebaseCount}</span>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>

      {/* Summary Insights */}
      {summary.mostPopularHomebase && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Key Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <div>
                  <div className="font-medium text-green-900 dark:text-green-100">
                    Most Popular Homebase
                  </div>
                  <div className="text-sm text-green-700 dark:text-green-200">
                    {summary.mostPopularHomebase[1].name} ({summary.mostPopularHomebase[1].icao}) - 
                    {summary.mostPopularHomebase[1].count} users
                  </div>
                </div>
              </div>

              {summary.leastPopularHomebase && summary.leastPopularHomebase[1].count < summary.mostPopularHomebase[1].count && (
                <div className="flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <MapPin className="h-5 w-5 text-orange-600" />
                  <div>
                    <div className="font-medium text-orange-900 dark:text-orange-100">
                      Least Popular Homebase
                    </div>
                    <div className="text-sm text-orange-700 dark:text-orange-200">
                      {summary.leastPopularHomebase[1].name} ({summary.leastPopularHomebase[1].icao}) - 
                      {summary.leastPopularHomebase[1].count} users
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
