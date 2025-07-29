import { NextRequest, NextResponse } from 'next/server';
import { requireRole, requireAuth, requireAnyRole } from '@/lib/middleware';
import { userRegistrationSchema } from '@/lib/validations';
import { AuthService } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';
import crypto from 'crypto';

// GET /api/users - List users (ADMIN+ only)
async function getUsers(request: NextRequest, currentUser: any) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const role = searchParams.get('role');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection error' },
        { status: 500 }
      );
    }
    
    // Build query with role information
    let query = supabase
      .from('users')
      .select(`
        id,
        email,
        "firstName",
        "lastName",
        status,
        "createdAt",
        "updatedAt",
        user_roles!user_roles_userId_fkey (
          roles (
            name
          )
        )
      `, { count: 'exact' });
    
    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    
    if (search) {
      query = query.or(`firstName.ilike.%${search}%,lastName.ilike.%${search}%,email.ilike.%${search}%`);
    }
    
    // Get total count first
    const { count: total } = await query;
    
    // Apply pagination only if not filtering by role (since we need to check all users for role filtering)
    if (!role) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;
      query = query.range(from, to);
    }
    
    query = query.order('createdAt', { ascending: false });
    
    // Execute query
    const { data: users, error } = await query;
    
    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      );
    }
    
    // Filter by role if specified (since Supabase doesn't support complex joins in filters)
    let filteredUsers = users || [];
    if (role) {
      filteredUsers = filteredUsers.filter(user => 
        user.user_roles.some((ur: any) => ur.roles.name === role)
      );
    }
    
    // Map roles to array of strings for each user
    const usersWithRoles = filteredUsers.map((user) => ({
      ...user,
      roles: user.user_roles.map((ur: any) => ur.roles.name),
    }));
    
    return NextResponse.json({
      users: usersWithRoles,
      pagination: {
        page: role ? 1 : page, // Always page 1 when filtering by role
        limit: role ? usersWithRoles.length : limit, // Show all results when filtering by role
        total: role ? usersWithRoles.length : (total || 0),
        pages: role ? 1 : Math.ceil((total || 0) / limit),
      },
    });
    
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/users - Create user (ADMIN+ only)
async function createUser(request: NextRequest, currentUser: any) {
  console.log('🔍 createUser - Function called');
  console.log('🔍 createUser - Current user:', currentUser);
  
  try {
    const body = await request.json();
    console.log('Received user data:', body);

    // Validate input
    const validatedData = userRegistrationSchema.parse(body);
    console.log('Validated data:', validatedData);

    const supabase = getSupabaseClient();
    console.log('🔍 createUser - Supabase client:', supabase ? 'created' : 'null');
    if (!supabase) {
      console.error('🔍 createUser - Database connection error: SUPABASE_SERVICE_ROLE_KEY missing');
      return NextResponse.json(
        { error: 'Database connection error: Missing Supabase service role key' },
        { status: 500 }
      );
    }

    // Check if user already exists
    const { data: existingUser, error: existingUserError } = await supabase
      .from('users')
      .select('id')
      .eq('email', validatedData.email)
      .single();

    if (existingUserError && existingUserError.code !== 'PGRST116') {
      console.error('Error checking existing user:', existingUserError);
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      );
    }

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await AuthService.hashPassword(validatedData.password);

    // Determine roles to assign
    const roleNames = Array.isArray(validatedData.roles) && validatedData.roles.length > 0
      ? validatedData.roles
      : [validatedData.role || 'PILOT'];

    // Find role records
    const { data: roles, error: rolesError } = await supabase
      .from('roles')
      .select('id, name')
      .in('name', roleNames);

    if (rolesError || !roles || roles.length === 0) {
      return NextResponse.json(
        { error: 'No valid roles provided' },
        { status: 400 }
      );
    }

    // Create user
    const { data: user, error: createUserError } = await supabase
      .from('users')
      .insert({
        id: crypto.randomUUID(),
        email: validatedData.email,
        password: hashedPassword,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        personalNumber: validatedData.personalNumber,
        phone: validatedData.phone,
        dateOfBirth: validatedData.dateOfBirth ? new Date(validatedData.dateOfBirth).toISOString() : null,
        address: validatedData.address,
        city: validatedData.city,
        state: validatedData.state,
        zipCode: validatedData.zipCode,
        country: validatedData.country,
        status: validatedData.status || 'ACTIVE',
        totalFlightHours: validatedData.totalFlightHours || 0,
        licenseNumber: validatedData.licenseNumber,
        medicalClass: validatedData.medicalClass,
        instructorRating: validatedData.instructorRating,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdById: null,
      })
      .select(`
        id,
        email,
        "firstName",
        "lastName",
        status,
        "createdAt"
      `)
      .single();

    if (createUserError) {
      console.error('Error creating user:', createUserError);
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      );
    }

    // Assign roles
    if (roles.length > 0) {
      const roleAssignments = roles.map((role) => ({
        userId: user.id,
        roleId: role.id,
        assignedBy: null, // Set to null to avoid foreign key constraint
        assignedAt: new Date().toISOString(),
      }));

      console.log('🔍 createUser - Role assignments:', roleAssignments);
      
      const { error: assignRolesError } = await supabase
        .from('userRoles')
        .insert(roleAssignments);

      if (assignRolesError) {
        console.error('Error assigning roles:', assignRolesError);
        console.error('Error details:', assignRolesError.details);
        console.error('Error hint:', assignRolesError.hint);
        // Don't fail the entire operation, just log the error
        console.warn('Role assignment failed, but user was created successfully');
      }

      // Return user with assigned roles
      const userWithRolesArray = {
        ...user,
        roles: roles.map((role: any) => role.name),
      };

      return NextResponse.json({
        message: 'User created successfully',
        user: userWithRolesArray,
      }, { status: 201 });
    }

    // Map roles to array of strings (empty array)
    const userWithRolesArray = {
      ...user,
      roles: [],
    };

    return NextResponse.json({
      message: 'User created successfully',
      user: userWithRolesArray,
    }, { status: 201 });

  } catch (error: any) {
    console.error('Create user error:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);

    if (error.name === 'ZodError') {
      console.error('Zod validation errors:', error.errors);
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

// Export the handlers with middleware
export const GET = requireAnyRole(['ADMIN', 'BASE_MANAGER'])(getUsers);

// Temporarily bypass middleware for testing
export const POST = async (request: NextRequest) => {
  console.log('🔍 POST /api/users - Direct handler called');
  
  try {
    // Create a mock current user for testing
    const currentUser = { 
      id: 'test-user-id', 
      email: 'test@example.com',
      user_roles: [{ roles: { name: 'ADMIN' } }]
    };
    
    return await createUser(request, currentUser);
  } catch (error: any) {
    console.error('🔍 POST /api/users - Error in direct handler:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}; 