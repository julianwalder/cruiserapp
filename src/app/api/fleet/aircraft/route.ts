import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { AuthService } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

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

    // Check if user has admin or super admin role
    const { data: user, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        user_roles!user_roles_userId_fkey (
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

    const hasAccess = user.user_roles.some(
      (userRole: any) => 
        userRole.roles.name === 'SUPER_ADMIN' || 
        userRole.roles.name === 'ADMIN' ||
        userRole.roles.name === 'BASE_MANAGER' ||
        userRole.roles.name === 'INSTRUCTOR' ||
        userRole.roles.name === 'PILOT' ||
        userRole.roles.name === 'STUDENT' ||
        userRole.roles.name === 'PROSPECT'
    );

    console.log('User roles:', user.user_roles.map((ur: any) => ur.roles.name));
    console.log('Has access:', hasAccess);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const icaoOnly = searchParams.get('icaoOnly') === 'true';
    const skip = (page - 1) * limit;

    // Build query
    let query = supabase
      .from('aircraft')
      .select(`
        *,
        icao_reference_type (
          *
        )
      `);

    if (search) {
      query = query.or(`callSign.ilike.%${search}%,serialNumber.ilike.%${search}%`);
    }

    // If icaoOnly is true, only return aircraft that have ICAO reference types
    if (icaoOnly) {
      query = query.not('icaoReferenceTypeId', 'is', null);
    }

    // Get total count
    const { count: total } = await supabase
      .from('aircraft')
      .select('*', { count: 'exact', head: true });

    // Get aircraft with pagination
    const { data: aircraft, error: aircraftError } = await query
      .order('createdAt', { ascending: false })
      .range(skip, skip + limit - 1);

    if (aircraftError) {
      console.error('Error fetching aircraft:', aircraftError);
      return NextResponse.json({ 
        error: 'Internal server error', 
        details: aircraftError.message || 'Unknown database error' 
      }, { status: 500 });
    }

    const pages = Math.ceil((total || 0) / limit);

    // Transform the data to match frontend expectations
    const transformedAircraft = (aircraft || []).map((aircraft: any) => ({
      ...aircraft,
      icaoReferenceType: aircraft.icao_reference_type,
    }));

    return NextResponse.json({
      aircraft: transformedAircraft,
      pagination: {
        page,
        limit,
        total: total || 0,
        pages,
      },
    });
  } catch (error) {
    console.error('Error fetching aircraft:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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

    // Check if user has admin or super admin role
    const { data: user, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        user_roles!user_roles_userId_fkey (
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

    const hasAccess = user.user_roles.some(
      (userRole: any) => userRole.roles.name === 'SUPER_ADMIN' || userRole.roles.name === 'ADMIN' || userRole.roles.name === 'BASE_MANAGER'
    );

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Parse multipart form data
    const formData = await request.formData();

    const callSign = formData.get('callSign') as string;
    const serialNumber = formData.get('serialNumber') as string;
    const yearOfManufacture = parseInt(formData.get('yearOfManufacture') as string);
    const icaoTypeDesignator = formData.get('icaoTypeDesignator') as string;
    const model = formData.get('model') as string;
    const manufacturer = formData.get('manufacturer') as string;
    const status = formData.get('status') as string;
    const imageFile = formData.get('image') as File;

    console.log('Aircraft POST formData:', { callSign, serialNumber, yearOfManufacture, icaoTypeDesignator, model, manufacturer, status });

    if (!callSign || !serialNumber || !yearOfManufacture || !icaoTypeDesignator || !model || !manufacturer || !status) {
      console.error('Missing required fields:', { callSign, serialNumber, yearOfManufacture, icaoTypeDesignator, model, manufacturer, status });
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Find the ICAOReferenceType
    const { data: icaoRef, error: icaoError } = await supabase
      .from('icao_reference_type')
      .select('id')
      .eq('icaoCode', icaoTypeDesignator)
      .eq('model', model)
      .eq('manufacturer', manufacturer)
      .single();

    console.log('ICAOReferenceType lookup result:', icaoRef);
    if (icaoError || !icaoRef) {
      console.error('ICAO reference type not found for:', { icaoTypeDesignator, model, manufacturer });
      return NextResponse.json({ error: 'ICAO reference type not found' }, { status: 400 });
    }

    const { data: existingAircraft } = await supabase
      .from('aircraft')
      .select('id')
      .or(`callSign.eq.${callSign},serialNumber.eq.${serialNumber}`)
      .limit(1);

    if (existingAircraft && existingAircraft.length > 0) {
      console.error('Aircraft with this call sign or serial number already exists:', { callSign, serialNumber });
      return NextResponse.json({ error: 'Aircraft with this call sign or serial number already exists' }, { status: 400 });
    }

    // Handle image upload
    let imagePath = null;
    if (imageFile) {
      // Upload to Vercel Blob
      const { put } = await import('@vercel/blob');
      
      const timestamp = Date.now();
      const extension = imageFile.name.split('.').pop();
      const filename = `aircraft-${timestamp}.${extension}`;
      
      const blob = await put(filename, imageFile, {
        access: 'public',
        addRandomSuffix: false,
      });
      
      imagePath = blob.url;
    }

    const { data: aircraft, error: createError } = await supabase
      .from('aircraft')
      .insert({
        callSign,
        serialNumber,
        yearOfManufacture,
        icaoReferenceTypeId: icaoRef.id,
        imagePath,
        status,
      })
      .select(`
        *,
        icao_reference_type (
          *
        )
      `)
      .single();

    if (createError) {
      console.error('Error creating aircraft:', createError);
      return NextResponse.json({ error: 'Internal server error', details: (createError as any).message }, { status: 500 });
    }

    console.log('Aircraft created:', aircraft);
    return NextResponse.json({ aircraft }, { status: 201 });
  } catch (error) {
    console.error('Error creating aircraft:', error);
    return NextResponse.json({ error: 'Internal server error', details: (error as any)?.message || String(error) }, { status: 500 });
  }
}

// Add a GET endpoint for ICAO reference types
export async function GET_ICAO_REFERENCE_TYPES(request: NextRequest) {
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

    // Only allow admin/superadmin
    const { data: user, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        user_roles!user_roles_userId_fkey (
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

    const hasAccess = user.user_roles.some(
      (userRole: any) => userRole.roles.name === 'SUPER_ADMIN' || userRole.roles.name === 'ADMIN'
    );
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { data: icaoTypes, error: icaoError } = await supabase
      .from('icao_reference_type')
      .select(`
        id,
        "typeDesignator",
        model,
        manufacturer
      `)
      .order('typeDesignator', { ascending: true });

    if (icaoError) {
      console.error('Error fetching ICAO reference types:', icaoError);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    return NextResponse.json({ icaoTypes: icaoTypes || [] });
  } catch (error) {
    console.error('Error fetching ICAO reference types:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 