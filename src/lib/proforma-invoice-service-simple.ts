import { createClient } from '@supabase/supabase-js';
import { SmartBillService } from './smartbill-service';

interface ProformaInvoiceData {
  userId: string;
  packageId: string;
  packageName: string;
  hours: number;
  pricePerHour: number;
  totalPrice: number;
  currency: string;
  validityDays: number;
}

interface UserInvoiceData {
  userId?: string;
  // Personal identification
  cnp?: string;
  idNumber?: string;
  
  // Personal information
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  
  // Address information (from normalized_addresses table)
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  
  // Company information (if linked)
  companyId?: string;
  companyName?: string;
  companyVatCode?: string;
  companyAddress?: string;
  companyCity?: string;
  companyCountry?: string;
}

interface ProformaInvoiceRequest {
  invoiceData: ProformaInvoiceData;
  userData: UserInvoiceData;
  paymentMethod: 'proforma' | 'fiscal';
  paymentLink?: boolean;
}

interface ProformaInvoiceResponse {
  success: boolean;
  invoiceId?: string;
  smartbillId?: string;
  paymentLink?: string;
  error?: string;
}

export class ProformaInvoiceService {
  private static supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  /**
   * Generate proforma invoice and optionally payment link for hour package order
   */
  static async generateProformaInvoice(request: ProformaInvoiceRequest): Promise<ProformaInvoiceResponse> {
    try {
      console.log('🔄 Generating proforma invoice for user:', request.invoiceData.userId);
      
      // 1. Get consolidated user data
      const consolidatedUserData = await this.getUserInvoiceData(request.invoiceData.userId);
      
      if (!consolidatedUserData) {
        return {
          success: false,
          error: 'Unable to retrieve user data for invoice generation'
        };
      }

      // 2. Generate Smartbill invoice
      const smartbillResponse = await this.generateSmartbillInvoice(
        request.invoiceData,
        consolidatedUserData,
        request.paymentMethod
      );

      if (!smartbillResponse.success) {
        return {
          success: false,
          error: smartbillResponse.error || 'Failed to generate Smartbill invoice'
        };
      }

      // 3. Store invoice record in database
      const storeResponse = await this.storeInvoiceRecord(
        request.invoiceData,
        consolidatedUserData,
        smartbillResponse.smartbillId!,
        request.paymentMethod
      );

      if (!storeResponse.success) {
        return {
          success: false,
          error: storeResponse.error || 'Failed to store invoice record'
        };
      }

      // 4. Generate payment link if requested
      let paymentLink: string | undefined;
      if (request.paymentLink) {
        paymentLink = await this.generatePaymentLink(
          smartbillResponse.smartbillId!,
          request.invoiceData.totalPrice,
          request.invoiceData.currency
        );
      }

      console.log('✅ Proforma invoice generated successfully');
      return {
        success: true,
        invoiceId: storeResponse.invoiceId,
        smartbillId: smartbillResponse.smartbillId,
        paymentLink
      };

    } catch (error) {
      console.error('❌ Error generating proforma invoice:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get user invoice data with normalized address from database
   */
  static async getUserInvoiceData(userId: string): Promise<UserInvoiceData | null> {
    try {
      // Get user data from database
      const { data: user, error: userError } = await this.supabase
        .from('users')
        .select(`
          id,
          email,
          "firstName",
          "lastName",
          "personalNumber",
          phone,
          "veriffPersonIdNumber",
          "veriffPersonGivenName",
          "veriffPersonLastName",
          "veriffPersonCountry"
        `)
        .eq('id', userId)
        .single();

      if (userError || !user) {
        console.error('❌ User not found:', userError);
        return null;
      }

      // Get normalized address from the dedicated table
      const { data: normalizedAddress, error: addressError } = await this.supabase
        .from('normalized_addresses')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (addressError && addressError.code !== 'PGRST116') {
        console.error('❌ Error fetching normalized address:', addressError);
      }

      // Get company relationship if user is linked to a company
      const { data: companyRelationship } = await this.supabase
        .from('user_company_relationships')
        .select(`
          companies (
            id,
            name,
            vat_code,
            address,
            city,
            country,
            email,
            phone
          )
        `)
        .eq('user_id', userId)
        .eq('is_primary', true)
        .single();

      const company = companyRelationship?.companies as any;

      // Get CNP from Smartbill imports (most recent invoice for this user)
      const { data: smartbillData } = await this.supabase
        .from('invoices')
        .select('smartbill_id, import_date')
        .eq('client_email', user.email)
        .order('import_date', { ascending: false })
        .limit(1)
        .single();

      // Consolidate data
      const consolidated: UserInvoiceData = {
        userId: user.id,
        // Personal identification - prioritize CNP from normalized address, then Smartbill, then user profile
        cnp: normalizedAddress?.source_data?.vat_code || smartbillData?.smartbill_id || user.personalNumber,
        idNumber: user.veriffPersonIdNumber,
        
        // Personal information
        firstName: user.veriffPersonGivenName || user.firstName,
        lastName: user.veriffPersonLastName || user.lastName,
        email: user.email,
        phone: user.phone,
        
        // Address information - use normalized address as single source of truth
        address: normalizedAddress?.street_address,
        city: normalizedAddress?.city,
        state: normalizedAddress?.state_region,
        zipCode: normalizedAddress?.postal_code,
        country: normalizedAddress?.country || user.veriffPersonCountry,
        
        // Company information (if linked)
        companyId: company?.id,
        companyName: company?.name,
        companyVatCode: company?.vat_code,
        companyAddress: company?.address,
        companyCity: company?.city,
        companyCountry: company?.country,
      };

      console.log('✅ User data consolidated:', {
        userId: userId,
        hasCnp: !!consolidated.cnp,
        hasIdNumber: !!consolidated.idNumber,
        hasCompany: !!consolidated.companyId,
        hasNormalizedAddress: !!normalizedAddress,
        addressConfidence: normalizedAddress?.confidence_score || 0
      });

      return consolidated;

    } catch (error) {
      console.error('❌ Error getting user invoice data:', error);
      return null;
    }
  }

  /**
   * Generate Smartbill invoice
   */
  private static async generateSmartbillInvoice(
    invoiceData: ProformaInvoiceData,
    userData: UserInvoiceData,
    paymentMethod: 'proforma' | 'fiscal'
  ): Promise<{ success: boolean; smartbillId?: string; error?: string }> {
    try {
      // Initialize Smartbill service
      const smartbillService = new SmartBillService({
        username: process.env.SMARTBILL_USERNAME!,
        password: process.env.SMARTBILL_PASSWORD!,
        cif: process.env.SMARTBILL_CIF!,
      });

      // Prepare client data
      const clientData = {
        name: userData.companyName || `${userData.firstName} ${userData.lastName}`,
        vatCode: userData.companyVatCode || userData.cnp || userData.idNumber,
        address: userData.companyAddress || userData.address,
        city: userData.companyCity || userData.city,
        country: userData.companyCountry || userData.country,
        email: userData.email,
        phone: userData.phone,
      };

      // Prepare invoice data
      const smartbillInvoice = {
        id: this.generateInvoiceNumber(),
        series: paymentMethod === 'proforma' ? 'PROFORMA' : 'FACTURA',
        number: this.generateInvoiceNumber(),
        date: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days
        currency: invoiceData.currency,
        language: 'RO',
        precision: 2,
        exchangeRate: 1,
        isDraft: false,
        isService: true,
        hasVat: true,
        hasDiscount: false,
        isIssued: false,
        client: clientData,
        products: [{
          name: invoiceData.packageName,
          code: invoiceData.packageId,
          price: invoiceData.pricePerHour,
          quantity: invoiceData.hours,
          unit: 'ore',
          vatPercent: 19, // Romanian VAT
          isDiscount: false
        }]
      };

      // Create invoice in Smartbill
      const response = await smartbillService.createInvoice(smartbillInvoice);

      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Failed to create Smartbill invoice'
        };
      }

      console.log('✅ Smartbill invoice created:', response.invoiceId);
      return {
        success: true,
        smartbillId: response.invoiceId
      };

    } catch (error) {
      console.error('❌ Error generating Smartbill invoice:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Store invoice record in database
   */
  private static async storeInvoiceRecord(
    invoiceData: ProformaInvoiceData,
    userData: UserInvoiceData,
    smartbillId: string,
    paymentMethod: 'proforma' | 'fiscal'
  ): Promise<{ success: boolean; invoiceId?: string; error?: string }> {
    try {
      // Insert invoice record
      const { data: invoice, error: invoiceError } = await this.supabase
        .from('invoices')
        .insert({
          user_id: invoiceData.userId,
          package_id: invoiceData.packageId,
          smartbill_id: smartbillId,
          amount: invoiceData.totalPrice,
          currency: invoiceData.currency,
          payment_method: paymentMethod,
          payment_status: 'pending',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (invoiceError) {
        return {
          success: false,
          error: invoiceError.message
        };
      }

      // Insert invoice client record
      const { error: clientError } = await this.supabase
        .from('invoice_clients')
        .insert({
          invoice_id: invoice.id,
          user_id: invoiceData.userId,
          client_name: userData.companyName || `${userData.firstName} ${userData.lastName}`,
          client_email: userData.email,
          client_phone: userData.phone,
          client_address: userData.address,
          client_city: userData.city,
          client_state: userData.state,
          client_country: userData.country,
          client_vat_code: userData.companyVatCode || userData.cnp || userData.idNumber,
          created_at: new Date().toISOString()
        });

      if (clientError) {
        return {
          success: false,
          error: clientError.message
        };
      }

      console.log('✅ Invoice record stored:', invoice.id);
      return {
        success: true,
        invoiceId: invoice.id
      };

    } catch (error) {
      console.error('❌ Error storing invoice record:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Generate payment link (placeholder for now)
   */
  private static async generatePaymentLink(
    smartbillId: string,
    amount: number,
    currency: string
  ): Promise<string> {
    // This would integrate with a payment provider like Stripe
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const params = new URLSearchParams({
      invoiceId: smartbillId,
      amount: amount.toString(),
      currency: currency
    });
    
    return `${baseUrl}/payment?${params.toString()}`;
  }

  /**
   * Generate unique invoice number
   */
  private static generateInvoiceNumber(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `INV-${timestamp}-${random}`;
  }

  /**
   * Validate user data for invoice generation
   */
  static validateUserDataForInvoice(userData: UserInvoiceData): { valid: boolean; missingFields: string[] } {
    const missingFields: string[] = [];

    // Check mandatory fields for fiscal invoices
    if (!userData.cnp && !userData.idNumber) {
      missingFields.push('CNP or ID Number');
    }

    if (!userData.firstName || !userData.lastName) {
      missingFields.push('First Name and Last Name');
    }

    if (!userData.address) {
      missingFields.push('Street Address');
    }
    if (!userData.city) {
      missingFields.push('City');
    }
    if (!userData.state) {
      missingFields.push('State/Region');
    }
    if (!userData.country) {
      missingFields.push('Country');
    }

    return {
      valid: missingFields.length === 0,
      missingFields
    };
  }

  /**
   * Update invoice payment status
   */
  static async updateInvoicePaymentStatus(
    invoiceId: string, 
    paymentStatus: 'paid' | 'failed' | 'cancelled',
    paymentReference?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: invoice, error: fetchError } = await this.supabase
        .from('invoices')
        .select('id, payment_method, payment_status, smartbill_id')
        .eq('id', invoiceId)
        .single();

      if (fetchError || !invoice) {
        return { success: false, error: 'Invoice not found' };
      }

      // If payment is successful and this is a proforma invoice, convert it to fiscal
      if (paymentStatus === 'paid' && invoice.payment_method === 'proforma') {
        console.log(`🔄 Converting proforma invoice ${invoiceId} to fiscal invoice`);
        console.log(`📝 Smartbill conversion would happen here for invoice ${invoice.smartbill_id}`);
      }

      // Update the invoice status
      const { error: updateError } = await this.supabase
        .from('invoices')
        .update({
          payment_status: paymentStatus,
          payment_reference: paymentReference,
          updated_at: new Date().toISOString()
        })
        .eq('id', invoiceId);

      if (updateError) {
        return { success: false, error: updateError.message };
      }

      console.log(`✅ Invoice ${invoiceId} payment status updated to ${paymentStatus}`);
      return { success: true };

    } catch (error) {
      console.error('❌ Error updating invoice payment status:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}
