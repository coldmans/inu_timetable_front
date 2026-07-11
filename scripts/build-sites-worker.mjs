import { mkdir, writeFile } from 'node:fs/promises';

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
  return accept.includes('text/html');
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
