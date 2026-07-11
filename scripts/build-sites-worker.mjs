import { cp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const workerSource = String.raw`
const API_PATHS = ['/api', '/admin/api'];

function isApiPath(pathname) {
  return API_PATHS.some((path) => pathname === path || pathname.startsWith(path + '/'));
}

function getBackendOrigin(env) {
  const origin = env.BACKEND_ORIGIN || '';
  return origin.replace(/\/+$/, '');
}

function shouldServeAppShell(request, response) {
  if (response.status !== 404) {
    return false;
  }

  const accept = request.headers.get('accept') || '';
  const url = new URL(request.url);
  const lastSegment = url.pathname.split('/').pop() || '';
  const looksLikeStaticFile = lastSegment.includes('.');

  return accept.includes('text/html') || !looksLikeStaticFile;
}

async function proxyApiRequest(request, env) {
  const backendOrigin = getBackendOrigin(env);

  if (!backendOrigin) {
    return new Response(
      JSON.stringify({ message: 'BACKEND_ORIGIN is not configured.' }),
      {
        status: 503,
        headers: { 'content-type': 'application/json; charset=utf-8' },
      },
    );
  }

  const incomingUrl = new URL(request.url);
  const targetUrl = new URL(incomingUrl.pathname + incomingUrl.search, backendOrigin);
  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('origin');
  headers.delete('referer');

  const init = {
    method: request.method,
    headers,
    redirect: 'manual',
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = request.body;
  }

  return fetch(new Request(targetUrl, init));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (isApiPath(url.pathname)) {
      return proxyApiRequest(request, env);
    }

    const assetResponse = await env.ASSETS.fetch(request);
    if (!shouldServeAppShell(request, assetResponse)) {
      return assetResponse;
    }

    return env.ASSETS.fetch(new Request(new URL('/index.html', request.url), request));
  },
};
`.trimStart();

await mkdir('dist/server', { recursive: true });
await writeFile('dist/server/index.js', workerSource + '\n');

await rm('dist/client', { recursive: true, force: true });
await mkdir('dist/client', { recursive: true });

const entries = await readdir('dist', { withFileTypes: true });
for (const entry of entries) {
  if (entry.name === 'client' || entry.name === 'server' || entry.name === '.openai') {
    continue;
  }

  await cp(join('dist', entry.name), join('dist/client', entry.name), {
    recursive: entry.isDirectory(),
  });
}
