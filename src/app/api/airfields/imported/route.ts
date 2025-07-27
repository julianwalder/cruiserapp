import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { AuthService } from '@/lib/auth';

const prisma = new PrismaClient();

// GET /api/airfields/imported - Get imported airfields (base airfields)
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await AuthService.validateSession(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get base airfields (airfields marked as base)
    const baseAirfields = await prisma.airfield.findMany({
      where: {
        isBase: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json({ airfields: baseAirfields });
  } catch (error) {
    console.error('Error fetching imported airfields:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 