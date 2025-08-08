import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '../../../../../lib/auth';
import { ProformaInvoiceService } from '../../../../../lib/proforma-invoice-service';
import { getSupabaseClient } from '../../../../../lib/supabase';
import { z } from 'zod';

// Validation schema for payment status update
const paymentStatusSchema = z.object({
  paymentStatus: z.enum(['paid', 'failed', 'cancelled']),
  paymentReference: z.string().optional(),
});

// PUT /api/proforma-invoices/[id]/payment-status - Update payment status
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    // Parse request body
    const body = await request.json();
    const validatedData = paymentStatusSchema.parse(body);

    // Check permissions - only admins or the invoice owner can update payment status
    const userRoles = user.user_roles?.map(ur => ur.roles?.name || ur.role?.name) || [];
    const isAdmin = userRoles.some(role => ['SUPER_ADMIN', 'ADMIN'].includes(role));
    
    if (!isAdmin) {
      // For non-admins, check if they own the invoice
      const supabase = getSupabaseClient();
      if (!supabase) {
        return NextResponse.json({ error: 'Database connection error' }, { status: 500 });
      }

      const { data: invoice } = await supabase
        .from('invoices')
        .select('user_id')
        .eq('id', params.id)
        .single();

      if (!invoice || invoice.user_id !== user.id) {
        return NextResponse.json(
          { error: 'Insufficient permissions to update this invoice' },
          { status: 403 }
        );
      }
    }

    // Update payment status
    const result = await ProformaInvoiceService.updateInvoicePaymentStatus(
      params.id,
      validatedData.paymentStatus,
      validatedData.paymentReference
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to update payment status' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Payment status updated to ${validatedData.paymentStatus}`,
    });

  } catch (error) {
    console.error('Error in PUT /api/proforma-invoices/[id]/payment-status:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/proforma-invoices/[id]/payment-status - Get payment status
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    // Check permissions - only admins or the invoice owner can view payment status
    const userRoles = user.user_roles?.map(ur => ur.roles?.name || ur.role?.name) || [];
    const isAdmin = userRoles.some(role => ['SUPER_ADMIN', 'ADMIN'].includes(role));
    
    if (!isAdmin) {
      // For non-admins, check if they own the invoice
      const supabase = getSupabaseClient();
      if (!supabase) {
        return NextResponse.json({ error: 'Database connection error' }, { status: 500 });
      }

      const { data: invoice } = await supabase
        .from('invoices')
        .select('user_id')
        .eq('id', params.id)
        .single();

      if (!invoice || invoice.user_id !== user.id) {
        return NextResponse.json(
          { error: 'Insufficient permissions to view this invoice' },
          { status: 403 }
        );
      }
    }

    // Get invoice payment status
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection error' }, { status: 500 });
    }

    const { data: invoice, error } = await supabase
      .from('invoices')
      .select(`
        id,
        payment_method,
        payment_status,
        payment_date,
        payment_reference,
        smartbill_id,
        total_amount,
        currency
      `)
      .eq('id', params.id)
      .single();

    if (error || !invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      paymentStatus: {
        method: invoice.payment_method,
        status: invoice.payment_status,
        date: invoice.payment_date,
        reference: invoice.payment_reference,
        smartbillId: invoice.smartbill_id,
        amount: invoice.total_amount,
        currency: invoice.currency,
      },
    });

  } catch (error) {
    console.error('Error in GET /api/proforma-invoices/[id]/payment-status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
