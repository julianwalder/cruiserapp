import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
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
      return NextResponse.json({ error: 'Database connection error' }, { status: 500 });
    }

    const { licenseId, reason } = await request.json();

    if (!licenseId) {
      return NextResponse.json({ error: 'License ID is required' }, { status: 400 });
    }

    // Archive the license
    const { data: archivedLicense, error: archiveError } = await supabase
      .from('pilot_licenses')
      .update({
        status: 'archived',
        archived_at: new Date().toISOString(),
        archive_reason: reason || 'Manually archived by user'
      })
      .eq('id', licenseId)
      .eq('user_id', decoded.userId)
      .select('*')
      .single();

    if (archiveError) {
      console.error('Error archiving pilot license:', archiveError);
      return NextResponse.json({ error: 'Failed to archive pilot license' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'License archived successfully',
      license: archivedLicense 
    });

  } catch (error) {
    console.error('Error in pilot licenses archive POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
