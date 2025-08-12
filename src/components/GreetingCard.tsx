'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Sun, 
  Moon, 
  Cloud, 
  Plane, 
  User, 
  Award, 
  BookOpen, 
  GraduationCap,
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
  icon: string;
  mood: string;
}

export function GreetingCard({ user }: GreetingCardProps) {
  const [greeting, setGreeting] = useState<GreetingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const getDefaultGreeting = (): GreetingData => {
    const timeOfDay = getTimeOfDay();
    const role = user?.userRoles?.[0]?.roles?.name || 'User';
    const roleDisplay = getRoleDisplayName(role);
    
    const greetings = {
      morning: {
        greeting: `Good morning, ${user?.firstName || 'there'}!`,
        message: `Ready to start your day as a ${roleDisplay.toLowerCase()}?`,
        icon: 'sun',
        mood: 'energetic'
      },
      afternoon: {
        greeting: `Good afternoon, ${user?.firstName || 'there'}!`,
        message: `How's your ${roleDisplay.toLowerCase()} journey going today?`,
        icon: 'sun',
        mood: 'productive'
      },
      evening: {
        greeting: `Good evening, ${user?.firstName || 'there'}!`,
        message: `Wrapping up another day as a ${roleDisplay.toLowerCase()}?`,
        icon: 'moon',
        mood: 'reflective'
      }
    };

    return greetings[timeOfDay as keyof typeof greetings];
  };

  const fetchAIGreeting = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔍 GreetingCard: Starting to fetch AI greeting');
      console.log('🔍 GreetingCard: User data:', user);

      const token = localStorage.getItem('token');
      if (!token) {
        console.log('🔍 GreetingCard: No token found, using default greeting');
        setGreeting(getDefaultGreeting());
        return;
      }

      console.log('🔍 GreetingCard: Making API call to /api/greeting');
      const response = await fetch('/api/greeting', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: user?.firstName,
          lastName: user?.lastName,
          role: user?.userRoles?.[0]?.roles?.name,
          timeOfDay: getTimeOfDay()
        }),
      });

      console.log('🔍 GreetingCard: API response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('🔍 GreetingCard: API response data:', data);
        setGreeting(data.greeting);
      } else {
        console.log('🔍 GreetingCard: API failed, using default greeting');
        const errorText = await response.text();
        console.log('🔍 GreetingCard: API error response:', errorText);
        // Fallback to default greeting if API fails
        setGreeting(getDefaultGreeting());
      }
    } catch (error) {
      console.error('🔍 GreetingCard: Error fetching AI greeting:', error);
      setError('Failed to load personalized greeting');
      setGreeting(getDefaultGreeting());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchAIGreeting();
    }
  }, [user]);

  const getIcon = (iconName: string) => {
    switch (iconName.toLowerCase()) {
      case 'sun': return <Sun className="h-6 w-6" />;
      case 'moon': return <Moon className="h-6 w-6" />;
      case 'cloud': return <Cloud className="h-6 w-6" />;
      case 'plane': return <Plane className="h-6 w-6" />;
      case 'user': return <User className="h-6 w-6" />;
      case 'award': return <Award className="h-6 w-6" />;
      case 'book': return <BookOpen className="h-6 w-6" />;
      case 'graduation': return <GraduationCap className="h-6 w-6" />;
      default: return <Sun className="h-6 w-6" />;
    }
  };

  const getMoodColor = (mood: string) => {
    switch (mood.toLowerCase()) {
      case 'energetic': return 'bg-gradient-to-r from-amber-100 to-orange-200 dark:from-amber-800/20 dark:to-orange-900/20';
      case 'productive': return 'bg-gradient-to-r from-blue-100 to-indigo-200 dark:from-blue-800/20 dark:to-indigo-900/20';
      case 'reflective': return 'bg-gradient-to-r from-slate-100 to-gray-200 dark:from-slate-800/20 dark:to-gray-900/20';
      case 'motivated': return 'bg-gradient-to-r from-emerald-100 to-teal-200 dark:from-emerald-800/20 dark:to-teal-900/20';
      case 'focused': return 'bg-gradient-to-r from-violet-100 to-purple-200 dark:from-violet-800/20 dark:to-purple-900/20';
      case 'friendly': return 'bg-gradient-to-r from-rose-100 to-pink-200 dark:from-rose-800/20 dark:to-pink-900/20';
      default: return 'bg-gradient-to-r from-blue-100 to-indigo-200 dark:from-blue-800/20 dark:to-indigo-900/20';
    }
  };

  if (!user) return null;

  const role = user.userRoles?.[0]?.roles?.name;
  const roleDisplay = getRoleDisplayName(role || 'User');

    return (
    <div className="p-6 border rounded-lg bg-card">
      {/* Top row with greeting and controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full">
            {greeting ? getIcon(greeting.icon) : <Sun className="h-6 w-6 text-primary" />}
          </div>
          <h2 className="text-2xl font-semibold text-foreground">
            {greeting?.greeting || `Hello, ${user.firstName}!`}
          </h2>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="text-xs">
            {roleDisplay}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchAIGreeting}
            disabled={loading}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>
      
      {/* Contextual message below */}
      <div>
        <p className="text-foreground/80 text-base leading-relaxed">
          {greeting?.message || `Welcome back, ${roleDisplay.toLowerCase()}!`}
        </p>
      </div>
    </div>
  );
}
