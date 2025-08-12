import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { AuthService } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Check if user is super admin
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

    const isSuperAdmin = user.user_roles.some(
      (userRole: any) => userRole.roles.name === 'SUPER_ADMIN'
    );

    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Access denied - Super Admin required' }, { status: 403 });
    }

    const aircraftId = params.id;
    const body = await request.json();
    const { hidden } = body;

    if (typeof hidden !== 'boolean') {
      return NextResponse.json({ error: 'Hidden field must be a boolean' }, { status: 400 });
    }

    // Update the aircraft hidden status
    const { data: aircraft, error: updateError } = await supabase
      .from('aircraft')
      .update({ 
        hidden,
        updatedAt: new Date().toISOString()
      })
      .eq('id', aircraftId)
      .select(`
        *,
        icao_reference_type (
          *
        )
      `)
      .single();

    if (updateError) {
      console.error('Error updating aircraft hidden status:', updateError);
      return NextResponse.json({ 
        error: 'Failed to update aircraft hidden status',
        details: updateError.message 
      }, { status: 500 });
    }

    if (!aircraft) {
      return NextResponse.json({ error: 'Aircraft not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: `Aircraft ${hidden ? 'hidden' : 'unhidden'} successfully`,
      aircraft: {
        ...aircraft,
        icaoReferenceType: aircraft.icao_reference_type,
      },
    });
  } catch (error) {
    console.error('Error updating aircraft hidden status:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
