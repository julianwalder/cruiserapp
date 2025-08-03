import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = AuthService.verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection error' }, { status: 500 });
    }

    // Get user to check permissions
    const { data: user, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        user_roles (
          roles (
            name
          )
        )
      `)
      .eq('id', decoded.userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check user roles and determine access level
    const userRoles = user.user_roles.map((userRole: any) => userRole.roles.name);
    const isAdmin = userRoles.some(role => ['SUPER_ADMIN', 'ADMIN', 'BASE_MANAGER'].includes(role));
    const isPilot = userRoles.includes('PILOT');
    const isStudent = userRoles.includes('STUDENT');
    const isInstructor = userRoles.includes('INSTRUCTOR');
    const isProspect = userRoles.includes('PROSPECT');

    // Determine if user can order hours
    const canOrder = isAdmin || isPilot || isStudent || isInstructor || isProspect;

    if (!canOrder) {
      return NextResponse.json({ error: 'Insufficient permissions to order hours' }, { status: 403 });
    }

    // For non-admins, they can only order for themselves
    if (!isAdmin && clientId !== user.email) {
      return NextResponse.json({ error: 'You can only order hours for yourself' }, { status: 403 });
    }

    const { clientId, hours, price } = await request.json();

    if (!clientId || !hours || !price) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get client information
    const clientEmail = clientId;
    const clientName = isAdmin ? 'Stefan Avadanei' : `${user.firstName} ${user.lastName}`; // For non-admins, use their own name

    // Create a new invoice record for the hour package
    const invoiceData = {
      smartbill_id: `ORDER-${Date.now()}`,
      series: 'ORD',
      number: Date.now().toString(),
      issue_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
      status: 'draft',
      total_amount: price,
      currency: 'RON',
      vat_amount: price * 0.19, // 19% VAT
      import_date: new Date().toISOString()
    };

    // Insert the new invoice
    const { data: newInvoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert(invoiceData)
      .select()
      .single();

    if (invoiceError) {
      console.error('Error creating invoice:', invoiceError);
      return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 });
    }

    // Create client record
    const { error: clientError } = await supabase
      .from('invoice_clients')
      .insert({
        invoice_id: newInvoice.id,
        name: clientName,
        email: clientEmail,
        vat_code: isAdmin ? 'RO12345678' : user.personalNumber || 'N/A' // Use personal number for non-admins
      });

    if (clientError) {
      console.error('Error creating client record:', clientError);
      return NextResponse.json({ error: 'Failed to create client record' }, { status: 500 });
    }

    // Create invoice item record
    const { error: itemError } = await supabase
      .from('invoice_items')
      .insert({
        invoice_id: newInvoice.id,
        line_id: 1,
        name: `${hours} Hour Flight Package`,
        description: `Flight training package of ${hours} hours`,
        quantity: hours,
        unit: 'HUR',
        unit_price: price / hours,
        total_amount: price,
        vat_rate: 19
      });

    if (itemError) {
      console.error('Error creating item record:', itemError);
      return NextResponse.json({ error: 'Failed to create item record' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Hour package ordered successfully',
      invoice: newInvoice,
      hours: hours,
      price: price
    });

  } catch (error) {
    console.error('Error in client hours order API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 