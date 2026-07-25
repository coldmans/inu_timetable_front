import { deploymentEnv, routes } from '@vercel/config/v1';

export const config = {
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
