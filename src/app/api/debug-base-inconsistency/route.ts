import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await AuthService.validateSession(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Get all airfields marked as bases
    const { data: baseAirfields, error: baseAirfieldsError } = await supabase
      .from('airfields')
      .select('id, name, code, "isBase"')
      .eq('isBase', true);

    if (baseAirfieldsError) {
      console.error('Error fetching base airfields:', baseAirfieldsError);
      return NextResponse.json({ error: 'Failed to fetch base airfields' }, { status: 500 });
    }

    // Get all base management records
    const { data: baseManagements, error: baseManagementsError } = await supabase
      .from('base_management')
      .select('id, "airfieldId"');

    if (baseManagementsError) {
      console.error('Error fetching base managements:', baseManagementsError);
      return NextResponse.json({ error: 'Failed to fetch base managements' }, { status: 500 });
    }

    // Find inconsistencies
    const baseAirfieldIds = baseAirfields?.map(af => af.id) || [];
    const baseManagementAirfieldIds = baseManagements?.map(bm => bm.airfieldId) || [];

    const airfieldsWithoutBaseManagement = baseAirfieldIds.filter(
      id => !baseManagementAirfieldIds.includes(id)
    );

    const baseManagementsWithoutAirfieldFlag = baseManagementAirfieldIds.filter(
      id => !baseAirfieldIds.includes(id)
    );

    return NextResponse.json({
      baseAirfields: baseAirfields || [],
      baseManagements: baseManagements || [],
      inconsistencies: {
        airfieldsWithoutBaseManagement,
        baseManagementsWithoutAirfieldFlag,
        totalBaseAirfields: baseAirfields?.length || 0,
        totalBaseManagements: baseManagements?.length || 0
      }
    });

  } catch (error) {
    console.error('Error in debug endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
