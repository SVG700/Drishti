# NEXORA God's Eye — File Manifest

This document provides a comprehensive inventory of all 32 files contained within the `TRANSFER` handoff package.

---

## Package Summary Table

| Category | File Count | Description |
| :--- | :---: | :--- |
| **Documentation & Guides** | 4 | README, Manifest, Integration Guide, Proxy Guide |
| **Configuration** | 3 | Package requirements, Environment template, Vite snippet |
| **Styles** | 1 | Cesium credit alignment, workstation theme, dark scrollbars |
| **Core Components** | 13 | GeoAnalysisView, SpatialIntelligenceView, HUD, Search, Shaders |
| **Services** | 3 | Flight provider engine, Spatial data adapter, Geocoding service |
| **Shared & Types** | 8 | Types (spatial, investigation), Motion wrappers, Badge, Synthetic data |
| **Total Files** | **32** | Complete, zero-dependency external handoff |

---

## Detailed File Inventory

### 1. Root & Documentation
* `TRANSFER/README.md`
  * **Category**: DOCUMENTATION
  * **Purpose**: Primary developer entrypoint and high-level architecture overview.
  * **Why Required**: Explains package purpose, features, prerequisites, and quickstart instructions.
* `TRANSFER/GODS-EYE-FILE-MANIFEST.md`
  * **Category**: DOCUMENTATION
  * **Purpose**: Full catalog of every file included in the transfer package.
  * **Why Required**: Guarantees no unexplained files and details role of every component.
* `TRANSFER/.env.example`
  * **Category**: CONFIG
  * **Purpose**: Template for runtime environment variables (`VITE_CESIUM_ION_TOKEN`, `VITE_AVIATIONSTACK_API_KEY`, etc.).
  * **Why Required**: Informs developer of supported key names without exposing actual credentials.
* `TRANSFER/package-requirements.json`
  * **Category**: CONFIG
  * **Purpose**: JSON catalog of exact npm package versions required by God's Eye.
  * **Why Required**: Allows teammates to run or merge exact package dependencies without guessing versions.

---

### 2. Integration Guides & Config
* `TRANSFER/integration/INTEGRATION-GUIDE.md`
  * **Category**: DOCUMENTATION
  * **Purpose**: Step-by-step instructions for placing files, installing packages, and routing.
  * **Why Required**: Allows any developer who did not build God's Eye to integrate it in under 5 minutes.
* `TRANSFER/integration/VITE-PROXY-REQUIREMENTS.md`
  * **Category**: DOCUMENTATION
  * **Purpose**: Technical details on the four reverse proxies (`/api/opensky`, `/api/aviationstack`, `/api/airlabs`, `/api/nominatim`).
  * **Why Required**: Explains how to circumvent browser CORS restrictions and forward custom user-agent headers.
* `TRANSFER/config/vite.config.snippet.ts`
  * **Category**: CONFIG
  * **Purpose**: Ready-to-merge TypeScript code snippet for `vite.config.ts`.
  * **Why Required**: Provides exact Vite plugin and proxy setup for copy-pasting.
* `TRANSFER/config/cesium.config.md`
  * **Category**: CONFIG
  * **Purpose**: Guide to Cesium WebGL asset bundling, keyless vs. Ion mode, and StrictMode lifecycle rules.
  * **Why Required**: Prevents common Cesium WebGL crashes, worker 404s, or dual-mount bugs.

---

### 3. Styling
* `TRANSFER/styles/gods-eye.css`
  * **Category**: STYLE
  * **Purpose**: Global CSS rules for Cesium credits repositioning, tactical grid overlay, and dark scrollbars.
  * **Why Required**: Prevents default large Cesium attribution banner from overlapping bottom-left HUD elements.

---

### 4. Core UI Components (`src/components/`)
* `TRANSFER/src/components/geo/GeoAnalysisView.tsx`
  * **Category**: CORE
  * **Purpose**: Geospatial workspace shell providing 3D Cesium Globe vs. 2D Tactical Grid tab switcher.
  * **Why Required**: Primary container component mounted to route `/geo`.
* `TRANSFER/src/components/spatial/SpatialIntelligenceView.tsx`
  * **Category**: CORE
  * **Purpose**: The main 3D Cesium God's Eye View engine.
  * **Why Required**: Hosts the Cesium Viewer, camera animations, entity billboards, drop lines, flight corridors, shader passes, and telemetry HUD.
* `TRANSFER/src/components/spatial/DetectionOverlay.tsx`
  * **Category**: CORE
  * **Purpose**: Screen-space 2D Canvas overlay that renders military-style tactical detection boxes on active entities.
  * **Why Required**: Synchronizes with 3D Cartesian coordinates and draws locked bounding brackets around tracked aircraft.
* `TRANSFER/src/components/spatial/TacticalHUD.tsx`
  * **Category**: CORE
  * **Purpose**: God's Eye heads-up display rendering crosshairs, telemetry readouts, and dynamic sector indicators.
  * **Why Required**: Displays dynamic sector names (`{SECTOR} • TACTICAL ORBIT ACTIVE`) and camera telemetry.
* `TRANSFER/src/components/spatial/FlightSearchControl.tsx`
  * **Category**: CORE
  * **Purpose**: Universal Tactical Search bar handling Flights, Locations, and Coordinates.
  * **Why Required**: Features automatic query classification, candidate previews, arrow-key navigation, and camera fly-to triggers.
