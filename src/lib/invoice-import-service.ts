import { createClient } from '@supabase/supabase-js';
import { XMLInvoiceParser, type XMLInvoice } from './xml-invoice-parser';
import { PPLDetectionService } from './ppl-detection-service';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface InvoiceImportResult {
  success: boolean;
  invoiceId?: string;
  userId?: string;
  companyId?: string;
  flightHoursId?: string;
  isPPL?: boolean;
  pplHoursPaid?: number;
  message: string;
  errors?: string[];
}

export interface ImportedInvoice {
  id: string;
  smartbill_id: string;
  series: string;
  number: string;
  issue_date: string;
  due_date: string;
  status: string;
  total_amount: number;
  vat_amount: number;
  currency: string;
  import_date: string;
  is_ppl?: boolean;
  ppl_hours_paid?: number;
  xml_content?: string; // Current content (edited JSON or original XML)
  original_xml_content?: string; // Original XML before any edits
  has_edits?: boolean; // Whether this invoice was edited during import
  client: {
    name: string;
    email?: string;
    phone?: string;
    vat_code?: string;
    address?: string;
    city?: string;
    country?: string;
    user_id?: string;
    company_id?: string;
  };
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
  flight_hours?: Array<{
    hours_regular: number;
    hours_promotional: number;
    total_hours: number;
    rate_per_hour: number;
    total_amount: number;
    notes?: string;
  }>;
}

export class InvoiceImportService {
  /**
   * Import a SmartBill XML invoice into the database
   */
  static async importInvoice(xmlContent: string, editedInvoice?: any): Promise<InvoiceImportResult> {
    try {
      // Use edited invoice data if provided, otherwise parse the XML
      const invoiceToImport = editedInvoice || await XMLInvoiceParser.parseXMLInvoice(xmlContent);
      
      // Check if invoice already exists
      const existingInvoice = await this.checkExistingInvoice(invoiceToImport.id);
      if (existingInvoice) {
        return {
          success: false,
          message: `Invoice ${invoiceToImport.id} already exists in the database`
        };
      }

      // Find user by email if client email exists
      const userId = await this.findUserByEmail(invoiceToImport.client.email);

      // Find or create company by VAT code or name
      const companyId = await this.findOrCreateCompany(invoiceToImport.client);

      // If we found a user, ensure they have a relationship with the company
      if (userId && companyId) {
        await this.ensureUserCompanyRelationship(userId, companyId);
      }

      // Insert invoice
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          smartbill_id: invoiceToImport.id, // Full SmartBill ID (e.g., "CA0766")
          series: invoiceToImport.series, // Series (e.g., "CA")
          number: invoiceToImport.number, // Numeric part only (e.g., "0766")
          issue_date: invoiceToImport.date,
          due_date: invoiceToImport.dueDate,
          status: invoiceToImport.status,
          total_amount: invoiceToImport.total,
          vat_amount: invoiceToImport.vatTotal,
          currency: invoiceToImport.currency,
          xml_content: editedInvoice ? JSON.stringify(editedInvoice) : xmlContent,
          original_xml_content: xmlContent
        })
        .select()
        .single();

      if (invoiceError) {
        throw new Error(`Failed to insert invoice: ${invoiceError.message}`);
      }

      // Insert client information
      const { error: clientError } = await supabase
        .from('invoice_clients')
        .insert({
          invoice_id: invoiceData.id,
          name: invoiceToImport.client.name,
          email: invoiceToImport.client.email,
          phone: invoiceToImport.client.phone,
          vat_code: invoiceToImport.client.vatCode,
          address: invoiceToImport.client.address,
          city: invoiceToImport.client.city,
          country: invoiceToImport.client.country,
          user_id: userId || undefined,
          company_id: companyId || undefined
        });

      if (clientError) {
        throw new Error(`Failed to insert client: ${clientError.message}`);
      }

      // Insert invoice items
      const invoiceItems = [];
      const flightHours = [];

      for (let i = 0; i < invoiceToImport.items.length; i++) {
        const item = invoiceToImport.items[i];
        
        // Insert invoice item
        const { data: itemData, error: itemError } = await supabase
          .from('invoice_items')
          .insert({
            invoice_id: invoiceData.id,
            line_id: i + 1,
            name: item.name,
            description: item.description ? item.description : undefined,
            quantity: item.quantity,
            unit: item.unit,
            unit_price: item.price,
            total_amount: item.total,
            vat_rate: item.vatRate || 19.00 // Use extracted VAT rate or default
          })
          .select()
          .single();

        if (itemError) {
          throw new Error(`Failed to insert invoice item: ${itemError.message}`);
        }

        invoiceItems.push(itemData);

        // If this is a flight hours item (unit = HUR), create flight hours record
        if (item.unit === 'HUR' && userId) {
          const isPromotional = item.price === 0 || item.name.toLowerCase().includes('promo');
          
          const { data: flightData, error: flightError } = await supabase
            .from('flight_hours')
            .insert({
              invoice_id: invoiceData.id,
              user_id: userId,
              company_id: companyId || undefined, // Link to company that paid for the hours
              invoice_item_id: itemData.id,
              flight_date: invoiceToImport.date,
              hours_regular: isPromotional ? 0 : item.quantity,
              hours_promotional: isPromotional ? item.quantity : 0,
              total_hours: item.quantity,
              rate_per_hour: item.price,
              total_amount: item.total,
              notes: item.name
            })
            .select()
            .single();

          if (flightError) {
            console.warn(`Failed to insert flight hours: ${flightError.message}`);
          } else {
            flightHours.push(flightData);
          }
        }
      }

