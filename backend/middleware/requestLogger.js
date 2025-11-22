/**
 * Request logging middleware
 * Logs all HTTP requests with method, URL, status, response time, and IP
 */
const logger = require('../utils/logger');

const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Log request start
  logger.debug(`${req.method} ${req.originalUrl || req.url} - Request started`);
  
  // Override res.end to capture response time
  const originalEnd = res.end;
  res.end = function(...args) {
    const responseTime = Date.now() - startTime;
    logger.request(req, res, responseTime);
    originalEnd.apply(this, args);
  };
  
  next();
};

module.exports = requestLogger;

