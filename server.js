'use strict';

/**
 * Genspark.ai OpenClaw — Railway HTTP server
 * Serves the built extension assets and exposes health/API endpoints.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { init } = require('./src/index');

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

const sdk = init({ env: process.env.NODE_ENV || 'production' });

const MIME = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.png':  'image/png',
  '.svg':  'image/svg+xml',
};

function serveStatic(res, filePath) {
  const ext = path.extname(filePath);
  const mime = MIME[ext] || 'application/octet-stream';
  try {
    const data = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  // ── Health check ──────────────────────────────────────────────────────────
  if (pathname === '/health' || pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      status: 'ok',
      service: 'genspark.ai-openclaw',
      version: sdk.version,
      ready: sdk.ready,
      timestamp: new Date().toISOString(),
    }));
  }

  // ── SDK info ──────────────────────────────────────────────────────────────
  if (pathname === '/api/info') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      name: 'genspark.ai-openclaw',
      version: sdk.version,
      description: 'Genspark OpenClaw SDK — async state management & extension utilities',
    }));
  }

  // ── Static assets from dist/ ──────────────────────────────────────────────
  const safePath = path.normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  const distFile = path.join(__dirname, 'dist', safePath);
  if (fs.existsSync(distFile) && fs.statSync(distFile).isFile()) {
    return serveStatic(res, distFile);
  }

  // ── Static assets from public/ ────────────────────────────────────────────
  const publicFile = path.join(__dirname, 'public', safePath);
  if (fs.existsSync(publicFile) && fs.statSync(publicFile).isFile()) {
    return serveStatic(res, publicFile);
  }

  // ── 404 ───────────────────────────────────────────────────────────────────
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found', path: pathname }));
});

server.listen(PORT, HOST, () => {
  console.log(`[genspark-openclaw] Server running on ${HOST}:${PORT}`);
  console.log(`[genspark-openclaw] SDK v${sdk.version} ready: ${sdk.ready}`);
  console.log(`[genspark-openclaw] Health: http://${HOST}:${PORT}/health`);
});

server.on('error', (err) => {
  console.error('[genspark-openclaw] Server error:', err);
  process.exit(1);
});
