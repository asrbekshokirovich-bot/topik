#!/usr/bin/env node
/**
 * Waits until the `db` service reported by docker compose is healthy.
 * Polls `docker compose ps` and the container healthcheck so that
 * `npm run db:load` never runs before PostgreSQL is ready to accept
 * connections.
 */
const { execSync } = require('child_process');

const SERVICE = 'db';
const MAX_ATTEMPTS = 60;
const INTERVAL_MS = 2000;

function getHealth() {
  try {
    // `docker compose ps` with JSON output gives us the Health column.
    const out = execSync('docker compose ps --format json', {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();

    if (!out) return null;

    // Output can be either a JSON array or newline-delimited JSON objects
    // depending on the Compose version. Handle both.
    const lines = out.startsWith('[')
      ? JSON.parse(out)
      : out
          .split('\n')
          .filter(Boolean)
          .map((line) => JSON.parse(line));

    const service = lines.find(
      (svc) => svc.Service === SERVICE || svc.Name?.includes(SERVICE)
    );
    if (!service) return null;
    return service.Health || service.State || null;
  } catch (err) {
    return null;
  }
}

function pgReady() {
  try {
    execSync(
      'docker compose exec -T db pg_isready -U postgres -d topik_station',
      { stdio: 'ignore' }
    );
    return true;
  } catch (err) {
    return false;
  }
}

async function main() {
  process.stdout.write('Waiting for the database to become healthy');
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const health = getHealth();
    if (health === 'healthy' || pgReady()) {
      process.stdout.write('\nDatabase is ready.\n');
      process.exit(0);
    }
    process.stdout.write('.');
    await new Promise((resolve) => setTimeout(resolve, INTERVAL_MS));
  }
  process.stdout.write(
    '\nTimed out waiting for the database to become healthy.\n'
  );
  process.exit(1);
}

main();
