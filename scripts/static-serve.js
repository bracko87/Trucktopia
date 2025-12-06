/**
 * static-serve.js
 *
 * Tiny static server to serve the repository's `public/` directory.
 *
 * Usage:
 *  node scripts/static-serve.js          // serve on port 8001
 *  PORT=9000 node scripts/static-serve.js // custom port
 *
 * Purpose:
 * - Remove uncertainty about which folder your static dev-server serves.
 * - Logs full request/response status so you can confirm whether /exports/migrated-users.json is reachable.
 *
 * Notes:
 * - Uses only Node built-ins (http, fs, path).
 * - Intentionally simple; suitable for local development/testing.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT ? Number(process.env.PORT) : 8001;
const PUBLIC_DIR = path.resolve(process.cwd(), 'public');

/**
 * getContentType
 * @description Minimal content-type mapping for common static assets.
 * @param {string} filePath
 * @returns {string}
 */
function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html': return 'text/html; charset=utf-8';
    case '.js': return 'application/javascript; charset=utf-8';
    case '.json': return 'application/json; charset=utf-8';
    case '.css': return 'text/css; charset=utf-8';
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.svg': return 'image/svg+xml';
    case '.ico': return 'image/x-icon';
    default: return 'application/octet-stream';
  }
}

/**
 * safeJoin
 * @description Prevent path traversal by bounding to PUBLIC_DIR.
 * @param {string} base
 * @param {string} target
 * @returns {string}
 */
function safeJoin(base, target) {
  const resolved = path.resolve(base, '.' + target);
  if (!resolved.startsWith(base)) {
    return base;
  }
  return resolved;
}

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url || '/');
  const requestPath = parsed.pathname || '/';
  // default to index.html for root.
  let fsPath = requestPath === '/' ? '/index.html' : requestPath;

  // Ensure leading slash.
  if (!fsPath.startsWith('/')) fsPath = '/' + fsPath;

  const filePath = safeJoin(PUBLIC_DIR, fsPath);

  // Log incoming request
  const now = new Date().toISOString();
  console.log(`[${now}] ${req.method} ${requestPath} -> ${filePath}`);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // 404
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      const msg = `Not Found: ${requestPath}\nServed from: ${PUBLIC_DIR}`;
      console.log(`[${now}] 404 ${requestPath}`);
      res.end(msg);
      return;
    }

    const stream = fs.createReadStream(filePath);
    res.statusCode = 200;
    res.setHeader('Content-Type', getContentType(filePath));
    // Optional: no-cache for dev convenience
    res.setHeader('Cache-Control', 'no-store, must-revalidate');
    stream.pipe(res);
    stream.on('end', () => {
      console.log(`[${now}] 200 ${requestPath}`);
    });
    stream.on('error', (err) => {
      console.error('Stream error', err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    });
  });
});

server.listen(PORT, () => {
  console.log(`Static server: serving ${PUBLIC_DIR}`);
  console.log(`Listening on http://127.0.0.1:${PORT}`);
  console.log('Try: http://127.0.0.1:' + PORT + '/exports/migrated-users.json');
});