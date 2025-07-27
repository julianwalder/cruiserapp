import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }
    const decoded = AuthService.verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    if (!decoded.roles.includes('SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const importId = params.id;
    
    // Get progress from global storage
    const progress = (global as any).importProgress?.[importId];
    
    if (!progress) {
      return NextResponse.json({ error: 'Import not found or expired' }, { status: 404 });
    }

    return NextResponse.json({
      id: progress.id,
      current: progress.current,
      total: progress.total,
      percentage: progress.percentage,
      status: progress.status,
      completed: progress.completed,
      results: progress.results
    });

  } catch (error) {
    console.error('Error fetching import progress:', error);
    return NextResponse.json({ error: 'Failed to fetch progress' }, { status: 500 });
  }
} 