import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const backendOrigin = process.env.VITE_DEV_BACKEND_ORIGIN || process.env.VITE_BACKEND_ORIGIN || 'http://localhost:8080';
const apiProxy = {
  '/api': {
    target: backendOrigin,
    changeOrigin: true,
    secure: false,
  },
  '/admin/api': {
    target: backendOrigin,
    changeOrigin: true,
    secure: false,
  },
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
        },
      },
    },
  },
  server: {
    // Proxy API requests to the backend during local development.
    proxy: apiProxy,
  },
  preview: {
    // Keep the production bundle testable against the same backend contract.
    proxy: apiProxy,
  },
});
