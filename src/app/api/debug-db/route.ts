import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Test basic connection
    console.log('Testing database connection...');

    // Check if aircraft table exists
    const { data: aircraftCount, error: aircraftError } = await supabase
      .from('aircraft')
      .select('id', { count: 'exact', head: true });

    if (aircraftError) {
      console.error('Aircraft table error:', aircraftError);
      return NextResponse.json({ 
        error: 'Aircraft table error', 
        details: aircraftError.message,
        code: aircraftError.code 
      }, { status: 500 });
    }

    // Check if ICAOReferenceType table exists
    const { data: icaoCount, error: icaoError } = await supabase
      .from('ICAOReferenceType')
      .select('id', { count: 'exact', head: true });

    if (icaoError) {
      console.error('ICAOReferenceType table error:', icaoError);
      return NextResponse.json({ 
        error: 'ICAOReferenceType table error', 
        details: icaoError.message,
        code: icaoError.code 
      }, { status: 500 });
    }

    // Try to get one aircraft with ICAO reference type
    const { data: testAircraft, error: testError } = await supabase
      .from('aircraft')
      .select(`
        id,
        callSign,
        serialNumber,
        icaoReferenceTypeId,
        icaoReferenceType (
          id,
          icaoCode,
          model,
          manufacturer
        )
      `)
      .limit(1);

    if (testError) {
      console.error('Test query error:', testError);
      return NextResponse.json({ 
        error: 'Test query error', 
        details: testError.message,
        code: testError.code 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      aircraftCount: aircraftCount || 0,
      icaoCount: icaoCount || 0,
      testAircraft: testAircraft || [],
      message: 'Database connection and tables are working'
    });

  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({ 
      error: 'Debug endpoint error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 