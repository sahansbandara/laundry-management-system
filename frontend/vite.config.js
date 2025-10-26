// vite.config.js
const FRONTEND_DEV_PORT = 43876;
const BACKEND_ORIGIN = 'http://localhost:42876';

export default {
  server: {
    host: '0.0.0.0',
    port: FRONTEND_DEV_PORT,
    strictPort: true,
    proxy: {
      '/api': {
        target: BACKEND_ORIGIN,
        changeOrigin: true
      }
    }
  }
};
