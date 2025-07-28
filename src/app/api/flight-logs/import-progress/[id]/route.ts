import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';

// Global storage for import progress (in production, use Redis or similar)
(global as any).flightLogsImportProgress = (global as any).flightLogsImportProgress || {};
const importProgress = (global as any).flightLogsImportProgress;

// GET - Fetch import progress
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await AuthService.verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Fetch the full user with roles from database
    const { data: user, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        userRoles (
          role (
            name
          )
        )
      `)
      .eq('id', decoded.userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user is super admin
    const isSuperAdmin = user.userRoles.some((ur: any) => ur.role.name === 'SUPER_ADMIN');
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden - Super Admin access required' }, { status: 403 });
    }

    const { id: importId } = await params;
    const progress = importProgress[importId];

    if (!progress) {
      return NextResponse.json({ error: 'Import progress not found' }, { status: 404 });
    }

    return NextResponse.json(progress);

  } catch (error) {
    console.error('Error fetching import progress:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 