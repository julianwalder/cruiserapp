import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { requireRole } from '@/lib/middleware';

async function handler() {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    console.log('🔍 Debug: Checking flight_logs table relationships...');

    // Check the actual foreign key constraints
    const { data: constraints, error: constraintsError } = await supabase
      .from('information_schema.table_constraints')
      .select(`
        constraint_name,
        constraint_type,
        table_name
      `)
      .eq('table_name', 'flight_logs')
      .eq('constraint_type', 'FOREIGN KEY');

    if (constraintsError) {
      console.error('❌ Error checking constraints:', constraintsError);
    } else {
      console.log('🔍 Foreign key constraints:', constraints);
    }

    // Check the actual foreign key column references
    const { data: keyColumns, error: keyColumnsError } = await supabase
      .from('information_schema.key_column_usage')
      .select(`
        constraint_name,
        column_name,
        referenced_table_name,
        referenced_column_name
      `)
      .eq('table_name', 'flight_logs');

    if (keyColumnsError) {
      console.error('❌ Error checking key columns:', keyColumnsError);
    } else {
      console.log('🔍 Key column usage:', keyColumns);
    }

    // Test different table name variations
    const tableNames = ['flightLog', 'flight_logs', 'flightLogs'];
    const results: any = {};

    for (const tableName of tableNames) {
      console.log(`🔍 Testing table name: ${tableName}`);
      
      // Check if table exists
      const { data: existsData, error: existsError } = await supabase
        .from(tableName)
        .select('count')
        .limit(1);

      if (existsError) {
        results[tableName] = {
          exists: false,
          count: 0,
          error: existsError.message
        };
      } else {
        // Get count
        const { count, error: countError } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });

        if (countError) {
          results[tableName] = {
            exists: true,
            count: 0,
            error: countError.message
          };
        } else {
          // Get sample data
          const { data: sampleData, error: sampleError } = await supabase
            .from(tableName)
            .select('*')
            .limit(3);

          results[tableName] = {
            exists: true,
            count: count || 0,
            sampleData: sampleError ? null : sampleData,
            sampleError: sampleError?.message
          };
        }
      }
    }

    return NextResponse.json({
      success: true,
      results,
      constraints: constraints || [],
      keyColumns: keyColumns || [],
      message: 'Flight logs table debug completed'
    });

  } catch (error) {
    console.error('❌ Debug error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 

export const GET = requireRole('SUPER_ADMIN')(handler);
