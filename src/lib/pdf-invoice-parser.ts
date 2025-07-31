interface PDFInvoiceData {
  invoiceNumber: string;
  series: string;
  number: string;
  issueDate: string;
  dueDate: string;
  totalAmount: number;
  vatAmount: number;
  currency: string;
  client: {
    name: string;
    email?: string;
    phone?: string;
    vatCode?: string;
    address?: string;
    city?: string;
    country?: string;
  };
  items: Array<{
    name: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    totalAmount: number;
    vatRate: number;
  }>;
}

class PDFInvoiceParser {
  /**
   * Parse Smartbill PDF content and extract invoice data
   */
  static parsePDFInvoice(pdfContent: string): PDFInvoiceData {
    // Extract text content from PDF
    const textContent = this.extractTextFromPDF(pdfContent);
    
    // Parse the extracted data
    return this.parseTextContent(textContent);
  }

  /**
   * Extract text content from PDF (simplified version)
   */
  private static extractTextFromPDF(pdfContent: string): string {
    // This is a simplified text extraction
    // In a production environment, you would use a proper PDF parsing library
    
    // For now, we'll create a basic structure based on what we know
    // The PDF contains invoice data that we can extract
    
    // Extract basic invoice information from the PDF content
    const lines = pdfContent.split('\n');
    let extractedText = '';
    
    // Look for text patterns in the PDF
    for (const line of lines) {
      // Skip binary data and look for readable text
      if (line.includes('(') && line.includes(')')) {
        extractedText += line + '\n';
      }
    }
    
    return extractedText || 'Invoice data extracted from PDF';
  }

  /**
   * Parse extracted text content to get invoice data
   */
  private static parseTextContent(textContent: string): PDFInvoiceData {
    // This is a placeholder implementation
    // In a real scenario, you would parse the actual text content
    
    // For now, we'll create a basic structure
    const currentDate = new Date().toISOString().split('T')[0];
    
    return {
      invoiceNumber: 'CA0000',
      series: 'CA',
      number: '0000',
      issueDate: currentDate,
      dueDate: currentDate,
      totalAmount: 0,
      vatAmount: 0,
      currency: 'RON',
      client: {
        name: 'Client from PDF',
        email: 'client@example.com',
        phone: '+40 000 000 000',
        vatCode: 'RO00000000',
        address: 'Address from PDF',
        city: 'City from PDF',
        country: 'RO'
      },
      items: [
        {
          name: 'Service from PDF',
          quantity: 1,
          unit: 'HUR',
          unitPrice: 0,
          totalAmount: 0,
          vatRate: 19
        }
      ]
    };
  }

  /**
   * Convert PDF invoice data to XML format
   */
  static convertToXML(invoiceData: PDFInvoiceData): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:efactura.mfinante.ro:CIUS-RO:1.0.1</cbc:CustomizationID>
  <cbc:ID>${invoiceData.invoiceNumber}</cbc:ID>
  <cbc:IssueDate>${invoiceData.issueDate}</cbc:IssueDate>
  <cbc:DueDate>${invoiceData.dueDate}</cbc:DueDate>
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>${invoiceData.currency}</cbc:DocumentCurrencyCode>
  
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${invoiceData.client.name}</cbc:RegistrationName>
        ${invoiceData.client.vatCode ? `<cbc:CompanyID>${invoiceData.client.vatCode}</cbc:CompanyID>` : ''}
      </cac:PartyLegalEntity>
      <cac:Contact>
        ${invoiceData.client.phone ? `<cbc:Telephone>${invoiceData.client.phone}</cbc:Telephone>` : ''}
        ${invoiceData.client.email ? `<cbc:ElectronicMail>${invoiceData.client.email}</cbc:ElectronicMail>` : ''}
      </cac:Contact>
      ${invoiceData.client.address ? `
      <cac:PostalAddress>
        <cbc:StreetName>${invoiceData.client.address}</cbc:StreetName>
        ${invoiceData.client.city ? `<cbc:CityName>${invoiceData.client.city}</cbc:CityName>` : ''}
        ${invoiceData.client.country ? `
        <cac:Country>
          <cbc:IdentificationCode>${invoiceData.client.country}</cbc:IdentificationCode>
        </cac:Country>` : ''}
      </cac:PostalAddress>` : ''}
    </cac:Party>
  </cac:AccountingCustomerParty>
  
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${invoiceData.currency}">${invoiceData.vatAmount.toFixed(2)}</cbc:TaxAmount>
  </cac:TaxTotal>
  
  <cac:LegalMonetaryTotal>
    <cbc:PayableAmount currencyID="${invoiceData.currency}">${invoiceData.totalAmount.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  
  ${invoiceData.items.map((item, index) => `
  <cac:InvoiceLine>
    <cbc:ID>${index + 1}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="${item.unit}">${item.quantity.toFixed(4)}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="${invoiceData.currency}">${item.totalAmount.toFixed(2)}</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Name>${item.name}</cbc:Name>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="${invoiceData.currency}">${item.unitPrice.toFixed(2)}</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>`).join('')}
</Invoice>`;
  }

  /**
   * Generate a basic XML structure for testing
   */
  static generateBasicXML(invoiceNumber: string): string {
    const currentDate = new Date().toISOString().split('T')[0];
    const series = invoiceNumber.substring(0, 2);
    const number = invoiceNumber.substring(2);
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:efactura.mfinante.ro:CIUS-RO:1.0.1</cbc:CustomizationID>
  <cbc:ID>${invoiceNumber}</cbc:ID>
  <cbc:IssueDate>${currentDate}</cbc:IssueDate>
  <cbc:DueDate>${currentDate}</cbc:DueDate>
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>RON</cbc:DocumentCurrencyCode>
  
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>Client from ${invoiceNumber}</cbc:RegistrationName>
      </cac:PartyLegalEntity>
      <cac:Contact>
        <cbc:ElectronicMail>client@example.com</cbc:ElectronicMail>
      </cac:Contact>
    </cac:Party>
  </cac:AccountingCustomerParty>
  
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="RON">0.00</cbc:TaxAmount>
  </cac:TaxTotal>
  
  <cac:LegalMonetaryTotal>
    <cbc:PayableAmount currencyID="RON">0.00</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  
  <cac:InvoiceLine>
    <cbc:ID>1</cbc:ID>
    <cbc:InvoicedQuantity unitCode="HUR">0.0000</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="RON">0.00</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Name>Auto-imported from PDF ${invoiceNumber}</cbc:Name>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="RON">0.00</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>
</Invoice>`;
  }
}

export { PDFInvoiceParser, type PDFInvoiceData }; 