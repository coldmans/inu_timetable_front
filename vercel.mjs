import { deploymentEnv, routes } from '@vercel/config/v1';

export const config = {
  headers: [
    routes.header('/(.*)', [
      {
        key: 'Content-Security-Policy',
        value: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; font-src 'self' https://cdn.jsdelivr.net data:; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests",
      },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
    ]),
  ],
  rewrites: [
    routes.rewrite(
      '/api/:path*',
      `${deploymentEnv('BACKEND_ORIGIN')}/api/:path*`,
    ),
    routes.rewrite(
      '/admin/api/:path*',
      `${deploymentEnv('BACKEND_ORIGIN')}/admin/api/:path*`,
    ),
    routes.rewrite('/(.*)', '/index.html'),
  ],
};
