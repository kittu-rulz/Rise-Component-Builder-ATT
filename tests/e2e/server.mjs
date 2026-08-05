import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';

const root = resolve(process.cwd());
const port = Number(process.env.PORT || 4173);
const mimeTypes = {
  '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml'
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
    response.writeHead(200, {
      'Content-Type': mimeTypes[extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    createReadStream(file).pipe(response);
  } catch {
    response.writeHead(404).end('Not found');
  }
}).listen(port, '127.0.0.1', () => process.stdout.write(`Test server listening on ${port}\n`));
