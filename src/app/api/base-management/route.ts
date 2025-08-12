import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';
import crypto from 'crypto';

// GET /api/base-management - List base managements (OPTIMIZED)
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

    // OPTIMIZED: Single query with efficient joins
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
          country,
          latitude,
          longitude,
          elevation,
          phone,
          email,
          website
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

    return NextResponse.json(baseManagements || []);
  } catch (error) {
    console.error('Error fetching base managements:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/base-management - Create new base management (OPTIMIZED)
export async function POST(request: NextRequest) {
  console.log('🔍 Backend - POST /api/base-management called');
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    console.log('🔍 Backend - Token present:', !!token);
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
    
    // Only SUPER_ADMIN and ADMIN can create base managements
    if (!AuthService.hasRole(userRoles, 'SUPER_ADMIN') && 
        !AuthService.hasRole(userRoles, 'ADMIN')) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only administrators can create base assignments.' },
        { status: 403 }
      );
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Parse FormData
    console.log('🔍 Backend - About to parse FormData');
    const formData = await request.formData();
    console.log('🔍 Backend - FormData parsed successfully');
    const airfieldId = formData.get('airfieldId') as string;
    const baseManagerId = formData.get('baseManagerId') as string;
    const additionalInfo = formData.get('additionalInfo') as string;
    const operatingHours = formData.get('operatingHours') as string;
    const emergencyContact = formData.get('emergencyContact') as string;
    const notes = formData.get('notes') as string;
    const image = formData.get('image') as File | null;

    console.log('🔍 Backend - Received airfieldId:', airfieldId);
    console.log('🔍 Backend - Received baseManagerId:', baseManagerId);

    // Validate required fields
    if (!airfieldId) {
      return NextResponse.json(
        { error: 'Airfield ID is required' },
        { status: 400 }
      );
    }

    // OPTIMIZED: Handle image upload to Vercel Blob (only if image exists)
    let imagePath: string | null = null;
    if (image) {
      try {
        const { put } = await import('@vercel/blob');
        const bytes = await image.arrayBuffer();
        const buffer = Buffer.from(bytes);
        
        const blob = await put(`base-images/${Date.now()}-${image.name}`, buffer, {
          access: 'public',
          addRandomSuffix: true,
        });
        
        imagePath = blob.url;
      } catch (error) {
        console.error('Error uploading image:', error);
        return NextResponse.json(
          { error: 'Failed to upload image' },
          { status: 500 }
        );
      }
    }

    // OPTIMIZED: Check airfield exists first
    console.log('🔍 Backend - Checking airfield with ID:', airfieldId);
    
    const { data: airfieldCheck, error: checkError } = await supabase
      .from('airfields')
      .select('id, "isBase"')
      .eq('id', airfieldId)
      .single();

    console.log('🔍 Backend - Airfield check result:', { airfieldCheck, checkError });

    if (checkError || !airfieldCheck) {
      console.log('🔍 Backend - Airfield not found, error:', checkError);
      return NextResponse.json(
        { error: 'Airfield not found' },
        { status: 404 }
      );
    }

    // Check if airfield is already a base
    if (airfieldCheck.isBase) {
      return NextResponse.json(
        { error: 'Airfield is already designated as a base' },
        { status: 409 }
      );
    }

    // Check if base management already exists for this airfield
    const { data: existingBaseManagement, error: existingError } = await supabase
      .from('base_management')
      .select('id')
      .eq('airfieldId', airfieldId)
      .single();

    if (existingBaseManagement) {
      return NextResponse.json(
        { error: 'Base management already exists for this airfield' },
        { status: 409 }
      );
    }

    // OPTIMIZED: Create base management with single query
    console.log('🔍 Backend - Creating base management with data:', {
      id: crypto.randomUUID(),
      airfieldId: airfieldId,
      baseManagerId: baseManagerId || null,
      additionalInfo: additionalInfo || null,
      facilities: [],
      operatingHours: operatingHours || null,
      emergencyContact: emergencyContact || null,
      notes: notes || null,
      imagePath: imagePath,
    });

    const { data: baseManagement, error: createError } = await supabase
      .from('base_management')
      .insert({
        id: crypto.randomUUID(),
        airfieldId: airfieldId,
        baseManagerId: baseManagerId || null,
        additionalInfo: additionalInfo || null,
        facilities: [],
        operatingHours: operatingHours || null,
        emergencyContact: emergencyContact || null,
        notes: notes || null,
        imagePath: imagePath,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .select(`
        *,
        airfield:airfields (
          id,
          name,
          code,
          type,
          status,
          city,
          state,
          country,
          latitude,
          longitude,
          elevation,
          phone,
          email,
          website
        ),
        baseManager:users (
          id,
          "firstName",
          "lastName",
          email
        )
      `)
      .single();

    console.log('🔍 Backend - Base management creation result:', { baseManagement, createError });

    if (createError) {
      console.error('Error creating base management:', createError);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }

    // OPTIMIZED: Update airfield to mark it as a base (non-blocking)
    supabase
      .from('airfields')
      .update({ isBase: true })
      .eq('id', airfieldId)
      .then(() => console.log('Airfield marked as base'), 
            (err) => console.error('Error marking airfield as base:', err));

    return NextResponse.json(baseManagement, { status: 201 });
  } catch (error) {
    console.error('🔍 Backend - Caught error in POST /api/base-management:', error);
    console.error('🔍 Backend - Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown error type'
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 