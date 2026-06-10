'use strict';

const { Pool } = require('pg');

/**
 * Build the pool configuration. Prefer a single DATABASE_URL connection
 * string; fall back to discrete DB_* environment variables otherwise.
 * SSL is enabled when PGSSL is truthy.
 */
function buildConfig() {
  const ssl =
    String(process.env.PGSSL).toLowerCase() === 'true'
      ? { rejectUnauthorized: false }
      : false;

  if (process.env.DATABASE_URL) {
    return { connectionString: process.env.DATABASE_URL, ssl };
  }

  return {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'topik_station',
    ssl,
  };
}

const pool = new Pool(buildConfig());

// A pool-level error means an idle client errored out (e.g. the database
// restarted). Log it instead of letting it crash the process.
pool.on('error', (err) => {
  // eslint-disable-next-line no-console
  console.error('Unexpected PostgreSQL pool error:', err.message);
});

/**
 * Run a single parameterized query against the pool.
 * @param {string} text SQL text with $1, $2 placeholders.
 * @param {Array} [params] Bound parameters.
 */
function query(text, params) {
  return pool.query(text, params);
}

/**
 * Check out a client for transactions. Caller MUST call client.release().
 */
function getClient() {
  return pool.connect();
}

module.exports = { query, getClient, pool };