      // Check if this is a PPL course invoice
      const pplInfo = PPLDetectionService.getPPLInfo(invoiceToImport.items.map((item: any) => ({
        name: item.name,
        description: item.description,
        total_amount: item.total
      })));
      
      // Update invoice with PPL information
      if (pplInfo.isPPL) {
        const { error: updateError } = await supabase
          .from('invoices')
          .update({
            is_ppl: true,
            ppl_hours_paid: pplInfo.hoursPaid
          })
          .eq('id', invoiceData.id);

        if (updateError) {
          console.error('Error updating invoice with PPL info:', updateError.message);
        }
      }

      return {
        success: true,
        invoiceId: invoiceData.id,
        userId: userId || undefined,
        companyId: companyId || undefined,
        message: `Successfully imported invoice ${invoiceToImport.number}`,
        flightHoursId: flightHours.length > 0 ? flightHours[0].id : undefined,
        isPPL: pplInfo.isPPL,
        pplHoursPaid: pplInfo.hoursPaid
      };

    } catch (error) {
      console.error('Invoice import error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Check if an invoice already exists
   */
  private static async checkExistingInvoice(invoiceNumber: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('invoices')
      .select('id')
      .eq('smartbill_id', invoiceNumber)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw new Error(`Failed to check existing invoice: ${error.message}`);
    }

    return !!data;
  }

  /**
   * Find or create company by VAT code or name
   */
  private static async findOrCreateCompany(client: any): Promise<string | null> {
    if (!client.name) return null;

    let companyId: string | null = null;

    // First try to find by VAT code if available
    if (client.vatCode) {
      const { data: existingCompany, error } = await supabase
        .from('companies')
        .select('id')
        .eq('vat_code', client.vatCode)
        .single();

      if (!error && existingCompany) {
        companyId = existingCompany.id;
      }
    }

    // If not found by VAT code, try to find by name
    if (!companyId) {
      const { data: existingCompany, error } = await supabase
        .from('companies')
        .select('id')
        .eq('name', client.name)
        .single();

      if (!error && existingCompany) {
        companyId = existingCompany.id;
      }
    }

    // Only create a new company if there's a VAT code (indicating it's actually a company)
    if (!companyId && client.vatCode) {
      // Check if VAT code is 13 characters (Romanian personal VAT code - CNP)
      if (client.vatCode.length === 13) {
        console.warn(`Skipping company creation for "${client.name}" - VAT code "${client.vatCode}" is 13 characters (personal VAT code)`);
        return null;
      }
      
      // Additional validation: check if the company name matches a user's full name
      const { data: matchingUser, error: userCheckError } = await supabase
        .from('users')
        .select('id, firstName, lastName')
        .or(`firstName.ilike.${client.name},lastName.ilike.${client.name}`)
        .limit(1);

      if (!userCheckError && matchingUser && matchingUser.length > 0) {
        const user = matchingUser[0];
        const userFullName = `${user.firstName} ${user.lastName}`.trim();
        
        if (userFullName.toLowerCase() === client.name.toLowerCase()) {
          console.warn(`Skipping company creation for "${client.name}" - matches user name "${userFullName}"`);
          return null;
        }
      }

      const { data: newCompany, error: createError } = await supabase
        .from('companies')
        .insert({
          name: client.name,
          vat_code: client.vatCode,
          email: client.email || null,
          phone: client.phone || null,
          address: client.address || null,
          city: client.city || null,
          country: client.country || 'Romania',
          status: 'Active'
        })
        .select('id')
        .single();

      if (createError) {
        console.warn(`Failed to create company: ${createError.message}`);
        return null;
      }

      companyId = newCompany.id;
    }

    // If no VAT code, don't create a company - treat as individual
    if (!companyId && !client.vatCode) {
      
      return null;
    }

    return companyId;
  }



  /**
   * Find user by email with improved matching
   */
  private static async findUserByEmail(email?: string): Promise<string | null> {
    if (!email) return null;

    // Clean and normalize email
    const cleanEmail = email.toLowerCase().trim();

    const { data, error } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', cleanEmail)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.warn(`Failed to find user by email ${cleanEmail}: ${error.message}`);
      return null;
    }

    return data?.id || null;
  }

  /**
   * Ensure user has a relationship with the company
   */
  private static async ensureUserCompanyRelationship(userId: string, companyId: string): Promise<void> {
    // Check if relationship already exists
    const { data: existingRelationship, error: checkError } = await supabase
      .from('user_company_relationships')
      .select('id')
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.warn(`Failed to check user-company relationship: ${checkError.message}`);
      return;
    }

    // If relationship doesn't exist, create it
    if (!existingRelationship) {
      const { error: createError } = await supabase
        .from('user_company_relationships')
        .insert({
          user_id: userId,
          company_id: companyId,
          relationship_type: 'employee', // Default relationship type
          is_primary: false // Will be set to true if this is the user's only company
        });

      if (createError) {
        console.warn(`Failed to create user-company relationship: ${createError.message}`);
      }
    }
  }

  /**
   * Get all imported invoices
   */
  static async getImportedInvoices(): Promise<ImportedInvoice[]> {
    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select(`
        *,
        invoice_clients (
          name,
          email,
          phone,
          vat_code,
          address,
          city,
          country,
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
          total_amount,
          vat_rate
        ),
        flight_hours (
          hours_regular,
          hours_promotional,
          total_hours,
          rate_per_hour,
          total_amount,
          notes
        )
      `)
      .order('issue_date', { ascending: false });

    if (invoicesError) {
      throw new Error(`Failed to fetch invoices: ${invoicesError.message}`);
    }

    return invoices.map(invoice => ({
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
      is_ppl: invoice.is_ppl || false,
      ppl_hours_paid: invoice.ppl_hours_paid || 0,
      xml_content: invoice.xml_content,
      original_xml_content: invoice.original_xml_content,
      edited_xml_content: invoice.edited_xml_content,
      has_edits: !!invoice.edited_xml_content,
      client: invoice.invoice_clients[0] || {},
      items: invoice.invoice_items || [],
      flight_hours: invoice.flight_hours || []
    }));
  }

  /**
   * Get invoices for a specific user
   */
  static async getUserInvoices(userId: string): Promise<ImportedInvoice[]> {
    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select(`
        *,
        invoice_clients!inner (
          name,
          email,
          phone,
          vat_code,
          address,
          city,
          country,
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
          total_amount,
          vat_rate
        ),
        flight_hours (
          hours_regular,
          hours_promotional,
          total_hours,
          rate_per_hour,
          total_amount,
          notes
        )
      `)
      .eq('invoice_clients.user_id', userId)
      .order('issue_date', { ascending: false });

    if (invoicesError) {
      throw new Error(`Failed to fetch user invoices: ${invoicesError.message}`);
    }

    return invoices.map(invoice => ({
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
      is_ppl: invoice.is_ppl || false,
      ppl_hours_paid: invoice.ppl_hours_paid || 0,
      xml_content: invoice.xml_content,
      original_xml_content: invoice.original_xml_content,
      edited_xml_content: invoice.edited_xml_content,
      has_edits: !!invoice.edited_xml_content,
      client: invoice.invoice_clients[0] || {},
      items: invoice.invoice_items || [],
      flight_hours: invoice.flight_hours || []
    }));
  }

  /**
   * Get a single invoice with full XML details
   */
  static async getInvoiceById(invoiceId: string): Promise<ImportedInvoice | null> {
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        invoice_clients (
          name,
          email,
          phone,
          vat_code,
          address,
          city,
          country,
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
          total_amount,
          vat_rate
        ),
        flight_hours (
          hours_regular,
          hours_promotional,
          total_hours,
          rate_per_hour,
          total_amount,
          notes
        )
      `)
      .eq('id', invoiceId)
      .single();

    if (invoiceError) {
      if (invoiceError.code === 'PGRST116') {
        return null; // Invoice not found
      }
      throw new Error(`Failed to fetch invoice: ${invoiceError.message}`);
    }

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
      is_ppl: invoice.is_ppl || false,
      ppl_hours_paid: invoice.ppl_hours_paid || 0,
      xml_content: invoice.xml_content,
      original_xml_content: invoice.original_xml_content,
      edited_xml_content: invoice.edited_xml_content,
      has_edits: !!invoice.edited_xml_content,
      client: invoice.invoice_clients[0] || {},
      items: invoice.invoice_items || [],
      flight_hours: invoice.flight_hours || []
    };
  }

  /**
   * Get flight hours for a specific user
   */
  static async getUserFlightHours(userId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('flight_hours')
      .select(`
        *,
        invoices (
          smartbill_id,
          issue_date,
          status
        ),
        invoice_items (
          name,
          notes
        ),
        companies (
          name,
          vat_code
        )
      `)
      .eq('user_id', userId)
      .order('flight_date', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch flight hours: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get companies for a specific user
   */
  static async getUserCompanies(userId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('user_company_relationships')
      .select(`
        *,
        companies (
          id,
          name,
          vat_code,
          email,
          phone,
          address,
          city,
          country,
          status
        )
      `)
      .eq('user_id', userId)
      .order('is_primary', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch user companies: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get users for a specific company
   */
  static async getCompanyUsers(companyId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('user_company_relationships')
      .select(`
        *,
        users (
          id,
          email,
          firstName,
          lastName,
          status
        )
      `)
      .eq('company_id', companyId)
      .order('is_primary', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch company users: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Delete an imported invoice
   */
  static async deleteInvoice(invoiceId: string): Promise<boolean> {
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', invoiceId);

    if (error) {
      throw new Error(`Failed to delete invoice: ${error.message}`);
    }

    return true;
  }
} 