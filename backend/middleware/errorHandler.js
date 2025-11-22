const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  // Log error with full context
  logger.errorWithContext(err, {
    method: req.method,
    url: req.originalUrl || req.url,
    ip: req.ip || req.connection.remoteAddress,
    body: req.body,
    query: req.query,
    params: req.params
  });
  
  // Send error response
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
}

module.exports = errorHandler;
