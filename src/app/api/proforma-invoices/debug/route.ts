import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '../../../../lib/auth';
import { getSupabaseClient } from '../../../../lib/supabase';

// Debug endpoint to identify 403 error source
export async function GET(request: NextRequest) {
  try {
    // 1. Check authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized - No token' }, { status: 401 });
    }

    const user = await AuthService.validateSession(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection error' }, { status: 500 });
    }

    // 2. Test user access
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, "firstName", "lastName"')
      .eq('id', user.id)
      .single();

    if (userError) {
      return NextResponse.json({ 
        error: 'User access failed', 
        details: userError.message 
      }, { status: 403 });
    }

    // 3. Test hour packages access
    const { data: packages, error: packagesError } = await supabase
      .from('hour_package_templates')
      .select('id, name, hours, total_price')
      .eq('is_active', true)
      .limit(1);

    if (packagesError) {
      return NextResponse.json({ 
        error: 'Hour packages access failed', 
        details: packagesError.message 
      }, { status: 403 });
    }

    // 4. Test invoices table access
    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select('id, smartbill_id')
      .limit(1);

    if (invoicesError) {
      return NextResponse.json({ 
        error: 'Invoices access failed', 
        details: invoicesError.message 
      }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      message: 'All database access tests passed',
      user: {
        id: user.id,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
      },
      packages: packages?.length || 0,
      invoices: invoices?.length || 0,
    });

  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({
      error: 'Debug endpoint failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
