require('dotenv').config();

const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback',
  },
  session: {
    secret: process.env.SESSION_SECRET || 'change-me-in-production',
  },
  app: {
    baseUrl: process.env.BASE_URL || 'http://localhost:3000',
    defaultVariant: process.env.DEFAULT_VARIANT || 'default',
    refreshInterval: parseInt(process.env.REFRESH_INTERVAL || '30', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  cors: {
    enabled: process.env.CORS_ENABLED === 'true',
    allowedOrigins: (process.env.ALLOWED_ORIGINS || '')
      .split(',')
      .map(function (s) { return s.trim(); })
      .filter(Boolean),
  },
  processor: {
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || null,
    cacheTTL: parseInt(process.env.PROCESSOR_CACHE_TTL || '300', 10) * 1000,
  },
};

// Validate required fields
const missing = [];
if (!config.google.clientId) missing.push('GOOGLE_CLIENT_ID');
if (!config.google.clientSecret) missing.push('GOOGLE_CLIENT_SECRET');

if (missing.length > 0) {
  console.error(`\nMissing required environment variables: ${missing.join(', ')}`);
  console.error('Copy .env.example to .env and fill in your values.\n');
  process.exit(1);
}

module.exports = config;
