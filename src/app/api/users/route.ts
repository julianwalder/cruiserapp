import { NextRequest, NextResponse } from 'next/server';
import { requireRole, requireAuth, requireAnyRole } from '@/lib/middleware';
import { userRegistrationSchema } from '@/lib/validations';
import { AuthService } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';
import { ActivityLogger } from '@/lib/activity-logger';
import crypto from 'crypto';
import { UUID } from '@/types/uuid-types';


// GET /api/users - List users (ADMIN+ only)
async function getUsers(request: NextRequest, currentUser: any) {
  console.log('🔍 getUsers called with currentUser:', currentUser?.email);
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
    
    // Check if current user is admin
    const { data: currentUserRoles, error: roleCheckError } = await supabase
      .from('user_roles')
      .select(`
        roles (
          name
        )
      `)
      .eq('userId', currentUser.id);

    if (roleCheckError) {
      console.error('Error checking user roles:', roleCheckError);
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      );
    }

    const currentUserRoleNames = currentUserRoles?.map((ur: any) => ur.roles.name) || [];
    const isAdmin = currentUserRoleNames.includes('ADMIN') || currentUserRoleNames.includes('SUPER_ADMIN');

    let users;
    let error;

    if (isAdmin) {
      // For admins, fetch all users directly
      const { data: allUsers, error: allUsersError } = await supabase
        .from('users')
        .select('*')
        .order('createdAt', { ascending: false });
      
      users = allUsers;
      error = allUsersError;
    } else {
      // For regular users, use the secure list_users function
      const { data: listUsersResult, error: listUsersError } = await supabase.rpc('list_users');
      users = listUsersResult;
      error = listUsersError;
    }
    

    
    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      );
    }
    
    // Apply client-side filtering since the function handles basic security
    let filteredUsers = (users || []) as any[];
    
    // Apply status filter
    if (status) {
      filteredUsers = filteredUsers.filter((user: any) => user.status === status);
    }
    
    // Apply search filter
    if (search) {
      filteredUsers = filteredUsers.filter((user: any) => 
        user.firstName?.toLowerCase().includes(search.toLowerCase()) ||
        user.lastName?.toLowerCase().includes(search.toLowerCase()) ||
        user.email?.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    // Always get role information for ALL users (not just when filtering)
    const userIds = filteredUsers.map((u: any) => u.id);
    
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select(`
        userId,
        roles (
          name
        )
      `)
      .in('userId', userIds);
    
    let usersWithRoles = filteredUsers;
    if (!rolesError && userRoles) {
      const roleMap = new Map();
      (userRoles as any[]).forEach((ur: any) => {
        if (!roleMap.has(ur.userId)) {
          roleMap.set(ur.userId, []);
        }
        roleMap.get(ur.userId).push(ur.roles.name);
      });
      
      usersWithRoles = filteredUsers.map((user: any) => ({
        ...user,
        roles: roleMap.get(user.id) || []
      }));
      
      // Apply role filter if specified
      if (role) {
        usersWithRoles = usersWithRoles.filter((user: any) => 
          user.roles.includes(role)
        );
      }
    } else {
      // Add empty roles array for consistency if role fetch failed
      usersWithRoles = filteredUsers.map((user: any) => ({
        ...user,
        roles: []
      }));
    }
    
    // Get total count AFTER role filtering
    const total = usersWithRoles.length;
    
    // Apply pagination AFTER role filtering
    const from = (page - 1) * limit;
    const to = from + limit;
    const paginatedUsers = usersWithRoles.slice(from, to);
    
    return NextResponse.json({
      users: usersWithRoles,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
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

    // Log user creation activity
    await ActivityLogger.logUserRegistration(
      user.id,
      validatedData.email,
      roleNames.join(', ')
    );

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
export const GET = requireAnyRole(['BASE_MANAGER', 'ADMIN', 'SUPER_ADMIN'])(getUsers);

// Export POST with proper middleware
export const POST = requireAnyRole(['ADMIN', 'SUPER_ADMIN'])(createUser); 