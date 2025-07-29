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

    // Check if user has admin or super admin role
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

    const hasAccess = user.userRoles.some(
      (userRole: any) => userRole.role.name === 'SUPER_ADMIN' || userRole.role.name === 'ADMIN' || userRole.role.name === 'BASE_MANAGER'
    );

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const iCAOtypeId = params.id;
    const body = await request.json();
    const { status } = body;

    // Check if iCAOtype exists
    const { data: iCAOtype, error: iCAOtypeError } = await supabase
      .from('iCAOtype')
      .select('id')
      .eq('id', iCAOtypeId)
      .single();

    if (iCAOtypeError || !iCAOtype) {
      return NextResponse.json({ error: 'iCAOtype not found' }, { status: 404 });
    }

    // Validate status
    const validStatuses = ['ACTIVE', 'MAINTENANCE', 'OUT_OF_SERVICE', 'RETIRED'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Update iCAOtype status
    const { data: updatediCAOtype, error: updateError } = await supabase
      .from('iCAOtype')
      .update({ status })
      .eq('id', iCAOtypeId)
      .select(`
        *,
        baseAirfield (
          id,
          name,
          code
        ),
        fleetManagement (
          assignedPilot (
            id,
            "firstName",
            "lastName",
            email
          )
        )
      `)
      .single();

    if (updateError) {
      console.error('Error updating iCAOtype status:', updateError);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    return NextResponse.json({ iCAOtype: updatediCAOtype });
  } catch (error) {
    console.error('Error updating iCAOtype status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 