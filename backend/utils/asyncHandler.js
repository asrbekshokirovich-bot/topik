'use strict';

/**
 * Wrap an async route handler so that rejected promises are forwarded to
 * Express's central error handler instead of crashing the process.
 * @param {Function} fn async (req, res, next) => {}
 */
function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
