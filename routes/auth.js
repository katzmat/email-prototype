const express = require('express');
const { createToken, verifyToken, setTokenCookie, clearTokenCookie } = require('../services/jwt');
const config = require('../config');

const router = express.Router();

// ─── Flow A: Yahoo token paste ───────────────────────
router.post('/yahoo-token', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token is required' });

    // Validate token via Yahoo userinfo
    const resp = await fetch('https://api.login.yahoo.com/openid/v1/userinfo', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) {
      return res.status(401).json({ error: 'Invalid Yahoo token' });
    }
    const info = await resp.json();

    const jwt = await createToken({
      provider: 'yahoo',
      email: info.email,
      name: info.name || info.email,
      credential: token,
    });
    setTokenCookie(res, jwt);
    res.json({ success: true, email: info.email });
  } catch (err) {
    console.error('Yahoo token login error:', err.message);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ─── Flow B: Gmail app password ──────────────────────
router.post('/gmail-password', async (req, res) => {
  try {
    const { email, appPassword } = req.body;
    if (!email || !appPassword) {
      return res.status(400).json({ error: 'Email and app password are required' });
    }

    // Validate by test-connecting to Gmail IMAP
    const { ImapFlow } = require('imapflow');
    const client = new ImapFlow({
      host: 'imap.gmail.com',
      port: 993,
      secure: true,
      auth: { user: email, pass: appPassword },
      logger: false,
    });

    await client.connect();
    await client.logout();

    const jwt = await createToken({
      provider: 'gmail',
      email,
      name: email,
      credential: appPassword,
    });
    setTokenCookie(res, jwt);
    res.json({ success: true, email });
  } catch (err) {
    console.error('Gmail password login error:', err.message);
    if (err.authenticationFailed || err.message?.includes('AUTHENTICATIONFAILED')) {
      return res.status(401).json({ error: 'Invalid email or app password' });
    }
    res.status(500).json({ error: 'Login failed' });
  }
});

// ─── Flow B2: Yahoo app password ─────────────────────
router.post('/yahoo-password', async (req, res) => {
  try {
    const { email, appPassword } = req.body;
    if (!email || !appPassword) {
      return res.status(400).json({ error: 'Email and app password are required' });
    }

    // Validate by test-connecting to Yahoo IMAP
    const { ImapFlow } = require('imapflow');
    const client = new ImapFlow({
      host: 'imap.mail.yahoo.com',
      port: 993,
      secure: true,
      auth: { user: email, pass: appPassword },
      logger: false,
    });

    await client.connect();
    await client.logout();

    const jwt = await createToken({
      provider: 'yahoo',
      email,
      name: email,
      credential: appPassword,
    });
    setTokenCookie(res, jwt);
    res.json({ success: true, email });
  } catch (err) {
    console.error('Yahoo password login error:', err.message);
    if (err.authenticationFailed || err.message?.includes('AUTHENTICATIONFAILED')) {
      return res.status(401).json({ error: 'Invalid email or app password' });
    }
    res.status(500).json({ error: 'Login failed' });
  }
});

// ─── Flow C: Yahoo OAuth redirect ────────────────────
router.get('/yahoo', (req, res) => {
  const redirect = req.query.redirect || config.cors.allowedOrigins[0] || config.app.baseUrl;
  // Store redirect in a short-lived cookie
  res.cookie('yahoo_redirect', redirect, { httpOnly: true, maxAge: 600000 });

  // Use the origin of the incoming request for the callback URL
  // (so ngrok URLs work without changing BASE_URL)
  const origin = `${req.protocol}://${req.get('host')}`;
  const callbackUrl = `${origin}/auth/yahoo/callback`;

  const state = Math.random().toString(36).substring(2);
  res.cookie('yahoo_state', state, { httpOnly: true, maxAge: 600000 });
  // Store callback URL for use in the callback handler
  res.cookie('yahoo_callback', callbackUrl, { httpOnly: true, maxAge: 600000 });

  const params = new URLSearchParams({
    client_id: config.yahoo.clientId,
    redirect_uri: callbackUrl,
    response_type: 'code',
    scope: 'openid mail-r',
    state,
  });

  res.redirect(`https://api.login.yahoo.com/oauth2/request_auth?${params}`);
});

router.get('/yahoo/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    const savedState = req.cookies.yahoo_state;
    const redirectUrl = req.cookies.yahoo_redirect || config.cors.allowedOrigins[0] || '/';

    // Clear state cookies
    res.clearCookie('yahoo_state');
    res.clearCookie('yahoo_redirect');

    if (!code || state !== savedState) {
      return res.redirect(`${redirectUrl}?error=oauth_failed`);
    }

    // Exchange code for tokens — use the same callback URL from the initial request
    const callbackUrl = req.cookies.yahoo_callback || `${config.app.baseUrl}/auth/yahoo/callback`;
    res.clearCookie('yahoo_callback');

    const tokenResp = await fetch('https://api.login.yahoo.com/oauth2/get_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: callbackUrl,
        client_id: config.yahoo.clientId,
        client_secret: config.yahoo.clientSecret,
      }),
    });

    if (!tokenResp.ok) {
      console.error('Yahoo token exchange failed:', await tokenResp.text());
      return res.redirect(`${redirectUrl}?error=token_exchange_failed`);
    }

    const tokens = await tokenResp.json();

    // Fetch userinfo
    const userResp = await fetch('https://api.login.yahoo.com/openid/v1/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const userInfo = await userResp.json();

    const jwt = await createToken({
      provider: 'yahoo',
      email: userInfo.email,
      name: userInfo.name || userInfo.email,
      credential: tokens.access_token,
    });
    setTokenCookie(res, jwt);
    res.redirect(redirectUrl);
  } catch (err) {
    console.error('Yahoo OAuth callback error:', err.message);
    res.redirect('/?error=auth_failed');
  }
});

// ─── Disconnect ──────────────────────────────────────
router.post('/disconnect', (req, res) => {
  clearTokenCookie(res);
  res.json({ success: true });
});

module.exports = router;
