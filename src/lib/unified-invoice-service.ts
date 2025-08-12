import { getSupabaseClient } from '@/lib/supabase';

export interface UnifiedInvoice {
  id: string;
  smartbill_id?: string;
  series: string;
  number: string;
  issue_date: string;
  due_date: string;
  status: string;
  total_amount: number;
  vat_amount: number;
  currency: string;
  import_date?: string;
  created_at: string;
  invoice_type: 'fiscal' | 'proforma';
  
  // Payment information (for proforma invoices)
  payment_method?: string;
  payment_link?: string;
  payment_status?: string;
  payment_date?: string;
  payment_reference?: string;
  
  // Client information
  client: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
    vat_code?: string;
    user_id?: string;
    company_id?: string;
  };
  
  // Items information
  items: Array<{
    line_id: number;
    name: string;
    description?: string;
    quantity: number;
    unit: string;
    unit_price: number;
    total_amount: number;
    vat_rate: number;
  }>;
  
  // Package information (for proforma invoices)
  package?: {
    name: string;
    hours: number;
    price_per_hour: number;
    validity_days: number;
  };
  
  // Metadata
  is_ppl?: boolean;
  ppl_hours_paid?: number;
  has_edits?: boolean;
}

export interface InvoiceSummary {
  totalInvoices: number;
  totalAmount: number;
  totalHours: number;
  currency: string;
  fiscalCount: number;
  proformaCount: number;
  paidCount: number;
  pendingCount: number;
  overdueCount: number;
}

export class UnifiedInvoiceService {
  private static supabase = getSupabaseClient();

  private static getSupabase() {
    const client = this.supabase;
    if (!client) {
      throw new Error('Supabase client not available');
    }
    return client;
  }

  /**
   * Get all invoices for a user (both legacy and new)
   */
  static async getUserInvoices(userId: string, options?: {
    startDate?: string;
    endDate?: string;
    status?: string;
    search?: string;
    invoiceType?: 'fiscal' | 'proforma' | 'all';
  }): Promise<UnifiedInvoice[]> {
    const { startDate, endDate, status, search, invoiceType } = options || {};

    // Get legacy fiscal invoices
    let legacyInvoices: UnifiedInvoice[] = [];
    if (!invoiceType || invoiceType === 'all' || invoiceType === 'fiscal') {
      legacyInvoices = await this.getLegacyFiscalInvoices(userId, { startDate, endDate, status, search });
    }

    // Get new proforma invoices
    let proformaInvoices: UnifiedInvoice[] = [];
    if (!invoiceType || invoiceType === 'all' || invoiceType === 'proforma') {
      proformaInvoices = await this.getProformaInvoices(userId, { startDate, endDate, status, search });
    }

    // Combine and sort all invoices by issue date (newest first)
    const allInvoices = [...legacyInvoices, ...proformaInvoices]
      .sort((a, b) => new Date(b.issue_date).getTime() - new Date(a.issue_date).getTime());

    return allInvoices;
  }

