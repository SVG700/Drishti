# Cesium Geospatial Runtime Configuration

This document describes the runtime requirements, asset loading pipelines, and Cesium Viewer configurations employed by **NEXORA God's Eye**.

---

## 1. Asset Bundling via `vite-plugin-cesium`

Cesium relies on dynamic Web Workers, Draco decompression binaries, KTX2 textures, and NaturalEarth baseline textures.

* In Vite projects, standard module bundlers do not automatically copy Cesium's multi-megabyte `Build/Cesium/Assets`, `Widgets`, `Workers`, and `ThirdParty` directories.
* The `vite-plugin-cesium` plugin automates this during both development (`vite dev`) and production builds (`vite build`).
* Ensure `cesium()` is included in your `plugins` array in `vite.config.ts`.

---

## 2. Keyless Mode vs. Cesium Ion Mode

NEXORA God's Eye supports two runtime operational modes:

### Keyless Mode (Default — 0 Setup)
When `VITE_CESIUM_ION_TOKEN` is unset or empty:
* **Imagery**: High-resolution **Esri World Satellite Imagery** (`ArcGisMapServerImageryProvider`).
* **Fallback Imagery**: **OpenStreetMap** raster tiles (`OpenStreetMapImageryProvider`).
* **Terrain**: Ellipsoid surface (WGS84) with NaturalEarth II baseline textures.
* **Cost / Tokens**: 100% free, no account or API token required.

### Cesium Ion Mode (Optional)
When `VITE_CESIUM_ION_TOKEN` is supplied:
* Automatically injects `Cesium.Ion.defaultAccessToken = token`.
* Enables **Cesium World Terrain** with real-time elevation profiling and mountain topology.
* Enables **Bing Maps Aerial** and **Cesium OSM 3D Buildings** photogrammetry.
* Enables **Google Photorealistic 3D Tiles** if `VITE_GOOGLE_MAPS_API_KEY` is provided.

---

## 3. WebGL Lifecycle & React StrictMode

`SpatialIntelligenceView.tsx` implements robust lifecycle management:
* **Double Mount Protection**: Cleans up previous Cesium Viewer instances before re-initializing to avoid WebGL context loss during React 18/19 StrictMode remounts.
* **Canvas Disposal**: Checks `viewer.isDestroyed()` before invoking camera operations or clearing entities.
* **Post-Process Shaders**: Stages (Surveillance, Thermal FLIR, Retro CRT, Noir, Snow) are managed via `viewer.scene.postProcessStages`.
* **Framerate Capping**: Capped at 60 FPS (`viewer.targetFrameRate = 60`) with throttled camera movement handlers (`viewer.camera.moveEnd`) to keep React renders at 0 overhead during flight simulations.
