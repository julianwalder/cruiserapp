const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

class PDFService {
  constructor() {
    this.uploadPath = process.env.UPLOAD_PATH || './uploads';
    this._ensureUploadDirectory();
  }

  /**
   * Ensure upload directory exists
   */
  _ensureUploadDirectory() {
    if (!fs.existsSync(this.uploadPath)) {
      fs.mkdirSync(this.uploadPath, { recursive: true });
      logger.info('Created upload directory', { path: this.uploadPath });
    }
  }

  /**
   * Generate invoice PDF
   */
  async generateInvoicePDF(invoice) {
    try {
      logger.info('Generating invoice PDF', { invoiceId: invoice.id });

      const doc = new PDFDocument({
        size: 'A4',
        margin: 50
      });

      const filename = `invoice-${invoice.invoiceNumber || invoice.id}.pdf`;
      const filepath = path.join(this.uploadPath, filename);
      const stream = fs.createWriteStream(filepath);

      doc.pipe(stream);

      // Add company header
      this._addCompanyHeader(doc);

      // Add invoice details
      this._addInvoiceDetails(doc, invoice);

      // Add client information
      this._addClientInformation(doc, invoice.userData);

      // Add invoice items
      this._addInvoiceItems(doc, invoice);

      // Add totals
      this._addTotals(doc, invoice);

      // Add footer
      this._addFooter(doc);

      doc.end();

      return new Promise((resolve, reject) => {
        stream.on('finish', () => {
          const pdfUrl = `/uploads/${filename}`;
          logger.info('Invoice PDF generated successfully', { 
            invoiceId: invoice.id, 
            filepath 
          });
          resolve(pdfUrl);
        });

        stream.on('error', (error) => {
          logger.error('Error generating PDF', { 
            invoiceId: invoice.id, 
            error: error.message 
          });
          reject(error);
        });
      });

    } catch (error) {
      logger.error('Failed to generate invoice PDF', { 
        invoiceId: invoice.id,
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Add company header to PDF
   */
  _addCompanyHeader(doc) {
    const companyName = process.env.COMPANY_NAME || 'Cruiser Aviation';
    const companyVatCode = process.env.COMPANY_VAT_CODE || 'RO12345678';
    const companyAddress = process.env.COMPANY_ADDRESS || '123 Aviation Street';
    const companyCity = process.env.COMPANY_CITY || 'Bucharest';
    const companyRegion = process.env.COMPANY_REGION || 'Bucharest';
    const companyCountry = process.env.COMPANY_COUNTRY || 'Romania';
    const companyEmail = process.env.COMPANY_EMAIL || 'billing@cruiseraviation.com';
    const companyWebsite = process.env.COMPANY_WEBSITE || 'https://cruiseraviation.com';

    // Company logo placeholder
    doc.fontSize(24)
       .font('Helvetica-Bold')
       .text(companyName, 50, 50);

    doc.fontSize(10)
       .font('Helvetica')
       .text(`VAT Code: ${companyVatCode}`, 50, 75)
       .text(companyAddress, 50, 90)
       .text(`${companyCity}, ${companyRegion}`, 50, 105)
       .text(companyCountry, 50, 120)
       .text(`Email: ${companyEmail}`, 50, 135)
       .text(`Website: ${companyWebsite}`, 50, 150);

    // Add line separator
    doc.moveTo(50, 170)
       .lineTo(550, 170)
       .stroke();
  }

  /**
   * Add invoice details to PDF
   */
  _addInvoiceDetails(doc, invoice) {
    const issueDate = new Date(invoice.createdAt).toLocaleDateString();
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString();

    // Determine invoice type and title
    let invoiceTitle = 'INVOICE';
    let invoiceTypeText = '';
    
    if (invoice.invoiceType === 'proforma') {
      invoiceTitle = 'PROFORMA INVOICE';
      invoiceTypeText = 'PROFORMA - NOT FOR TAX PURPOSES';
    } else if (invoice.invoiceType === 'fiscal') {
      invoiceTitle = 'FISCAL INVOICE';
      invoiceTypeText = 'FISCAL - TAX DOCUMENT';
    }

    doc.fontSize(20)
       .font('Helvetica-Bold')
       .text(invoiceTitle, 350, 50);

    if (invoiceTypeText) {
      doc.fontSize(8)
         .font('Helvetica')
         .text(invoiceTypeText, 350, 70);
    }

    doc.fontSize(10)
       .font('Helvetica')
       .text(`Invoice Number: ${invoice.invoiceNumber}`, 350, 85)
       .text(`Issue Date: ${issueDate}`, 350, 100)
       .text(`Due Date: ${dueDate}`, 350, 115)
       .text(`Payment Method: ${invoice.paymentMethod.toUpperCase()}`, 350, 130);

    // Add payment status for fiscal invoices
    if (invoice.invoiceType === 'fiscal' && invoice.paymentStatus === 'paid') {
      doc.fontSize(10)
         .font('Helvetica-Bold')
         .text('PAID', 350, 145)
         .font('Helvetica')
         .text(`Paid Date: ${new Date(invoice.paidAt).toLocaleDateString()}`, 350, 160);
    }
  }

  /**
   * Add client information to PDF
   */
  _addClientInformation(doc, userData) {
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('Bill To:', 50, 190);

    // Client name (first name + last name)
    const clientName = `${userData.firstName} ${userData.lastName}`;
    
    doc.fontSize(10)
       .font('Helvetica')
       .text(clientName, 50, 210);

    // CNP (always show, even if N/A)
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .text(`CNP: ${userData.cnp}`, 50, 225);

    // Address information
    if (userData.address) {
      doc.fontSize(10)
         .font('Helvetica')
         .text(userData.address, 50, 240);
    }

    // City, Region, Country
    const cityRegionCountry = [];
    if (userData.city) cityRegionCountry.push(userData.city);
    if (userData.region) cityRegionCountry.push(userData.region);
    if (userData.country) cityRegionCountry.push(userData.country);
    
    if (cityRegionCountry.length > 0) {
      doc.fontSize(10)
         .font('Helvetica')
         .text(cityRegionCountry.join(', '), 50, 255);
    }

    // Email
    if (userData.email) {
      doc.fontSize(10)
         .font('Helvetica')
         .text(`Email: ${userData.email}`, 50, 270);
    }

    // Company VAT code if available (for business clients)
    if (userData.companyVatCode) {
      doc.fontSize(10)
         .font('Helvetica')
         .text(`VAT Code: ${userData.companyVatCode}`, 50, 285);
    }
  }

  /**
   * Add invoice items to PDF
   */
  _addInvoiceItems(doc, invoice) {
    const startY = 340;

    // Table header
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .text('Description', 50, startY)
       .text('Quantity', 300, startY)
       .text('Unit Price', 400, startY)
       .text('Amount', 500, startY);

    // Add line separator
    doc.moveTo(50, startY + 15)
       .lineTo(550, startY + 15)
       .stroke();

    // Invoice item
    const itemY = startY + 30;
    const itemAmount = invoice.subtotal !== undefined ? invoice.subtotal : invoice.totalPrice;
    
    // Calculate unit price without VAT if prices include VAT
    let unitPrice = invoice.pricePerHour;
    if (invoice.pricesIncludeVat && invoice.vatPercentage) {
      unitPrice = invoice.pricePerHour / (1 + invoice.vatPercentage / 100);
    }
    
    doc.fontSize(10)
       .font('Helvetica')
       .text(invoice.packageName, 50, itemY)
       .text(`${invoice.hours} hours`, 300, itemY)
       .text(`${unitPrice.toFixed(2)} ${invoice.currency}`, 400, itemY)
       .text(`${itemAmount.toFixed(2)} ${invoice.currency}`, 500, itemY);

    // Add line separator
    doc.moveTo(50, itemY + 15)
       .lineTo(550, itemY + 15)
       .stroke();
  }

  /**
   * Add totals to PDF
   */
  _addTotals(doc, invoice) {
    const startY = 470;

    if (invoice.subtotal !== undefined && invoice.vatAmount !== undefined) {
      // Subtotal
      doc.fontSize(10)
         .font('Helvetica')
         .text('Subtotal:', 400, startY)
         .font('Helvetica-Bold')
         .text(`${invoice.subtotal.toFixed(2)} ${invoice.currency}`, 500, startY);

      // VAT
      doc.fontSize(10)
         .font('Helvetica')
         .text(`VAT (${invoice.vatPercentage}%):`, 400, startY + 20)
         .font('Helvetica-Bold')
         .text(`${invoice.vatAmount.toFixed(2)} ${invoice.currency}`, 500, startY + 20);

      // Total
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text('Total:', 400, startY + 40)
         .text(`${invoice.totalPrice.toFixed(2)} ${invoice.currency}`, 500, startY + 40);

      // Currency conversion info if available
      if (invoice.exchangeRateInfo && invoice.convertedAmounts) {
        const convY = startY + 70;
        
        doc.fontSize(8)
           .font('Helvetica')
           .text('Currency Conversion:', 400, convY)
           .text(`${invoice.exchangeRateInfo.fromCurrency} → ${invoice.exchangeRateInfo.toCurrency}`, 400, convY + 12)
           .text(`Rate: 1 ${invoice.exchangeRateInfo.fromCurrency} = ${invoice.exchangeRateInfo.rate} ${invoice.exchangeRateInfo.toCurrency}`, 400, convY + 24)
           .text(`Source: ${invoice.exchangeRateInfo.source}`, 400, convY + 36);

        doc.fontSize(10)
           .font('Helvetica-Bold')
           .text('Converted Total:', 400, convY + 50)
           .text(`${invoice.convertedAmounts.totalPrice.toFixed(2)} ${invoice.exchangeRateInfo.toCurrency}`, 500, convY + 50);
      }
    } else {
      // Simple total (no VAT breakdown)
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text('Total:', 400, startY + 20)
         .text(`${invoice.totalPrice.toFixed(2)} ${invoice.currency}`, 500, startY + 20);
    }

    // Add line separator
    const separatorY = invoice.exchangeRateInfo ? startY + 80 : startY + 50;
    doc.moveTo(400, separatorY)
       .lineTo(550, separatorY)
       .stroke();
  }

  /**
   * Add footer to PDF
   */
  _addFooter(doc) {
    const footerY = 700;

    doc.fontSize(8)
       .font('Helvetica')
       .text('Thank you for your business!', 50, footerY)
       .text('Payment is due within 30 days of invoice date.', 50, footerY + 15)
       .text('For questions about this invoice, please contact billing@cruiseraviation.com', 50, footerY + 30);
  }

  /**
   * Get PDF file path
   */
  getPDFFilePath(invoiceId) {
    const filename = `invoice-${invoiceId}.pdf`;
    return path.join(this.uploadPath, filename);
  }

  /**
   * Check if PDF exists
   */
  pdfExists(invoiceId) {
    const filepath = this.getPDFFilePath(invoiceId);
    return fs.existsSync(filepath);
  }

  /**
   * Delete PDF file
   */
  deletePDF(invoiceId) {
    try {
      const filepath = this.getPDFFilePath(invoiceId);
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
        logger.info('PDF file deleted', { invoiceId, filepath });
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Failed to delete PDF file', { 
        invoiceId, 
        error: error.message 
      });
      return false;
    }
  }
}

module.exports = new PDFService();
