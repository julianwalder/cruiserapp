import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';

// GET /api/airfields - List airfields with pagination and filtering
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
      return NextResponse.json({ error: 'Database connection error' }, { status: 500 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') || '';
    const status = searchParams.get('status') || '';
    const country = searchParams.get('country') || '';

    let query = supabase
      .from('airfields')
      .select(`
        id,
        name,
        code,
        type,
        city,
        state,
        country,
        latitude,
        longitude,
        elevation,
        phone,
        email,
        website,
        status,
        "isBase",
        "createdAt",
        "updatedAt"
      `, { count: 'exact' });

    // Apply filters
    if (search) {
      query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%,city.ilike.%${search}%,country.ilike.%${search}%`);
    }

    if (type && type !== 'ALL') {
      query = query.eq('type', type);
    }

    if (status && status !== 'ALL_STATUSES') {
      query = query.eq('status', status);
    }

    if (country && country !== 'ALL_COUNTRIES') {
      query = query.eq('country', country);
    }

    // Get total count first
    const { count: total } = await query;

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to).order('name', { ascending: true });

    // Execute query
    const { data: airfields, error } = await query;

    if (error) {
      console.error('Error fetching airfields:', error);
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      airfields: airfields || [],
      pagination: {
        page,
        limit,
        total: total || 0,
        pages: Math.ceil((total || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching airfields:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/airfields - Create new airfield (DISABLED - Only import allowed)
export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'Manual airfield creation is disabled. Airfields can only be imported via the import process.' },
    { status: 403 }
  );
} 