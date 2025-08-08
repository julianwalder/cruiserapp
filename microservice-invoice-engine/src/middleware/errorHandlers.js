const logger = require('../utils/logger');

/**
 * 404 Not Found handler
 */
const notFoundHandler = (req, res, next) => {
  const error = new Error(`Route ${req.originalUrl} not found`);
  error.status = 404;
  next(error);
};

/**
 * Global error handler
 */
const errorHandler = (err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  // Log error
  logger.error('Error occurred', {
    error: message,
    stack: err.stack,
    status,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Don't leak error details in production
  const errorResponse = {
    success: false,
    error: process.env.NODE_ENV === 'production' && status === 500 
      ? 'Internal Server Error' 
      : message
  };

  // Add validation errors if available
  if (err.details) {
    errorResponse.details = err.details;
  }

  res.status(status).json(errorResponse);
};

module.exports = {
  notFoundHandler,
  errorHandler
};
