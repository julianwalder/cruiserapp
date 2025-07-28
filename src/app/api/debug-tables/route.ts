import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    console.log('Checking database tables...');

    // Try different possible table names
    const tableNames = [
      'ICAOReferenceType',
      'icaoReferenceType', 
      'icao_reference_type',
      'icaoreferencetype',
      'aircraft',
      'users',
      'flightLog'
    ];

    const results: any = {};

    for (const tableName of tableNames) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });

        if (error) {
          results[tableName] = {
            exists: false,
            error: error.message,
            code: error.code
          };
        } else {
          results[tableName] = {
            exists: true,
            count: data || 0
          };
        }
      } catch (err) {
        results[tableName] = {
          exists: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        };
      }
    }

    // Also try to get table list from information_schema
    let tableList: any[] = [];
    try {
      const { data: tables, error: tablesError } = await supabase
        .rpc('get_table_names');

      if (!tablesError && tables) {
        tableList = tables;
      }
    } catch (err) {
      // If RPC doesn't exist, try a different approach
      console.log('RPC method not available, trying alternative...');
    }

    return NextResponse.json({
      success: true,
      tableCheck: results,
      tableList: tableList,
      message: 'Database table check completed'
    });

  } catch (error) {
    console.error('Debug tables endpoint error:', error);
    return NextResponse.json({ 
      error: 'Debug tables endpoint error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 