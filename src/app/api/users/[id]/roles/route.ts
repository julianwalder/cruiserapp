import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { AuthService } from '@/lib/auth';

const prisma = new PrismaClient();

// GET /api/users/[id]/roles - Get user roles
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = await AuthService.validateSession(token);
    if (!currentUser) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = request.nextUrl.pathname.split('/')[3]; // Get user ID from URL

    // Users can get their own roles, or ADMIN+ can get any user's roles
    if (currentUser.id !== userId) {
      // Check if current user has ADMIN or SUPER_ADMIN role
      const userRoles = await prisma.userRole.findMany({
        where: {
          userId: currentUser.id,
          role: {
            name: {
              in: ['ADMIN', 'SUPER_ADMIN'],
            },
          },
        },
      });

      if (userRoles.length === 0) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        );
      }
    }

    // Get user roles
    const userRoles = await prisma.userRole.findMany({
      where: {
        userId: userId,
      },
      include: {
        role: true,
      },
    });

    const roles = userRoles.map((ur: any) => ur.role.name);

    return NextResponse.json({ roles });
  } catch (error) {
    console.error('Error fetching user roles:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 