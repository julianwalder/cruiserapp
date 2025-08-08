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
  userId?: string; // User ID for database queries
  // Personal identification
  cnp?: string; // From Smartbill imports or user profile
  idNumber?: string; // From Veriff verification (13 digits)
  
  // Personal information
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  
  // Address information (legacy fields for backward compatibility)
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  
  // Normalized address (single source of truth)
  normalizedAddress?: {
    street_address: string;
    city: string;
    state_region: string;
    country: string;
    postal_code?: string;
    confidence_score: number;
  };
  
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
   * Note: All users can generate proforma invoices, which become fiscal invoices after payment
   */
  static async generateProformaInvoice(request: ProformaInvoiceRequest): Promise<ProformaInvoiceResponse> {
    try {
      console.log('🔄 Generating proforma invoice for user:', request.invoiceData.userId);
      
      // 1. Validate and consolidate user data from multiple sources
      const consolidatedUserData = await this.consolidateUserData(request.userData, request.invoiceData.userId);
      
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
      const dbInvoice = await this.storeInvoiceRecord(
        request.invoiceData,
        consolidatedUserData,
        smartbillResponse.smartbillId!,
        request.paymentMethod
      );

      if (!dbInvoice.success) {
        return {
          success: false,
          error: dbInvoice.error || 'Failed to store invoice record'
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

      return {
        success: true,
        invoiceId: dbInvoice.invoiceId,
        smartbillId: smartbillResponse.smartbillId,
        paymentLink
      };

    } catch (error) {
      console.error('❌ Error generating proforma invoice:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Consolidate user data from multiple sources (profile, Veriff, Smartbill imports)
   */
  private static async consolidateUserData(userData: UserInvoiceData, userId: string): Promise<UserInvoiceData | null> {
    try {
      console.log('🔍 Debug: Starting consolidateUserData for userId:', userId);
      
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
          address,
          city,
          state,
          "zipCode",
          country,
          "veriffPersonIdNumber",
          "veriffPersonGivenName",
          "veriffPersonLastName",
          "veriffPersonCountry",
          "veriffPersonDateOfBirth"
        `)
        .eq('id', userId)
        .single();

      if (userError || !user) {
        console.error('❌ User not found:', userError);
        return null;
      }

      console.log('🔍 Debug: User data retrieved:', { userId: user.id, email: user.email });

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
        .select(`
          smartbill_id,
          import_date
        `)
        .eq('client_email', user.email)
        .order('import_date', { ascending: false })
        .limit(1)
        .single();

      // Consolidate address data from multiple sources
      console.log('🔍 Debug: Starting address consolidation');
      const normalizedAddress = await this.consolidateAddressData(user, smartbillData);
      console.log('🔍 Debug: Address consolidation result:', normalizedAddress);

      // Consolidate data with priority:
      // 1. Veriff verification data (most reliable)
      // 2. User profile data
      // 3. Smartbill import data
      // 4. Company data (if linked)

      const consolidated: UserInvoiceData = {
        // Personal identification - prioritize Veriff ID number, then CNP from Smartbill
        cnp: smartbillData?.smartbill_id || user.personalNumber,
        idNumber: user.veriffPersonIdNumber,
        
        // Personal information - prioritize Veriff data, fallback to profile
        firstName: user.veriffPersonGivenName || user.firstName,
        lastName: user.veriffPersonLastName || user.lastName,
        email: user.email,
        phone: user.phone,
        
        // Address information - use normalized address as single source of truth
        address: normalizedAddress?.streetAddress || user.address,
        // For Romanian addresses: if capitala exists, use sector as city and capitala as state
        city: normalizedAddress?.capitala ? normalizedAddress.sector : (normalizedAddress?.oras || user.city),
        state: normalizedAddress?.capitala || normalizedAddress?.judet || user.state,
        zipCode: user.zipCode,
        country: normalizedAddress?.capitala || normalizedAddress?.judet || user.veriffPersonCountry || user.country,
        
        // Normalized address (single source of truth)
        normalizedAddress: normalizedAddress || undefined,
        
        // Company information (if linked)
        companyId: company?.id,
        companyName: company?.name,
        companyVatCode: company?.vat_code,
        companyAddress: company?.address,
        companyCity: company?.city,
        companyCountry: company?.country,
      };

      console.log('✅ Consolidated user data:', {
        userId: userId,
        hasCnp: !!consolidated.cnp,
        hasIdNumber: !!consolidated.idNumber,
        hasCompany: !!consolidated.companyId,
        hasNormalizedAddress: !!consolidated.normalizedAddress,
        addressConfidence: consolidated.normalizedAddress?.confidence || 0
      });

      return consolidated;

    } catch (error) {
      console.error('❌ Error consolidating user data:', error);
      return null;
    }
  }

  /**
   * Consolidate address data from multiple sources into a single normalized address
   */
  private static async consolidateAddressData(user: any, smartbillData: any): Promise<NormalizedAddress | null> {
    console.log('🔍 Debug: Starting consolidateAddressData');
    console.log('🔍 Debug: User data:', { 
      hasVeriffAddress: !!user.veriffPersonAddress,
      hasProfileAddress: !!user.address,
      hasSmartbillAddress: !!smartbillData?.client_address
    });
    
    const addressSources: Array<{ address: any; source: string; confidence: number }> = [];

    // 1. Veriff address (highest priority - from ID validation)
    if (user.veriffPersonAddress) {
      try {
        const veriffResult = RomanianAddressNormalizer.normalizeAddress(user.veriffPersonAddress, 'veriff_id');
        if (veriffResult && veriffResult.success) {
          addressSources.push({
            address: veriffResult.address!,
            source: 'veriff_id',
            confidence: veriffResult.address!.confidence
          });
        }
      } catch (error) {
        console.error('❌ Error normalizing Veriff address:', error);
      }
    }

    // 2. User profile address
    if (user.address) {
      try {
        const profileResult = RomanianAddressNormalizer.normalizeAddress(user.address, 'user_profile');
        if (profileResult && profileResult.success) {
          addressSources.push({
            address: profileResult.address!,
            source: 'user_profile',
            confidence: profileResult.address!.confidence
          });
        }
      } catch (error) {
        console.error('❌ Error normalizing user profile address:', error);
      }
    }

    // 3. Smartbill historical address
    if (smartbillData?.client_address) {
      try {
        const smartbillResult = RomanianAddressNormalizer.normalizeAddress(smartbillData.client_address, 'smartbill_historical');
        if (smartbillResult && smartbillResult.success) {
          addressSources.push({
            address: smartbillResult.address!,
            source: 'smartbill_historical',
            confidence: smartbillResult.address!.confidence
          });
        }
      } catch (error) {
        console.error('❌ Error normalizing Smartbill address:', error);
      }
    }

    // 4. Construct address from individual fields if no full address available
    if (addressSources.length === 0 && (user.address || user.city || user.country)) {
      try {
        const constructedAddress = [user.address, user.city, user.country].filter(Boolean).join(', ');
        const constructedResult = RomanianAddressNormalizer.normalizeAddress(constructedAddress, 'constructed');
        if (constructedResult && constructedResult.success) {
          addressSources.push({
            address: constructedResult.address!,
            source: 'constructed',
            confidence: constructedResult.address!.confidence
          });
        }
      } catch (error) {
        console.error('❌ Error normalizing constructed address:', error);
      }
    }

    // Merge all address sources into a single normalized address
    console.log('🔍 Debug: Address sources count:', addressSources.length);
    
    if (addressSources.length > 0) {
      try {
        console.log('🔍 Debug: About to call mergeAddressSources');
        const mergedAddress = RomanianAddressNormalizer.mergeAddressSources(addressSources);
        console.log(`📍 Address consolidated from ${addressSources.length} sources:`, {
          sources: addressSources.map(s => s.source),
          confidence: mergedAddress.confidence,
          fullAddress: mergedAddress.fullAddress
        });
        return mergedAddress;
      } catch (error) {
        console.error('❌ Error merging address sources:', error);
        // Return the highest confidence address as fallback
        const bestAddress = addressSources.sort((a, b) => b.confidence - a.confidence)[0];
        return bestAddress.address;
      }
    }

    console.log('🔍 Debug: No address sources found, returning null');

    return null;
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
        id: this.generateInvoiceNumber(), // Use invoice number as ID
        series: paymentMethod === 'proforma' ? 'PROFORMA' : 'FACT',
        number: this.generateInvoiceNumber(),
        date: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days
        status: 'draft',
        total: invoiceData.totalPrice,
        currency: invoiceData.currency,
        client: clientData,
        items: [{
          name: invoiceData.packageName,
          quantity: invoiceData.hours,
          price: invoiceData.pricePerHour,
          total: invoiceData.totalPrice,
          unit: 'hours',
          description: `Flight hours package - valid for ${invoiceData.validityDays} days`,
          vatRate: 19, // 19% VAT for Romania
        }],
      };

      // Create invoice in Smartbill
      const response = await smartbillService.createInvoice(smartbillInvoice);
      
      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Failed to create Smartbill invoice'
        };
      }

      return {
        success: true,
        smartbillId: response.invoiceId
      };

    } catch (error) {
      console.error('❌ Error generating Smartbill invoice:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Smartbill invoice generation failed'
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
          smartbill_id: smartbillId,
          series: paymentMethod === 'proforma' ? 'PROFORMA' : 'FACT',
          number: this.generateInvoiceNumber(),
          issue_date: new Date().toISOString().split('T')[0],
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: 'draft',
          total_amount: invoiceData.totalPrice,
          currency: invoiceData.currency,
          vat_amount: invoiceData.totalPrice * 0.19,
          import_date: new Date().toISOString(),
          user_id: invoiceData.userId,
          package_id: invoiceData.packageId,
          payment_method: paymentMethod,
        })
        .select()
        .single();

      if (invoiceError) {
        console.error('❌ Error storing invoice record:', invoiceError);
        return {
          success: false,
          error: 'Failed to store invoice record'
        };
      }

      // Insert or update client record
      const { error: clientError } = await this.supabase
        .from('invoice_clients')
        .upsert({
          invoice_id: invoice.id,
          name: userData.companyName || `${userData.firstName} ${userData.lastName}`,
          email: userData.email,
          phone: userData.phone,
          address: userData.companyAddress || userData.address,
          city: userData.companyCity || userData.city,
          country: userData.companyCountry || userData.country,
          vat_code: userData.companyVatCode || userData.cnp || userData.idNumber,
          company_id: userData.companyId,
        });

      if (clientError) {
        console.error('❌ Error storing client record:', clientError);
        // Don't fail the entire operation for client record error
      }

      return {
        success: true,
        invoiceId: invoice.id
      };

    } catch (error) {
      console.error('❌ Error storing invoice record:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Database storage failed'
      };
    }
  }

  /**
   * Generate payment link (placeholder - integrate with your payment provider)
   */
  private static async generatePaymentLink(
    smartbillId: string,
    amount: number,
    currency: string
  ): Promise<string> {
    // This is a placeholder - integrate with your preferred payment provider
    // Examples: Stripe, PayPal, local payment processors
    
    const paymentData = {
      invoiceId: smartbillId,
      amount: amount.toString(),
      currency: currency,
      description: `Payment for invoice ${smartbillId}`,
      returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success`,
      cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payment/cancel`,
    };

    // For now, return a mock payment link
    // In production, integrate with actual payment provider
    const paymentLink = `${process.env.NEXT_PUBLIC_APP_URL}/payment/process?` + 
      new URLSearchParams(paymentData).toString();

    console.log('🔗 Generated payment link:', paymentLink);
    
    return paymentLink;
  }

  /**
   * Generate unique invoice number
   */
  private static generateInvoiceNumber(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
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
   * Update invoice payment status and convert proforma to fiscal when payment is received
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
        
        // Update Smartbill invoice to fiscal (if needed)
        if (invoice.smartbill_id) {
          // Note: This would require Smartbill API call to convert proforma to fiscal
          // For now, we'll just update the database
          console.log(`📝 Smartbill conversion would happen here for invoice ${invoice.smartbill_id}`);
        }
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

  /**
   * Get user invoice data for a specific user
   */
  static async getUserInvoiceData(userId: string): Promise<UserInvoiceData | null> {
    try {
      // Create a minimal userData object to pass to consolidateUserData
      const userData: UserInvoiceData = {
        userId: userId,
        firstName: '',
        lastName: '',
        email: ''
      };

      // Use the same consolidation logic as in generateProformaInvoice
      const consolidatedData = await this.consolidateUserData(userData, userId);
      
      if (!consolidatedData) {
        return null;
      }

      return consolidatedData;

    } catch (error) {
      console.error('❌ Error getting user invoice data:', error);
      return null;
    }
  }
}
