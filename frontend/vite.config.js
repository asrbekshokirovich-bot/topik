import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Where the dev server proxies API calls. Locally and in Codespaces this is
// the backend on localhost:4000; in the Docker `app` profile it is the
// backend container (set via API_PROXY_TARGET=http://backend:4000).
const apiTarget = process.env.API_PROXY_TARGET || 'http://localhost:4000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    // Proxy same-origin /api and /health requests to the backend. This lets
    // the frontend use relative URLs, so it works behind any host (localhost,
    // Codespaces forwarded URLs, etc.) without CORS configuration.
    proxy: {
      '/api': { target: apiTarget, changeOrigin: true },
      '/health': { target: apiTarget, changeOrigin: true },
    },
  },
  preview: {
    port: 5173,
    proxy: {
      '/api': { target: apiTarget, changeOrigin: true },
      '/health': { target: apiTarget, changeOrigin: true },
    },
  },
});
