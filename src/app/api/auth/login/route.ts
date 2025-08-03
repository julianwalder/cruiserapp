import { NextRequest, NextResponse } from 'next/server';
import { userLoginSchema } from '@/lib/validations';
import { AuthService } from '@/lib/auth';
import { UUID } from '@/types/uuid-types';
import { ActivityLogger } from '@/lib/activity-logger';

// Extended User interface for auth with user_roles
interface AuthUser {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING_APPROVAL';
  totalFlightHours: number;
  licenseNumber?: string;
  medicalClass?: string;
  instructorRating?: string;
  user_roles: Array<{
    roles: {
      id: string;
      name: string;
    };
  }>;
}


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = userLoginSchema.parse(body);

    // Validate user credentials using Supabase
    const user = await AuthService.validateUser(email, password) as AuthUser | null;
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check if user is inactive and provide appropriate feedback
    if (user.status === 'INACTIVE') {
      return NextResponse.json(
        { 
          error: 'Your account has been suspended. Please contact an administrator for reactivation.',
          status: 'INACTIVE',
          userId: user.id 
        },
        { status: 403 }
      );
    }

    // Check if user is a prospect and provide guidance
    const userRoles = user.user_roles.map(userRole => userRole.roles.name);
    if (userRoles.includes('PROSPECT')) {
      return NextResponse.json({
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          userRoles: user.user_roles,
          roles: userRoles,
          status: user.status,
          totalFlightHours: 0,
          licenseNumber: null,
          medicalClass: null,
          instructorRating: null,
          lastLoginAt: new Date().toISOString(),
        },
        token: AuthService.generateToken({
          userId: user.id,
          email: user.email,
          roles: userRoles,
        }),
        prospectGuidance: 'Welcome! Please complete your document validation to upgrade your account status.',
      });
    }

    // Extract roles from user
    const roles = user.user_roles.map(userRole => userRole.roles.name);

    // Generate JWT token
    const token = AuthService.generateToken({
      userId: user.id,
      email: user.email,
      roles,
    });

    // Update last login time
    await AuthService.updateLastLogin(user.id);

    // Log the login activity
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    await ActivityLogger.logUserLogin(user.id, ipAddress, userAgent);

    // Prepare user data for response (exclude password)
    const userData = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      userRoles: user.user_roles, // Keep userRoles for frontend compatibility
      roles,
      status: user.status,
      totalFlightHours: 0, // You might want to fetch this from the database
      licenseNumber: null,
      medicalClass: null,
      instructorRating: null,
      lastLoginAt: new Date().toISOString(),
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
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 