import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = AuthService.verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = request.nextUrl.pathname.split('/')[3]; // Extract user ID from /api/users/[id]/all-invoices
    
    // Check if user has admin role or is viewing their own invoices
    const hasAdminRole = Array.isArray(decoded.roles) && decoded.roles.includes('admin');
    if (!hasAdminRole && decoded.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const invoiceType = searchParams.get('type'); // 'proforma', 'fiscal', or 'all'

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      );
    }

    // Get legacy fiscal invoices
    let legacyInvoices: any[] = [];
    if (!invoiceType || invoiceType === 'all' || invoiceType === 'fiscal') {
      let legacyQuery = supabase
        .from('invoices')
        .select(`
          id,
          smartbill_id,
          series,
          number,
          issue_date,
          due_date,
          status,
          total_amount,
          vat_amount,
          currency,
          import_date,
          created_at,
          xml_content,
          original_xml_content,
          client:invoice_clients!inner(
            name,
            email,
            phone,
            address,
            city,
            country,
            vat_code,
            user_id,
            company_id
          ),
          items:invoice_items(
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
        .eq('client.user_id', userId);

      // Apply filters
      if (startDate) {
        legacyQuery = legacyQuery.gte('issue_date', startDate);
      }
      if (endDate) {
        legacyQuery = legacyQuery.lte('issue_date', endDate);
      }
      if (status && status !== 'all') {
        legacyQuery = legacyQuery.eq('status', status);
      }

      const { data: legacyData, error: legacyError } = await legacyQuery;
      if (legacyError) {
        console.error('Error fetching legacy invoices:', legacyError);
      } else {
        legacyInvoices = legacyData || [];
      }
    }

    // Get proforma invoices
    let proformaInvoices: any[] = [];
    if (!invoiceType || invoiceType === 'all' || invoiceType === 'proforma') {
      let proformaQuery = supabase
        .from('invoices')
        .select(`
          id,
          smartbill_id,
          series,
          number,
          issue_date,
          due_date,
          status,
          total_amount,
          vat_amount,
          currency,
          import_date,
          created_at,
          payment_method,
          payment_link,
          payment_status,
          payment_date,
          payment_reference,
          user_id,
          package_id,
          client:invoice_clients(
            name,
            email,
            phone,
            address,
            city,
            country,
            vat_code,
            user_id,
            company_id
          ),
          package:hour_package_templates(
            name,
            hours,
            price_per_hour,
            validity_days
          )
        `)
        .eq('user_id', userId)
        .eq('payment_method', 'proforma');

      // Apply filters
      if (startDate) {
        proformaQuery = proformaQuery.gte('issue_date', startDate);
      }
      if (endDate) {
        proformaQuery = proformaQuery.lte('issue_date', endDate);
      }
      if (status && status !== 'all') {
        proformaQuery = proformaQuery.eq('status', status);
      }

      const { data: proformaData, error: proformaError } = await proformaQuery;
      if (proformaError) {
        console.error('Error fetching proforma invoices:', proformaError);
      } else {
        proformaInvoices = proformaData || [];
      }
    }

    // Normalize the data structure for frontend compatibility
    const normalizeInvoice = (invoice: any) => {
      // Extract client data from the array
      const client = invoice.client?.[0] || {};
      
      return {
        ...invoice,
        client: {
          name: client.name || '',
          email: client.email || '',
          phone: client.phone || '',
          address: client.address || '',
          city: client.city || '',
          country: client.country || '',
          vat_code: client.vat_code || '',
          user_id: client.user_id || null,
          company_id: client.company_id || null,
        },
        // Add invoice type for frontend
        invoice_type: invoice.payment_method === 'proforma' ? 'proforma' : 'fiscal',
        // Extract package data if it exists
        package: invoice.package?.[0] || null,
      };
    };

    // Combine and sort all invoices by issue date (newest first)
    const invoices = [...legacyInvoices, ...proformaInvoices]
      .map(normalizeInvoice)
      .sort((a, b) => new Date(b.issue_date).getTime() - new Date(a.issue_date).getTime());

    // Calculate summary statistics
    const summary = {
      totalInvoices: invoices.length,
      totalAmount: invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0),
      totalHours: invoices.reduce((sum, inv) => {
        const hours = inv.items?.reduce((itemSum: number, item: any) => itemSum + (item.quantity || 0), 0) || 0;
        return sum + hours;
      }, 0),
      currency: 'RON',
      fiscalCount: legacyInvoices.length,
      proformaCount: proformaInvoices.length,
      paidCount: invoices.filter(inv => inv.status === 'paid').length,
      pendingCount: invoices.filter(inv => inv.status === 'pending').length,
      overdueCount: invoices.filter(inv => inv.status === 'overdue').length,
    };

    return NextResponse.json({
      invoices,
      summary,
    });

  } catch (error) {
    console.error('Error fetching user invoices:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
