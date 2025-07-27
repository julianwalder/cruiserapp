import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { AuthService } from '@/lib/auth';

const prisma = new PrismaClient();

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
    // Only allow admin/superadmin
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { userRoles: { include: { role: true } } },
    });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const hasAccess = user.userRoles.some(
      (userRole) => userRole.role.name === 'SUPER_ADMIN' || userRole.role.name === 'ADMIN'
    );
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    const icaoTypes = await prisma.iCAOReferenceType.findMany({
      select: {
        id: true,
        typeDesignator: true,
        model: true,
        manufacturer: true,
      },
      orderBy: { typeDesignator: 'asc' },
    });
    return NextResponse.json({ icaoTypes });
  } catch (error) {
    console.error('Error fetching ICAO reference types:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 