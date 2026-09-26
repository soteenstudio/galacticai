import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, extname, sep } from 'node:path';
import { handleChat } from './chat.mjs';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

export function createAppServer(chatOptions) {
  return createServer(async (request, response) => {
    try {
      const pathname = new URL(request.url, 'http://localhost').pathname;
      if (pathname === '/api/chat') {
        await handleChat(request, response, chatOptions);
        return;
      }
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        response.writeHead(405, { Allow: 'GET, HEAD' }).end();
        return;
      }
      const path = resolve(dist, `.${decodeURIComponent(pathname === '/' ? '/index.html' : pathname)}`);
      if (!path.startsWith(dist.endsWith(sep) ? dist : dist + sep)) {
        response.writeHead(404).end();
        return;
      }
      const content = await readFile(path);
      response.writeHead(200, { 'Content-Type': contentTypes[extname(path)] || 'application/octet-stream' });
      response.end(request.method === 'HEAD' ? undefined : content);
    } catch {
      response.writeHead(404).end();
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 3001);
  createAppServer().listen(port, () => {
    console.log(`GalacticAI server listening on port ${port}`);
  });
}
