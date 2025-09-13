import { getSupabaseClient } from '@/lib/supabase';

/**
 * Safely updates aircraft hobbs data, ensuring that past flights don't overwrite
 * more recent hobbs readings.
 */
export async function updateAircraftHobbs(
  aircraftId: string,
  flightLogId: string,
  arrivalHobbs: number,
  flightDate: string
): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Database connection failed');
  }

  try {
    // Get current hobbs data for this aircraft
    const { data: currentHobbs, error: currentError } = await supabase
      .from('aircraft_hobbs')
      .select('*')
      .eq('aircraft_id', aircraftId)
      .single();

    if (currentError && currentError.code !== 'PGRST116') {
      // PGRST116 = no rows returned, which is fine for first-time entries
      console.error('Error fetching current hobbs data:', currentError);
      throw new Error('Failed to fetch current hobbs data');
    }

    // If no current hobbs data exists, create new record
    if (!currentHobbs) {
      console.log(`📝 Creating new hobbs record for aircraft ${aircraftId}`);
      
      const { error: insertError } = await supabase
        .from('aircraft_hobbs')
        .insert({
          aircraft_id: aircraftId,
          last_hobbs_reading: arrivalHobbs,
          last_hobbs_date: flightDate,
          last_flight_log_id: flightLogId
        });

      if (insertError) {
        console.error('Error creating new hobbs record:', insertError);
        throw new Error('Failed to create new hobbs record');
      }

      console.log(`✅ Created new hobbs record for aircraft ${aircraftId}: ${arrivalHobbs} hours on ${flightDate}`);
      return;
    }

    // Compare dates to ensure we don't overwrite newer data with older data
    const currentDate = new Date(currentHobbs.last_hobbs_date);
    const newDate = new Date(flightDate);

    if (newDate < currentDate) {
      console.log(`⚠️ Skipping hobbs update for aircraft ${aircraftId}: new date ${flightDate} is older than current date ${currentHobbs.last_hobbs_date}`);
      return;
    }

    // If dates are equal, compare hobbs readings (higher reading is more recent)
    if (newDate.getTime() === currentDate.getTime()) {
      if (arrivalHobbs <= currentHobbs.last_hobbs_reading) {
        console.log(`⚠️ Skipping hobbs update for aircraft ${aircraftId}: new hobbs ${arrivalHobbs} is not higher than current ${currentHobbs.last_hobbs_reading}`);
        return;
      }
      console.log(`📝 Updating hobbs for aircraft ${aircraftId} (same date, higher reading): ${currentHobbs.last_hobbs_reading} → ${arrivalHobbs}`);
    } else {
      console.log(`📝 Updating hobbs for aircraft ${aircraftId} (newer date): ${currentHobbs.last_hobbs_reading} → ${arrivalHobbs} (${flightDate})`);
    }

    // Update the hobbs record
    const { error: updateError } = await supabase
      .from('aircraft_hobbs')
      .update({
        last_hobbs_reading: arrivalHobbs,
        last_hobbs_date: flightDate,
        last_flight_log_id: flightLogId,
        updated_at: new Date().toISOString()
      })
      .eq('aircraft_id', aircraftId);

    if (updateError) {
      console.error('Error updating hobbs record:', updateError);
      throw new Error('Failed to update hobbs record');
    }

    console.log(`✅ Updated hobbs record for aircraft ${aircraftId}: ${arrivalHobbs} hours on ${flightDate}`);

  } catch (error) {
    console.error('Error in updateAircraftHobbs:', error);
    throw error;
  }
}

/**
 * Recalculates and updates aircraft hobbs data by finding the truly latest
 * flight log with arrival hobbs for a given aircraft.
 * This should be used when the hobbs data might be inconsistent.
 */
export async function recalculateAircraftHobbs(aircraftId: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Database connection failed');
  }

  try {
    console.log(`🔍 Recalculating hobbs data for aircraft ${aircraftId}`);

    // Find the latest flight log with arrival Hobbs for this aircraft
    // Order by date DESC, then by arrivalHobbs DESC to handle same-day flights
    const { data: latestLog, error: logError } = await supabase
      .from('flight_logs')
      .select('id, arrivalHobbs, date')
      .eq('aircraftId', aircraftId)
      .not('arrivalHobbs', 'is', null)
      .order('date', { ascending: false })
      .order('arrivalHobbs', { ascending: false })
      .limit(1)
      .single();

    if (logError && logError.code !== 'PGRST116') {
      console.error(`❌ Error fetching latest log for aircraft ${aircraftId}:`, logError);
      throw new Error('Failed to fetch latest flight log');
    }

    if (!latestLog) {
      console.log(`⚠️ No Hobbs data found for aircraft ${aircraftId}`);
      return;
    }

    console.log(`✅ Found latest Hobbs for aircraft ${aircraftId}: ${latestLog.arrivalHobbs} hours on ${latestLog.date}`);

    // Upsert the aircraft_hobbs record
    const { error: upsertError } = await supabase
      .from('aircraft_hobbs')
      .upsert({
        aircraft_id: aircraftId,
        last_hobbs_reading: parseFloat(latestLog.arrivalHobbs.toString()),
        last_hobbs_date: latestLog.date,
        last_flight_log_id: latestLog.id,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'aircraft_id'
      });

    if (upsertError) {
      console.error(`❌ Error upserting Hobbs data for aircraft ${aircraftId}:`, upsertError);
      throw new Error('Failed to update hobbs record');
    }

    console.log(`✅ Recalculated and updated Hobbs data for aircraft ${aircraftId}`);

  } catch (error) {
    console.error('Error in recalculateAircraftHobbs:', error);
    throw error;
  }
}
