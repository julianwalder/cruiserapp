const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const PaymentService = require('./paymentService');
const EmailService = require('./emailService');
const PDFService = require('./pdfService');
const ExchangeRateService = require('./exchangeRateService');
const SupabaseService = require('./supabaseService');

// In-memory storage for invoices (in production, use a database)
const invoices = new Map();

// Invoice counters for sequential numbering (fallback to in-memory if Supabase not available)
let proformaInvoiceCounter = parseInt(process.env.PROFORMA_INVOICE_START_NUMBER) || 1000;
let fiscalInvoiceCounter = parseInt(process.env.FISCAL_INVOICE_START_NUMBER) || 1000;

// Initialize counters from Supabase on startup
(async () => {
  try {
    if (SupabaseService.isAvailable()) {
      await SupabaseService.initializeCounters();
      
      // Load current counters from Supabase
      const proformaCounter = await SupabaseService.getInvoiceCounter('PROF');
      const fiscalCounter = await SupabaseService.getInvoiceCounter('FISC');
      
      if (proformaCounter) {
        proformaInvoiceCounter = proformaCounter.currentCounter;
        logger.info('Loaded proforma counter from Supabase', { counter: proformaInvoiceCounter });
      }
      
      if (fiscalCounter) {
        fiscalInvoiceCounter = fiscalCounter.currentCounter;
        logger.info('Loaded fiscal counter from Supabase', { counter: fiscalInvoiceCounter });
      }
    }
  } catch (error) {
    logger.error('Error initializing counters from Supabase', { error: error.message });
  }
})();

