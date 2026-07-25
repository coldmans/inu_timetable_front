const rawBackendOrigin = process.env.BACKEND_ORIGIN;

if (!rawBackendOrigin) {
  throw new Error('BACKEND_ORIGIN is required for Vercel API rewrites.');
}

const backendOrigin = rawBackendOrigin.replace(/\/+$/, '');

export const config = {
  rewrites: [
    {
      source: '/api/:path*',
      destination: `${backendOrigin}/api/:path*`,
    },
    {
      source: '/admin/api/:path*',
      destination: `${backendOrigin}/admin/api/:path*`,
    },
    {
      source: '/(.*)',
      destination: '/index.html',
    },
  ],
};
