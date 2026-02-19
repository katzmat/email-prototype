const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const config = require('./config');

const app = express();

// Trust proxy when behind ngrok/HTTPS
app.set('trust proxy', 1);

// CORS — allow external prototypes to call our API
if (config.cors.enabled) {
  app.use(
    cors({
      origin: function (origin, callback) {
        // Allow requests with no origin (same-origin, curl, etc.)
        if (!origin) return callback(null, true);
        // Allow configured origins
        if (config.cors.allowedOrigins.indexOf(origin) !== -1) {
          return callback(null, true);
        }
        // Allow any ngrok origin (for remote testing)
        if (origin.endsWith('.ngrok-free.app') || origin.endsWith('.ngrok.io')) {
          return callback(null, true);
        }
        return callback(null, false);
      },
      credentials: true,
    })
  );
}

// Middleware
app.use(cookieParser());
app.use(express.json());

// Static files
app.use('/shared', express.static(path.join(__dirname, 'public', 'shared')));
app.use('/variants', express.static(path.join(__dirname, 'public', 'variants')));
app.use('/landing', express.static(path.join(__dirname, 'public', 'landing')));

// Request logger for debugging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.originalUrl}`);
  next();
});

// Routes
app.use('/auth', require('./routes/auth'));
app.use('/api', require('./routes/api'));
app.use('/', require('./routes/pages'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Serve Expo web build for remote access (single ngrok tunnel)
const expoDistPath = path.join(__dirname, '..', 'inbox-app', 'dist');
const fs = require('fs');
if (fs.existsSync(expoDistPath)) {
  // Serve _expo assets at root (Expo build references /_expo/...)
  app.use('/_expo', express.static(path.join(expoDistPath, '_expo')));
  app.use('/app', express.static(expoDistPath));
  app.get('/app/{*path}', (req, res) => {
    res.sendFile(path.join(expoDistPath, 'index.html'));
  });
}

// Start server
app.listen(config.port, () => {
  console.log(`\n  Email Prototype Server`);
  console.log(`  ----------------------`);
  console.log(`  Local:   http://localhost:${config.port}`);
  console.log(`  CORS:    ${config.cors.enabled ? config.cors.allowedOrigins.join(', ') : 'disabled'}`);
  console.log(`  Refresh: every ${config.app.refreshInterval}s\n`);
});
