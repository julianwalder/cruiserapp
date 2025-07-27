import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync, readFileSync } from 'fs';
import path from 'path';

// GET - Read last import summary
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await AuthService.verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Fetch the full user with roles from database
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

    // Check if user is super admin
    const isSuperAdmin = user.userRoles.some((ur: any) => ur.role.name === 'SUPER_ADMIN');
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden - Super Admin access required' }, { status: 403 });
    }

    // Read from file
    const dataDir = path.join(process.cwd(), 'data');
    const summaryFile = path.join(dataDir, 'flight-logs-import-summary.json');

    // Ensure data directory exists
    if (!existsSync(dataDir)) {
      await mkdir(dataDir, { recursive: true });
    }

    if (!existsSync(summaryFile)) {
      return NextResponse.json({
        date: '',
        totalImported: 0,
        totalErrors: 0,
        totalSkipped: 0,
        lastImportDate: '',
        total: 0,
      });
    }

    const fileContent = readFileSync(summaryFile, 'utf-8');
    const summaryData = JSON.parse(fileContent);
    return NextResponse.json(summaryData);

  } catch (error) {
    console.error('Error reading flight logs import summary:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Save import summary
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await AuthService.verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Fetch the full user with roles from database
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

    // Check if user is super admin
    const isSuperAdmin = user.userRoles.some((ur: any) => ur.role.name === 'SUPER_ADMIN');
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden - Super Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { date, totalImported, totalErrors, totalSkipped, lastImportDate, total } = body;

    // Ensure data directory exists
    const dataDir = path.join(process.cwd(), 'data');
    if (!existsSync(dataDir)) {
      await mkdir(dataDir, { recursive: true });
    }

    // Write to file
    const summaryFile = path.join(dataDir, 'flight-logs-import-summary.json');
    const summaryData = {
      date,
      totalImported,
      totalErrors,
      totalSkipped,
      lastImportDate,
      total,
    };

    await writeFile(summaryFile, JSON.stringify(summaryData, null, 2));

    return NextResponse.json({ message: 'Import summary saved successfully' });

  } catch (error) {
    console.error('Error saving flight logs import summary:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 