  /**
   * Get legacy fiscal invoices from the imported invoices system
   */
  private static async getLegacyFiscalInvoices(userId: string, options?: {
    startDate?: string;
    endDate?: string;
    status?: string;
    search?: string;
  }): Promise<UnifiedInvoice[]> {
    const { startDate, endDate, status, search } = options || {};



    // Build query for legacy invoices
    let query = this.getSupabase()
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
      `);

    // Filter by user_id only (after migration, all invoices should be linked by user_id)
    query = query.eq('client.user_id', userId);

    // Apply filters
    if (startDate) {
      query = query.gte('issue_date', startDate);
    }
    if (endDate) {
      query = query.lte('issue_date', endDate);
    }
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    // Note: Search filtering is handled client-side to avoid overriding user_id filter
    // if (search) {
    //   query = query.or(`smartbill_id.ilike.%${search}%,client.name.ilike.%${search}%,client.email.ilike.%${search}%`);
    // }

    const { data: invoices, error } = await query;

    if (error) {
      console.error('Error fetching legacy fiscal invoices:', error);
      return [];
    }

    return (invoices || []).map(invoice => this.normalizeLegacyInvoice(invoice));
  }

  /**
   * Get new proforma invoices from the system
   */
  private static async getProformaInvoices(userId: string, options?: {
    startDate?: string;
    endDate?: string;
    status?: string;
    search?: string;
  }): Promise<UnifiedInvoice[]> {
    const { startDate, endDate, status, search } = options || {};

    let query = this.getSupabase()
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
      query = query.gte('issue_date', startDate);
    }
    if (endDate) {
      query = query.lte('issue_date', endDate);
    }
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    // Note: Search filtering is handled client-side to avoid overriding user_id filter
    // if (search) {
    //   query = query.or(`smartbill_id.ilike.%${search}%,client.name.ilike.%${search}%,client.email.ilike.%${search}%`);
    // }

    const { data: invoices, error } = await query;

    if (error) {
      console.error('Error fetching proforma invoices:', error);
      return [];
    }

    return (invoices || []).map(invoice => this.normalizeProformaInvoice(invoice));
  }

  /**
   * Normalize legacy fiscal invoice to unified format
   */
  private static normalizeLegacyInvoice(invoice: any): UnifiedInvoice {
    const client = invoice.client?.[0] || {};
    
    return {
      id: invoice.id,
      smartbill_id: invoice.smartbill_id,
      series: invoice.series,
      number: invoice.number,
      issue_date: invoice.issue_date,
      due_date: invoice.due_date,
      status: invoice.status,
      total_amount: invoice.total_amount,
      vat_amount: invoice.vat_amount,
      currency: invoice.currency,
      import_date: invoice.import_date,
      created_at: invoice.created_at,
      invoice_type: 'fiscal',
      client: {
        name: client.name || '',
        email: client.email || '',
        phone: client.phone || '',
        address: client.address || '',
        city: client.city || '',
        country: client.country || '',
        vat_code: client.vat_code || '',
        user_id: client.user_id,
        company_id: client.company_id,
      },
      items: invoice.items || [],
      is_ppl: invoice.is_ppl || false,
      ppl_hours_paid: invoice.ppl_hours_paid || 0,
      has_edits: !!invoice.edited_xml_content,
    };
  }

  /**
   * Normalize proforma invoice to unified format
   */
  private static normalizeProformaInvoice(invoice: any): UnifiedInvoice {
    const client = invoice.client?.[0] || {};
    
    return {
      id: invoice.id,
      smartbill_id: invoice.smartbill_id,
      series: invoice.series,
      number: invoice.number,
      issue_date: invoice.issue_date,
      due_date: invoice.due_date,
      status: invoice.payment_status || invoice.status,
      total_amount: invoice.total_amount,
      vat_amount: invoice.vat_amount,
      currency: invoice.currency,
      import_date: invoice.import_date,
      created_at: invoice.created_at,
      invoice_type: 'proforma',
      payment_method: invoice.payment_method,
      payment_link: invoice.payment_link,
      payment_status: invoice.payment_status,
      payment_date: invoice.payment_date,
      payment_reference: invoice.payment_reference,
      client: {
        name: client.name || '',
        email: client.email || '',
        phone: client.phone || '',
        address: client.address || '',
        city: client.city || '',
        country: client.country || '',
        vat_code: client.vat_code || '',
        user_id: client.user_id,
        company_id: client.company_id,
      },
      items: invoice.package ? [{
        line_id: 1,
        name: invoice.package.name,
        description: `Hour package: ${invoice.package.hours} hours`,
        quantity: invoice.package.hours,
        unit: 'HUR',
        unit_price: invoice.package.price_per_hour,
        total_amount: invoice.total_amount,
        vat_rate: 19.00,
      }] : [],
      package: invoice.package,
    };
  }

  /**
   * Get invoice summary statistics for a user
   */
  static async getUserInvoiceSummary(userId: string, options?: {
    startDate?: string;
    endDate?: string;
  }): Promise<InvoiceSummary> {
    const invoices = await this.getUserInvoices(userId, options);

    const fiscalInvoices = invoices.filter(inv => inv.invoice_type === 'fiscal');
    const proformaInvoices = invoices.filter(inv => inv.invoice_type === 'proforma');
    
    const paidInvoices = invoices.filter(inv => 
      inv.status === 'paid' || inv.payment_status === 'paid'
    );
    const pendingInvoices = invoices.filter(inv => 
      inv.status === 'pending' || inv.payment_status === 'pending'
    );
    const overdueInvoices = invoices.filter(inv => 
      inv.status === 'overdue' || new Date(inv.due_date) < new Date()
    );

    const totalHours = invoices.reduce((sum, invoice) => {
      if (invoice.invoice_type === 'proforma' && invoice.package) {
        return sum + invoice.package.hours;
      } else if (invoice.invoice_type === 'fiscal' && invoice.items) {
        return sum + invoice.items.reduce((itemSum, item) => {
          if (item.unit === 'HUR' || item.unit === 'HOUR' || item.unit === 'H') {
            return itemSum + (item.quantity || 0);
          }
          return itemSum;
        }, 0);
      }
      return sum;
    }, 0);

    return {
      totalInvoices: invoices.length,
      totalAmount: invoices.reduce((sum, invoice) => sum + (invoice.total_amount || 0), 0),
      totalHours,
      currency: invoices[0]?.currency || 'RON',
      fiscalCount: fiscalInvoices.length,
      proformaCount: proformaInvoices.length,
      paidCount: paidInvoices.length,
      pendingCount: pendingInvoices.length,
      overdueCount: overdueInvoices.length,
    };
  }

  /**
   * Get a single invoice by ID (works for both legacy and new invoices)
   */
  static async getInvoiceById(invoiceId: string): Promise<UnifiedInvoice | null> {
    // Try to get as proforma invoice first
    const { data: proformaInvoice, error: proformaError } = await this.getSupabase()
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
      .eq('id', invoiceId)
      .eq('payment_method', 'proforma')
      .single();

    if (proformaInvoice) {
      return this.normalizeProformaInvoice(proformaInvoice);
    }

    // If not found as proforma, try as legacy fiscal invoice
    const { data: fiscalInvoice, error: fiscalError } = await this.getSupabase()
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
      .eq('id', invoiceId)
      .single();

    if (fiscalInvoice) {
      return this.normalizeLegacyInvoice(fiscalInvoice);
    }

    return null;
  }
}
