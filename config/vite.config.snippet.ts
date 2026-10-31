/**
 * NEXORA God's Eye — Vite Configuration Reference Snippet
 * 
 * Merge this snippet into your existing `vite.config.ts`.
 * It configures:
 * 1. `vite-plugin-cesium` to serve and bundle Cesium static assets and workers.
 * 2. HTTP reverse proxies for OpenSky, Aviationstack, AirLabs, and OpenStreetMap Nominatim.
 */

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
      cesium() // REQUIRED: Handles Cesium static assets, web workers, and third-party libraries
    ],
    define: {
      // Expose AirLabs key safely if needed by the runtime provider
      'import.meta.env.AIRLABS_API_KEY': JSON.stringify(env.AIRLABS_API_KEY || '')
    },
    server: {
      proxy: {
        // OpenSky Network live ADS-B corridor feed
        '/api/opensky': {
          target: 'https://opensky-network.org/api',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/opensky/, '')
        },

        // Aviationstack primary global live flight API
        '/api/aviationstack': {
          target: 'https://api.aviationstack.com/v1',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/aviationstack/, '')
        },

        // AirLabs secondary live flight failover API
        '/api/airlabs': {
          target: 'https://airlabs.co/api/v9',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/airlabs/, '')
        },

        // OpenStreetMap Nominatim geocoding proxy for Universal Location Search
        '/api/nominatim': {
          target: 'https://nominatim.openstreetmap.org',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/nominatim/, ''),
          headers: {
            'User-Agent': 'NexoraIntelligence/1.0 (tactical-recon)'
          }
        }
      }
    }
  };
});
