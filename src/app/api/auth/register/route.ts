import { NextRequest, NextResponse } from 'next/server';
import { userRegistrationSchema } from '@/lib/validations';
import { AuthService } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validatedData = userRegistrationSchema.parse(body);
    
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection error' },
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
    
    // Create user
    const { data: user, error: createUserError } = await supabase
      .from('users')
      .insert({
        email: validatedData.email,
        password: hashedPassword,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        phone: validatedData.phone,
        dateOfBirth: validatedData.dateOfBirth ? new Date(validatedData.dateOfBirth).toISOString() : null,
        address: validatedData.address,
        city: validatedData.city,
        state: validatedData.state,
        zipCode: validatedData.zipCode,
        country: validatedData.country,
        licenseNumber: validatedData.licenseNumber,
        medicalClass: validatedData.medicalClass,
        instructorRating: validatedData.instructorRating,
        status: 'ACTIVE',
      })
      .select('id, email, "firstName", "lastName", status, "createdAt"')
      .single();
    
    if (createUserError) {
      console.error('Error creating user:', createUserError);
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      );
    }
    
    // Get the default role (PILOT)
    const { data: defaultRole, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('name', validatedData.role || 'PILOT')
      .single();
    
    if (roleError) {
      console.error('Error finding default role:', roleError);
      return NextResponse.json(
        { error: 'Failed to assign role' },
        { status: 500 }
      );
    }
    
    if (defaultRole) {
      // Assign the role to the user
      const { error: assignRoleError } = await supabase
        .from('userRoles')
        .insert({
          userId: user.id,
          roleId: defaultRole.id,
          assignedAt: new Date().toISOString(),
        });
      
      if (assignRoleError) {
        console.error('Error assigning role:', assignRoleError);
        return NextResponse.json(
          { error: 'Failed to assign role' },
          { status: 500 }
        );
      }
    }
    
    // Generate JWT token
    const token = AuthService.generateToken({
      userId: user.id,
      email: user.email,
      roles: [validatedData.role || 'PILOT'],
    });
    
    // Create session (for backward compatibility)
    await AuthService.createSession(user.id, token);
    
    return NextResponse.json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        status: user.status,
        createdAt: user.createdAt,
      },
      token,
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('Registration error:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 