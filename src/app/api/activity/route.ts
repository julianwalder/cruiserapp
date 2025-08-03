import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware';
import { getSupabaseClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const currentUser = await requireAuth(request);
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection error' },
        { status: 500 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const entityType = searchParams.get('entityType');
    const action = searchParams.get('action');

    // Calculate pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Get total count for pagination
    let countQuery = supabase
      .from('activity_log')
      .select('*', { count: 'exact', head: true });

    // Add filters to count query if provided
    if (entityType) {
      countQuery = countQuery.eq('entity_type', entityType);
    }
    if (action) {
      countQuery = countQuery.eq('action', action);
    }

    const { count: total, error: countError } = await countQuery;
    
    if (countError) {
      console.error('Error counting activities:', countError);
      return NextResponse.json(
        { error: 'Failed to count activities' },
        { status: 500 }
      );
    }

    // Build query - show all activities with pagination
    let query = supabase
      .from('activity_log')
      .select(`
        id,
        action,
        entity_type,
        entity_id,
        description,
        metadata,
        created_at,
        user_id,
        users (
          id,
          email,
          firstName,
          lastName
        )
      `)
      .order('created_at', { ascending: false });

    // Add filters if provided
    if (entityType) {
      query = query.eq('entity_type', entityType);
    }
    if (action) {
      query = query.eq('action', action);
    }

    // Apply pagination
    query = query.range(from, to);

    const { data: activities, error } = await query;

    if (error) {
      console.error('Error fetching activity log:', error);
      return NextResponse.json(
        { error: 'Failed to fetch activity log' },
        { status: 500 }
      );
    }

    // Transform data for frontend
    const transformedActivities = activities?.map(activity => ({
      id: activity.id,
      title: getActivityTitle(activity.action, activity.entity_type),
      description: activity.description,
      time: formatTimeAgo(activity.created_at),
      type: activity.action,
      entityType: activity.entity_type,
      entityId: activity.entity_id,
      user: activity.users ? {
        id: activity.users.id,
        name: `${activity.users.firstName} ${activity.users.lastName}`,
        email: activity.users.email
      } : null,
      metadata: activity.metadata
    })) || [];

    return NextResponse.json({
      activities: transformedActivities,
      pagination: {
        page,
        limit,
        total: total || 0,
        pages: Math.ceil((total || 0) / limit),
        hasNext: page < Math.ceil((total || 0) / limit),
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Error in activity API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to get activity titles
function getActivityTitle(action: string, entityType: string): string {
  const titles: Record<string, string> = {
    'USER_REGISTERED': 'New user registered',
    'USER_LOGIN': 'User logged in',
    'USER_LOGOUT': 'User logged out',
    'USER_UPDATED': 'User profile updated',
    'ROLE_UPDATED': 'User role updated',
    'FLIGHT_CREATED': 'Flight log created',
    'FLIGHT_UPDATED': 'Flight log updated',
    'FLIGHT_DELETED': 'Flight log deleted',
    'AIRCRAFT_ADDED': 'Aircraft added',
    'AIRCRAFT_UPDATED': 'Aircraft updated',
    'AIRCRAFT_DELETED': 'Aircraft removed',
    'AIRFIELD_ADDED': 'Airfield added',
    'AIRFIELD_UPDATED': 'Airfield updated',
    'AIRFIELD_DELETED': 'Airfield removed',
    'INVOICE_CREATED': 'Invoice created',
    'INVOICE_UPDATED': 'Invoice updated',
    'INVOICE_DELETED': 'Invoice deleted',
    'SYSTEM_STARTUP': 'System started',
    'DATABASE_MIGRATION': 'Database migration',
    'BACKUP_CREATED': 'Backup created',
    'SETTINGS_UPDATED': 'Settings updated'
  };

  return titles[action] || `${action.replace(/_/g, ' ').toLowerCase()}`;
}

// Helper function to format time ago
function formatTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return `${diffInSeconds} seconds ago`;
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks} week${diffInWeeks > 1 ? 's' : ''} ago`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`;
  }

  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears} year${diffInYears > 1 ? 's' : ''} ago`;
} 