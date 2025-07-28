import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { AuthService } from '@/lib/auth';

export async function POST(
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
      (userRole: any) => userRole.role.name === 'SUPER_ADMIN' || userRole.role.name === 'ADMIN'
    );

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const iCAOtypeId = params.id;
    const body = await request.json();
    const {
      assignedPilotId,
      maintenanceSchedule,
      operationalHours,
      fuelType,
      fuelCapacity,
      range,
      maxPassengers,
      maxPayload,
      specialEquipment,
      operationalNotes,
    } = body;

    // Check if iCAOtype exists
    const { data: iCAOtype, error: iCAOtypeError } = await supabase
      .from('iCAOtype')
      .select('id')
      .eq('id', iCAOtypeId)
      .single();

    if (iCAOtypeError || !iCAOtype) {
      return NextResponse.json({ error: 'iCAOtype not found' }, { status: 404 });
    }

    // Check if assigned pilot exists and has PILOT role
    if (assignedPilotId) {
      const { data: pilot, error: pilotError } = await supabase
        .from('users')
        .select(`
          id,
          userRoles (
            role (
              name
            )
          )
        `)
        .eq('id', assignedPilotId)
        .single();

      if (pilotError || !pilot) {
        return NextResponse.json({ error: 'Assigned pilot not found' }, { status: 404 });
      }

      const isPilot = pilot.userRoles.some(
        (userRole: any) => userRole.role.name === 'PILOT' || userRole.role.name === 'INSTRUCTOR'
      );

      if (!isPilot) {
        return NextResponse.json({ error: 'Assigned user must be a pilot or instructor' }, { status: 400 });
      }
    }

    // Check if fleet management record exists
    const { data: existingManagement } = await supabase
      .from('fleetManagement')
      .select('id')
      .eq('iCAOtypeId', iCAOtypeId)
      .single();

    const managementData = {
      assignedPilotId: assignedPilotId || null,
      maintenanceSchedule: maintenanceSchedule || null,
      operationalHours: operationalHours || null,
      fuelType: fuelType || null,
      fuelCapacity: fuelCapacity ? parseFloat(fuelCapacity) : null,
      range: range ? parseFloat(range) : null,
      maxPassengers: maxPassengers ? parseInt(maxPassengers) : null,
      maxPayload: maxPayload ? parseFloat(maxPayload) : null,
      specialEquipment: specialEquipment || [],
      operationalNotes: operationalNotes || null,
    };

    let fleetManagement;
    if (existingManagement) {
      // Update existing record
      const { data: updatedManagement, error: updateError } = await supabase
        .from('fleetManagement')
        .update(managementData)
        .eq('iCAOtypeId', iCAOtypeId)
        .select(`
          *,
          assignedPilot (
            id,
            "firstName",
            "lastName",
            email
          )
        `)
        .single();

      if (updateError) {
        console.error('Error updating fleet management:', updateError);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
      }
      fleetManagement = updatedManagement;
    } else {
      // Create new record
      const { data: newManagement, error: createError } = await supabase
        .from('fleetManagement')
        .insert({
          iCAOtypeId,
          ...managementData,
        })
        .select(`
          *,
          assignedPilot (
            id,
            "firstName",
            "lastName",
            email
          )
        `)
        .single();

      if (createError) {
        console.error('Error creating fleet management:', createError);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
      }
      fleetManagement = newManagement;
    }

    return NextResponse.json({ fleetManagement });
  } catch (error) {
    console.error('Error updating fleet management:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 