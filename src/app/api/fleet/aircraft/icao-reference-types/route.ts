import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { AuthService } from '@/lib/auth';

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

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Only allow admin/superadmin
    const { data: user, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        user_roles!user_roles_userId_fkey (
          roles (
            name
          )
        )
      `)
      .eq('id', decoded.userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const hasAccess = user.user_roles.some(
      (userRole: any) => userRole.roles.name === 'SUPER_ADMIN' || userRole.roles.name === 'ADMIN'
    );
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { data: icaoTypes, error: icaoError } = await supabase
      .from('icao_reference_type')
      .select(`
        id,
        "typeDesignator",
        model,
        manufacturer
      `)
      .order('typeDesignator', { ascending: true });

    if (icaoError) {
      console.error('Error fetching ICAO reference types:', icaoError);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    return NextResponse.json({ icaoTypes });
  } catch (error) {
    console.error('Error fetching ICAO reference types:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 