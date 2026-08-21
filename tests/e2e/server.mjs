import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';

const root = resolve(process.cwd());
const port = Number(process.env.PORT || 4173);
const mimeTypes = {
  '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml',
  // Added for tests/e2e/interactive-video.spec.js's local test video (tests/fixtures/media)
  // — without a real video/mp4 Content-Type, some browsers (Firefox in particular) refuse
  // to play a <video><source> served as the previous application/octet-stream fallback.
  '.mp4': 'video/mp4', '.webm': 'video/webm'
};

createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
  const candidate = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
  if (candidate !== root && !candidate.startsWith(`${root}${sep}`)) {
    response.writeHead(403).end('Forbidden');
    return;
  }
  try {
    const file = statSync(candidate).isDirectory() ? resolve(candidate, 'index.html') : candidate;
    const { size } = statSync(file);
    const contentType = mimeTypes[extname(file).toLowerCase()] || 'application/octet-stream';
    const rangeHeader = request.headers.range;
    // Real browsers build a <video>'s seekable TimeRanges from whether the server supports
    // byte-range requests — without Accept-Ranges + 206 responses, a video can report
    // `seekable = [[0,0]]` even once fully buffered, silently resetting any seek back to 0
    // (discovered debugging tests/e2e/interactive-video.spec.js's seek-based tests).
    if (rangeHeader) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader);
      if (match) {
        const start = match[1] ? Number(match[1]) : 0;
        const end = match[2] ? Number(match[2]) : size - 1;
        if (start <= end && end < size) {
          response.writeHead(206, {
            'Content-Type': contentType,
            'Content-Range': `bytes ${start}-${end}/${size}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': end - start + 1,
            'Cache-Control': 'no-store'
          });
          createReadStream(file, { start, end }).pipe(response);
          return;
        }
      }
      response.writeHead(416, { 'Content-Range': `bytes */${size}` }).end();
      return;
    }
    response.writeHead(200, {
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
      'Content-Length': size,
      'Cache-Control': 'no-store'
    });
    createReadStream(file).pipe(response);
  } catch {
    response.writeHead(404).end('Not found');
  }
}).listen(port, '127.0.0.1', () => process.stdout.write(`Test server listening on ${port}\n`));
