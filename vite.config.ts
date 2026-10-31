import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import cesiumPlugin from 'vite-plugin-cesium';

// Handle both default and named export variants of vite-plugin-cesium
const cesium = (
  typeof cesiumPlugin === 'function'
    ? cesiumPlugin
    : (cesiumPlugin as unknown as { default: () => Plugin }).default
) as () => Plugin;

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      tailwindcss(),
      cesium() // Handles Cesium static assets, web workers, and third-party libraries
    ],
    server: {
      proxy: {
        // OpenStreetMap Nominatim geocoding proxy for Location Search
        '/api/nominatim': {
          target: 'https://nominatim.openstreetmap.org',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/nominatim/, ''),
          headers: {
            'User-Agent': 'SIH26103-ProjectMonitoring/1.0'
          }
        },
        // Python FastAPI AI Backend proxies
        '/ai': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true
        },
        '/analytics': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true
        },
        '/projects': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true
        },
        '/health': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true
        }
      }
    }
  };
});
