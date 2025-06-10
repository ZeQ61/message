const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/user',
    createProxyMiddleware({
      target: 'https://backend-gq5v.onrender.com',
      changeOrigin: true,
      secure: false,
      logLevel: 'debug',
      onProxyReq: function(proxyReq, req, res) {
        console.log('Proxy Request to:', req.method, req.path);
        console.log('Request Headers:', req.headers);
      },
      onProxyRes: function(proxyRes, req, res) {
        proxyRes.headers['Access-Control-Allow-Origin'] = '*';
        proxyRes.headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,DELETE,OPTIONS';
        proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
        
        console.log('Proxy Response Status:', proxyRes.statusCode);
        console.log('Response Headers:', proxyRes.headers);
      }
    })
  );
  
  app.use(
    '/admin',
    createProxyMiddleware({
      target: 'https://backend-gq5v.onrender.com',
      changeOrigin: true,
    })
  );

  app.use(
    '/ws-chat',
    createProxyMiddleware({
      target: 'https://backend-gq5v.onrender.com',
      ws: true,
      changeOrigin: true,
    })
  );
}; 