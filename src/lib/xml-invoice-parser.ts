import { parseString } from 'xml2js';

// Company details constants
const COMPANY_DETAILS = {
  VAT_CODE: 'RO39767581',
  EMAIL: 'tower@cruiseraviation.ro',
  NAME: 'CRUISER AVIATION SRL'
};

interface XMLInvoiceItem {
  name: string;
  description?: string;
  quantity: number;
  price: number;
  total: number;
  unit: string;
  vatRate?: number;
}

interface XMLInvoiceClient {
  name: string;
  email?: string;
  phone?: string;
  vatCode?: string;
  address?: string;
  city?: string;
  country?: string;
}

interface XMLInvoice {
  id: string;
  number: string;
  series: string;
  date: string;
  dueDate: string;
  status: string;
  total: number;
  currency: string;
  vatTotal: number;
  client: XMLInvoiceClient;
  items: XMLInvoiceItem[];
  xmlContent: string;
  importDate: string;
}

class XMLInvoiceParser {
  /**
   * Parse SmartBill XML invoice content
   */
  static parseXMLInvoice(xmlContent: string): Promise<XMLInvoice> {
    return new Promise((resolve, reject) => {
      parseString(xmlContent, { explicitArray: false }, (err, result) => {
        if (err) {
          reject(new Error(`XML parsing error: ${err.message}`));
          return;
        }

        try {
          const invoice = this.parseInvoiceFromResult(result, xmlContent);
          resolve(invoice);
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  private static parseInvoiceFromResult(result: any, xmlContent: string): XMLInvoice {
    const invoice = result.Invoice || result.invoice || result.factura;
    if (!invoice) {
      throw new Error('No invoice element found in XML');
    }

    // Extract basic invoice data (UBL format) - fixed for xml2js
    const fullNumber = this.getNestedValue(invoice, 'cbc:ID') || 'UNKNOWN';
    const series = this.extractSeriesFromNumber(fullNumber) || 'FACT';
    const number = this.extractNumberFromSmartBillId(fullNumber) || fullNumber; // Extract numeric part only
    const date = this.getNestedValue(invoice, 'cbc:IssueDate') || new Date().toISOString().split('T')[0];
    const dueDate = this.getNestedValue(invoice, 'cbc:DueDate') || date;
    
    // Extract totals (UBL format) - fixed for xml2js
    const legalMonetaryTotal = invoice['cac:LegalMonetaryTotal'];
    const total = this.parseNumber(this.getNestedValue(legalMonetaryTotal, 'cbc:PayableAmount') || '0');
    
    const taxTotal = invoice['cac:TaxTotal'];
    const vatTotal = this.parseNumber(this.getNestedValue(taxTotal, 'cbc:TaxAmount') || '0');
    
    const currency = this.getNestedValue(invoice, 'cbc:DocumentCurrencyCode') || 'RON';

    // Extract client information (UBL format) - fixed for xml2js
    const customerParty = invoice['cac:AccountingCustomerParty'];
    const party = customerParty?.['cac:Party'];
    

    
    const partyLegalEntity = party?.['cac:PartyLegalEntity'];
    const clientName = this.getNestedValue(partyLegalEntity, 'cbc:RegistrationName') || 'Unknown Client';

    const contact = party?.['cac:Contact'];
    let clientEmail = this.getNestedValue(contact, 'cbc:ElectronicMail');
    
    // Use the new helper method to extract client email, excluding company email
    const extractedClientEmail = this.extractClientEmail(xmlContent);
    if (extractedClientEmail) {
      clientEmail = extractedClientEmail;
    }

    const clientPhone = this.getNestedValue(contact, 'cbc:Telephone');

    const partyTaxScheme = party?.['cac:PartyTaxScheme'];
    const partyTaxSchemeVatCode = this.getNestedValue(partyTaxScheme, 'cbc:CompanyID');
    
    // Extract client VAT code from the specific BT-47 location first
    const bt47VatCode = this.extractClientVatCodeFromBT47(xmlContent);
    
    // Extract all CompanyID values from the XML as fallback
    const allCompanyIds = this.extractAllCompanyIds(xmlContent);
    
    // Prioritize BT-47 VAT code, then use the selection logic
    const clientVatCode = bt47VatCode || this.selectBestVatCode(allCompanyIds, partyTaxSchemeVatCode);

    const postalAddress = party?.['cac:PostalAddress'];
    const clientAddress = this.getNestedValue(postalAddress, 'cbc:StreetName');

    const clientCity = this.getNestedValue(postalAddress, 'cbc:CityName');

    const country = postalAddress?.['cac:Country'];
    const clientCountry = this.getNestedValue(country, 'cbc:IdentificationCode') || 'Romania';

    // Extract invoice items (UBL format) - fixed for xml2js
    const invoiceLines = invoice['cac:InvoiceLine'] || [];
    const items = Array.isArray(invoiceLines) ? invoiceLines : [invoiceLines];

    const parsedItems: XMLInvoiceItem[] = items.map((line: any, index: number) => {
      const item = line['cac:Item'];
      
      // Extract item name - try multiple possible locations
      let itemName = this.getNestedValue(item, 'cbc:Name') || 
                    this.getNestedValue(item, 'cbc:Description') ||
                    `Item ${index + 1}`;

      // Extract item description - try multiple possible locations
      const itemDescription = this.getNestedValue(item, 'cbc:Description') ||
                             this.getNestedValue(item, 'cbc:Name') ||
                             undefined;

      const quantity = this.parseNumber(this.getNestedValue(line, 'cbc:InvoicedQuantity') || '0');

      const unit = this.getAttributeValue(line, 'cbc:InvoicedQuantity', 'unitCode') || 'HUR';

      const price = line['cac:Price'];
      const priceAmount = this.parseNumber(this.getNestedValue(price, 'cbc:PriceAmount') || '0');

      const total = this.parseNumber(this.getNestedValue(line, 'cbc:LineExtensionAmount') || '0');

      // Extract VAT rate from tax information
      const itemTaxTotal = line['cac:TaxTotal'];
      let vatRate = 19.00; // Default VAT rate
      if (itemTaxTotal) {
        const taxSubtotal = itemTaxTotal['cac:TaxSubtotal'];
        if (taxSubtotal) {
          const taxCategory = taxSubtotal['cac:TaxCategory'];
          if (taxCategory) {
            const taxScheme = taxCategory['cac:TaxScheme'];
            if (taxScheme) {
              const rate = this.getNestedValue(taxCategory, 'cbc:Percent');
              if (rate) {
                vatRate = this.parseNumber(rate);
              }
            }
          }
        }
      }

      return {
        name: itemName,
        description: itemDescription,
        quantity,
        price: priceAmount,
        total,
        unit,
        vatRate
      };
    });

    return {
      id: fullNumber, // Use the full SmartBill ID (e.g., "CA0766")
      number,
      series,
      date,
      dueDate,
      status: 'imported',
      total,
      currency,
      vatTotal,
      client: {
        name: clientName,
        email: clientEmail || undefined,
        phone: clientPhone || undefined,
        vatCode: clientVatCode || undefined,
        address: clientAddress || undefined,
        city: clientCity || undefined,
        country: clientCountry || undefined
      },
      items: parsedItems,
      xmlContent: xmlContent, // Pass the original XML content
      importDate: new Date().toISOString()
    };
  }

  /**
   * Validate XML invoice content
   */
  static validateXMLInvoice(xmlContent: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!xmlContent || xmlContent.trim().length === 0) {
      errors.push('XML content is empty');
      return { isValid: false, errors };
    }

    // Basic XML structure validation
    if (!xmlContent.includes('<Invoice') && !xmlContent.includes('<invoice') && !xmlContent.includes('<factura')) {
      errors.push('No invoice element found in XML');
    }

    // Check for required UBL elements
    if (!xmlContent.includes('cbc:ID') && !xmlContent.includes('ID')) {
      errors.push('Invoice number (ID) not found');
    }

    if (!xmlContent.includes('cbc:IssueDate') && !xmlContent.includes('IssueDate')) {
      errors.push('Invoice date not found');
    }

    if (!xmlContent.includes('cac:LegalMonetaryTotal') && !xmlContent.includes('LegalMonetaryTotal')) {
      errors.push('Invoice total not found');
    }

    if (!xmlContent.includes('cac:AccountingCustomerParty') && !xmlContent.includes('AccountingCustomerParty')) {
      errors.push('Customer information not found');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get nested value from object using dot notation
   */
  private static getNestedValue(obj: any, path: string): string | null {
    if (!obj || !path) return null;
    
    const keys = path.split('.');
    let current = obj;
    
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return null;
      }
    }
    
    // Handle xml2js format: values are in "_" property
    if (current && typeof current === 'object' && '_' in current) {
      return current['_'];
    }
    
    return current && typeof current === 'string' ? current : null;
  }

  /**
   * Get attribute value from element
   */
  private static getAttributeValue(element: any, tagName: string, attributeName: string): string | null {
    if (!element || !element[tagName]) return null;
    
    const tag = element[tagName];
    if (tag && tag.$ && tag.$[attributeName]) {
      return tag.$[attributeName];
    }
    
    // Handle direct attribute access for xml2js format
    if (tag && tag.$ && tag.$[attributeName]) {
      return tag.$[attributeName];
    }
    
    return null;
  }

  /**
   * Extract series from invoice number (e.g., "CA0766" -> "CA")
   */
  private static extractSeriesFromNumber(number: string | null): string | null {
    if (!number) return null;
    
    // Extract letters from the beginning
    const match = number.match(/^([A-Z]+)/);
    return match ? match[1] : null;
  }

  /**
   * Extract numeric part from SmartBill ID (e.g., "CA0766" -> "0766")
   */
  private static extractNumberFromSmartBillId(smartBillId: string | null): string | null {
    if (!smartBillId) return null;
    
    // Extract digits from the end (can start with zero)
    const match = smartBillId.match(/(\d+)$/);
    return match ? match[1] : null;
  }

  /**
   * Parse number from string
   */
  private static parseNumber(value: string | null): number {
    if (!value) return 0;
    
    const cleaned = value.replace(/[^\d.-]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Extract all CompanyID values from XML content
   */
  private static extractAllCompanyIds(xmlContent: string): string[] {
    const companyIdMatches = xmlContent.match(/<cbc:CompanyID[^>]*>([^<]+)<\/cbc:CompanyID>/g);
    if (!companyIdMatches) return [];
    
    return companyIdMatches.map(match => {
      return match.replace(/<\/?cbc:CompanyID[^>]*>/g, '');
    });
  }

  /**
   * Extract client VAT code/CNP from the specific BT-47 location
   */
  private static extractClientVatCodeFromBT47(xmlContent: string): string | undefined {
    // Look for CompanyID with BT-47 comment (client VAT/CNP)
    const bt47Match = xmlContent.match(/<cbc:CompanyID[^>]*>([^<]+)<\/cbc:CompanyID>\s*<!--BT-47-->/);
    if (bt47Match) {
      return bt47Match[1];
    }
    
    // Fallback: look for CompanyID in customer party section
    const customerPartyMatch = xmlContent.match(/<cac:AccountingCustomerParty>[\s\S]*?<cbc:CompanyID[^>]*>([^<]+)<\/cbc:CompanyID>/);
    if (customerPartyMatch) {
      return customerPartyMatch[1];
    }
    
    return undefined;
  }

  /**
   * Select the best VAT code from multiple CompanyID values
   * Priority: 1. Non-RO-prefixed numeric codes, 2. RO-prefixed codes (excluding company VAT), 3. Registration numbers
   */
  private static selectBestVatCode(allCompanyIds: string[], partyTaxSchemeVatCode: string | null): string | undefined {
    if (allCompanyIds.length === 0) {
      return partyTaxSchemeVatCode || undefined;
    }

    // Filter out company VAT code (RO39767581) from client VAT codes
    const filteredCompanyIds = allCompanyIds.filter(id => id !== COMPANY_DETAILS.VAT_CODE);

    if (filteredCompanyIds.length === 0) {
      // If only company VAT code is found, return the party tax scheme VAT code
      return partyTaxSchemeVatCode || undefined;
    }

    // Priority 1: Non-RO-prefixed numeric codes (like 32512351, 36729443)
    const numericCodes = filteredCompanyIds.filter(id => /^\d+$/.test(id));
    if (numericCodes.length > 0) {
      return numericCodes[0]; // Return the first numeric code found
    }

    // Priority 2: RO-prefixed codes (excluding company VAT code)
    const roCodes = filteredCompanyIds.filter(id => id.startsWith('RO') && id !== COMPANY_DETAILS.VAT_CODE);
    if (roCodes.length > 0) {
      return roCodes[0]; // Return the first RO code found
    }

    // Priority 3: Fallback to party tax scheme VAT code (if it's not the company VAT code)
    if (partyTaxSchemeVatCode && partyTaxSchemeVatCode !== COMPANY_DETAILS.VAT_CODE) {
      return partyTaxSchemeVatCode;
    }

    // Priority 4: Any other CompanyID (like registration numbers)
    return filteredCompanyIds[0];
  }

  /**
   * Check if an email belongs to the company
   */
  private static isCompanyEmail(email: string): boolean {
    return email === COMPANY_DETAILS.EMAIL;
  }

  /**
   * Check if a VAT code belongs to the company
   */
  private static isCompanyVatCode(vatCode: string): boolean {
    return vatCode === COMPANY_DETAILS.VAT_CODE;
  }

  /**
   * Extract client email from XML, excluding company email
   */
  private static extractClientEmail(xmlContent: string): string | undefined {
    const emailMatches = xmlContent.match(/<cbc:ElectronicMail>([^<]+)<\/cbc:ElectronicMail>/g);
    if (!emailMatches) return undefined;

    // Convert matches to actual email addresses
    const emails = emailMatches.map(match => {
      const emailMatch = match.match(/<cbc:ElectronicMail>([^<]+)<\/cbc:ElectronicMail>/);
      return emailMatch ? emailMatch[1] : null;
    }).filter(email => email !== null) as string[];

    // Filter out company email and return the first client email
    const clientEmails = emails.filter(email => !this.isCompanyEmail(email));
    
    return clientEmails.length > 0 ? clientEmails[0] : undefined;
  }

  /**
   * Generate sample XML for testing
   */
  static generateSampleXML(): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:efactura.mfinante.ro:CIUS-RO:1.0.1</cbc:CustomizationID>
  <cbc:ID>CA0766</cbc:ID>
  <cbc:IssueDate>2025-03-04</cbc:IssueDate>
  <cbc:DueDate>2025-03-11</cbc:DueDate>
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>RON</cbc:DocumentCurrencyCode>
  
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${COMPANY_DETAILS.NAME}</cbc:RegistrationName>
        <cbc:CompanyID>${COMPANY_DETAILS.VAT_CODE}</cbc:CompanyID>
      </cac:PartyLegalEntity>
      <cac:Contact>
        <cbc:Telephone>+40 (722) 500 163</cbc:Telephone>
        <cbc:ElectronicMail>${COMPANY_DETAILS.EMAIL}</cbc:ElectronicMail>
      </cac:Contact>
    </cac:Party>
  </cac:AccountingSupplierParty>
  
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>Ștefan Avădănei</cbc:RegistrationName>
        <cbc:CompanyID>5010723225621</cbc:CompanyID>
      </cac:PartyLegalEntity>
      <cac:Contact>
        <cbc:Telephone>+40 (748) 023 575</cbc:Telephone>
        <cbc:ElectronicMail>s.avadanei@yahoo.com</cbc:ElectronicMail>
      </cac:Contact>
    </cac:Party>
  </cac:AccountingCustomerParty>
  
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="RON">3079.20</cbc:TaxAmount>
  </cac:TaxTotal>
  
  <cac:LegalMonetaryTotal>
    <cbc:PayableAmount currencyID="RON">19285.50</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  
  <cac:InvoiceLine>
    <cbc:ID>1</cbc:ID>
    <cbc:InvoicedQuantity unitCode="HUR">25.0000</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="RON">16206.30</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Name>Ora de zbor (combustibil inclus)</cbc:Name>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="RON">648.25</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>
  
  <cac:InvoiceLine>
    <cbc:ID>2</cbc:ID>
    <cbc:InvoicedQuantity unitCode="HUR">5.0000</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="RON">0.00</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Name>Ora de zbor promo (combustibil inclus)</cbc:Name>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="RON">0.00</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>
</Invoice>`;
  }
}

export { XMLInvoiceParser, type XMLInvoice, type XMLInvoiceItem, type XMLInvoiceClient }; 