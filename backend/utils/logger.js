/**
 * Simple logging utility for Docker/Render deployment
 * All logs go to stdout/stderr so they can be captured by deployment platforms
 */

const getTimestamp = () => {
  return new Date().toISOString();
};

const logger = {
  info: (...args) => {
    console.log(`[${getTimestamp()}] [INFO]`, ...args);
  },
  
  error: (...args) => {
    console.error(`[${getTimestamp()}] [ERROR]`, ...args);
  },
  
  warn: (...args) => {
    console.warn(`[${getTimestamp()}] [WARN]`, ...args);
  },
  
  debug: (...args) => {
    if (process.env.NODE_ENV !== 'production' || process.env.DEBUG === 'true') {
      console.log(`[${getTimestamp()}] [DEBUG]`, ...args);
    }
  },
  
  // Log HTTP requests
  request: (req, res, responseTime) => {
    const method = req.method;
    const url = req.originalUrl || req.url;
    const status = res.statusCode;
    const ip = req.ip || req.connection.remoteAddress;
    
    const logMessage = `${method} ${url} ${status} - ${responseTime}ms - IP: ${ip}`;
    
    // Log errors (4xx, 5xx) as warnings/errors
    if (status >= 500) {
      logger.error(logMessage);
    } else if (status >= 400) {
      logger.warn(logMessage);
    } else {
      logger.info(logMessage);
    }
  },
  
  // Log errors with full context
  errorWithContext: (error, context = {}) => {
    logger.error('Error occurred:', {
      message: error.message,
      stack: error.stack,
      context,
      ...error
    });
  }
};

module.exports = logger;
