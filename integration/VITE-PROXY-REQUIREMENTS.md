# Vite HTTP Reverse Proxy Requirements

NEXORA God's Eye uses Vite dev server reverse proxies to interface with third-party intelligence data feeds without exposing client-side credentials or triggering CORS blocks.

---

## Required Proxy Routes

| Route | Target | Purpose | Notes |
| :--- | :--- | :--- | :--- |
| `/api/opensky` | `https://opensky-network.org/api` | Live ADS-B state vectors | Public OpenSky Network API (no key required) |
| `/api/aviationstack` | `https://api.aviationstack.com/v1` | Primary live flight tracking | Uses `VITE_AVIATIONSTACK_API_KEY` |
| `/api/airlabs` | `https://airlabs.co/api/v9` | Secondary flight failover | Uses `VITE_AIRLABS_API_KEY` |
| `/api/nominatim` | `https://nominatim.openstreetmap.org` | Universal Location Geocoding | Injects `User-Agent: NexoraIntelligence/1.0` header |

---

## Configuration Code to Merge into `vite.config.ts`

Add or merge the following block inside your `defineConfig({ ... })` under the `server.proxy` object:

```typescript
// Inside vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api/opensky': {
        target: 'https://opensky-network.org/api',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/opensky/, '')
      },
      '/api/aviationstack': {
        target: 'https://api.aviationstack.com/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/aviationstack/, '')
      },
      '/api/airlabs': {
        target: 'https://airlabs.co/api/v9',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/airlabs/, '')
      },
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
});
```

---

## Why These Proxies Are Necessary

1. **Aviationstack & AirLabs CORS Restrictions**: Commercial flight APIs enforce CORS restrictions on direct browser `fetch()` requests from `http://localhost:*`. Proxying through Vite routes the request server-side, eliminating browser CORS errors.
2. **Nominatim Header Policy**: OpenStreetMap's Nominatim API requires an identifiable HTTP `User-Agent`. Browsers prohibit modifying the `User-Agent` header in direct client `fetch()` requests. The Vite proxy seamlessly injects the user agent header.
3. **Production Deployment**: For production deployments (e.g. Nginx, Cloudflare Pages, Netlify, or Vercel), replicate these four rewrite rules in your server configuration (e.g., `_redirects` or `nginx.conf`).
