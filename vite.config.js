import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const devBackendOrigin = process.env.VITE_DEV_BACKEND_ORIGIN || 'http://localhost:8080';

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
    proxy: {
      '/admin/api': {
        target: devBackendOrigin,
        changeOrigin: true,
        secure: false,
      },
      '/api': {
        target: devBackendOrigin,
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