class InvoiceService {
  /**
   * Issue a proforma invoice
   */
  static async issueProformaInvoice(data) {
    try {
      logger.info('Starting proforma invoice generation', {
        userId: data.userId,
        packageId: data.packageId
      });

      // Generate invoice ID
      const invoiceId = uuidv4();
      const microserviceId = uuidv4();

      // Get VAT configuration
      const vatPercentage = data.vatPercentage || parseFloat(process.env.VAT_PERCENTAGE) || 19;
      const pricesIncludeVat = data.pricesIncludeVat !== undefined ? data.pricesIncludeVat : (process.env.PRICES_INCLUDE_VAT === 'true');
      
      // Calculate VAT amounts
      let subtotal, vatAmount, totalWithVat;
      
      if (pricesIncludeVat) {
        // Prices include VAT, so we need to extract VAT
        totalWithVat = data.totalPrice;
        subtotal = totalWithVat / (1 + vatPercentage / 100);
        vatAmount = totalWithVat - subtotal;
      } else {
        // Prices don't include VAT, so we need to add VAT
        subtotal = data.totalPrice;
        vatAmount = subtotal * (vatPercentage / 100);
        totalWithVat = subtotal + vatAmount;
      }

      // Handle currency conversion if requested
      let exchangeRateInfo = null;
      let convertedAmounts = null;
      
      if (data.convertToRON && data.currency !== 'RON') {
        try {
          logger.info('Converting currency to RON', { 
            fromCurrency: data.currency, 
            toCurrency: data.targetCurrency || 'RON' 
          });

          // Get exchange rate info
          exchangeRateInfo = await ExchangeRateService.getInvoiceExchangeRateInfo(
            data.currency, 
            data.targetCurrency || 'RON'
          );

          if (exchangeRateInfo) {
            // Convert all amounts
            const convertedSubtotal = await ExchangeRateService.convertCurrency(
              subtotal, 
              data.currency, 
              data.targetCurrency || 'RON'
            );
            
            const convertedVatAmount = await ExchangeRateService.convertCurrency(
              vatAmount, 
              data.currency, 
              data.targetCurrency || 'RON'
            );
            
            const convertedTotal = await ExchangeRateService.convertCurrency(
              totalWithVat, 
              data.currency, 
              data.targetCurrency || 'RON'
            );

            convertedAmounts = {
              subtotal: convertedSubtotal,
              vatAmount: convertedVatAmount,
              totalPrice: convertedTotal
            };

            logger.info('Currency conversion completed', {
              originalCurrency: data.currency,
              targetCurrency: data.targetCurrency || 'RON',
              exchangeRate: exchangeRateInfo.rate,
              originalSubtotal: subtotal,
              convertedSubtotal: convertedSubtotal,
              originalVatAmount: vatAmount,
              convertedVatAmount: convertedVatAmount,
              originalTotal: totalWithVat,
              convertedTotal: convertedTotal
            });
          }
        } catch (conversionError) {
          logger.error('Currency conversion failed, using original amounts', { 
            error: conversionError.message,
            originalCurrency: data.currency
          });
          // Continue with original amounts if conversion fails
        }
      }

      // Create invoice record
      const invoice = {
        id: invoiceId,
        microserviceId,
        userId: data.userId,
        packageId: data.packageId,
        packageName: data.packageName,
        hours: data.hours,
        pricePerHour: data.pricePerHour,
        subtotal: Math.round(subtotal * 100) / 100,
        vatPercentage: vatPercentage,
        vatAmount: Math.round(vatAmount * 100) / 100,
        totalPrice: Math.round(totalWithVat * 100) / 100,
        pricesIncludeVat: pricesIncludeVat,
        currency: data.currency,
        validityDays: data.validityDays,
        userData: data.userData,
        paymentMethod: data.paymentMethod,
        paymentLink: data.paymentLink,
        invoiceType: 'proforma',
        status: 'issued',
        paymentStatus: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        paymentUrl: null,
        pdfUrl: null,
        invoiceNumber: await this._generateInvoiceNumber(process.env.PROFORMA_INVOICE_SERIES || 'PROF'),
        exchangeRateInfo: exchangeRateInfo,
        convertedAmounts: convertedAmounts
      };

      // Store invoice
      invoices.set(invoiceId, invoice);

      // Generate payment link if requested
      let paymentUrl = null;
      if (data.paymentLink) {
        try {
          // Use converted total if available, otherwise use original total
          const paymentAmount = convertedAmounts ? convertedAmounts.totalPrice : invoice.totalPrice;
          const paymentCurrency = convertedAmounts ? (data.targetCurrency || 'RON') : data.currency;

          paymentUrl = await PaymentService.generatePaymentLink({
            invoiceId,
            amount: paymentAmount,
            currency: paymentCurrency,
            description: `${data.packageName} - ${data.hours} hours`,
            userEmail: data.userData.email
          });

          invoice.paymentUrl = paymentUrl;
          logger.info('Payment link generated', { invoiceId, paymentUrl });

        } catch (paymentError) {
          logger.error('Payment link generation failed', {
            invoiceId,
            error: paymentError.message
          });
        }
      }

      // Generate PDF invoice
      let pdfData = null;
      try {
        pdfData = await PDFService.generateInvoicePDF(invoice);
        logger.info('PDF invoice generated', { invoiceId, filename: pdfData.filename });

      } catch (pdfError) {
        logger.error('PDF generation failed', {
          invoiceId,
          error: pdfError.message
        });
      }

      // Send email notification
      try {
        await EmailService.sendInvoiceEmail({
          to: data.userData.email,
          invoiceId,
          invoiceNumber: invoice.invoiceNumber,
          packageName: data.packageName,
          subtotal: invoice.subtotal,
          vatPercentage: invoice.vatPercentage,
          vatAmount: invoice.vatAmount,
          totalPrice: invoice.totalPrice,
          currency: data.currency,
          paymentUrl,
          pdfData: pdfData,
          exchangeRateInfo: exchangeRateInfo,
          convertedAmounts: convertedAmounts
        });

        logger.info('Invoice email sent', { invoiceId, email: data.userData.email });

      } catch (emailError) {
        logger.error('Email sending failed', {
          invoiceId,
          error: emailError.message
        });
      }

      // Update stored invoice
      invoices.set(invoiceId, invoice);

      logger.info('Proforma invoice generation completed', {
        invoiceId,
        status: invoice.status
      });

      return {
        success: true,
        data: {
          invoiceId,
          microserviceId,
          invoiceNumber: invoice.invoiceNumber,
          subtotal: invoice.subtotal,
          vatPercentage: invoice.vatPercentage,
          vatAmount: invoice.vatAmount,
          totalPrice: invoice.totalPrice,
          currency: data.currency,
          paymentLink: paymentUrl,
          status: invoice.status,
          message: 'Proforma invoice generated successfully',
          exchangeRateInfo: exchangeRateInfo,
          convertedAmounts: convertedAmounts
        }
      };

    } catch (error) {
      logger.error('Error in issueProformaInvoice', {
        error: error.message,
        stack: error.stack,
        userId: data.userId
      });
      throw error;
    }
  }

