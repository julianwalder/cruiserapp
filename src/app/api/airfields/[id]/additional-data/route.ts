import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// GET /api/airfields/[id]/additional-data - Get additional aviation data for an airfield
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // First, get the airfield to find its code
    const { data: airfield, error: airfieldError } = await supabase
      .from('airfields')
      .select('code, name')
      .eq('id', id)
      .single();

    if (airfieldError || !airfield) {
      return NextResponse.json({ error: 'Airfield not found' }, { status: 404 });
    }

    // Try to find the reference airport by code
    let referenceAirportId: number | null = null;
    
    // Search in reference_airports by ICAO/IATA code
    const { data: referenceAirport } = await supabase
      .from('reference_airports')
      .select('id, icao_code, iata_code, gps_code, local_code')
      .or(`icao_code.eq.${airfield.code},iata_code.eq.${airfield.code},gps_code.eq.${airfield.code},local_code.eq.${airfield.code}`)
      .limit(1)
      .single();

    if (referenceAirport) {
      referenceAirportId = referenceAirport.id;
    }

    const additionalData: any = {};

    if (referenceAirportId) {
      // Get runways
      const { data: runways } = await supabase
        .from('reference_runways')
        .select('*')
        .eq('airport_ref', referenceAirportId)
        .order('length_ft', { ascending: false });
      
      if (runways && runways.length > 0) {
        additionalData.runways = runways;
      }

      // Get frequencies
      const { data: frequencies } = await supabase
        .from('reference_airport_frequencies')
        .select('*')
        .eq('airport_ref', referenceAirportId)
        .order('type');
      
      if (frequencies && frequencies.length > 0) {
        additionalData.frequencies = frequencies;
      }

      // Get navaids by associated airport code
      const { data: navaids } = await supabase
        .from('reference_navaids')
        .select('*')
        .eq('associated_airport', airfield.code)
        .limit(10);
      
      if (navaids && navaids.length > 0) {
        additionalData.navaids = navaids;
      }

      // Get airport comments
      const { data: comments } = await supabase
        .from('reference_airport_comments')
        .select('*')
        .eq('airportRef', referenceAirportId)
        .order('date', { ascending: false })
        .limit(5);
      
      if (comments && comments.length > 0) {
        additionalData.comments = comments;
      }
    }

    return NextResponse.json(additionalData);
  } catch (error) {
    console.error('Error fetching additional airfield data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
