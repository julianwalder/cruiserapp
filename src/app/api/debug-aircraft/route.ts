import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    console.log('Checking aircraft table...');

    // Check aircraft table structure and data
    const { data: aircraft, error: aircraftError } = await supabase
      .from('aircraft')
      .select('*')
      .limit(10);

    if (aircraftError) {
      console.error('Aircraft table error:', aircraftError);
      return NextResponse.json({ 
        error: 'Aircraft table error', 
        details: aircraftError.message,
        code: aircraftError.code 
      }, { status: 500 });
    }

    // Get total count
    const { count: totalAircraft, error: countError } = await supabase
      .from('aircraft')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('Count error:', countError);
      return NextResponse.json({ 
        error: 'Count error', 
        details: countError.message 
      }, { status: 500 });
    }

    // Check ICAOReferenceType table
    const { data: icaoTypes, error: icaoError } = await supabase
      .from('ICAOReferenceType')
      .select('*')
      .limit(5);

    if (icaoError) {
      console.error('ICAOReferenceType table error:', icaoError);
      return NextResponse.json({ 
        error: 'ICAOReferenceType table error', 
        details: icaoError.message,
        code: icaoError.code 
      }, { status: 500 });
    }

    // Get ICAOReferenceType count
    const { count: totalIcaoTypes, error: icaoCountError } = await supabase
      .from('ICAOReferenceType')
      .select('*', { count: 'exact', head: true });

    if (icaoCountError) {
      console.error('ICAO count error:', icaoCountError);
      return NextResponse.json({ 
        error: 'ICAO count error', 
        details: icaoCountError.message 
      }, { status: 500 });
    }

    // Try to get aircraft with ICAO reference type
    const { data: aircraftWithIcao, error: joinError } = await supabase
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
      .limit(5);

    if (joinError) {
      console.error('Join query error:', joinError);
      return NextResponse.json({ 
        error: 'Join query error', 
        details: joinError.message,
        code: joinError.code 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      aircraftTable: {
        totalCount: totalAircraft || 0,
        sampleData: aircraft || [],
        hasData: (aircraft && aircraft.length > 0)
      },
      icaoReferenceTypeTable: {
        totalCount: totalIcaoTypes || 0,
        sampleData: icaoTypes || [],
        hasData: (icaoTypes && icaoTypes.length > 0)
      },
      joinTest: {
        sampleData: aircraftWithIcao || [],
        hasJoinData: (aircraftWithIcao && aircraftWithIcao.length > 0)
      },
      message: 'Aircraft table check completed'
    });

  } catch (error) {
    console.error('Debug aircraft endpoint error:', error);
    return NextResponse.json({ 
      error: 'Debug aircraft endpoint error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 