/**
 * Frontend logging utility
 * Provides consistent logging with timestamps and log levels
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
    if (process.env.NODE_ENV !== 'production' || process.env.REACT_APP_DEBUG === 'true') {
      console.log(`[${getTimestamp()}] [DEBUG]`, ...args);
    }
  },
  
  // Log with context
  logWithContext: (level, message, context = {}) => {
    const logMessage = {
      message,
      context,
      timestamp: getTimestamp()
    };
    
    switch (level) {
      case 'error':
        logger.error(logMessage);
        break;
      case 'warn':
        logger.warn(logMessage);
        break;
      case 'debug':
        logger.debug(logMessage);
        break;
      default:
        logger.info(logMessage);
    }
  }
};

export default logger;

