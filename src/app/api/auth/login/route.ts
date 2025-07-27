import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { userLoginSchema } from '@/lib/validations';
import { AuthService } from '@/lib/auth';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validatedData = userLoginSchema.parse(body);
    
    // Find user with roles
    const user = await prisma.user.findUnique({
      where: { email: validatedData.email },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }
    
    // Verify password
    const isValidPassword = await AuthService.verifyPassword(
      validatedData.password,
      user.password
    );
    
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }
    
    // Check if user is active
    if (user.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Account is not active. Please contact administrator.' },
        { status: 403 }
      );
    }
    
    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    
    // Extract roles from userRoles
    const roles = user.userRoles.map(ur => ur.role.name);
    
    // Generate JWT token
    const token = AuthService.generateToken({
      userId: user.id,
      email: user.email,
      roles: roles,
    });
    
    // Create session
    await AuthService.createSession(user.id, token);
    
    // Return user data (excluding password)
    const userData = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      userRoles: user.userRoles,
      roles: roles,
      status: user.status,
      totalFlightHours: user.totalFlightHours,
      licenseNumber: user.licenseNumber,
      medicalClass: user.medicalClass,
      instructorRating: user.instructorRating,
      lastLoginAt: user.lastLoginAt,
    };
    
    return NextResponse.json({
      message: 'Login successful',
      user: userData,
      token,
    });
    
  } catch (error: any) {
    console.error('Login error:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 