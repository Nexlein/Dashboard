import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { responses } from './fixtures.mjs';

const origin = 'http://127.0.0.1:4174';
const root = path.resolve(
    fileURLToPath(new URL('../../frontend/dist-lighthouse/', import.meta.url)),
);
const nginx = await readFile(
    new URL('../../frontend/nginx/default.conf.template', import.meta.url),
    'utf8',
);
const csp = nginx
    .match(/add_header Content-Security-Policy "([^"]+)"/)[1]
    .replace('${API_ORIGIN}', origin);
const types = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.woff2': 'font/woff2',
    '.txt': 'text/plain',
};

// Fail at startup if the isolated production build does not exist.
await stat(path.join(root, 'index.html'));

const server = http.createServer(async (request, response) => {
    try {
        if (request.method !== 'GET' && request.method !== 'HEAD') {
            response.writeHead(405).end();
            return;
        }
        const pathname = decodeURIComponent(new URL(request.url, origin).pathname);
        response.setHeader('X-Content-Type-Options', 'nosniff');
        if (Object.hasOwn(responses, pathname)) {
            response.setHeader('Content-Type', 'application/json');
            response.setHeader('Cache-Control', 'no-store');
            // Small, fixed API latency: data is not available instantaneously.
            await new Promise((resolve) => setTimeout(resolve, 50));
            response.end(
                request.method === 'HEAD' ? undefined : JSON.stringify(responses[pathname]),
            );
            return;
        }
        if (/^\/(api|widgets|services)(\/|$)/.test(pathname)) {
            console.error(`Missing Lighthouse fixture: ${pathname}`);
            response.writeHead(404).end();
            return;
        }
        let filename = path.resolve(root, `.${pathname}`);
        if (filename !== root && !filename.startsWith(`${root}${path.sep}`)) {
            response.writeHead(403).end();
            return;
        }
        if (!(await stat(filename).catch(() => null))?.isFile()) {
            if (pathname.startsWith('/assets/') || path.extname(pathname)) {
                response.writeHead(404).end();
                return;
            }
            filename = path.join(root, 'index.html');
        }
        const contentType = types[path.extname(filename)] || 'application/octet-stream';
        response.setHeader('Content-Type', contentType);
        response.setHeader('Content-Security-Policy', csp);
        response.setHeader('X-Frame-Options', 'DENY');
        response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
        response.setHeader(
            'Cache-Control',
            pathname.startsWith('/assets/') ? 'public, max-age=31536000' : 'no-cache',
        );
        response.setHeader('Vary', 'Accept-Encoding');
        let body = await readFile(filename);
        // Same gzip types and size threshold as the production nginx configuration.
        if (
            body.length >= 1024 &&
            /text\/html|text\/css|application\/javascript|image\/svg\+xml/.test(contentType) &&
            /\bgzip\b/.test(request.headers['accept-encoding'] || '')
        ) {
            body = gzipSync(body);
            response.setHeader('Content-Encoding', 'gzip');
        }
        response.end(request.method === 'HEAD' ? undefined : body);
    } catch (error) {
        console.error(error);
        response.writeHead(500).end();
    }
});

server.listen(4174, '127.0.0.1', () => console.log(`Lighthouse fixture ready: ${origin}`));