* `TRANSFER/src/components/spatial/orbitController.ts`
  * **Category**: UTILITY
  * **Purpose**: Smooth 60 FPS target orbit controller utilizing Cesium's `scene.preRender` event.
  * **Why Required**: Powers the "Tactical Orbit Active" continuous reconnaissance camera rotation.
* `TRANSFER/src/components/spatial/sectorResolver.ts`
  * **Category**: UTILITY
  * **Purpose**: Offline coordinate-to-sector resolver for metropolitan, maritime, and regional sectors.
  * **Why Required**: Converts coordinates into tactical designations (e.g. `BENGALURU METRO SECTOR`, `ARABIAN SEA SECTOR`).
* `TRANSFER/src/components/spatial/SpatialErrorBoundary.tsx`
  * **Category**: UTILITY
  * **Purpose**: React Error Boundary isolating WebGL/Cesium context exceptions.
  * **Why Required**: Prevents WebGL driver issues from crashing the entire host application.
* `TRANSFER/src/components/spatial/shaders/surveillanceShader.ts`
  * **Category**: CORE
  * **Purpose**: GLSL post-process shader for Night Vision (NVG) green phosphor (530nm) simulation.
  * **Why Required**: Multi-sensor surveillance mode.
* `TRANSFER/src/components/spatial/shaders/thermalShader.ts`
  * **Category**: CORE
  * **Purpose**: GLSL post-process shader for FLIR thermal infrared ironbow visualization.
  * **Why Required**: Multi-sensor surveillance mode.
* `TRANSFER/src/components/spatial/shaders/retroShader.ts`
  * **Category**: CORE
  * **Purpose**: GLSL post-process shader for CRT phosphor terminal scanlines and curvature.
  * **Why Required**: Multi-sensor surveillance mode.
* `TRANSFER/src/components/spatial/shaders/noirShader.ts`
  * **Category**: CORE
  * **Purpose**: GLSL post-process shader for high-contrast monochrome satellite reconnaissance.
  * **Why Required**: Multi-sensor surveillance mode.
* `TRANSFER/src/components/spatial/shaders/snowShader.ts`
  * **Category**: CORE
  * **Purpose**: GLSL post-process shader for Arctic / blizzard visual enhancement.
  * **Why Required**: Multi-sensor surveillance mode.

---

### 5. Services (`src/services/`)
* `TRANSFER/src/services/flightDataProvider.ts`
  * **Category**: SERVICE
  * **Purpose**: Live global ADS-B flight tracking engine with multi-provider failover.
  * **Why Required**: Integrates Aviationstack, AirLabs, OpenSky, coordinate normalization, deduplication, and synthetic corridor failovers.
* `TRANSFER/src/services/spatialDataAdapter.ts`
  * **Category**: SERVICE
  * **Purpose**: Reactive adapter bridging NEXORA investigative entities and spatial points to the 3D globe.
  * **Why Required**: Transforms entities, phones, vehicles, and organizations into `SpatialEntity` and `SpatialRelationship` graphs.
* `TRANSFER/src/services/geocodingService.ts`
  * **Category**: SERVICE
  * **Purpose**: Tactical geocoding service for the Universal Search bar.
  * **Why Required**: Resolves place names (e.g. Yelahanka, Bengaluru, Kempegowda, London) via curated offline directory and OSM Nominatim.

---

### 6. Shared & Supporting Files
* `TRANSFER/src/types/spatial.ts`
  * **Category**: SHARED / TYPES
  * **Purpose**: TypeScript definitions for spatial entities, telemetry, sensor modes, and map stacks.
  * **Why Required**: Strongly types all Cesium interactions.
* `TRANSFER/src/types/investigation.ts`
  * **Category**: SHARED / TYPES
  * **Purpose**: TypeScript definitions for core entities, geolocation points, severity levels, and relationships.
  * **Why Required**: Required by `GeoAnalysisView` and `Badge.tsx`.
* `TRANSFER/src/data/syntheticData.ts`
  * **Category**: SHARED / DATA
  * **Purpose**: Initial seed targets (Location C, Safehouse, cell towers, subjects) for the investigation corridor.
  * **Why Required**: Supplies `INITIAL_GEO_POINTS` and `INITIAL_ENTITIES` so the globe is populated immediately on mount.
* `TRANSFER/src/components/motion/MotionPage.tsx`
  * **Category**: SHARED / UI
  * **Purpose**: Page wrapper providing standard Framer Motion entrance/exit transitions.
  * **Why Required**: Wraps `GeoAnalysisView`.
* `TRANSFER/src/components/motion/SpatialPage.tsx`
  * **Category**: SHARED / UI
  * **Purpose**: 3D spatial perspective layout container with reduced-motion support.
  * **Why Required**: Base container for `MotionPage`.
* `TRANSFER/src/components/motion/spatialConfig.ts`
  * **Category**: SHARED / UI
  * **Purpose**: Configuration constants for 3D perspective and spring physics.
  * **Why Required**: Supplies perspective constants to `SpatialPage`.
* `TRANSFER/src/components/common/Badge.tsx`
  * **Category**: SHARED / UI
  * **Purpose**: Color-coded tactical status and entity-type chip component.
  * **Why Required**: Renders entity category badges in the God's Eye intelligence drawer.
