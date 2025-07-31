import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';
import { PPLCourseService, type PPLCourseInvoice } from '@/lib/ppl-course-service';

export async function POST(request: NextRequest) {
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

    // Check if user is admin
    const payload = AuthService.verifyToken(token);
    const userRoles = payload?.roles || [];
    
    if (!AuthService.hasRole(userRoles, 'SUPER_ADMIN') && !AuthService.hasRole(userRoles, 'ADMIN')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection error' }, { status: 500 });
    }

    // Get all imported invoices
    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select(`
        id,
        smartbill_id,
        series,
        number,
        issue_date,
        invoice_clients (
          name,
          email,
          user_id,
          company_id
        ),
        invoice_items (
          line_id,
          name,
          description,
          quantity,
          unit,
          unit_price,
          total_amount
        )
      `)
      .in('status', ['paid', 'imported'])
      .order('issue_date', { ascending: false });

    if (invoicesError) {
      console.error('Error fetching invoices:', invoicesError);
      return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
    }

    const results = {
      processed: 0,
      skipped: 0,
      errors: [] as string[],
      pplInvoices: [] as any[]
    };

    // Process each invoice
    for (const invoice of invoices || []) {
      try {
        const client = invoice.invoice_clients?.[0];
        if (!client || !client.user_id) {
          results.skipped++;
          continue;
        }

        const pplInvoice: PPLCourseInvoice = {
          id: invoice.id,
          smartbill_id: invoice.smartbill_id,
          series: invoice.series,
          number: invoice.number,
          issue_date: invoice.issue_date,
          client: {
            name: client.name,
            email: client.email,
            user_id: client.user_id,
            company_id: client.company_id
          },
          items: invoice.invoice_items?.map(item => ({
            name: item.name,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unit_price: item.unit_price,
            total_amount: item.total_amount
          })) || []
        };

        // Check if this is a PPL course invoice
        if (PPLCourseService.isPPLCourseInvoice(pplInvoice)) {
          console.log(`Processing PPL course invoice: ${invoice.smartbill_id}`);
          
          const tranches = await PPLCourseService.processPPLCourseInvoice(pplInvoice);
          await PPLCourseService.savePPLCourseTranches(tranches);
          
          results.processed++;
          results.pplInvoices.push({
            invoiceId: invoice.smartbill_id,
            tranches: tranches.length,
            userEmail: client.email
          });
        } else {
          results.skipped++;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error processing invoice ${invoice.smartbill_id}:`, error);
        results.errors.push(`Invoice ${invoice.smartbill_id}: ${errorMessage}`);
      }
    }

    return NextResponse.json({
      message: `Processed ${results.processed} PPL course invoices`,
      results
    });

  } catch (error) {
    console.error('Error processing PPL courses:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 