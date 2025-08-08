const express = require('express');
const router = express.Router();
const Joi = require('joi');
const logger = require('../utils/logger');
const InvoiceService = require('../services/invoiceService');
const { validateRequest } = require('../middleware/validation');

// Validation schema for issue_proforma_invoice command
const issueProformaInvoiceSchema = Joi.object({
  command: Joi.string().valid('issue_proforma_invoice').required(),
  data: Joi.object({
    userId: Joi.string().required(),
    packageId: Joi.string().required(),
    packageName: Joi.string().required(),
    hours: Joi.number().positive().required(),
    pricePerHour: Joi.number().positive().required(),
    totalPrice: Joi.number().positive().required(),
    currency: Joi.string().length(3).required(),
    validityDays: Joi.number().positive().required(),
    userData: Joi.object({
      userId: Joi.string().required(),
      firstName: Joi.string().required(),
      lastName: Joi.string().required(),
      email: Joi.string().email().required(),
      address: Joi.string().optional(),
      city: Joi.string().optional(),
      region: Joi.string().optional(),
      country: Joi.string().optional(),
      cnp: Joi.string().required(),
      companyId: Joi.string().optional(),
      companyName: Joi.string().optional(),
      companyVatCode: Joi.string().optional(),
      companyAddress: Joi.string().optional(),
      companyCity: Joi.string().optional(),
      companyCountry: Joi.string().optional()
    }).required(),
    paymentMethod: Joi.string().valid('card', 'bank_transfer', 'cash').required(),
    paymentLink: Joi.boolean().default(false),
    vatPercentage: Joi.number().min(0).max(100).optional(),
    pricesIncludeVat: Joi.boolean().default(false),
    convertToRON: Joi.boolean().default(false),
    targetCurrency: Joi.string().length(3).default('RON')
  }).required()
});

/**
 * POST /api/commands
 * Handle command requests
 */
router.post('/', (req, res, next) => {
  const { error, value } = issueProformaInvoiceSchema.validate(req.body);
  if (error) {
    console.error('Validation error:', error.details);
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: error.details
    });
  }
  req.body = value;
  next();
}, async (req, res, next) => {
  try {
    const { command, data } = req.body;
    
    logger.info('Command received', { 
      command, 
      userId: data.userId,
      packageId: data.packageId 
    });

    let result;

    switch (command) {
      case 'issue_proforma_invoice':
        result = await InvoiceService.issueProformaInvoice(data);
        break;
      
      default:
        return res.status(400).json({
          success: false,
          error: `Unknown command: ${command}`
        });
    }

    logger.info('Command processed successfully', { 
      command, 
      invoiceId: result.data?.invoiceId 
    });

    res.status(200).json(result);

  } catch (error) {
    logger.error('Error processing command', { 
      error: error.message, 
      command: req.body.command,
      stack: error.stack 
    });
    next(error);
  }
});

module.exports = router;
