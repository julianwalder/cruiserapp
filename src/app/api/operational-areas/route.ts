import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';
import crypto from 'crypto';

// GET /api/operational-areas - List operational areas
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
    
    // Check if user is super admin
    if (!AuthService.hasRole(userRoles, 'SUPER_ADMIN')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection error' }, { status: 500 });
    }

    const { data: operationalAreas, error } = await supabase
      .from('operational_areas')
      .select(`
        id,
        continent,
        countries,
        "createdAt",
        "updatedAt"
      `)
      .order('createdAt', { ascending: false });

    if (error) {
      console.error('Error fetching operational areas:', error);
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      );
    }

    return NextResponse.json(operationalAreas || []);
  } catch (error) {
    console.error('Error fetching operational areas:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/operational-areas - Create new operational area
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
    
    // Check if user is super admin
    if (!AuthService.hasRole(userRoles, 'SUPER_ADMIN')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.continent || !body.countries || !Array.isArray(body.countries) || body.countries.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection error' }, { status: 500 });
    }

    // Check if operational area already exists for this user
    // We need to check for exact array match, so we'll get all areas and filter in code
    const { data: existingOperationalAreas, error: existingError } = await supabase
      .from('operational_areas')
      .select('id, continent, countries')
      .eq('continent', body.continent);

    if (existingError) {
      console.error('Error checking existing operational areas:', existingError);
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      );
    }

    const existingOperationalArea = existingOperationalAreas?.find((area: any) => 
      JSON.stringify(area.countries.sort()) === JSON.stringify(body.countries.sort())
    );

    if (existingOperationalArea) {
      return NextResponse.json(
        { error: 'Operational area already exists for this continent and countries combination' },
        { status: 409 }
      );
    }

    // Create operational area
    const now = new Date().toISOString();
    const { data: operationalArea, error: createError } = await supabase
      .from('operational_areas')
      .insert({
        id: crypto.randomUUID(),
        continent: body.continent,
        countries: body.countries,
        createdById: user.id,
        createdAt: now,
        updatedAt: now,
      })
      .select(`
        id,
        continent,
        countries,
        "createdAt",
        "updatedAt"
      `)
      .single();

    if (createError) {
      console.error('Error creating operational area:', createError);
      return NextResponse.json(
        { error: 'Failed to create operational area' },
        { status: 500 }
      );
    }

    return NextResponse.json(operationalArea, { status: 201 });
  } catch (error) {
    console.error('Error creating operational area:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/operational-areas - Delete operational area
export async function DELETE(request: NextRequest) {
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
    
    // Check if user is super admin
    if (!AuthService.hasRole(userRoles, 'SUPER_ADMIN')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Operational area ID is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection error' }, { status: 500 });
    }

    // Check if operational area exists and belongs to the user
    const { data: operationalArea, error: checkError } = await supabase
      .from('operational_areas')
      .select('id')
      .eq('id', id)
      .eq('createdById', user.id)
      .single();

    if (checkError || !operationalArea) {
      return NextResponse.json(
        { error: 'Operational area not found' },
        { status: 404 }
      );
    }

    // Delete the operational area
    const { error: deleteError } = await supabase
      .from('operational_areas')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting operational area:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete operational area' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Operational area deleted successfully' });
  } catch (error) {
    console.error('Error deleting operational area:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 