import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// Helper function to verify super admin
async function verifySuperAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  
  try {
    const session = await prisma.session.findUnique({
      where: { token },
      include: {
        user: {
          include: {
            userRoles: {
              include: {
                role: true
              }
            }
          }
        }
      }
    });

    if (!session || session.expiresAt < new Date()) {
      return null;
    }

    const isSuperAdmin = session.user.userRoles.some(
      userRole => userRole.role.name === 'SUPER_ADMIN'
    );

    return isSuperAdmin ? session.user : null;
  } catch (error) {
    console.error('Error verifying super admin:', error);
    return null;
  }
}

// GET: Retrieve last import summary
export async function GET(request: NextRequest) {
  const user = await verifySuperAdmin(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized - Super Admin access required' }, { status: 401 });
  }

  try {
    const summaryPath = path.join(process.cwd(), 'data', 'users-import-summary.json');
    
    if (fs.existsSync(summaryPath)) {
      const summaryData = fs.readFileSync(summaryPath, 'utf8');
      const summary = JSON.parse(summaryData);
      return NextResponse.json(summary);
    } else {
      return NextResponse.json(null);
    }
  } catch (error) {
    console.error('Error reading import summary:', error);
    return NextResponse.json(null);
  }
}

// POST: Store import summary
export async function POST(request: NextRequest) {
  const user = await verifySuperAdmin(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized - Super Admin access required' }, { status: 401 });
  }

  try {
    const summary = await request.json();
    
    // Ensure data directory exists
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    const summaryPath = path.join(dataDir, 'users-import-summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error storing import summary:', error);
    return NextResponse.json({ error: 'Failed to store import summary' }, { status: 500 });
  }
} 