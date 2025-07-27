import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { userRegistrationSchema } from '@/lib/validations';
import { AuthService } from '@/lib/auth';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validatedData = userRegistrationSchema.parse(body);
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }
    
    // Hash password
    const hashedPassword = await AuthService.hashPassword(validatedData.password);
    
    // Create user
    const user = await prisma.user.create({
      data: {
        email: validatedData.email,
        password: hashedPassword,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        phone: validatedData.phone,
        dateOfBirth: validatedData.dateOfBirth ? new Date(validatedData.dateOfBirth) : null,
        address: validatedData.address,
        city: validatedData.city,
        state: validatedData.state,
        zipCode: validatedData.zipCode,
        country: validatedData.country,
        licenseNumber: validatedData.licenseNumber,
        medicalClass: validatedData.medicalClass,
        instructorRating: validatedData.instructorRating,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        createdAt: true,
      },
    });

    // Get the default role (PILOT)
    const defaultRole = await prisma.role.findUnique({
      where: { name: validatedData.role || 'PILOT' },
    });

    if (defaultRole) {
      // Assign the role to the user
      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: defaultRole.id,
        },
      });
    }
    
    // Generate JWT token with default role
    const token = AuthService.generateToken({
      userId: user.id,
      email: user.email,
      roles: [validatedData.role || 'PILOT'],
    });
    
    // Create session
    await AuthService.createSession(user.id, token);
    
    return NextResponse.json({
      message: 'User registered successfully',
      user,
      token,
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('Registration error:', error);
    
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