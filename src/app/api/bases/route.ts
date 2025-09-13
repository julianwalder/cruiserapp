import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Bases API called');

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection error' },
        { status: 500 }
      );
    }

    // Get all bases (airfields marked as base)
    const { data: bases, error } = await supabase
      .from('airfields')
      .select('*')
      .eq('isBase', true)
      .eq('status', 'ACTIVE')
      .order('name', { ascending: true });

    if (error) {
      console.error('❌ Error fetching bases:', error);
      return NextResponse.json(
        { error: 'Failed to fetch bases' },
        { status: 500 }
      );
    }

    console.log('✅ Bases fetched successfully:', bases?.length || 0);

    return NextResponse.json({
      bases: bases || [],
      count: bases?.length || 0
    });

  } catch (error) {
    console.error('❌ Unexpected error in bases API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
