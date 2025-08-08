const logger = require('../utils/logger');

class PaymentService {
  constructor() {
    this.paymentGatewayUrl = process.env.PAYMENT_GATEWAY_URL;
    this.paymentGatewayKey = process.env.PAYMENT_GATEWAY_KEY;
  }

  /**
   * Generate a payment link for an invoice
   */
  async generatePaymentLink(data) {
    try {
      logger.info('Generating payment link', { 
        invoiceId: data.invoiceId,
        amount: data.amount,
        currency: data.currency 
      });

      // For demo purposes, we'll create a mock payment link
      // In production, integrate with a real payment gateway like Stripe, PayPal, etc.
      
      if (this.paymentGatewayUrl && this.paymentGatewayKey) {
        return await this._generateRealPaymentLink(data);
      } else {
        return await this._generateMockPaymentLink(data);
      }

    } catch (error) {
      logger.error('Payment link generation failed', { 
        invoiceId: data.invoiceId,
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Generate a real payment link using payment gateway
   */
  async _generateRealPaymentLink(data) {
    // Example integration with a payment gateway
    // This is a placeholder - replace with actual payment gateway integration
    
    const paymentData = {
      amount: data.amount * 100, // Convert to cents
      currency: data.currency.toLowerCase(),
      description: data.description,
      customer_email: data.userEmail,
      metadata: {
        invoice_id: data.invoiceId
      },
      success_url: `${process.env.FRONTEND_URL}/payment/success?invoice_id=${data.invoiceId}`,
      cancel_url: `${process.env.FRONTEND_URL}/payment/cancel?invoice_id=${data.invoiceId}`
    };

    // Make API call to payment gateway
    // const response = await axios.post(`${this.paymentGatewayUrl}/payment-links`, paymentData, {
    //   headers: {
    //     'Authorization': `Bearer ${this.paymentGatewayKey}`,
    //     'Content-Type': 'application/json'
    //   }
    // });

    // return response.data.url;

    // For now, return a mock URL
    return `https://payment.example.com/pay/${data.invoiceId}?amount=${data.amount}&currency=${data.currency}`;
  }

  /**
   * Generate a mock payment link for demo purposes
   */
  async _generateMockPaymentLink(data) {
    const mockPaymentUrl = `https://mock-payment.example.com/pay/${data.invoiceId}`;
    
    logger.info('Mock payment link generated', { 
      invoiceId: data.invoiceId,
      paymentUrl: mockPaymentUrl 
    });

    return mockPaymentUrl;
  }

  /**
   * Process payment webhook
   */
  async processPaymentWebhook(webhookData) {
    try {
      logger.info('Processing payment webhook', { 
        paymentId: webhookData.payment_id,
        status: webhookData.status 
      });

      // Verify webhook signature
      if (!this._verifyWebhookSignature(webhookData)) {
        throw new Error('Invalid webhook signature');
      }

      // Process payment status
      const paymentStatus = webhookData.status;
      const invoiceId = webhookData.metadata?.invoice_id;

      if (!invoiceId) {
        throw new Error('Invoice ID not found in webhook data');
      }

      // Update invoice status based on payment
      if (paymentStatus === 'succeeded') {
        // Payment successful
        logger.info('Payment successful', { invoiceId, paymentId: webhookData.payment_id });
        return {
          success: true,
          invoiceId,
          status: 'paid',
          message: 'Payment processed successfully'
        };
      } else if (paymentStatus === 'failed') {
        // Payment failed
        logger.warn('Payment failed', { invoiceId, paymentId: webhookData.payment_id });
        return {
          success: false,
          invoiceId,
          status: 'payment_failed',
          message: 'Payment failed'
        };
      } else {
        // Other status (pending, etc.)
        logger.info('Payment status update', { 
          invoiceId, 
          paymentId: webhookData.payment_id,
          status: paymentStatus 
        });
        return {
          success: true,
          invoiceId,
          status: paymentStatus,
          message: `Payment status: ${paymentStatus}`
        };
      }

    } catch (error) {
      logger.error('Payment webhook processing failed', { 
        error: error.message,
        webhookData 
      });
      throw error;
    }
  }

  /**
   * Verify webhook signature
   */
  _verifyWebhookSignature(webhookData) {
    // Implement webhook signature verification
    // This is a placeholder - replace with actual signature verification
    
    if (!this.paymentGatewayKey) {
      logger.warn('Payment gateway key not configured, skipping signature verification');
      return true; // Skip verification in demo mode
    }

    // Example signature verification
    // const signature = req.headers['x-signature'];
    // const expectedSignature = crypto
    //   .createHmac('sha256', this.paymentGatewayKey)
    //   .update(JSON.stringify(webhookData))
    //   .digest('hex');
    
    // return signature === expectedSignature;

    return true; // For demo purposes
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(paymentId) {
    try {
      logger.info('Getting payment status', { paymentId });

      if (this.paymentGatewayUrl && this.paymentGatewayKey) {
        // Make API call to payment gateway
        // const response = await axios.get(`${this.paymentGatewayUrl}/payments/${paymentId}`, {
        //   headers: {
        //     'Authorization': `Bearer ${this.paymentGatewayKey}`
        //   }
        // });
        // return response.data;

        // For now, return mock data
        return {
          id: paymentId,
          status: 'succeeded',
          amount: 150000, // in cents
          currency: 'eur',
          created_at: new Date().toISOString()
        };
      } else {
        // Return mock status
        return {
          id: paymentId,
          status: 'succeeded',
          amount: 150000,
          currency: 'eur',
          created_at: new Date().toISOString()
        };
      }

    } catch (error) {
      logger.error('Failed to get payment status', { 
        paymentId,
        error: error.message 
      });
      throw error;
    }
  }
}

module.exports = new PaymentService();
