import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { AuthService } from '@/lib/auth';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { join } from 'path';
import formidable from 'formidable';

const prisma = new PrismaClient();

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: aircraftId } = await params;

    // Check if aircraft exists
    const aircraft = await prisma.aircraft.findUnique({
      where: { id: aircraftId },
    });

    if (!aircraft) {
      return NextResponse.json({ error: 'Aircraft not found' }, { status: 404 });
    }

    // Delete aircraft
    await prisma.aircraft.delete({
      where: { id: aircraftId },
    });

    return NextResponse.json({ message: 'Aircraft deleted successfully' });
  } catch (error) {
    console.error('Error deleting aircraft:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    // Check if aircraft exists
    const existingAircraft = await prisma.aircraft.findUnique({
      where: { id },
      include: { icaoReferenceType: true },
    });

    if (!existingAircraft) {
      return NextResponse.json({ error: 'Aircraft not found' }, { status: 404 });
    }

    // Convert NextRequest to Node.js request for formidable
    const formData = await request.formData();
    
    const callSign = formData.get('callSign') as string;
    const serialNumber = formData.get('serialNumber') as string;
    const yearOfManufacture = parseInt(formData.get('yearOfManufacture') as string);
    const icaoTypeDesignator = formData.get('icaoTypeDesignator') as string;
    const model = formData.get('model') as string;
    const manufacturer = formData.get('manufacturer') as string;
    const status = formData.get('status') as string;
    const imageFile = formData.get('image') as File | null;

    console.log('Aircraft PUT formData:', { callSign, serialNumber, yearOfManufacture, icaoTypeDesignator, model, manufacturer, status });

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

    // Check for duplicate callSign or serialNumber (excluding current aircraft)
    const duplicateAircraft = await prisma.aircraft.findFirst({
      where: {
        OR: [
          { callSign },
          { serialNumber },
        ],
        NOT: {
          id,
        },
      },
    });
    if (duplicateAircraft) {
      console.error('Aircraft with this call sign or serial number already exists:', { callSign, serialNumber });
      return NextResponse.json({ error: 'Aircraft with this call sign or serial number already exists' }, { status: 400 });
    }

    // Handle image upload
    let imagePath = existingAircraft.imagePath; // Keep existing image if no new one
    if (imageFile && imageFile.size > 0) {
      const bytes = await imageFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const fileName = `${Date.now()}-${imageFile.name}`;
      const uploadDir = join(process.cwd(), 'public', 'uploads');
      await mkdir(uploadDir, { recursive: true });
      const filePath = join(uploadDir, fileName);
      await writeFile(filePath, buffer);
      imagePath = `/uploads/${fileName}`;
    }

    const aircraft = await prisma.aircraft.update({
      where: { id },
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
    console.log('Aircraft updated:', aircraft);
    return NextResponse.json({ aircraft }, { status: 200 });
  } catch (error) {
    console.error('Error updating aircraft:', error);
    return NextResponse.json({ error: 'Internal server error', details: error?.message || error }, { status: 500 });
  }
} 