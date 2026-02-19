const { SignJWT, jwtVerify } = require('jose');
const config = require('../config');

const secret = new TextEncoder().encode(config.jwt.secret);

async function createToken({ provider, email, name, credential }) {
  return new SignJWT({ provider, email, name, credential })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secret);
}

async function verifyToken(token) {
  const { payload } = await jwtVerify(token, secret);
  return payload;
}

function setTokenCookie(res, token) {
  // Use secure cookies when behind HTTPS (ngrok, production)
  const origin = res.req.get('origin') || res.req.get('referer') || '';
  const isSecure = origin.startsWith('https://') || res.req.secure;
  res.cookie('session', token, {
    httpOnly: true,
    sameSite: isSecure ? 'none' : 'lax',
    secure: isSecure,
    maxAge: 86400000, // 24h
  });
}

function clearTokenCookie(res) {
  res.clearCookie('session');
}

module.exports = { createToken, verifyToken, setTokenCookie, clearTokenCookie };
