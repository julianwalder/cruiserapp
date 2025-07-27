import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { requireRole } from '@/lib/middleware';
import { userRegistrationSchema } from '@/lib/validations';
import { AuthService } from '@/lib/auth';

const prisma = new PrismaClient();

// GET /api/users - List users (ADMIN+ only)
async function getUsers(request: NextRequest, currentUser: any) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const role = searchParams.get('role');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    
    const skip = (page - 1) * limit;
    
    // Build where clause
    const where: any = {};
    
    if (role) {
      where.userRoles = {
        some: {
          role: {
            name: role,
          },
        },
      };
    }
    
    if (status) {
      where.status = status;
    }
    
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { personalNumber: { contains: search, mode: 'insensitive' } },
        { licenseNumber: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    // Get users
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          userRoles: {
            include: {
              role: true
            }
          },
          createdBy: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);
    
    // Map roles to array of strings for each user
    const usersWithRoles = users.map((user) => ({
      ...user,
      roles: user.userRoles.map((ur: any) => ur.role.name),
    }));
    
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

    // Determine roles to assign
    const roleNames = Array.isArray(validatedData.roles) && validatedData.roles.length > 0
      ? validatedData.roles
      : [validatedData.role || 'PILOT'];

    // Find role records
    const roles = await prisma.role.findMany({
      where: { name: { in: roleNames } },
    });

    if (roles.length === 0) {
      return NextResponse.json(
        { error: 'No valid roles provided' },
        { status: 400 }
      );
    }

    // Create user first
    const user = await prisma.user.create({
      data: {
        email: validatedData.email,
        password: hashedPassword,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        personalNumber: validatedData.personalNumber,
        phone: validatedData.phone,
        dateOfBirth: validatedData.dateOfBirth ? new Date(validatedData.dateOfBirth) : null,
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
        createdById: currentUser.id,
      },
      include: {
        userRoles: { include: { role: true } },
        createdBy: true,
      },
    });

    // Assign roles separately
    if (roles.length > 0) {
      await prisma.userRole.createMany({
        data: roles.map((role) => ({
          userId: user.id,
          roleId: role.id,
          assignedBy: currentUser.id || null,
          assignedAt: new Date(),
        })),
      });

      // Fetch user with roles
      const userWithRoles = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          userRoles: { include: { role: true } },
          createdBy: true,
        },
      });

      // Map roles to array of strings
      const userWithRolesArray = {
        ...userWithRoles,
        roles: userWithRoles!.userRoles.map((ur: any) => ur.role.name),
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

  } catch (error: any) {
    console.error('Create user error:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack
    });

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    if (error.code === 'P2003') {
      return NextResponse.json(
        { error: 'Invalid role reference' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Custom middleware for GET users - allow access to instructor/pilot lists for flight logging
async function getUsersWithFlightLoggingAccess(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const payload = await AuthService.verifyToken(token);
    
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Fetch the full user with roles from database
    const currentUser = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        userRoles: {
          include: {
            role: true
          }
        }
      }
    });

    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');

    // Allow access to instructor, pilot, and student lists for flight logging purposes
    if (role === 'INSTRUCTOR' || role === 'PILOT' || role === 'STUDENT') {
      // Any authenticated user can access instructor, pilot, and student lists
      return await getUsers(request, currentUser);
    }

    // For other queries (like getting all users), require ADMIN role
    const isAdmin = currentUser.userRoles.some((ur: any) => 
      ur.role.name === 'ADMIN' || ur.role.name === 'SUPER_ADMIN'
    );

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    return await getUsers(request, currentUser);

  } catch (error) {
    console.error('Get users middleware error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 401 }
    );
  }
}

// Export handlers with custom protection
export const GET = getUsersWithFlightLoggingAccess;
export const POST = requireRole('ADMIN')(createUser); 