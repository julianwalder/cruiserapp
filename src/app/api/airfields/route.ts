import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { AuthService } from '@/lib/auth';

const prisma = new PrismaClient();

// GET /api/airfields - List airfields with pagination and filtering
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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') || '';
    const status = searchParams.get('status') || '';
    const country = searchParams.get('country') || '';

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { country: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (type && type !== 'ALL') {
      where.type = type;
    }

    if (status && status !== 'ALL_STATUSES') {
      where.status = status;
    }

    if (country && country !== 'ALL_COUNTRIES') {
      where.country = country;
    }

    // Get total count
    const total = await prisma.airfield.count({ where });

    // Get airfields with pagination
    const airfields = await prisma.airfield.findMany({
      where,
      select: {
        id: true,
        name: true,
        code: true,
        type: true,
        city: true,
        state: true,
        country: true,
        latitude: true,
        longitude: true,
        elevation: true,
        runwayLength: true,
        runwaySurface: true,
        phone: true,
        email: true,
        website: true,
        status: true,
        isBase: true,
        createdAt: true,
        updatedAt: true,
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Calculate pagination info
    const pages = Math.ceil(total / limit);

    return NextResponse.json({
      airfields,
      pagination: {
        page,
        limit,
        total,
        pages,
      },
    });
  } catch (error) {
    console.error('Error fetching airfields:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/airfields - Create new airfield (DISABLED - Only import allowed)
export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'Manual airfield creation is disabled. Airfields can only be imported via the import process.' },
    { status: 403 }
  );
} 