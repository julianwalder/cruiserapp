import { NextRequest, NextResponse } from 'next/server';
import { userRegistrationSchema } from '@/lib/validations';
import { AuthService } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';
import { ActivityLogger } from '@/lib/activity-logger';
import crypto from 'crypto';

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
    
    // Get PROSPECT role ID (if it exists)
    const { data: prospectRole, error: prospectRoleError } = await supabase
      .from('roles')
      .select('id')
      .eq('name', 'PROSPECT')
      .single();

    // If PROSPECT role doesn't exist, we'll skip role assignment for now
    if (prospectRoleError) {
      console.log('PROSPECT role not found, skipping role assignment for new user');
    }

    const userId = crypto.randomUUID();

    // Create user
    const { data: user, error: createUserError } = await supabase
      .from('users')
      .insert({
        id: userId,
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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

    // Log user registration activity
    await ActivityLogger.logUserRegistration(
      user.id,
      validatedData.email,
      validatedData.role || 'PROSPECT'
    );
    
    // Assign PROSPECT role to user (if role exists)
    if (prospectRole) {
      const { error: assignRoleError } = await supabase
        .from('user_roles')
        .insert({
          id: crypto.randomUUID(),
          userId: userId,
          roleId: prospectRole.id,
          assignedAt: new Date().toISOString(),
        });

      if (assignRoleError) {
        console.error('Error assigning PROSPECT role:', assignRoleError);
        // Don't fail the registration, but log the error
      }
    }
    
    // Generate JWT token
    const token = AuthService.generateToken({
      userId: user.id,
      email: user.email,
      roles: [validatedData.role || 'PROSPECT'],
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