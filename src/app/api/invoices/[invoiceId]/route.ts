import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';

/**
 * GET /api/invoices/[invoiceId]
 *
 * Returns detailed information for a specific invoice.
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
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

    const { invoiceId } = await params;

    // Get requesting user to check permissions
    const { data: requestingUser, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        user_roles (
          roles (
            name
          )
        )
      `)
      .eq('id', decoded.userId)
      .single();

    if (userError || !requestingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check permissions
    const userRoles = requestingUser.user_roles.map((userRole: any) => userRole.roles.name);
    const isAdmin = userRoles.some(role => ['SUPER_ADMIN', 'ADMIN', 'BASE_MANAGER'].includes(role));

    // Get invoice by smartbill_id
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        id,
        smartbill_id,
        series_name,
        number,
        issue_date,
        due_date,
        total_amount,
        currency,
        status,
        payment_url,
        invoice_clients (
          name,
          email,
          phone,
          vat_code,
          address,
          city,
          country,
          user_id
        ),
        invoice_items (
          line_id,
          name,
          description,
          quantity,
          unit,
          unit_price,
          total_amount,
          vat_rate
        )
      `)
      .eq('smartbill_id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const client = invoice.invoice_clients?.[0];
    const isOwnInvoice = client && client.user_id === decoded.userId;

    if (!isAdmin && !isOwnInvoice) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(invoice);

  } catch (error) {
    console.error(`Error in /api/invoices/[invoiceId]:`, error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
