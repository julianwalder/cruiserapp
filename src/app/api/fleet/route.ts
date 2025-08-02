import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/lib/middleware';
import { getSupabaseClient } from '@/lib/supabase';

// GET /api/fleet - List aircraft
async function getAircraft(request: NextRequest, currentUser: any) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status') || '';
    const type = searchParams.get('type') || '';
    const search = searchParams.get('search') || '';

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection error' },
        { status: 500 }
      );
    }

    let query = supabase
      .from('aircraft')
      .select(`
        id,
        "registrationNumber",
        "icaoType",
        manufacturer,
        model,
        type,
        status,
        "yearOfManufacture",
        "totalFlightHours",
        "lastMaintenanceDate",
        "nextMaintenanceDate",
        "insuranceExpiryDate",
        "registrationExpiryDate",
        "imagePath",
        "createdAt",
        "updatedAt"
      `, { count: 'exact' });

    // Apply filters
    if (status && status !== 'ALL') {
      query = query.eq('status', status);
    }

    if (type && type !== 'ALL') {
      query = query.eq('type', type);
    }

    if (search) {
      query = query.or(`registrationNumber.ilike.%${search}%,manufacturer.ilike.%${search}%,model.ilike.%${search}%`);
    }

    // Get total count first
    const { count: total } = await query;

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to).order('registrationNumber', { ascending: true });

    // Execute query
    const { data: aircraft, error } = await query;

    if (error) {
      console.error('Error fetching aircraft:', error);
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      aircraft: aircraft || [],
      pagination: {
        page,
        limit,
        total: total || 0,
        pages: Math.ceil((total || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching aircraft:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/fleet - Create aircraft
async function createAircraft(request: NextRequest, currentUser: any) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.registrationNumber || !body.manufacturer || !body.model) {
      return NextResponse.json(
        { error: 'Registration number, manufacturer, and model are required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection error' },
        { status: 500 }
      );
    }

    // Check if aircraft already exists
    const { data: existingAircraft, error: existingError } = await supabase
      .from('aircraft')
      .select('id')
      .eq('registrationNumber', body.registrationNumber)
      .single();

    if (existingError && existingError.code !== 'PGRST116') {
      console.error('Error checking existing aircraft:', existingError);
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      );
    }

    if (existingAircraft) {
      return NextResponse.json(
        { error: 'Aircraft with this registration number already exists' },
        { status: 409 }
      );
    }

    // Create aircraft
    const { data: aircraft, error: createError } = await supabase
      .from('aircraft')
      .insert({
        registrationNumber: body.registrationNumber,
        icaoType: body.icaoType || null,
        manufacturer: body.manufacturer,
        model: body.model,
        type: body.type || 'UNKNOWN',
        status: body.status || 'ACTIVE',
        yearOfManufacture: body.yearOfManufacture || null,
        totalFlightHours: body.totalFlightHours || 0,
        lastMaintenanceDate: body.lastMaintenanceDate ? new Date(body.lastMaintenanceDate).toISOString() : null,
        nextMaintenanceDate: body.nextMaintenanceDate ? new Date(body.nextMaintenanceDate).toISOString() : null,
        insuranceExpiryDate: body.insuranceExpiryDate ? new Date(body.insuranceExpiryDate).toISOString() : null,
        registrationExpiryDate: body.registrationExpiryDate ? new Date(body.registrationExpiryDate).toISOString() : null,
        imagePath: body.imagePath || null,
        createdById: currentUser.id,
      })
      .select(`
        id,
        "registrationNumber",
        "icaoType",
        manufacturer,
        model,
        type,
        status,
        "yearOfManufacture",
        "totalFlightHours",
        "lastMaintenanceDate",
        "nextMaintenanceDate",
        "insuranceExpiryDate",
        "registrationExpiryDate",
        "imagePath",
        "createdAt",
        "updatedAt"
      `)
      .single();

    if (createError) {
      console.error('Error creating aircraft:', createError);
      return NextResponse.json(
        { error: 'Failed to create aircraft' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Aircraft created successfully',
      aircraft,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating aircraft:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Export handlers with middleware
export const GET = requireAnyRole(['SUPER_ADMIN', 'ADMIN', 'BASE_MANAGER', 'PILOT', 'STUDENT', 'INSTRUCTOR', 'PROSPECT'])(getAircraft);
export const POST = requireAnyRole(['ADMIN', 'BASE_MANAGER'])(createAircraft); 