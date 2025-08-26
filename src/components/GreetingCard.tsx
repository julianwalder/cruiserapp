'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';

interface GreetingCardProps {
  user: {
    firstName: string;
    lastName: string;
    userRoles: Array<{
      roles: {
        name: string;
      };
    }>;
  } | null;
}

interface GreetingData {
  greeting: string;
  message: string;
}

interface WeatherData {
  temperature?: number;
  windSpeed?: number;
  visibility?: number;
  conditions?: string;
}

export function GreetingCard({ user }: GreetingCardProps) {
  const [greeting, setGreeting] = useState<GreetingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showContext, setShowContext] = useState(false);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [flightStats, setFlightStats] = useState<{totalFlights: number, recentFlights: number} | null>(null);

  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'PILOT': return 'Pilot';
      case 'STUDENT': return 'Student Pilot';
      case 'INSTRUCTOR': return 'Flight Instructor';
      case 'PROSPECT': return 'Prospect';
      default: return role;
    }
  };

  const fetchWeatherData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return null;

      const response = await fetch('/api/weather', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setWeatherData(data);
        return data;
      }
      return null;
    } catch (error) {
      console.log('Weather data not available');
      return null;
    }
  };

  const fetchFlightStats = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return null;

      const response = await fetch('/api/dashboard/pilot-stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const stats = {
          totalFlights: data.flights?.total || 0,
          recentFlights: data.flights?.recent?.length || 0
        };
        setFlightStats(stats);
        return stats;
      }
      return null;
    } catch (error) {
      console.log('Flight stats not available');
      return null;
    }
  };

  const fetchAIGreeting = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No token available for greeting API');
        setLoading(false);
        return;
      }

      // Fetch weather and flight stats in parallel
      const [weatherResponse, flightStatsResponse] = await Promise.allSettled([
        fetchWeatherData(),
        fetchFlightStats()
      ]);

      const requestData = {
        firstName: user?.firstName,
        lastName: user?.lastName,
        role: user?.userRoles?.[0]?.roles?.name,
        timeOfDay: getTimeOfDay(),
        weatherData: weatherResponse.status === 'fulfilled' ? weatherResponse.value : null,
        flightStats: flightStatsResponse.status === 'fulfilled' ? flightStatsResponse.value : null
      };

      console.log('🔍 GreetingCard: Sending data:', requestData);

      const response = await fetch('/api/greeting', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestData)
      });

      if (response.ok) {
        const data = await response.json();
        console.log('🔍 GreetingCard: Received data:', data);
        setGreeting(data.greeting || data);
        // Show contextual message after a short delay for smooth transition
        setTimeout(() => setShowContext(true), 500);
      } else {
        const errorData = await response.json();
        console.error('🔍 GreetingCard: API error:', response.status, errorData);
      }
    } catch (error) {
      console.error('Error fetching AI greeting:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      console.log('🔍 GreetingCard: User object:', user);
      console.log('🔍 GreetingCard: User roles:', user.userRoles);
      fetchAIGreeting();
    }
  }, [user]);



  if (!user) return null;

  const role = user.userRoles?.[0]?.roles?.name;
  const roleDisplay = getRoleDisplayName(role || 'User');

  return (
    <div className="p-6 border rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/30 border-blue-200 dark:border-blue-800 transition-all duration-500 min-h-[160px]">
      {/* Top row with greeting and controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <h2 className="text-2xl font-semibold text-blue-900 dark:text-blue-100">
            {greeting?.greeting || `Captain ${user.lastName}`}
          </h2>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700">
            {roleDisplay}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchAIGreeting}
            disabled={loading}
            className="h-8 w-8 p-0 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-900/30"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>
      
      {/* Contextual message with smooth transition */}
      <div className={`transition-all duration-700 ease-in-out ${
        showContext 
          ? 'opacity-100 transform translate-y-0' 
          : 'opacity-0 transform translate-y-4'
      }`}>
        <p className="text-blue-800 dark:text-blue-200 text-base leading-relaxed">
          {showContext ? (greeting?.message || 'Loading...') : ''}
        </p>
      </div>
    </div>
  );
}