  /**
   * Generate a unique invoice number
   */
  static async _generateInvoiceNumber(series = null) {
    const defaultSeries = series || process.env.PROFORMA_INVOICE_SERIES || 'PROF';
    
    // Try to use Supabase for counter persistence
    if (SupabaseService.isAvailable()) {
      try {
        const counter = await SupabaseService.incrementInvoiceCounter(defaultSeries);
        if (counter) {
          logger.info('Generated invoice number using Supabase', { 
            series: defaultSeries, 
            number: counter.currentCounter 
          });
          return `${defaultSeries}-${counter.currentCounter}`;
        }
      } catch (error) {
        logger.error('Error generating invoice number with Supabase, falling back to in-memory', { 
          series: defaultSeries, 
          error: error.message 
        });
      }
    }
    
    // Fallback to in-memory counters
    let invoiceNumber;
    if (defaultSeries === (process.env.PROFORMA_INVOICE_SERIES || 'PROF')) {
      invoiceNumber = proformaInvoiceCounter++;
    } else if (defaultSeries === (process.env.FISCAL_INVOICE_SERIES || 'FISC')) {
      invoiceNumber = fiscalInvoiceCounter++;
    } else {
      // Fallback to timestamp-based numbering
      const timestamp = Date.now().toString().slice(-8);
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      return `${defaultSeries}-${timestamp}-${random}`;
    }
    
    logger.info('Generated invoice number using in-memory counter', { 
      series: defaultSeries, 
      number: invoiceNumber 
    });
    
    return `${defaultSeries}-${invoiceNumber}`;
  }

  /**
   * Get invoice status
   */
  static async getInvoiceStatus(invoiceId) {
    const invoice = invoices.get(invoiceId);

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    return {
      status: invoice.status,
      message: `Invoice is ${invoice.status}`,
      updatedAt: invoice.updatedAt
    };
  }

  /**
   * Get invoice details
   */
  static async getInvoiceDetails(invoiceId) {
    const invoice = invoices.get(invoiceId);

    if (!invoice) {
      return null;
    }

    return {
      id: invoice.id,
      microserviceId: invoice.microserviceId,
      invoiceNumber: invoice.invoiceNumber,
      userId: invoice.userId,
      packageId: invoice.packageId,
      packageName: invoice.packageName,
      hours: invoice.hours,
      pricePerHour: invoice.pricePerHour,
      subtotal: invoice.subtotal,
      vatPercentage: invoice.vatPercentage,
      vatAmount: invoice.vatAmount,
      totalPrice: invoice.totalPrice,
      pricesIncludeVat: invoice.pricesIncludeVat,
      currency: invoice.currency,
      validityDays: invoice.validityDays,
      userData: invoice.userData,
      paymentMethod: invoice.paymentMethod,
      status: invoice.status,
      paymentUrl: invoice.paymentUrl,
      pdfUrl: invoice.pdfUrl,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
      exchangeRateInfo: invoice.exchangeRateInfo,
      convertedAmounts: invoice.convertedAmounts
    };
  }

