import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
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

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Check table structure by trying to select all columns
    const { data: tableInfo, error: tableError } = await supabase
      .from('base_management')
      .select('*')
      .limit(1);

    if (tableError) {
      return NextResponse.json({
        error: 'Table structure error',
        details: tableError
      }, { status: 500 });
    }

    // Check if we can insert a test record
    const testData = {
      id: 'test-id-' + Date.now(),
      airfieldId: 'test-airfield-id',
      baseManagerId: null,
      additionalInfo: null,
      facilities: [],
      operatingHours: null,
      emergencyContact: null,
      notes: null,
      imagePath: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const { data: insertTest, error: insertError } = await supabase
      .from('base_management')
      .insert(testData)
      .select();

    if (insertError) {
      return NextResponse.json({
        error: 'Insert test failed',
        details: insertError,
        testData
      }, { status: 500 });
    }

    // Clean up test record
    await supabase
      .from('base_management')
      .delete()
      .eq('id', testData.id);

    return NextResponse.json({
      success: true,
      message: 'Base management table structure is correct',
      tableInfo: tableInfo || [],
      insertTest: insertTest
    });

  } catch (error) {
    console.error('Error in debug endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    );
  }
}
