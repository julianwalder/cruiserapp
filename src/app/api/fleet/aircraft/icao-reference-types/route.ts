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

    // Allow all authenticated users to read ICAO reference types
    const { data: user, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        user_roles (
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

    // All authenticated users can read ICAO reference types
    console.log('✅ User authenticated, allowing access to ICAO reference types');

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