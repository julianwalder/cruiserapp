const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { getAllTemplates, getTemplateNames, getTemplate } = require('../templates/invoice-templates');
const { authenticateApiKey } = require('../middleware/auth');

/**
 * GET /api/templates
 * Get all available invoice templates
 */
router.get('/', authenticateApiKey, async (req, res, next) => {
  try {
    logger.info('Templates list requested');

    const templates = getAllTemplates();
    const templateNames = getTemplateNames();

    res.status(200).json({
      success: true,
      data: {
        templates,
        availableTemplates: templateNames,
        count: templateNames.length
      }
    });

  } catch (error) {
    logger.error('Error getting templates', { 
      error: error.message, 
      stack: error.stack 
    });
    next(error);
  }
});

/**
 * GET /api/templates/:name
 * Get specific template details
 */
router.get('/:name', authenticateApiKey, async (req, res, next) => {
  try {
    const { name } = req.params;
    
    logger.info('Template details requested', { templateName: name });

    const template = getTemplate(name);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        error: `Template '${name}' not found`
      });
    }

    res.status(200).json({
      success: true,
      data: template
    });

  } catch (error) {
    logger.error('Error getting template details', { 
      error: error.message, 
      stack: error.stack 
    });
    next(error);
  }
});

/**
 * GET /api/templates/:name/preview
 * Generate a preview invoice with the specified template
 */
router.get('/:name/preview', authenticateApiKey, async (req, res, next) => {
  try {
    const { name } = req.params;
    
    logger.info('Template preview requested', { templateName: name });

    const template = getTemplate(name);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        error: `Template '${name}' not found`
      });
    }

    // Create a sample invoice for preview
    const sampleInvoice = {
      id: 'preview-invoice',
      invoiceNumber: 'PREVIEW-001',
      invoiceType: 'proforma',
      paymentStatus: 'pending',
      packageName: 'Sample Flight Hours Package',
      hours: 10,
      pricePerHour: 150,
      subtotal: 1239.67,
      vatPercentage: 21,
      vatAmount: 260.33,
      totalPrice: 1500,
      currency: 'EUR',
      paymentMethod: 'card',
      createdAt: new Date().toISOString(),
      userData: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        address: '123 Sample Street',
        city: 'Bucharest',
        region: 'Bucharest',
        country: 'Romania',
        cnp: '1234567890123'
      },
      exchangeRateInfo: {
        fromCurrency: 'EUR',
        toCurrency: 'RON',
        rate: 5.0711,
        source: 'BNR',
        date: new Date().toISOString(),
        isCached: true
      },
      convertedAmounts: {
        subtotal: 6286.49,
        vatAmount: 1320.16,
        totalPrice: 7606.65
      }
    };

    res.status(200).json({
      success: true,
      data: {
        template,
        sampleInvoice,
        message: 'Preview data generated successfully. Use this data to test the template.'
      }
    });

  } catch (error) {
    logger.error('Error generating template preview', { 
      error: error.message, 
      stack: error.stack 
    });
    next(error);
  }
});

module.exports = router;
