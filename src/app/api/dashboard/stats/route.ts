import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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

    // Get user to check permissions
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

    // Fetch dashboard statistics
    const [
      totalUsers,
      activeUsers,
      pendingApprovals,
      totalAirfields,
      activeAirfields,
      todayFlights,
      scheduledFlights,
      totalAircraft
    ] = await Promise.all([
      // Total users
      prisma.user.count(),
      
      // Active users
      prisma.user.count({
        where: { status: 'ACTIVE' }
      }),
      
      // Pending approvals
      prisma.user.count({
        where: { status: 'PENDING_APPROVAL' }
      }),
      
      // Total airfields
      prisma.airfield.count(),
      
      // Active airfields
      prisma.airfield.count({
        where: { status: 'ACTIVE' }
      }),
      
      // Today's flights (placeholder - will be implemented with flight scheduling)
      Promise.resolve(0),
      
      // Scheduled flights (placeholder - will be implemented with flight scheduling)
      Promise.resolve(0),
      
      // Total aircraft (placeholder - will be implemented with aircraft management)
      Promise.resolve(0)
    ]);

    return NextResponse.json({
      totalUsers,
      activeUsers,
      pendingApprovals,
      totalAirfields,
      activeAirfields,
      todayFlights,
      scheduledFlights,
      totalAircraft
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 