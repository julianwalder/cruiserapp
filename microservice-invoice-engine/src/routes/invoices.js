const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const InvoiceService = require('../services/invoiceService');
const ExchangeRateService = require('../services/exchangeRateService');
const { authenticateApiKey } = require('../middleware/auth');

/**
 * GET /api/invoices/counters
 * Get invoice counters
 */
router.get('/counters', authenticateApiKey, async (req, res, next) => {
  try {
    logger.info('Invoice counters requested');

    const counters = await InvoiceService.getInvoiceCounters();

    res.status(200).json({
      success: true,
      data: counters
    });

  } catch (error) {
    logger.error('Error getting invoice counters', { 
      error: error.message, 
      stack: error.stack 
    });
    next(error);
  }
});

/**
 * GET /api/invoices/exchange-rates
 * Get current exchange rates
 */
router.get('/exchange-rates', authenticateApiKey, async (req, res, next) => {
  try {
    const { from, to } = req.query;
    
    if (!from || !to) {
      return res.status(400).json({
        success: false,
        error: 'Both "from" and "to" currency parameters are required'
      });
    }

    logger.info('Exchange rate requested', { from, to });

    const rate = await ExchangeRateService.getExchangeRate(from, to);
    
    if (rate === null) {
      return res.status(400).json({
        success: false,
        error: `Unsupported currency conversion: ${from} to ${to}`
      });
    }

    const cacheStatus = ExchangeRateService.getCacheStatus();

    res.status(200).json({
      success: true,
      data: {
        fromCurrency: from,
        toCurrency: to,
        rate: rate,
        source: 'BNR',
        date: cacheStatus.lastUpdate,
        isCached: cacheStatus.shouldUseCached
      }
    });

  } catch (error) {
    logger.error('Error getting exchange rate', { 
      error: error.message, 
      stack: error.stack 
    });
    next(error);
  }
});

/**
 * GET /api/invoices/exchange-rates/cache
 * Get exchange rate cache status
 */
router.get('/exchange-rates/cache', authenticateApiKey, async (req, res, next) => {
  try {
    const cacheStatus = ExchangeRateService.getCacheStatus();

    res.status(200).json({
      success: true,
      data: cacheStatus
    });

  } catch (error) {
    logger.error('Error getting cache status', { 
      error: error.message, 
      stack: error.stack 
    });
    next(error);
  }
});

/**
 * POST /api/invoices/exchange-rates/cache/clear
 * Clear exchange rate cache
 */
router.post('/exchange-rates/cache/clear', authenticateApiKey, async (req, res, next) => {
  try {
    ExchangeRateService.clearCache();

    res.status(200).json({
      success: true,
      message: 'Exchange rate cache cleared successfully'
    });

  } catch (error) {
    logger.error('Error clearing cache', { 
      error: error.message, 
      stack: error.stack 
    });
    next(error);
  }
});

/**
 * GET /api/invoices/:id/status
 * Get invoice status
 */
router.get('/:id/status', authenticateApiKey, async (req, res, next) => {
  try {
    const { id } = req.params;
    
    logger.info('Invoice status requested', { invoiceId: id });

    const status = await InvoiceService.getInvoiceStatus(id);

    res.status(200).json({
      success: true,
      data: status
    });

  } catch (error) {
    logger.error('Error getting invoice status', { 
      error: error.message, 
      stack: error.stack 
    });
    next(error);
  }
});

/**
 * GET /api/invoices/:id
 * Get invoice details
 */
router.get('/:id', authenticateApiKey, async (req, res, next) => {
  try {
    const { id } = req.params;
    
    logger.info('Invoice details requested', { invoiceId: id });

    const invoice = await InvoiceService.getInvoiceDetails(id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found'
      });
    }

    res.status(200).json({
      success: true,
      data: invoice
    });

  } catch (error) {
    logger.error('Error getting invoice details', { 
      error: error.message, 
      stack: error.stack 
    });
    next(error);
  }
});

/**
 * POST /api/invoices/:id/cancel
 * Cancel an invoice
 */
router.post('/:id/cancel', authenticateApiKey, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    logger.info('Invoice cancellation requested', { invoiceId: id, reason });

    const result = await InvoiceService.cancelInvoice(id, reason);

    res.status(200).json(result);

  } catch (error) {
    logger.error('Error cancelling invoice', { 
      error: error.message, 
      stack: error.stack 
    });
    next(error);
  }
});

/**
 * POST /api/invoices/:id/mark-paid
 * Mark invoice as paid and generate fiscal invoice
 */
router.post('/:id/mark-paid', authenticateApiKey, async (req, res, next) => {
  try {
    const { id } = req.params;
    const paymentDetails = req.body;
    
    logger.info('Mark invoice as paid requested', { invoiceId: id, paymentDetails });

    const result = await InvoiceService.markInvoiceAsPaid(id, paymentDetails);

    res.status(200).json(result);

  } catch (error) {
    logger.error('Error marking invoice as paid', { 
      error: error.message, 
      stack: error.stack 
    });
    next(error);
  }
});

/**
 * GET /api/invoices/type/:type
 * Get invoices by type (proforma, fiscal)
 */
router.get('/type/:type', authenticateApiKey, async (req, res, next) => {
  try {
    const { type } = req.params;
    const { limit = 100, offset = 0 } = req.query;
    
    logger.info('Invoices by type requested', { type, limit, offset });

    const result = await InvoiceService.getInvoicesByType(type, parseInt(limit), parseInt(offset));

    res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Error getting invoices by type', { 
      error: error.message, 
      stack: error.stack 
    });
    next(error);
  }
});

/**
 * GET /api/invoices/payment-status/:status
 * Get invoices by payment status (pending, paid, cancelled)
 */
router.get('/payment-status/:status', authenticateApiKey, async (req, res, next) => {
  try {
    const { status } = req.params;
    const { limit = 100, offset = 0 } = req.query;
    
    logger.info('Invoices by payment status requested', { status, limit, offset });

    const result = await InvoiceService.getInvoicesByPaymentStatus(status, parseInt(limit), parseInt(offset));

    res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Error getting invoices by payment status', { 
      error: error.message, 
      stack: error.stack 
    });
    next(error);
  }
});

module.exports = router;
