import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = AuthService.verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const currentUser = await AuthService.validateSession(token);
    if (!currentUser) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    console.log('🔍 Notifications API - Current user:', currentUser);
    console.log('🔍 Notifications API - Decoded token:', decoded);

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
    const limit = parseInt(searchParams.get('limit') || '50');
    const type = searchParams.get('type');
    const status = searchParams.get('status'); // 'all', 'read', 'unread'

    // Calculate pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Build base query - only show notifications for current user that aren't deleted
    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', decoded.userId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    // Add type filter if provided
    if (type && type !== 'all') {
      query = query.eq('type', type);
    }

    // Add status filter if provided
    if (status === 'read') {
      query = query.eq('is_read', true);
    } else if (status === 'unread') {
      query = query.eq('is_read', false);
    }

    // Get total count for pagination
    const { count: total, error: countError } = await query;
    
    if (countError) {
      console.error('Error counting notifications:', countError);
      return NextResponse.json(
        { error: 'Failed to count notifications' },
        { status: 500 }
      );
    }

    // Apply pagination
    query = query.range(from, to);

    const { data: notifications, error } = await query;

    if (error) {
      console.error('Error fetching notifications:', error);
      return NextResponse.json(
        { error: 'Failed to fetch notifications' },
        { status: 500 }
      );
    }

    // Transform data for frontend
    const transformedNotifications = notifications?.map(notification => ({
      id: notification.id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      isRead: notification.is_read,
      isDeleted: notification.is_deleted,
      metadata: notification.metadata,
      createdAt: notification.created_at,
      readAt: notification.read_at,
      deletedAt: notification.deleted_at,
      timeString: formatTimeAgo(notification.created_at)
    })) || [];

    return NextResponse.json({
      notifications: transformedNotifications,
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
    console.error('Error in notifications API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to format time ago
function formatTimeAgo(dateString: string): string {
  if (!dateString) {
    return 'Unknown time';
  }
  
  const now = new Date();
  const date = new Date(dateString);
  
  // Check if the date is valid
  if (isNaN(date.getTime())) {
    console.warn('Invalid date string:', dateString);
    return 'Unknown time';
  }
  
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
