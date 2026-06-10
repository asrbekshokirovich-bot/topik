'use strict';

const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { signToken, ROLES } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BCRYPT_ROUNDS = 10;

/** Shape a DB user row into a safe public object (never includes the hash). */
function toPublicUser(row) {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    createdAt: row.created_at,
  };
}

/** POST /api/auth/signup */
const signup = asyncHandler(async (req, res) => {
  const { email, password, fullName, role } = req.body || {};

  if (!email || !EMAIL_RE.test(String(email))) {
    return res.status(400).json({ error: 'A valid email is required.' });
  }
  if (!password || String(password).length < 8) {
    return res
      .status(400)
      .json({ error: 'Password must be at least 8 characters long.' });
  }
  if (!fullName || !String(fullName).trim()) {
    return res.status(400).json({ error: 'Full name is required.' });
  }
  if (!role || ![ROLES.STUDENT, ROLES.TEACHER].includes(role)) {
    return res
      .status(400)
      .json({ error: 'Role must be either STUDENT or TEACHER.' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  const existing = await db.query('SELECT id FROM users WHERE email = $1', [
    normalizedEmail,
  ]);
  if (existing.rowCount > 0) {
    return res
      .status(409)
      .json({ error: 'An account with that email already exists.' });
  }

  const passwordHash = await bcrypt.hash(String(password), BCRYPT_ROUNDS);

  const result = await db.query(
    `INSERT INTO users (email, password_hash, full_name, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, full_name, role, created_at`,
    [normalizedEmail, passwordHash, String(fullName).trim(), role]
  );

  const user = result.rows[0];
  const token = signToken(user);

  return res.status(201).json({ token, user: toPublicUser(user) });
});

/** POST /api/auth/login */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res
      .status(400)
      .json({ error: 'Email and password are required.' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  const result = await db.query(
    `SELECT id, email, password_hash, full_name, role, created_at
     FROM users WHERE email = $1`,
    [normalizedEmail]
  );

  if (result.rowCount === 0) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const user = result.rows[0];
  const match = await bcrypt.compare(String(password), user.password_hash);
  if (!match) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const token = signToken(user);
  return res.json({ token, user: toPublicUser(user) });
});

/** GET /api/auth/me */
const me = asyncHandler(async (req, res) => {
  const result = await db.query(
    `SELECT id, email, full_name, role, created_at
     FROM users WHERE id = $1`,
    [req.user.id]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'User not found.' });
  }

  return res.json({ user: toPublicUser(result.rows[0]) });
});

module.exports = { signup, login, me, toPublicUser };
