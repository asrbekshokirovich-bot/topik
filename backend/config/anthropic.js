'use strict';

const Anthropic = require('@anthropic-ai/sdk');

// The model used for all AI features. Defaults to Claude Opus 4.8 — the most
// capable model — and can be overridden with ANTHROPIC_MODEL.
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-8';

let client = null;
if (process.env.ANTHROPIC_API_KEY) {
  client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

/** Whether AI features are configured (an API key is present). */
function isConfigured() {
  return Boolean(client);
}

/** Returns the Anthropic client, or throws a tagged error if not configured. */
function getClient() {
  if (!client) {
    const err = new Error(
      'AI features are not configured. Set ANTHROPIC_API_KEY in backend/.env.'
    );
    err.code = 'AI_NOT_CONFIGURED';
    throw err;
  }
  return client;
}

module.exports = { getClient, isConfigured, MODEL };
