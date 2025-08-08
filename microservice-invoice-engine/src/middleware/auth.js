const logger = require('../utils/logger');

/**
 * Middleware to authenticate API key
 */
const authenticateApiKey = (req, res, next) => {
  const apiKey = req.headers.authorization?.replace('Bearer ', '') || req.headers['x-api-key'];
  
  if (!apiKey) {
    logger.warn('API key missing', { ip: req.ip, path: req.path });
    return res.status(401).json({
      success: false,
      error: 'API key is required'
    });
  }

  const expectedApiKey = process.env.API_KEY;
  
  if (!expectedApiKey) {
    logger.error('API_KEY environment variable not set');
    return res.status(500).json({
      success: false,
      error: 'Server configuration error'
    });
  }

  if (apiKey !== expectedApiKey) {
    logger.warn('Invalid API key', { ip: req.ip, path: req.path });
    return res.status(401).json({
      success: false,
      error: 'Invalid API key'
    });
  }

  logger.debug('API key authenticated', { ip: req.ip, path: req.path });
  next();
};

module.exports = {
  authenticateApiKey
};
