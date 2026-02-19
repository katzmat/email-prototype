const { verifyToken } = require('../services/jwt');

async function requireAuth(req, res, next) {
  const token = req.cookies.session;
  if (!token) {
    return res.status(401).json({
      error: 'NOT_AUTHENTICATED',
      message: 'Please log in first.',
    });
  }

  try {
    const payload = await verifyToken(token);
    req.user = {
      provider: payload.provider,
      email: payload.email,
      name: payload.name,
      credential: payload.credential,
    };
    next();
  } catch (err) {
    return res.status(401).json({
      error: 'AUTH_EXPIRED',
      message: 'Session expired. Please log in again.',
    });
  }
}

module.exports = requireAuth;
