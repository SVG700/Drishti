# NEXORA God's Eye — Comprehensive Integration Guide

This guide walks you step-by-step through integrating the **God's Eye / 3D Spatial Intelligence subsystem** into your React application using **only the files inside this `TRANSFER` folder**.

---

## Prerequisites & Compatibility

* **Node.js**: v18.0.0 or higher (v20+ recommended).
* **React**: React 18 or React 19.
* **Build Tool**: Vite v5, v6, or v8.
* **Styling**: Tailwind CSS (v3 or v4).
* **Browser**: Chrome, Edge, Firefox, or Safari with WebGL2 support.

---

## Step 1: Copy Source Files

Copy the contents of `TRANSFER/src/` directly into your application's `src/` directory:

```bash
# If your project root is my-app:
cp -r TRANSFER/src/* my-app/src/
```

### Destination Tree in Your Application
```
my-app/src/
├── components/
│   ├── geo/
│   │   └── GeoAnalysisView.tsx
│   ├── spatial/
│   │   ├── SpatialIntelligenceView.tsx
│   │   ├── DetectionOverlay.tsx
│   │   ├── TacticalHUD.tsx
│   │   ├── FlightSearchControl.tsx
│   │   ├── orbitController.ts
│   │   ├── sectorResolver.ts
│   │   ├── SpatialErrorBoundary.tsx
│   │   └── shaders/
│   │       ├── surveillanceShader.ts
│   │       ├── thermalShader.ts
│   │       ├── retroShader.ts
│   │       ├── noirShader.ts
│   │       └── snowShader.ts
│   ├── motion/
│   │   ├── MotionPage.tsx
│   │   ├── SpatialPage.tsx
│   │   └── spatialConfig.ts
│   └── common/
│       └── Badge.tsx
├── services/
│   ├── flightDataProvider.ts
│   ├── spatialDataAdapter.ts
│   └── geocodingService.ts
├── types/
│   ├── spatial.ts
│   └── investigation.ts
└── data/
    └── syntheticData.ts
```

---

## Step 2: Install Required NPM Dependencies

Run the following install command in your project root:

```bash
npm install cesium@^1.145.0 vite-plugin-cesium@^1.2.23 lucide-react@^1.46.0 framer-motion@^13.4.0 clsx@^2.1.1 tailwind-merge@^3.7.0
```

Refer to `TRANSFER/package-requirements.json` for exact peer dependency information.

---

## Step 3: Configure `vite.config.ts`

Open your `vite.config.ts` and merge the `vite-plugin-cesium` plugin and HTTP proxy endpoints:

```typescript
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import cesiumPlugin from 'vite-plugin-cesium';

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
      cesium() // Handles Cesium static assets and Web Workers
    ],
    define: {
      'import.meta.env.AIRLABS_API_KEY': JSON.stringify(env.AIRLABS_API_KEY || '')
    },
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
  };
});
```

---

## Step 4: Include Styles

Import `TRANSFER/styles/gods-eye.css` into your root CSS entrypoint (`src/index.css` or `src/main.tsx`):

```css
/* Inside your src/index.css */
@import "./styles/gods-eye.css";
```

Alternatively, copy the contents of `TRANSFER/styles/gods-eye.css` into your existing stylesheet.

---

## Step 5: Configure Environment Variables

Copy `TRANSFER/.env.example` to your application's `.env`:

```bash
cp TRANSFER/.env.example .env
```

Set any optional API keys you possess:
```env
# Optional: Cesium Ion Token (for Ion 3D photogrammetry and World Terrain)
VITE_CESIUM_ION_TOKEN=your_cesium_ion_token_here

# Optional: Aviationstack Key (Primary live flight telemetry feed)
VITE_AVIATIONSTACK_API_KEY=your_aviationstack_key_here

# Optional: AirLabs Key (Secondary live flight failover feed)
VITE_AIRLABS_API_KEY=your_airlabs_key_here
```
> **Note**: If left completely empty, God's Eye automatically operates in **Keyless Mode** using high-resolution Esri World Satellite imagery and OpenSky Network/synthetic flights!

---

## Step 6: Route Mounting & Component Integration

NEXORA God's Eye provides two entrypoint options:

### Option A: Standard Full View with 2D/3D Mode Switcher (`GeoAnalysisView`)
Use `GeoAnalysisView` if you want the full geospatial workspace with the 2D Tactical Grid toggle:

```tsx
import React from 'react';
import { GeoAnalysisView } from './components/geo/GeoAnalysisView';
import { INITIAL_GEO_POINTS } from './data/syntheticData';

export const GeoPage = () => {
  return (
    <div className="w-screen h-screen overflow-hidden bg-[#07090E]">
      <GeoAnalysisView
        geoPoints={INITIAL_GEO_POINTS}
        onNavigateTab={(tab) => console.log('Navigate to:', tab)}
        onSelectEntity={(entity) => console.log('Selected entity:', entity)}
      />
    </div>
  );
};
```

### Option B: Direct 3D Cesium God's Eye View (`SpatialIntelligenceView`)
Use `SpatialIntelligenceView` if you want direct access to the 3D globe, tactical HUD, multi-sensor post-processing shaders, and universal search bar:

```tsx
import React, { Suspense } from 'react';
import { SpatialErrorBoundary } from './components/spatial/SpatialErrorBoundary';
const SpatialIntelligenceView = React.lazy(() => import('./components/spatial/SpatialIntelligenceView'));

export const GodsEyeDirect = () => {
  return (
    <div className="w-full h-full overflow-hidden bg-[#07090E]">
      <SpatialErrorBoundary>
        <Suspense fallback={<div className="text-cyan-400 p-8">INITIALIZING GOD'S EYE...</div>}>
          <SpatialIntelligenceView
            onSelectEntity={(entity) => console.log('Entity:', entity)}
            onNavigateTab={(tab) => console.log('Tab:', tab)}
          />
        </Suspense>
      </SpatialErrorBoundary>
    </div>
  );
};
```

### Route Aliases
Mount your component to `/geo`. The system also recognizes these route patterns:
* `/geo` (Canonical)
* `/spatial-intelligence`
* `#/geo`
* `#/spatial-intelligence`

---

## Step 7: Verification Checklist

1. Start your dev server:
   ```bash
   npm run dev
   ```
2. Navigate to `http://localhost:5173/geo`.
3. Confirm the 3D Cesium globe loads with dark starry space, atmosphere, and satellite imagery.
4. **Flight Search**: Type `AI101` $\to$ Press Enter. Verify camera flies directly to the aircraft and centers it at 2,500m tactical distance.
5. **Location Search**: Type `Yelahanka` $\to$ Select result. Verify camera navigates to Bengaluru North ($13.1007^\circ\text{N}, 77.5963^\circ\text{E}$) at 15km overview range, and the Tactical HUD displays `BENGALURU METRO SECTOR • TACTICAL ORBIT ACTIVE`.
6. **Coordinate Search**: Type `13.1007, 77.5963` $\to$ Press Enter. Verify camera navigates directly to coordinates.
7. **Shaders**: Click the sensor buttons (`Optical`, `NVG`, `FLIR`, `CRT`, `Noir`, `Snow`) in the command bar to confirm WebGL GLSL post-processing stages engage seamlessly.
8. **Clear Target**: Click the `×` button on the search input to reset target focus back to the camera ground center.
