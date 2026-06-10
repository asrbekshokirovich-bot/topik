'use strict';

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'topik_station_dev_secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const ROLES = Object.freeze({ STUDENT: 'STUDENT', TEACHER: 'TEACHER' });

/**
 * Sign a JWT for a user. Payload uses the standard `sub` claim for id.
 * @param {{id:number, email:string, role:string}} user
 */
function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Authentication middleware. Validates `Authorization: Bearer <token>`
 * and attaches `req.user = { id, email, role }`.
 */
function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res
      .status(401)
      .json({ error: 'Missing or malformed Authorization header.' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

/**
 * Role-based authorization. Use after `authenticate`.
 * @param {...string} roles Allowed roles.
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (roles.length && !roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ error: 'You do not have permission to perform this action.' });
    }
    return next();
  };
}

module.exports = { authenticate, authorize, signToken, ROLES, JWT_SECRET };
