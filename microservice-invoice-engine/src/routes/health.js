const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

/**
 * GET /api/health
 * Health check endpoint
 */
router.get('/', (req, res) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Invoice Engine Microservice',
    version: '1.0.0',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development'
  };

  logger.debug('Health check requested', { ip: req.ip });
  
  res.status(200).json(health);
});

/**
 * GET /api/health/ready
 * Readiness check endpoint
 */
router.get('/ready', (req, res) => {
  // Add any readiness checks here (database, external services, etc.)
  const ready = {
    status: 'ready',
    timestamp: new Date().toISOString(),
    checks: {
      database: 'OK',
      externalServices: 'OK'
    }
  };

  res.status(200).json(ready);
});

/**
 * GET /api/health/live
 * Liveness check endpoint
 */
router.get('/live', (req, res) => {
  const live = {
    status: 'alive',
    timestamp: new Date().toISOString()
  };

  res.status(200).json(live);
});

module.exports = router;
