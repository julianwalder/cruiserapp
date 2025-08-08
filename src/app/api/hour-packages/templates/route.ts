import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';
import { z } from 'zod';

// Validation schema for hour package template
const hourPackageTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  hours: z.number().positive('Hours must be positive'),
  price_per_hour: z.number().positive('Price per hour must be positive'),
  total_price: z.number().positive('Total price must be positive'),
  currency: z.string().length(3, 'Currency must be 3 characters').default('EUR'),
  validity_days: z.number().positive('Validity days must be positive').default(365),
  is_active: z.boolean().default(true),
});

// GET /api/hour-packages/templates - List all hour package templates
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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';

    // Check permissions based on request type
    const userRoles = user.user_roles?.map(ur => ur.roles?.name || ur.role?.name) || [];
    console.log('User roles:', userRoles);
    console.log('User data:', JSON.stringify(user, null, 2));
    
    // Allow public access for viewing active packages (for onboarding)
    // Require super admin for management operations
    if (!activeOnly && !userRoles.includes('SUPER_ADMIN')) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only super admins can manage hour package templates.' },
        { status: 403 }
      );
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection error' }, { status: 500 });
    }

    // Get remaining query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';

    let query = supabase
      .from('hour_package_templates')
      .select('*', { count: 'exact' });

    // Apply filters
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    // Apply pagination and sorting
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1).order('hours', { ascending: true });

    const { data: templates, error, count } = await query;

    console.log('Database query result:', { templates, error, count });

    if (error) {
      console.error('Error fetching hour package templates:', error);
      return NextResponse.json(
        { error: `Failed to fetch hour package templates: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      templates: templates || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      },
    });

  } catch (error) {
    console.error('Error in GET /api/hour-packages/templates:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/hour-packages/templates - Create a new hour package template
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

    // Check if user is super admin
    const userRoles = user.user_roles?.map(ur => ur.roles?.name || ur.role?.name) || [];
    if (!userRoles.includes('SUPER_ADMIN')) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only super admins can create hour package templates.' },
        { status: 403 }
      );
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection error' }, { status: 500 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = hourPackageTemplateSchema.parse(body);

    // Create the template
    const { data: template, error } = await supabase
      .from('hour_package_templates')
      .insert({
        ...validatedData,
        created_by: user.id,
        updated_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating hour package template:', error);
      return NextResponse.json(
        { error: 'Failed to create hour package template' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Hour package template created successfully',
      template,
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error in POST /api/hour-packages/templates:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 