import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';
import { z } from 'zod';

// Validation schema for updating hour package template
const updateHourPackageTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  description: z.string().optional(),
  hours: z.number().positive('Hours must be positive').optional(),
  price_per_hour: z.number().positive('Price per hour must be positive').optional(),
  total_price: z.number().positive('Total price must be positive').optional(),
  currency: z.string().length(3, 'Currency must be 3 characters').optional(),
  validity_days: z.number().positive('Validity days must be positive').optional(),
  is_active: z.boolean().optional(),
});

// GET /api/hour-packages/templates/[id] - Get a specific hour package template
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

    // Check if user is super admin
    const userRoles = user.user_roles?.map(ur => ur.roles?.name || ur.role?.name) || [];
    if (!userRoles.includes('SUPER_ADMIN')) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only super admins can view hour package templates.' },
        { status: 403 }
      );
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection error' }, { status: 500 });
    }

    const resolvedParams = await params;
    const { data: template, error } = await supabase
      .from('hour_package_templates')
      .select('*')
      .eq('id', resolvedParams.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Hour package template not found' },
          { status: 404 }
        );
      }
      console.error('Error fetching hour package template:', error);
      return NextResponse.json(
        { error: 'Failed to fetch hour package template' },
        { status: 500 }
      );
    }

    return NextResponse.json({ template });

  } catch (error) {
    console.error('Error in GET /api/hour-packages/templates/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/hour-packages/templates/[id] - Update a specific hour package template
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

    // Check if user is super admin
    const userRoles = user.user_roles?.map(ur => ur.roles?.name || ur.role?.name) || [];
    if (!userRoles.includes('SUPER_ADMIN')) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only super admins can update hour package templates.' },
        { status: 403 }
      );
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection error' }, { status: 500 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = updateHourPackageTemplateSchema.parse(body);

    // Update the template
    const resolvedParams = await params;
    const { data: template, error } = await supabase
      .from('hour_package_templates')
      .update({
        ...validatedData,
        updated_by: user.id,
      })
      .eq('id', resolvedParams.id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Hour package template not found' },
          { status: 404 }
        );
      }
      console.error('Error updating hour package template:', error);
      return NextResponse.json(
        { error: 'Failed to update hour package template' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Hour package template updated successfully',
      template,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error in PUT /api/hour-packages/templates/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/hour-packages/templates/[id] - Delete a specific hour package template
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

    // Check if user is super admin
    const userRoles = user.user_roles?.map(ur => ur.roles?.name || ur.role?.name) || [];
    if (!userRoles.includes('SUPER_ADMIN')) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only super admins can delete hour package templates.' },
        { status: 403 }
      );
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection error' }, { status: 500 });
    }

    // Check if template exists
    const resolvedParams = await params;
    const { data: existingTemplate, error: fetchError } = await supabase
      .from('hour_package_templates')
      .select('id')
      .eq('id', resolvedParams.id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Hour package template not found' },
          { status: 404 }
        );
      }
      console.error('Error checking hour package template:', fetchError);
      return NextResponse.json(
        { error: 'Failed to check hour package template' },
        { status: 500 }
      );
    }

    // Delete the template
    const { error } = await supabase
      .from('hour_package_templates')
      .delete()
      .eq('id', resolvedParams.id);

    if (error) {
      console.error('Error deleting hour package template:', error);
      return NextResponse.json(
        { error: 'Failed to delete hour package template' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Hour package template deleted successfully',
    });

  } catch (error) {
    console.error('Error in DELETE /api/hour-packages/templates/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 