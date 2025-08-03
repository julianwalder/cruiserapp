import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';
import crypto from 'crypto';

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
    
    // All authenticated users can read base management data
    // No additional permission check needed for GET requests

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    const { data: baseManagements, error: baseError } = await supabase
      .from('base_management')
      .select(`
        *,
        airfields (
          *
        ),
        baseManager:users (
          id,
          "firstName",
          "lastName",
          email,
          user_roles (
            roles (
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
    const formData = await request.formData();
    const airfieldId = formData.get('airfieldId') as string;
    const baseManagerId = formData.get('baseManagerId') as string;
    const additionalInfo = formData.get('additionalInfo') as string;
    const operatingHours = formData.get('operatingHours') as string;
    const emergencyContact = formData.get('emergencyContact') as string;
    const notes = formData.get('notes') as string;
    const image = formData.get('image') as File | null;

    // Validate required fields
    if (!airfieldId) {
      return NextResponse.json(
        { error: 'Airfield ID is required' },
        { status: 400 }
      );
    }

    // Handle image upload to Vercel Blob
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

    // Check if airfield exists and is not already a base
    const { data: airfield, error: airfieldError } = await supabase
      .from('airfields')
      .select('id, isBase')
      .eq('id', airfieldId)
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
      .eq('airfieldId', airfieldId)
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
        id: crypto.randomUUID(),
        airfieldId: airfieldId,
        baseManagerId: baseManagerId || null,
        additionalInfo: additionalInfo || null,
        facilities: [],
        operatingHours: operatingHours || null,
        emergencyContact: emergencyContact || null,
        notes: notes || null,
                  imagePath: imagePath,
      })
      .select(`
        *,
        airfields!base_management_airfieldId_fkey (
          *
        ),
        baseManager:users!base_management_baseManagerId_fkey (
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
      .from('airfields')
      .update({ isBase: true })
      .eq('id', airfieldId);

    return NextResponse.json(baseManagement, { status: 201 });
  } catch (error) {
    console.error('Error creating base management:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 