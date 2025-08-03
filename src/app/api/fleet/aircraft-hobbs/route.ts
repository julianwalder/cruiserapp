import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { AuthService } from '@/lib/auth';

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

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Allow all authenticated users to read aircraft Hobbs data
    const { data: user, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        user_roles (
          roles (
            name
          )
        )
      `)
      .eq('id', decoded.userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const aircraftId = searchParams.get('aircraftId');

    // Build query
    let query = supabase
      .from('aircraft_hobbs')
      .select(`
        id,
        aircraft_id,
        last_hobbs_reading,
        last_hobbs_date,
        last_flight_log_id,
        updated_at
      `);

    // Filter by aircraft ID if provided
    if (aircraftId) {
      query = query.eq('aircraft_id', aircraftId);
    }

    // Execute query
    const { data: hobbsData, error: hobbsError } = await query;

    if (hobbsError) {
      console.error('Error fetching aircraft Hobbs data:', hobbsError);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    return NextResponse.json({
      aircraftHobbs: hobbsData || [],
      total: hobbsData?.length || 0
    });

  } catch (error) {
    console.error('Error in aircraft Hobbs API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 