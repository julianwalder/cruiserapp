import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { AuthService } from '@/lib/auth';

// GET /api/base-management - List base managements
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

    // Get user roles from JWT token
    const payload = AuthService.verifyToken(token);
    const userRoles = payload?.roles || [];
    
    // Check if user has appropriate permissions
    if (!AuthService.hasRole(userRoles, 'SUPER_ADMIN') && 
        !AuthService.hasRole(userRoles, 'ADMIN') && 
        !AuthService.hasRole(userRoles, 'BASE_MANAGER') &&
        !AuthService.hasRole(userRoles, 'PILOT')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    const { data: baseManagements, error: baseError } = await supabase
      .from('base_management')
      .select(`
        *,
        airfield (
          *
        ),
        baseManager (
          id,
          "firstName",
          "lastName",
          email,
          userRoles (
            role (
              name
            )
          )
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

    return NextResponse.json(baseManagements || []);
  } catch (error) {
    console.error('Error fetching base managements:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/base-management - Create new base management
export async function POST(request: NextRequest) {
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

    // Get user roles from JWT token
    const payload = AuthService.verifyToken(token);
    const userRoles = payload?.roles || [];
    
    // Only SUPER_ADMIN can create base managements
    if (!AuthService.hasRole(userRoles, 'SUPER_ADMIN')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.airfieldId) {
      return NextResponse.json(
        { error: 'Airfield ID is required' },
        { status: 400 }
      );
    }

    // Check if airfield exists and is not already a base
    const { data: airfield, error: airfieldError } = await supabase
      .from('airfield')
      .select('id, isBase')
      .eq('id', body.airfieldId)
      .single();

    if (airfieldError || !airfield) {
      return NextResponse.json(
        { error: 'Airfield not found' },
        { status: 404 }
      );
    }

    if (airfield.isBase) {
      return NextResponse.json(
        { error: 'Airfield is already designated as a base' },
        { status: 409 }
      );
    }

    // Check if base management already exists for this airfield
    const { data: existingBaseManagement } = await supabase
      .from('base_management')
      .select('id')
      .eq('airfieldId', body.airfieldId)
      .single();

    if (existingBaseManagement) {
      return NextResponse.json(
        { error: 'Base management already exists for this airfield' },
        { status: 409 }
      );
    }

    // Create base management
    const { data: baseManagement, error: createError } = await supabase
      .from('base_management')
      .insert({
        airfieldId: body.airfieldId,
        baseManagerId: body.baseManagerId || null,
        additionalInfo: body.additionalInfo || null,
        facilities: body.facilities || [],
        operatingHours: body.operatingHours || null,
        emergencyContact: body.emergencyContact || null,
        notes: body.notes || null,
      })
      .select(`
        *,
        airfield (
          *
        ),
        baseManager (
          id,
          "firstName",
          "lastName",
          email
        )
      `)
      .single();

    if (createError) {
      console.error('Error creating base management:', createError);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }

    // Update airfield to mark it as a base
    await supabase
      .from('airfield')
      .update({ isBase: true })
      .eq('id', body.airfieldId);

    return NextResponse.json(baseManagement, { status: 201 });
  } catch (error) {
    console.error('Error creating base management:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 