  /**
   * Cancel an invoice
   */
  static async cancelInvoice(invoiceId, reason) {
    const invoice = invoices.get(invoiceId);

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (invoice.status === 'cancelled') {
      throw new Error('Invoice is already cancelled');
    }

    // Update invoice status
    invoice.status = 'cancelled';
    invoice.cancelledAt = new Date().toISOString();
    invoice.cancellationReason = reason;
    invoice.updatedAt = new Date().toISOString();

    invoices.set(invoiceId, invoice);

    logger.info('Invoice cancelled', { invoiceId, reason });

    return {
      success: true,
      data: {
        invoiceId,
        status: 'cancelled',
        message: 'Invoice cancelled successfully'
      }
    };
  }

  /**
   * Get all invoices (for admin purposes)
   */
  static async getAllInvoices(limit = 100, offset = 0) {
    const invoiceArray = Array.from(invoices.values());
    return invoiceArray
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(offset, offset + limit);
  }

  /**
   * Mark invoice as paid and generate fiscal invoice
   */
  static async markInvoiceAsPaid(invoiceId, paymentDetails = {}) {
    const invoice = invoices.get(invoiceId);

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (invoice.paymentStatus === 'paid') {
      throw new Error('Invoice is already marked as paid');
    }

    if (invoice.invoiceType !== 'proforma') {
      throw new Error('Only proforma invoices can be marked as paid');
    }

    // Update proforma invoice payment status
    invoice.paymentStatus = 'paid';
    invoice.paidAt = new Date().toISOString();
    invoice.paymentDetails = paymentDetails;
    invoice.updatedAt = new Date().toISOString();

    invoices.set(invoiceId, invoice);

    logger.info('Proforma invoice marked as paid', { invoiceId, paymentDetails });

    // Generate fiscal invoice
    const fiscalInvoice = await this._generateFiscalInvoice(invoice);

    return {
      success: true,
      data: {
        proformaInvoiceId: invoiceId,
        fiscalInvoiceId: fiscalInvoice.id,
        fiscalInvoiceNumber: fiscalInvoice.invoiceNumber,
        message: 'Proforma invoice marked as paid and fiscal invoice generated'
      }
    };
  }

