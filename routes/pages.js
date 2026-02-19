const express = require('express');
const path = require('path');
const fs = require('fs');
const config = require('../config');

const router = express.Router();

// Landing page
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'landing', 'index.html'));
});

// Main email client (variant-based) — kept for legacy web views
router.get('/inbox', (req, res) => {
  const variant = req.query.variant || config.app.defaultVariant;
  const variantPath = path.join(__dirname, '..', 'public', 'variants', variant, 'index.html');

  if (!fs.existsSync(variantPath)) {
    console.warn(`Variant "${variant}" not found, falling back to default`);
    return res.sendFile(
      path.join(__dirname, '..', 'public', 'variants', 'default', 'index.html')
    );
  }

  res.sendFile(variantPath);
});

module.exports = router;
