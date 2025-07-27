import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { AuthService } from '@/lib/auth';

const prisma = new PrismaClient();

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check if user has admin or super admin role
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
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

    const iCAOtypeId = params.id;
    const body = await request.json();
    const { status } = body;

    // Check if iCAOtype exists
    const iCAOtype = await prisma.iCAOtype.findUnique({
      where: { id: iCAOtypeId },
    });

    if (!iCAOtype) {
      return NextResponse.json({ error: 'iCAOtype not found' }, { status: 404 });
    }

    // Validate status
    const validStatuses = ['ACTIVE', 'MAINTENANCE', 'OUT_OF_SERVICE', 'RETIRED'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Update iCAOtype status
    const updatediCAOtype = await prisma.iCAOtype.update({
      where: { id: iCAOtypeId },
      data: { status },
      include: {
        baseAirfield: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        fleetManagement: {
          include: {
            assignedPilot: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ iCAOtype: updatediCAOtype });
  } catch (error) {
    console.error('Error updating iCAOtype status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 