import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Airfields API called');

    // Get all active airfields
    const { data: airfields, error } = await supabase
      .from('airfields')
      .select('*')
      .eq('status', 'ACTIVE')
      .order('name', { ascending: true });

    if (error) {
      console.error('❌ Error fetching airfields:', error);
      return NextResponse.json(
        { error: 'Failed to fetch airfields' },
        { status: 500 }
      );
    }

    console.log('✅ Airfields fetched successfully:', airfields?.length || 0);

    return NextResponse.json({
      airfields: airfields || [],
      count: airfields?.length || 0
    });

  } catch (error) {
    console.error('❌ Unexpected error in airfields API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}