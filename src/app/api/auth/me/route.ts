import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';
import { UUID } from '@/types/uuid-types';


export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = AuthService.verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection error' }, { status: 500 });
    }

    // Get user data with roles
    const { data: user, error } = await supabase
      .from('users')
      .select(`
        id,
        email,
        "firstName",
        "lastName",
        status,
        "totalFlightHours",
        "licenseNumber",
        "medicalClass",
        "instructorRating",
        "lastLoginAt",
        "createdAt",
        "updatedAt",
        user_roles (
          roles (
            name
          )
        )
      `)
      .eq('id', decoded.userId)
      .single();

    if (error || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Extract roles from user_roles
    const roles = user.user_roles.map((ur: any) => ur.roles.name);

    // Return user data with roles array
    const userData = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      userRoles: user.user_roles, // Keep userRoles for frontend compatibility
      roles: roles,
      status: user.status,
      totalFlightHours: user.totalFlightHours || 0,
      licenseNumber: user.licenseNumber,
      medicalClass: user.medicalClass,
      instructorRating: user.instructorRating,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return NextResponse.json(userData);
  } catch (error) {
    console.error('Error fetching user data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 