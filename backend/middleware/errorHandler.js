const logger = require('../utils/logger');

// Sensitive fields that must never be written to logs or error responses.
const SENSITIVE_FIELDS = new Set([
  'password',
  'currentPassword',
  'newPassword',
  'confirmPassword',
  'token',
  'registrationCode',
  'secret',
  'authorization',
  'apiKey',
]);

const redactSensitive = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(redactSensitive);
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_FIELDS.has(key)) {
      result[key] = '[REDACTED]';
    } else if (value && typeof value === 'object') {
      result[key] = redactSensitive(value);
    } else {
      result[key] = value;
    }
  }
  return result;
};

function errorHandler(err, req, res, next) {
  // Log error with context, redacting sensitive request data
  logger.errorWithContext(err, {
    method: req.method,
    url: req.originalUrl || req.url,
    ip: req.ip || req.connection.remoteAddress,
    body: redactSensitive(req.body),
    query: redactSensitive(req.query),
    params: redactSensitive(req.params)
  });

  // Send error response
  const statusCode = err.status || err.statusCode || 500;

  if (process.env.NODE_ENV === 'production') {
    // Do not leak internal error details to clients in production
    res.status(statusCode).json({
      error: statusCode >= 500 ? 'Internal Server Error' : (err.message || 'Request failed')
    });
  } else {
    res.status(statusCode).json({
      error: err.message || 'Internal Server Error',
      ...(err.stack && { stack: err.stack })
    });
  }
}

module.exports = errorHandler;
