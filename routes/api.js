const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const { fetchInboxMessages } = require('../services/imap');
const { verifyToken } = require('../services/jwt');

const router = express.Router();

// Session status
router.get('/session', async (req, res) => {
  const token = req.cookies.session;
  if (!token) {
    return res.json({ connected: false, userEmail: null, provider: null });
  }
  try {
    const payload = await verifyToken(token);
    res.json({
      connected: true,
      userEmail: payload.email,
      provider: payload.provider,
    });
  } catch {
    res.json({ connected: false, userEmail: null, provider: null });
  }
});

// List inbox emails
router.get('/emails', requireAuth, async (req, res) => {
  try {
    const maxResults = parseInt(req.query.maxResults || '30', 10);
    const result = await fetchInboxMessages(req.user, maxResults);
    res.json(result);
  } catch (error) {
    console.error('Email fetch error:', error.message, error.stack);

    if (error.authenticationFailed || error.message?.includes('AUTHENTICATIONFAILED')) {
      return res.status(401).json({
        error: 'AUTH_EXPIRED',
        message: 'Email credentials expired. Please log in again.',
      });
    }

    res.status(500).json({ error: 'INTERNAL', message: 'Failed to fetch emails.' });
  }
});

module.exports = router;
