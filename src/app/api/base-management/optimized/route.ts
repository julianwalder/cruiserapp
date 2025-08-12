import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';

// GET /api/base-management/optimized - Fast base management data
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await AuthService.validateSession(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // ULTRA-OPTIMIZED: Single query with minimal data selection
    const { data: baseManagements, error: baseError } = await supabase
      .from('base_management')
      .select(`
        id,
        "airfieldId",
        "baseManagerId",
        "additionalInfo",
        "operatingHours",
        "emergencyContact",
        notes,
        "imagePath",
        "isActive",
        "createdAt",
        "updatedAt",
        airfield:airfields (
          id,
          name,
          code,
          type,
          status,
          city,
          state,
          country
        ),
        baseManager:users (
          id,
          "firstName",
          "lastName",
          email
        )
      `)
      .order('createdAt', { ascending: false });

    if (baseError) {
      console.error('Error fetching base managements:', baseError);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }

    // OPTIMIZED: Transform data to match frontend expectations
    const transformedData = (baseManagements || []).map(base => ({
      ...base,
      airfield: base.airfield || {
        id: base.airfieldId,
        name: 'Unknown Airfield',
        code: 'N/A',
        type: 'AIRPORT',
        city: 'Unknown',
        country: 'Unknown',
        status: 'ACTIVE'
      },
      baseManager: base.baseManager || null
    }));

    return NextResponse.json(transformedData);
  } catch (error) {
    console.error('Error fetching base managements:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
