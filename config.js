var path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env'), override: true });

module.exports = {
  port: parseInt(process.env.PORT || '3000', 10),

  yahoo: {
    clientId: process.env.YAHOO_CLIENT_ID,
    clientSecret: process.env.YAHOO_CLIENT_SECRET,
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-jwt-secret-change-me',
  },

  cors: {
    enabled: process.env.CORS_ENABLED === 'true',
    allowedOrigins: (process.env.ALLOWED_ORIGINS || '')
      .split(',')
      .map(function (s) { return s.trim(); })
      .filter(Boolean),
  },

  app: {
    baseUrl: process.env.BASE_URL || 'http://localhost:3000',
    defaultVariant: process.env.DEFAULT_VARIANT || 'default',
    refreshInterval: parseInt(process.env.REFRESH_INTERVAL || '30', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
  },

  processor: {
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || null,
    cacheTTL: parseInt(process.env.PROCESSOR_CACHE_TTL || '300000', 10),
  },
};
