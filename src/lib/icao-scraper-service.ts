import { getSupabaseClient } from './supabase';

export interface ICAOReferenceType {
  id: string;
  icaoCode: string;
  manufacturer: string;
  model: string;
  type: string;
  category: string;
  engineType: string;
  engineCount: number;
  maxTakeoffWeight: number;
  maxSpeed: number;
  maxRange: number;
  maxAltitude: number;
  length: number;
  wingspan: number;
  height: number;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

export class ICAOScraperService {
  static async findOrCreateICAOReferenceType(icaoData: any): Promise<ICAOReferenceType | null> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        console.error('Supabase client not initialized');
        return null;
      }

      // Check if ICAO reference type already exists
      const { data: existing, error: findError } = await supabase
        .from('icao_reference_type')
        .select('*')
        .eq('icaoCode', icaoData.icaoCode)
        .single();

      if (findError && findError.code !== 'PGRST116') {
        console.error('Error finding ICAO reference type:', findError);
        return null;
      }

      if (existing) {
        // Update existing record
        const { data: updated, error: updateError } = await supabase
          .from('icao_reference_type')
          .update({
            manufacturer: icaoData.manufacturer,
            model: icaoData.model,
            type: icaoData.type,
            category: icaoData.category,
            engineType: icaoData.engineType,
            engineCount: icaoData.engineCount,
            maxTakeoffWeight: icaoData.maxTakeoffWeight,
            maxSpeed: icaoData.maxSpeed,
            maxRange: icaoData.maxRange,
            maxAltitude: icaoData.maxAltitude,
            length: icaoData.length,
            wingspan: icaoData.wingspan,
            height: icaoData.height,
            description: icaoData.description,
            updatedAt: new Date().toISOString(),
          })
          .eq('icaoCode', icaoData.icaoCode)
          .select('*')
          .single();

        if (updateError) {
          console.error('Error updating ICAO reference type:', updateError);
          return null;
        }

        return updated as ICAOReferenceType;
      } else {
        // Create new record
        const { data: created, error: createError } = await supabase
          .from('icao_reference_type')
          .insert({
            icaoCode: icaoData.icaoCode,
            manufacturer: icaoData.manufacturer,
            model: icaoData.model,
            type: icaoData.type,
            category: icaoData.category,
            engineType: icaoData.engineType,
            engineCount: icaoData.engineCount,
            maxTakeoffWeight: icaoData.maxTakeoffWeight,
            maxSpeed: icaoData.maxSpeed,
            maxRange: icaoData.maxRange,
            maxAltitude: icaoData.maxAltitude,
            length: icaoData.length,
            wingspan: icaoData.wingspan,
            height: icaoData.height,
            description: icaoData.description,
          })
          .select('*')
          .single();

        if (createError) {
          console.error('Error creating ICAO reference type:', createError);
          return null;
        }

        return created as ICAOReferenceType;
      }
    } catch (error) {
      console.error('Error in findOrCreateICAOReferenceType:', error);
      return null;
    }
  }
} 