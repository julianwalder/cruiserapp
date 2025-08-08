const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    this.transporter = null;
    this.fromEmail = process.env.EMAIL_FROM || 'noreply@cruiseraviation.com';
    this._initializeTransporter();
  }

  /**
   * Initialize email transporter
   */
  _initializeTransporter() {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpSecure = process.env.SMTP_SECURE === 'true';
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (smtpHost && smtpUser && smtpPass) {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort) || 587,
        secure: smtpSecure,
        auth: {
          user: smtpUser,
          pass: smtpPass
        }
      });

      logger.info('Email transporter initialized', { 
        host: smtpHost, 
        port: smtpPort,
        secure: smtpSecure,
        user: smtpUser
      });
    } else {
      logger.warn('SMTP configuration not found, email sending will be disabled');
    }
  }

  /**
   * Get the proper "From" address based on configuration
   */
  _getFromAddress() {
    const smtpUser = process.env.SMTP_USER;
    const fromEmail = process.env.EMAIL_FROM;
    
    // Always use display name format with "Cruiser Aviation"
    if (smtpUser) {
      return `"Cruiser Aviation" <${smtpUser}>`;
    }
    
    // Fallback to fromEmail if SMTP_USER is not set
    return fromEmail || this.fromEmail;
  }

  /**
   * Send invoice email
   */
  async sendInvoiceEmail(data) {
    try {
      if (!this.transporter) {
        logger.warn('Email transporter not available, skipping email send');
        return { success: false, error: 'Email service not configured' };
      }

      logger.info('Sending invoice email', { 
        to: data.to,
        invoiceId: data.invoiceId 
      });

      const emailContent = this._generateInvoiceEmailContent(data);
      const fromAddress = this._getFromAddress();

      const mailOptions = {
        from: fromAddress,
        to: data.to,
        subject: `Invoice ${data.invoiceNumber || data.invoiceId} - ${data.packageName}`,
        html: emailContent.html,
        text: emailContent.text,
        attachments: data.pdfData ? [
          {
            filename: data.pdfData.filename,
            content: data.pdfData.buffer,
            contentType: data.pdfData.mimeType
          }
        ] : []
      };

      const result = await this.transporter.sendMail(mailOptions);

      logger.info('Invoice email sent successfully', { 
        to: data.to,
        invoiceId: data.invoiceId,
        messageId: result.messageId,
        from: fromAddress
      });

      return {
        success: true,
        messageId: result.messageId
      };

    } catch (error) {
      logger.error('Failed to send invoice email', { 
        to: data.to,
        invoiceId: data.invoiceId,
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Send fiscal invoice email
   */
  async sendFiscalInvoiceEmail(data) {
    try {
      if (!this.transporter) {
        logger.warn('Email transporter not available, skipping email send');
        return { success: false, error: 'Email service not configured' };
      }

      logger.info('Sending fiscal invoice email', { 
        to: data.to,
        invoiceId: data.invoiceId 
      });

      const emailContent = this._generateFiscalInvoiceEmailContent(data);
      const fromAddress = this._getFromAddress();

      const mailOptions = {
        from: fromAddress,
        to: data.to,
        subject: `FISCAL INVOICE ${data.invoiceNumber || data.invoiceId} - ${data.packageName} (PAID)`,
        html: emailContent.html,
        text: emailContent.text,
        attachments: data.pdfData ? [
          {
            filename: `fiscal-${data.pdfData.filename}`,
            content: data.pdfData.buffer,
            contentType: data.pdfData.mimeType
          }
        ] : []
      };

      const result = await this.transporter.sendMail(mailOptions);

      logger.info('Fiscal invoice email sent successfully', { 
        to: data.to,
        invoiceId: data.invoiceId,
        messageId: result.messageId,
        from: fromAddress
      });

      return {
        success: true,
        messageId: result.messageId
      };

    } catch (error) {
      logger.error('Failed to send fiscal invoice email', {
        to: data.to,
        invoiceId: data.invoiceId,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * Generate invoice email content
   */
  _generateInvoiceEmailContent(data) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice ${data.invoiceNumber || data.invoiceId}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
          .invoice-details { background: #fff; border: 1px solid #ddd; padding: 20px; border-radius: 5px; }
          .amount { font-size: 24px; font-weight: bold; color: #28a745; }
          .button { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
          .vat-info { background: #f8f9fa; padding: 10px; border-radius: 3px; margin: 10px 0; }
          .currency-info { background: #e3f2fd; padding: 10px; border-radius: 3px; margin: 10px 0; border-left: 4px solid #2196f3; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Invoice ${data.invoiceNumber || data.invoiceId}</h1>
            <p>Thank you for your order with Cruiser Aviation!</p>
          </div>
          
          <div class="invoice-details">
            <h2>${data.packageName}</h2>
            
            ${data.subtotal !== undefined ? `
              <div class="vat-info">
                <p><strong>Subtotal:</strong> ${data.subtotal} ${data.currency.toUpperCase()}</p>
                <p><strong>VAT (${data.vatPercentage}%):</strong> ${data.vatAmount} ${data.currency.toUpperCase()}</p>
                <p><strong>Total Amount:</strong> <span class="amount">${data.totalPrice} ${data.currency.toUpperCase()}</span></p>
              </div>
            ` : `
              <p><strong>Amount:</strong> <span class="amount">${data.totalPrice} ${data.currency.toUpperCase()}</span></p>
            `}
            
            ${data.exchangeRateInfo && data.convertedAmounts ? `
              <div class="currency-info">
                <h3>Currency Conversion (${data.exchangeRateInfo.fromCurrency} → ${data.exchangeRateInfo.toCurrency})</h3>
                <p><strong>Exchange Rate:</strong> 1 ${data.exchangeRateInfo.fromCurrency} = ${data.exchangeRateInfo.rate} ${data.exchangeRateInfo.toCurrency}</p>
                <p><strong>Source:</strong> ${data.exchangeRateInfo.source} (${new Date(data.exchangeRateInfo.date).toLocaleDateString()})</p>
                <p><strong>Converted Subtotal:</strong> ${data.convertedAmounts.subtotal} ${data.exchangeRateInfo.toCurrency}</p>
                <p><strong>Converted VAT:</strong> ${data.convertedAmounts.vatAmount} ${data.exchangeRateInfo.toCurrency}</p>
                <p><strong>Converted Total:</strong> <span class="amount">${data.convertedAmounts.totalPrice} ${data.exchangeRateInfo.toCurrency}</span></p>
              </div>
            ` : ''}
            
            <p><strong>Invoice Number:</strong> ${data.invoiceNumber || data.invoiceId}</p>
            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            
            ${data.paymentUrl ? `
              <p><strong>Payment Link:</strong></p>
              <a href="${data.paymentUrl}" class="button">Pay Now</a>
            ` : ''}
            
            ${data.pdfData ? `
              <p><strong>Invoice PDF:</strong> Attached to this email</p>
            ` : ''}
          </div>
          
          <div class="footer">
            <p>This is an automated message from Cruiser Aviation.</p>
            <p>If you have any questions, please contact us at billing@cruiseraviation.com</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Invoice ${data.invoiceNumber || data.invoiceId}

Thank you for your order with Cruiser Aviation!

Package: ${data.packageName}
${data.subtotal !== undefined ? `
Subtotal: ${data.subtotal} ${data.currency.toUpperCase()}
VAT (${data.vatPercentage}%): ${data.vatAmount} ${data.currency.toUpperCase()}
Total Amount: ${data.totalPrice} ${data.currency.toUpperCase()}
` : `
Amount: ${data.totalPrice} ${data.currency.toUpperCase()}
`}
${data.exchangeRateInfo && data.convertedAmounts ? `

Currency Conversion (${data.exchangeRateInfo.fromCurrency} → ${data.exchangeRateInfo.toCurrency})
Exchange Rate: 1 ${data.exchangeRateInfo.fromCurrency} = ${data.exchangeRateInfo.rate} ${data.exchangeRateInfo.toCurrency}
Source: ${data.exchangeRateInfo.source} (${new Date(data.exchangeRateInfo.date).toLocaleDateString()})
Converted Subtotal: ${data.convertedAmounts.subtotal} ${data.exchangeRateInfo.toCurrency}
Converted VAT: ${data.convertedAmounts.vatAmount} ${data.exchangeRateInfo.toCurrency}
Converted Total: ${data.convertedAmounts.totalPrice} ${data.exchangeRateInfo.toCurrency}
` : ''}
Invoice Number: ${data.invoiceNumber || data.invoiceId}
Date: ${new Date().toLocaleDateString()}

${data.paymentUrl ? `Payment Link: ${data.paymentUrl}` : ''}
${data.pdfData ? `Invoice PDF: Attached to this email` : ''}

This is an automated message from Cruiser Aviation.
If you have any questions, please contact us at billing@cruiseraviation.com
    `;

    return { html, text };
  }

  /**
   * Send payment confirmation email
   */
  async sendPaymentConfirmationEmail(data) {
    try {
      if (!this.transporter) {
        logger.warn('Email transporter not available, skipping email send');
        return { success: false, error: 'Email service not configured' };
      }

      logger.info('Sending payment confirmation email', { 
        to: data.to,
        invoiceId: data.invoiceId 
      });

      const emailContent = this._generatePaymentConfirmationEmailContent(data);
      const fromAddress = this._getFromAddress();

      const mailOptions = {
        from: fromAddress,
        to: data.to,
        subject: `Payment Confirmed - Invoice ${data.invoiceId}`,
        html: emailContent.html,
        text: emailContent.text
      };

      const result = await this.transporter.sendMail(mailOptions);

      logger.info('Payment confirmation email sent successfully', { 
        to: data.to,
        invoiceId: data.invoiceId,
        messageId: result.messageId,
        from: fromAddress
      });

      return {
        success: true,
        messageId: result.messageId
      };

    } catch (error) {
      logger.error('Failed to send payment confirmation email', { 
        to: data.to,
        invoiceId: data.invoiceId,
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Generate fiscal invoice email content
   */
  _generateFiscalInvoiceEmailContent(data) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Fiscal Invoice ${data.invoiceNumber || data.invoiceId}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #d4edda; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
          .invoice-details { background: #fff; border: 1px solid #ddd; padding: 20px; border-radius: 5px; }
          .amount { font-size: 24px; font-weight: bold; color: #28a745; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
          .vat-info { background: #f8f9fa; padding: 10px; border-radius: 3px; margin: 10px 0; }
          .currency-info { background: #e3f2fd; padding: 10px; border-radius: 3px; margin: 10px 0; border-left: 4px solid #2196f3; }
          .paid-badge { background: #28a745; color: white; padding: 5px 10px; border-radius: 3px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>FISCAL INVOICE <span class="paid-badge">PAID</span></h1>
            <p>Your payment has been confirmed and your fiscal invoice is ready!</p>
          </div>
          
          <div class="invoice-details">
            <h2>${data.packageName}</h2>
            
            ${data.subtotal !== undefined ? `
              <div class="vat-info">
                <p><strong>Subtotal:</strong> ${data.subtotal} ${data.currency.toUpperCase()}</p>
                <p><strong>VAT (${data.vatPercentage}%):</strong> ${data.vatAmount} ${data.currency.toUpperCase()}</p>
                <p><strong>Total Amount:</strong> <span class="amount">${data.totalPrice} ${data.currency.toUpperCase()}</span></p>
              </div>
            ` : `
              <p><strong>Amount:</strong> <span class="amount">${data.totalPrice} ${data.currency.toUpperCase()}</span></p>
            `}
            
            ${data.exchangeRateInfo && data.convertedAmounts ? `
              <div class="currency-info">
                <h3>Currency Conversion (${data.exchangeRateInfo.fromCurrency} → ${data.exchangeRateInfo.toCurrency})</h3>
                <p><strong>Exchange Rate:</strong> 1 ${data.exchangeRateInfo.fromCurrency} = ${data.exchangeRateInfo.rate} ${data.exchangeRateInfo.toCurrency}</p>
                <p><strong>Source:</strong> ${data.exchangeRateInfo.source} (${new Date(data.exchangeRateInfo.date).toLocaleDateString()})</p>
                <p><strong>Converted Subtotal:</strong> ${data.convertedAmounts.subtotal} ${data.exchangeRateInfo.toCurrency}</p>
                <p><strong>Converted VAT:</strong> ${data.convertedAmounts.vatAmount} ${data.exchangeRateInfo.toCurrency}</p>
                <p><strong>Converted Total:</strong> <span class="amount">${data.convertedAmounts.totalPrice} ${data.exchangeRateInfo.toCurrency}</span></p>
              </div>
            ` : ''}
            
            <p><strong>Fiscal Invoice Number:</strong> ${data.invoiceNumber || data.invoiceId}</p>
            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            <p><strong>Status:</strong> <span class="paid-badge">PAID</span></p>
            
            ${data.pdfData ? `
              <p><strong>Fiscal Invoice PDF:</strong> Attached to this email</p>
            ` : ''}
          </div>
          
          <div class="footer">
            <p><strong>This is your official fiscal invoice for tax purposes.</strong></p>
            <p>This is an automated message from Cruiser Aviation.</p>
            <p>If you have any questions, please contact us at billing@cruiseraviation.com</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
FISCAL INVOICE ${data.invoiceNumber || data.invoiceId} - PAID

Your payment has been confirmed and your fiscal invoice is ready!

Package: ${data.packageName}
${data.subtotal !== undefined ? `
Subtotal: ${data.subtotal} ${data.currency.toUpperCase()}
VAT (${data.vatPercentage}%): ${data.vatAmount} ${data.currency.toUpperCase()}
Total Amount: ${data.totalPrice} ${data.currency.toUpperCase()}
` : `
Amount: ${data.totalPrice} ${data.currency.toUpperCase()}
`}
${data.exchangeRateInfo && data.convertedAmounts ? `
Currency Conversion (${data.exchangeRateInfo.fromCurrency} → ${data.exchangeRateInfo.toCurrency}):
Exchange Rate: 1 ${data.exchangeRateInfo.fromCurrency} = ${data.exchangeRateInfo.rate} ${data.exchangeRateInfo.toCurrency}
Source: ${data.exchangeRateInfo.source} (${new Date(data.exchangeRateInfo.date).toLocaleDateString()})
Converted Subtotal: ${data.convertedAmounts.subtotal} ${data.exchangeRateInfo.toCurrency}
Converted VAT: ${data.convertedAmounts.vatAmount} ${data.exchangeRateInfo.toCurrency}
Converted Total: ${data.convertedAmounts.totalPrice} ${data.exchangeRateInfo.toCurrency}
` : ''}

Fiscal Invoice Number: ${data.invoiceNumber || data.invoiceId}
Date: ${new Date().toLocaleDateString()}
Status: PAID

This is your official fiscal invoice for tax purposes.

This is an automated message from Cruiser Aviation.
If you have any questions, please contact us at billing@cruiseraviation.com
    `;

    return { html, text };
  }

  /**
   * Generate payment confirmation email content
   */
  _generatePaymentConfirmationEmailContent(data) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Payment Confirmed - Invoice ${data.invoiceId}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #d4edda; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
          .details { background: #fff; border: 1px solid #ddd; padding: 20px; border-radius: 5px; }
          .success { color: #155724; font-weight: bold; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 class="success">Payment Confirmed!</h1>
            <p>Your payment has been successfully processed.</p>
          </div>
          
          <div class="details">
            <h2>Invoice ${data.invoiceId}</h2>
            <p><strong>Amount Paid:</strong> ${data.amount} ${data.currency.toUpperCase()}</p>
            <p><strong>Payment Date:</strong> ${new Date().toLocaleDateString()}</p>
            <p><strong>Transaction ID:</strong> ${data.transactionId}</p>
            
            <p>Your flight hours package is now active and ready to use!</p>
          </div>
          
          <div class="footer">
            <p>This is an automated message from Cruiser Aviation.</p>
            <p>If you have any questions, please contact us at billing@cruiseraviation.com</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Payment Confirmed!

Your payment has been successfully processed.

Invoice: ${data.invoiceId}
Amount Paid: ${data.amount} ${data.currency.toUpperCase()}
Payment Date: ${new Date().toLocaleDateString()}
Transaction ID: ${data.transactionId}

Your flight hours package is now active and ready to use!

This is an automated message from Cruiser Aviation.
If you have any questions, please contact us at billing@cruiseraviation.com
    `;

    return { html, text };
  }

  /**
   * Test email configuration
   */
  async testEmailConfiguration() {
    try {
      if (!this.transporter) {
        return { success: false, error: 'Email service not configured' };
      }

      await this.transporter.verify();

      return {
        success: true,
        message: 'Email configuration is valid'
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new EmailService();