  /**
   * Generate fiscal invoice from proforma invoice
   */
  static async _generateFiscalInvoice(proformaInvoice) {
    try {
      logger.info('Generating fiscal invoice from proforma', { 
        proformaInvoiceId: proformaInvoice.id 
      });

      // Generate fiscal invoice ID
      const fiscalInvoiceId = uuidv4();
      const microserviceId = uuidv4();

      // Create fiscal invoice record
      const fiscalInvoice = {
        id: fiscalInvoiceId,
        microserviceId,
        proformaInvoiceId: proformaInvoice.id,
        userId: proformaInvoice.userId,
        packageId: proformaInvoice.packageId,
        packageName: proformaInvoice.packageName,
        hours: proformaInvoice.hours,
        pricePerHour: proformaInvoice.pricePerHour,
        subtotal: proformaInvoice.subtotal,
        vatPercentage: proformaInvoice.vatPercentage,
        vatAmount: proformaInvoice.vatAmount,
        totalPrice: proformaInvoice.totalPrice,
        pricesIncludeVat: proformaInvoice.pricesIncludeVat,
        currency: proformaInvoice.currency,
        validityDays: proformaInvoice.validityDays,
        userData: proformaInvoice.userData,
        paymentMethod: proformaInvoice.paymentMethod,
        invoiceType: 'fiscal',
        status: 'issued',
        paymentStatus: 'paid',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        paidAt: new Date().toISOString(),
        paymentUrl: null,
        pdfUrl: null,
        invoiceNumber: await this._generateInvoiceNumber(process.env.FISCAL_INVOICE_SERIES || 'FISC'),
        exchangeRateInfo: proformaInvoice.exchangeRateInfo,
        convertedAmounts: proformaInvoice.convertedAmounts
      };

      // Store fiscal invoice
      invoices.set(fiscalInvoiceId, fiscalInvoice);

      // Generate PDF fiscal invoice
      let fiscalPdfData = null;
      try {
        fiscalPdfData = await PDFService.generateInvoicePDF(fiscalInvoice);
        logger.info('PDF fiscal invoice generated', { fiscalInvoiceId, filename: fiscalPdfData.filename });

      } catch (pdfError) {
        logger.error('PDF fiscal invoice generation failed', {
          fiscalInvoiceId,
          error: pdfError.message
        });
      }

      // Send fiscal invoice email
      try {
        await EmailService.sendFiscalInvoiceEmail({
          to: proformaInvoice.userData.email,
          invoiceId: fiscalInvoiceId,
          invoiceNumber: fiscalInvoice.invoiceNumber,
          packageName: proformaInvoice.packageName,
          subtotal: fiscalInvoice.subtotal,
          vatPercentage: fiscalInvoice.vatPercentage,
          vatAmount: fiscalInvoice.vatAmount,
          totalPrice: fiscalInvoice.totalPrice,
          currency: proformaInvoice.currency,
          pdfData: fiscalPdfData,
          exchangeRateInfo: proformaInvoice.exchangeRateInfo,
          convertedAmounts: proformaInvoice.convertedAmounts
        });

        logger.info('Fiscal invoice email sent', { 
          fiscalInvoiceId, 
          email: proformaInvoice.userData.email 
        });

      } catch (emailError) {
        logger.error('Fiscal invoice email failed', {
          fiscalInvoiceId,
          error: emailError.message
        });
      }

      logger.info('Fiscal invoice generated successfully', { 
        fiscalInvoiceId, 
        invoiceNumber: fiscalInvoice.invoiceNumber 
      });

      return fiscalInvoice;

    } catch (error) {
      logger.error('Fiscal invoice generation failed', {
        proformaInvoiceId: proformaInvoice.id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get invoice by type
   */
  static async getInvoicesByType(type, limit = 100, offset = 0) {
    const allInvoices = Array.from(invoices.values());
    const filteredInvoices = allInvoices.filter(invoice => invoice.invoiceType === type);
    const paginatedInvoices = filteredInvoices.slice(offset, offset + limit);
    
    return {
      invoices: paginatedInvoices,
      total: filteredInvoices.length,
      limit,
      offset
    };
  }

  /**
   * Get invoice by payment status
   */
  static async getInvoicesByPaymentStatus(status, limit = 100, offset = 0) {
    const allInvoices = Array.from(invoices.values());
    const filteredInvoices = allInvoices.filter(invoice => invoice.paymentStatus === status);
    const paginatedInvoices = filteredInvoices.slice(offset, offset + limit);
    
    return {
      invoices: filteredInvoices,
      total: filteredInvoices.length,
      limit,
      offset
    };
  }

  /**
   * Get invoice counters
   */
  static async getInvoiceCounters() {
    // Try to get counters from Supabase first
    if (SupabaseService.isAvailable()) {
      try {
        const supabaseCounters = await SupabaseService.getAllInvoiceCounters();
        if (supabaseCounters) {
          return supabaseCounters;
        }
      } catch (error) {
        logger.error('Error getting counters from Supabase, falling back to in-memory', { 
          error: error.message 
        });
      }
    }
    
    // Fallback to in-memory counters
    return {
      proforma: {
        series: process.env.PROFORMA_INVOICE_SERIES || 'PROF',
        currentCounter: proformaInvoiceCounter,
        startNumber: parseInt(process.env.PROFORMA_INVOICE_START_NUMBER) || 1000
      },
      fiscal: {
        series: process.env.FISCAL_INVOICE_SERIES || 'FISC',
        currentCounter: fiscalInvoiceCounter,
        startNumber: parseInt(process.env.FISCAL_INVOICE_START_NUMBER) || 1000
      }
    };
  }
}

module.exports = InvoiceService;
