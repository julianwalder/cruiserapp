import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';
import crypto from 'crypto';

// PUT /api/base-management/[id] - Assign base manager (OPTIMIZED)
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

    // Get user roles from JWT token
    const payload = AuthService.verifyToken(token);
    const userRoles = payload?.roles || [];
    
    // Check if user has appropriate permissions (SUPER_ADMIN or ADMIN only)
    if (!AuthService.hasRole(userRoles, 'SUPER_ADMIN') && 
        !AuthService.hasRole(userRoles, 'ADMIN')) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only administrators can edit base assignments.' },
        { status: 403 }
      );
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection error' }, { status: 500 });
    }

    const { id } = await params;
    
    // Parse FormData
    const formData = await request.formData();
    const managerId = formData.get('managerId') as string;
    const additionalInfo = formData.get('additionalInfo') as string;
    const operatingHours = formData.get('operatingHours') as string;
    const emergencyContact = formData.get('emergencyContact') as string;
    const notes = formData.get('notes') as string;
    const image = formData.get('image') as File | null;

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

    // OPTIMIZED: Single query to check manager and role (only if managerId is provided)
    if (managerId) {
      console.log('🔍 Checking manager with ID:', managerId);
      
      const { data: managerExists, error: managerError } = await supabase
        .from('users')
        .select(`
          id,
          "firstName",
          "lastName",
          user_roles (
            roles (
              name
            )
          )
        `)
        .eq('id', managerId)
        .single();

      console.log('🔍 Manager query result:', { managerExists, managerError });

      if (managerError || !managerExists) {
        console.log('🔍 Manager not found:', managerError);
        return NextResponse.json(
          { error: 'Manager not found' },
          { status: 404 }
        );
      }

      // Check if user has appropriate role (ADMIN, SUPER_ADMIN, or BASE_MANAGER)
      const managerRoles = managerExists.user_roles?.map((ur: any) => ur.roles.name) || [];
      console.log('🔍 Manager roles:', managerRoles);
      
      const hasAppropriateRole = managerRoles.some((role: string) => 
        ['ADMIN', 'SUPER_ADMIN', 'BASE_MANAGER'].includes(role)
      );

      console.log('🔍 Has appropriate role:', hasAppropriateRole);

      if (!hasAppropriateRole) {
        return NextResponse.json(
          { error: 'Manager must have ADMIN, SUPER_ADMIN, or BASE_MANAGER role' },
          { status: 400 }
        );
      }
    }

    // OPTIMIZED: Check if base management exists and get current data
    const { data: existingBaseManagement, error: existingError } = await supabase
      .from('base_management')
      .select('id, "baseManagerId", "imagePath"')
      .eq('airfieldId', id)
      .single();

    if (existingError && existingError.code !== 'PGRST116') {
      console.error('Error checking existing base management:', existingError);
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      );
    }

    if (existingBaseManagement) {
      // OPTIMIZED: Update existing base management
      const updateData: any = {
        baseManagerId: managerId || null,
        additionalInfo: additionalInfo || null,
        operatingHours: operatingHours || null,
        emergencyContact: emergencyContact || null,
        notes: notes || null,
        updatedAt: new Date().toISOString(),
      };

      // Only update imagePath if a new image was uploaded
      if (imagePath) {
        updateData.imagePath = imagePath;
      }

      const { data: updatedBaseManagement, error: updateError } = await supabase
        .from('base_management')
        .update(updateData)
        .eq('airfieldId', id)
        .select(`
          id,
          "airfieldId",
          "baseManagerId",
          "additionalInfo",
          "operatingHours",
          "emergencyContact",
          "notes",
          "imagePath",
          "updatedAt"
        `)
        .single();

      if (updateError) {
        console.error('Error updating base management:', updateError);
        return NextResponse.json(
          { error: 'Failed to update base management' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        message: 'Base manager updated successfully',
        baseManagement: updatedBaseManagement,
      });
    } else {
      // OPTIMIZED: Check if airfield exists before creating base management
      const { data: airfield, error: airfieldError } = await supabase
        .from('airfields')
        .select('id')
        .eq('id', id)
        .single();

      if (airfieldError || !airfield) {
        return NextResponse.json(
          { error: 'Airfield not found' },
          { status: 404 }
        );
      }

      // OPTIMIZED: Create new base management
      const { data: newBaseManagement, error: createError } = await supabase
        .from('base_management')
        .insert({
          id: crypto.randomUUID(),
          airfieldId: id,
          baseManagerId: managerId || null,
          additionalInfo: additionalInfo || null,
          operatingHours: operatingHours || null,
          emergencyContact: emergencyContact || null,
          notes: notes || null,
          imagePath: imagePath,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .select(`
          id,
          "airfieldId",
          "baseManagerId",
          "additionalInfo",
          "operatingHours",
          "emergencyContact",
          "notes",
          "imagePath",
          "createdAt",
          "updatedAt"
        `)
        .single();

      if (createError) {
        console.error('Error creating base management:', createError);
        return NextResponse.json(
          { error: 'Failed to create base management' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        message: 'Base manager assigned successfully',
        baseManagement: newBaseManagement,
      }, { status: 201 });
    }
  } catch (error) {
    console.error('Error managing base:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/base-management/[id] - Remove base manager (OPTIMIZED)
export async function DELETE(
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

    // Get user roles from JWT token
    const payload = AuthService.verifyToken(token);
    const userRoles = payload?.roles || [];
    
    // Check if user has appropriate permissions (SUPER_ADMIN or ADMIN only)
    if (!AuthService.hasRole(userRoles, 'SUPER_ADMIN') && 
        !AuthService.hasRole(userRoles, 'ADMIN')) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only administrators can delete base assignments.' },
        { status: 403 }
      );
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection error' }, { status: 500 });
    }

    const { id } = await params;

    // OPTIMIZED: Delete base management directly (Supabase will handle not found)
    const { error: deleteError } = await supabase
      .from('base_management')
      .delete()
      .eq('airfieldId', id);

    if (deleteError) {
      console.error('Error deleting base management:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete base management' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Base manager removed successfully' });
  } catch (error) {
    console.error('Error removing base manager:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 