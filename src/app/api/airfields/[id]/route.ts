import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';
import { UUID } from '@/types/uuid-types';


// GET /api/airfields/[id] - Get airfield by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const { data: airfield, error } = await supabase
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
      `)
      .eq('id', id)
      .single();

    if (error || !airfield) {
      return NextResponse.json({ error: 'Airfield not found' }, { status: 404 });
    }

    return NextResponse.json(airfield);
  } catch (error) {
    console.error('Error fetching airfield:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/airfields/[id] - Update airfield (admin-only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Only admins can mutate airfields. Previously any authenticated
    // user could PUT here and flip `status`, rename an airfield, etc.
    // Explicit allowlist rather than hasPermission() because
    // AuthService.hasPermission's role hierarchy omits BASE_MANAGER
    // (see auth.ts:473-486), which would silently evaluate to 0.
    const callerRoles: string[] = (AuthService.verifyToken(token) as any)?.roles || [];
    const isAdmin = ['SUPER_ADMIN', 'ADMIN', 'BASE_MANAGER'].some(r =>
      callerRoles.includes(r),
    );
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection error' }, { status: 500 });
    }

    const { id } = await params;
    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.code) {
      return NextResponse.json(
        { error: 'Name and code are required' },
        { status: 400 }
      );
    }

    // Update airfield
    const { data: airfield, error } = await supabase
      .from('airfields')
      .update({
        name: body.name,
        code: body.code,
        type: body.type,
        status: body.status,
        city: body.city,
        state: body.state,
        country: body.country,
        latitude: body.latitude,
        longitude: body.longitude,
        elevation: body.elevation,
        phone: body.phone,
        email: body.email,
        website: body.website,
      })
      .eq('id', id)
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
      `)
      .single();

    if (error) {
      console.error('Error updating airfield:', error);
      return NextResponse.json(
        { error: 'Failed to update airfield' },
        { status: 500 }
      );
    }

    return NextResponse.json(airfield);
  } catch (error) {
    console.error('Error updating airfield:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 