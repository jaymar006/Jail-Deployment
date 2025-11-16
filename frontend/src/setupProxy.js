const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Use environment variable or fallback to localhost for development
  const target = process.env.REACT_APP_API_URL || 'http://localhost:3001';
  
  app.use(
    ['/api', '/auth'],
    createProxyMiddleware({
      target: target,
      changeOrigin: true,
    })
  );
};
 