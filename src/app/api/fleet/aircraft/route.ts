import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { AuthService } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

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
      (userRole) => 
        userRole.role.name === 'SUPER_ADMIN' || 
        userRole.role.name === 'ADMIN' ||
        userRole.role.name === 'INSTRUCTOR' ||
        userRole.role.name === 'PILOT'
    );

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    if (search) {
      where.OR = [
        { callSign: { contains: search, mode: 'insensitive' } },
        { serialNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [aircraft, total] = await Promise.all([
      prisma.aircraft.findMany({
        where,
        include: {
          icaoReferenceType: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.aircraft.count({ where }),
    ]);

    const pages = Math.ceil(total / limit);

    return NextResponse.json({
      aircraft,
      pagination: {
        page,
        limit,
        total,
        pages,
      },
    });
  } catch (error) {
    console.error('Error fetching aircraft:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = AuthService.verifyToken(token);
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

    // Parse multipart form data
    const formData = await request.formData();

    const callSign = formData.get('callSign') as string;
    const serialNumber = formData.get('serialNumber') as string;
    const yearOfManufacture = parseInt(formData.get('yearOfManufacture') as string);
    const icaoTypeDesignator = formData.get('icaoTypeDesignator') as string;
    const model = formData.get('model') as string;
    const manufacturer = formData.get('manufacturer') as string;
    const status = formData.get('status') as string;
    const imageFile = formData.get('image') as File;

    console.log('Aircraft POST formData:', { callSign, serialNumber, yearOfManufacture, icaoTypeDesignator, model, manufacturer, status });

    if (!callSign || !serialNumber || !yearOfManufacture || !icaoTypeDesignator || !model || !manufacturer || !status) {
      console.error('Missing required fields:', { callSign, serialNumber, yearOfManufacture, icaoTypeDesignator, model, manufacturer, status });
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Find the ICAOReferenceType
    const icaoRef = await prisma.iCAOReferenceType.findFirst({
      where: {
        typeDesignator: icaoTypeDesignator,
        model,
      manufacturer,
      },
    });
    console.log('ICAOReferenceType lookup result:', icaoRef);
    if (!icaoRef) {
      console.error('ICAO reference type not found for:', { icaoTypeDesignator, model, manufacturer });
      return NextResponse.json({ error: 'ICAO reference type not found' }, { status: 400 });
    }

    const existingAircraft = await prisma.aircraft.findFirst({
      where: {
        OR: [
          { callSign },
          { serialNumber },
        ],
      },
    });
    if (existingAircraft) {
      console.error('Aircraft with this call sign or serial number already exists:', { callSign, serialNumber });
      return NextResponse.json({ error: 'Aircraft with this call sign or serial number already exists' }, { status: 400 });
    }

    // Handle image upload
    let imagePath = null;
    if (imageFile) {
      // Ensure upload directory exists
      await mkdir(join(process.cwd(), 'public', 'uploads'), { recursive: true });
      
      const fileName = `${Date.now()}-${imageFile.name}`;
      const newPath = join(process.cwd(), 'public', 'uploads', fileName);
      const buffer = Buffer.from(await imageFile.arrayBuffer());
      await writeFile(newPath, buffer);
      imagePath = `/uploads/${fileName}`;
    }

    const aircraft = await prisma.aircraft.create({
      data: {
        callSign,
        serialNumber,
        yearOfManufacture,
        icaoReferenceType: {
          connect: { id: icaoRef.id }
        },
        imagePath,
        status,
      },
      include: {
        icaoReferenceType: true,
      },
    });
    console.log('Aircraft created:', aircraft);
    return NextResponse.json({ aircraft }, { status: 201 });
  } catch (error) {
    console.error('Error creating aircraft:', error);
    return NextResponse.json({ error: 'Internal server error', details: error?.message || error }, { status: 500 });
  }
}

// Add a GET endpoint for ICAO reference types
export async function GET_ICAO_REFERENCE_TYPES(request: NextRequest) {
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