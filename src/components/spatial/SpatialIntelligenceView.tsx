import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe,
  Camera,
  Navigation,
  Crosshair,
  RefreshCw,
  GitFork,
  Building2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  RotateCcw,
  Layers,
  MapPin,
  ExternalLink,
  Info,
  Compass
} from 'lucide-react';
import type {
  InfrastructureProject,
  ProjectSector,
  ProjectStatus,
  ProjectRiskLevel,
  ProjectFilterCriteria
} from '../../types/project';
import type {
  SpatialEntity,
  SpatialRelationship,
  SpatialMapStack,
  SpatialTelemetry
} from '../../types/spatial';
import { projectToSpatialEntity } from '../../services/spatialDataAdapter';
import { OrbitController } from './orbitController';
import { DetectionOverlay } from './DetectionOverlay';
import { TacticalHUD } from './TacticalHUD';
import { FlightSearchControl, type UniversalLocationTarget } from './FlightSearchControl';
import { resolveSector } from './sectorResolver';
import { Badge } from '../common/Badge';
import { ProjectHistoryChart } from './ProjectHistoryChart';

// State and Union Territory centroid coordinates for regional overview camera navigation
const STATE_CENTROIDS: Record<string, { lat: number; lon: number; height: number }> = {
  'Maharashtra': { lat: 19.7515, lon: 75.7139, height: 850000 },
  'Gujarat': { lat: 22.2587, lon: 71.1924, height: 800000 },
  'Uttar Pradesh': { lat: 26.8467, lon: 80.9462, height: 950000 },
  'Delhi': { lat: 28.7041, lon: 77.1025, height: 140000 },
  'Karnataka': { lat: 15.3173, lon: 75.7139, height: 850000 },
  'Tamil Nadu': { lat: 11.1271, lon: 78.6569, height: 850000 },
  'West Bengal': { lat: 22.9868, lon: 87.8550, height: 850000 },
  'Bihar': { lat: 25.0961, lon: 85.3131, height: 800000 },
  'Madhya Pradesh': { lat: 22.9734, lon: 78.6569, height: 1000000 },
  'Rajasthan': { lat: 27.0238, lon: 74.2179, height: 1000000 },
  'Odisha': { lat: 20.9517, lon: 85.0985, height: 850000 },
  'Andhra Pradesh': { lat: 15.9129, lon: 79.7400, height: 900000 },
  'Telangana': { lat: 18.1124, lon: 79.0193, height: 800000 },
  'Kerala': { lat: 10.8505, lon: 76.2711, height: 750000 },
  'Punjab': { lat: 31.1471, lon: 75.3412, height: 650000 },
  'Haryana': { lat: 29.0588, lon: 76.0856, height: 650000 },
  'Assam': { lat: 26.2006, lon: 92.9376, height: 750000 },
  'Jammu & Kashmir': { lat: 33.7782, lon: 76.5762, height: 750000 },
  'Ladakh': { lat: 34.1526, lon: 77.5771, height: 650000 },
  'Himachal Pradesh': { lat: 31.1048, lon: 77.1734, height: 650000 },
  'Uttarakhand': { lat: 30.0668, lon: 79.0193, height: 650000 },
  'Chhattisgarh': { lat: 21.2787, lon: 81.8661, height: 800000 },
  'Jharkhand': { lat: 23.6102, lon: 85.2799, height: 750000 },
  'Goa': { lat: 15.2993, lon: 74.1240, height: 220000 },
  'Tripura': { lat: 23.9408, lon: 91.9882, height: 400000 },
  'Manipur': { lat: 24.6637, lon: 93.9063, height: 450000 },
  'Meghalaya': { lat: 25.4670, lon: 91.3662, height: 450000 },
  'Mizoram': { lat: 23.1645, lon: 92.9376, height: 450000 },
  'Nagaland': { lat: 26.1584, lon: 94.5624, height: 450000 },
  'Arunachal Pradesh': { lat: 28.2180, lon: 94.7278, height: 800000 },
  'Sikkim': { lat: 27.5330, lon: 88.5122, height: 350000 },
  'Multi State': { lat: 22.0000, lon: 79.0000, height: 3500000 }
};

// Ensure Cesium Ion defaultAccessToken is bound immediately if configured
const defaultIonToken = (import.meta.env.VITE_CESIUM_ION_TOKEN as string | undefined)?.trim() || '';
if (defaultIonToken) {
  Cesium.Ion.defaultAccessToken = defaultIonToken;
}

// Color styling for 3D corridor network links between infrastructure nodes
function getCorridorLinkColor(type?: string): Cesium.Color {
  switch (type) {
    case 'Corridor Connectivity':
      return Cesium.Color.fromCssColorString('#38bdf8').withAlpha(0.7);
    case 'Supply Chain':
      return Cesium.Color.fromCssColorString('#fbbf24').withAlpha(0.7);
    case 'Power Transmission':
      return Cesium.Color.fromCssColorString('#f59e0b').withAlpha(0.7);
    case 'Water Transfer':
      return Cesium.Color.fromCssColorString('#2dd4bf').withAlpha(0.7);
    default:
      return Cesium.Color.fromCssColorString('#06b6d4').withAlpha(0.65);
  }
}

export interface SpatialIntelligenceViewProps {
  projects?: InfrastructureProject[];
  selectedProjectId?: string | null;
  onSelectProject?: (project: InfrastructureProject | null) => void;
  onNavigateTab?: (tab: string) => void;
  initialSelectedEntityId?: string | null;
}

export const SpatialIntelligenceView: React.FC<SpatialIntelligenceViewProps> = ({
  projects = [],
  selectedProjectId: propSelectedProjectId,
  onSelectProject,
  onNavigateTab,
  initialSelectedEntityId
}) => {
  const cesiumContainerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const [viewerInstance, setViewerInstance] = useState<Cesium.Viewer | null>(null);
  const orbitControllerRef = useRef<OrbitController | null>(null);
  const entityPrimitivesRef = useRef<Map<string, Cesium.Entity>>(new Map());
  const dropLinesRef = useRef<Map<string, Cesium.Entity>>(new Map());
  const networkLinkEntitiesRef = useRef<Map<string, Cesium.Entity>>(new Map());
  const active3DTilesetRef = useRef<Cesium.Cesium3DTileset | null>(null);
  const onCesiumClickRef = useRef<(movement: { position: Cesium.Cartesian2 }) => void>(() => {});

  // Read Cesium Ion access token securely from Vite environment
  const rawIonToken = import.meta.env.VITE_CESIUM_ION_TOKEN;
  const ionToken = typeof rawIonToken === 'string' ? rawIonToken.trim() : '';
  const hasIonToken = Boolean(ionToken);

  // Filter State
  const [filterSector, setFilterSector] = useState<string | 'ALL'>('ALL');
  const [filterState, setFilterState] = useState<string | 'ALL'>('ALL');
  const [filterStatus, setFilterStatus] = useState<ProjectStatus | 'ALL'>('ALL');
  const [filterRisk, setFilterRisk] = useState<ProjectRiskLevel | 'ALL'>('ALL');
  const [filterGeocoding, setFilterGeocoding] = useState<'ALL' | 'GEOLOCATED_ONLY' | 'PENDING_GEOCODING'>('ALL');
  const [showFilterBar, setShowFilterBar] = useState<boolean>(true);

  // Available Sectors & States derived dynamically from provided projects
  const availableSectors = useMemo(() => {
    return Array.from(new Set(projects.map(p => p.sector).filter(Boolean))).sort();
  }, [projects]);

  const availableStates = useMemo(() => {
    return Array.from(new Set(projects.map(p => p.state).filter(Boolean))).sort();
  }, [projects]);

  // Filtered Projects computation
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      if (filterSector !== 'ALL' && p.sector !== filterSector) return false;
      if (filterState !== 'ALL' && p.state !== filterState) return false;
      if (filterStatus !== 'ALL' && p.status !== filterStatus) return false;
      if (filterRisk !== 'ALL' && p.riskLevel !== filterRisk) return false;
      if (filterGeocoding === 'GEOLOCATED_ONLY' && !p.hasCoordinates) return false;
      if (filterGeocoding === 'PENDING_GEOCODING' && p.hasCoordinates) return false;
      return true;
    });
  }, [projects, filterSector, filterState, filterStatus, filterRisk, filterGeocoding]);

  const geocodedCount = useMemo(() => {
    return filteredProjects.filter(p => p.hasCoordinates).length;
  }, [filteredProjects]);

  const hasActiveFilters =
    filterSector !== 'ALL' ||
    filterState !== 'ALL' ||
    filterStatus !== 'ALL' ||
    filterRisk !== 'ALL' ||
    filterGeocoding !== 'ALL';

  const resetFilters = useCallback(() => {
    setFilterSector('ALL');
    setFilterState('ALL');
    setFilterStatus('ALL');
    setFilterRisk('ALL');
    setFilterGeocoding('ALL');
  }, []);

  // Selection state
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(
    propSelectedProjectId || initialSelectedEntityId || projects[0]?.id || null
  );
  const [selectedRelationshipId, setSelectedRelationshipId] = useState<string | null>(null);

  // Map Controls State
  const [mapStack, setMapStack] = useState<SpatialMapStack>(hasIonToken ? 'ion-aerial' : 'esri-imagery');
  const [showDetectionOverlay, setShowDetectionOverlay] = useState<boolean>(false);
  const [showHUD, setShowHUD] = useState<boolean>(true);
  const [showCorridors, setShowCorridors] = useState<boolean>(true);
  const [isOrbiting, setIsOrbiting] = useState<boolean>(false);
  const [isViewerReady, setIsViewerReady] = useState<boolean>(false);
  const [cameraCenter, setCameraCenter] = useState<{ latitude: number; longitude: number }>({
    latitude: 22.3072,
    longitude: 73.1812
  });
  const [activeLocationTarget, setActiveLocationTarget] = useState<UniversalLocationTarget | null>(null);

  const [telemetry, setTelemetry] = useState<SpatialTelemetry>({
    latitude: 22.3072,
    longitude: 73.1812,
    altitude: 4500,
    heading: 35,
    pitch: -38,
    roll: 0,
    cameraRange: 4500,
    fov: 60,
    mgrs: '43QDA 7318 2230'
  });

  // Sync selected project ID from props if provided
  useEffect(() => {
    if (propSelectedProjectId !== undefined) {
      setSelectedEntityId(propSelectedProjectId);
    }
  }, [propSelectedProjectId]);

  // Convert filtered projects into SpatialEntities for Cesium
  const displayedEntities = useMemo(() => {
    return filteredProjects.map(projectToSpatialEntity);
  }, [filteredProjects]);

  // Compute 3D corridor relationships between filtered projects
  const relationships = useMemo(() => {
    const list: SpatialRelationship[] = [];
    const validIds = new Set(filteredProjects.map(p => p.id));
    const processedPairs = new Set<string>();

    filteredProjects.forEach(p => {
      if (p.connectedProjectIds && p.connectedProjectIds.length > 0) {
        p.connectedProjectIds.forEach(targetId => {
          if (validIds.has(targetId)) {
            const pairKey = [p.id, targetId].sort().join('<->');
            if (!processedPairs.has(pairKey)) {
              processedPairs.add(pairKey);
              list.push({
                id: `corridor-${pairKey}`,
                source: p.id,
                target: targetId,
                type: 'Corridor Connectivity',
                confidence: 95
              });
            }
          }
        });
      }
    });

    return list;
  }, [filteredProjects]);

  // ── Initialize Cesium Viewer Lifecycle ──────────────────
  useEffect(() => {
    const container = cesiumContainerRef.current;
    if (!container) return;

    if (viewerRef.current && !viewerRef.current.isDestroyed()) {
      try {
        viewerRef.current.destroy();
      } catch {}
      viewerRef.current = null;
    }

    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    const rawIonToken = import.meta.env.VITE_CESIUM_ION_TOKEN;
    const ionToken = typeof rawIonToken === 'string' ? rawIonToken.trim() : '';
    const hasIonToken = Boolean(ionToken);

    if (hasIonToken) {
      Cesium.Ion.defaultAccessToken = ionToken;
    }

    let viewer: Cesium.Viewer;
    try {
      viewer = new Cesium.Viewer(container, {
        timeline: false,
        animation: false,
        baseLayerPicker: false,
        geocoder: false,
        homeButton: false,
        sceneModePicker: false,
        navigationHelpButton: false,
        fullscreenButton: false,
        vrButton: false,
        selectionIndicator: false,
        infoBox: false,
        baseLayer: false,
        msaaSamples: 2,
        contextOptions: {
          webgl: {
            preserveDrawingBuffer: true,
            failIfMajorPerformanceCaveat: false
          }
        }
      });
    } catch (viewerErr) {
      console.error('[SpatialView] Fatal Cesium Viewer WebGL creation error:', viewerErr);
      return;
    }

    // Keep NaturalEarthII as instant fallback base layer
    try {
      Cesium.TileMapServiceImageryProvider.fromUrl(
        Cesium.buildModuleUrl('Assets/Textures/NaturalEarthII')
      ).then(defaultProvider => {
        if (!viewer.isDestroyed() && viewer.imageryLayers.length === 0) {
          viewer.imageryLayers.addImageryProvider(defaultProvider);
        }
      }).catch(() => {});
    } catch {}

    viewerRef.current = viewer;
    (window as any).cesiumViewer = viewer;
    setViewerInstance(viewer);

    if (hasIonToken) {
      Cesium.createWorldTerrainAsync({
        requestVertexNormals: true,
        requestWaterMask: true
      })
        .then(terrainProvider => {
          if (!viewer.isDestroyed()) {
            viewer.terrainProvider = terrainProvider;
          }
        })
        .catch(err => {
          console.warn('[SpatialView] Cesium World Terrain fallback to ellipsoid:', err?.message || err);
        });
    }

    const loadInitialImagery = async () => {
      if (hasIonToken) {
        try {
          const ionImagery = await Cesium.createWorldImageryAsync({
            style: Cesium.IonWorldImageryStyle.AERIAL_WITH_LABELS
          });
          if (!viewer.isDestroyed()) {
            viewer.imageryLayers.removeAll();
            viewer.imageryLayers.addImageryProvider(ionImagery);
            return;
          }
        } catch (err) {
          console.warn('[SpatialView] Cesium Ion imagery fallback to Esri/OSM:', err);
        }
      }

      // High-resolution satellite imagery directly from Esri server
      try {
        const esriImagery = new Cesium.UrlTemplateImageryProvider({
          url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          maximumLevel: 19,
          credit: 'Esri, Maxar, Earthstar Geographics'
        });
        if (!viewer.isDestroyed()) {
          viewer.imageryLayers.removeAll();
          viewer.imageryLayers.addImageryProvider(esriImagery);
          return;
        }
      } catch (err) {
        console.warn('[SpatialView] Esri direct tile fallback to OSM:', err);
        const osm = new Cesium.UrlTemplateImageryProvider({
          url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          maximumLevel: 19,
          credit: 'OpenStreetMap contributors'
        });
        if (!viewer.isDestroyed()) {
          viewer.imageryLayers.removeAll();
          viewer.imageryLayers.addImageryProvider(osm);
        }
      }
    };

    loadInitialImagery();

    viewer.targetFrameRate = 60;
    viewer.scene.globe.show = true;
    viewer.scene.globe.enableLighting = false; // Always uniformly illuminate earth so terrain/geography is clearly visible
    if (viewer.scene.skyAtmosphere) {
      viewer.scene.skyAtmosphere.show = true;
      viewer.scene.skyAtmosphere.atmosphereLightIntensity = 10.0;
    }

    const orbitController = new OrbitController(viewer);
    orbitControllerRef.current = orbitController;

    // Initial camera position — Overview of Central / Western India Corridor
    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(75.5000, 21.0000, 2200000),
      orientation: {
        heading: 0,
        pitch: Cesium.Math.toRadians(-75),
        roll: 0.0
      }
    });

    const updateTelemetry = () => {
      if (viewer.isDestroyed()) return;
      const camera = viewer.camera;
      const carto = Cesium.Cartographic.fromCartesian(camera.position);

      const lat = Cesium.Math.toDegrees(carto.latitude);
      const lon = Cesium.Math.toDegrees(carto.longitude);
      const alt = carto.height;
      const heading = Cesium.Math.toDegrees(camera.heading);
      const pitch = Cesium.Math.toDegrees(camera.pitch);
      const roll = Cesium.Math.toDegrees(camera.roll);

      let centerLat = lat;
      let centerLon = lon;
      try {
        const centerPos = viewer.camera.pickEllipsoid(
          new Cesium.Cartesian2(viewer.canvas.clientWidth / 2, viewer.canvas.clientHeight / 2),
          viewer.scene.globe.ellipsoid
        );
        if (centerPos) {
          const centerCarto = Cesium.Cartographic.fromCartesian(centerPos);
          centerLat = Cesium.Math.toDegrees(centerCarto.latitude);
          centerLon = Cesium.Math.toDegrees(centerCarto.longitude);
        }
      } catch {}

      setCameraCenter({ latitude: centerLat, longitude: centerLon });

      setTelemetry({
        latitude: lat,
        longitude: lon,
        altitude: alt,
        heading,
        pitch,
        roll,
        cameraRange: alt,
        fov: camera.frustum instanceof Cesium.PerspectiveFrustum && typeof camera.frustum.fov === 'number'
          ? Cesium.Math.toDegrees(camera.frustum.fov)
          : 60,
        mgrs: `43QDA ${(Math.abs(lon * 100) % 10000).toFixed(0)} ${(Math.abs(lat * 100) % 10000).toFixed(0)}`
      });
    };

    const removeMoveListener = viewer.camera.moveEnd.addEventListener(updateTelemetry);

    const clickHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    clickHandler.setInputAction((movement: any) => {
      if (movement && movement.position) {
        onCesiumClickRef.current(movement);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    setIsViewerReady(true);

    return () => {
      removeMoveListener();
      clickHandler.destroy();
      if (active3DTilesetRef.current && !viewer.isDestroyed()) {
        try {
          viewer.scene.primitives.remove(active3DTilesetRef.current);
        } catch {}
        active3DTilesetRef.current = null;
      }
      orbitController.destroy();

      entityPrimitivesRef.current.clear();
      dropLinesRef.current.clear();
      networkLinkEntitiesRef.current.clear();

      if (!viewer.isDestroyed()) {
        viewer.destroy();
      }

      if (viewerRef.current === viewer) {
        viewerRef.current = null;
        setIsViewerReady(false);
      }
      setViewerInstance(prev => (prev === viewer ? null : prev));
      if (orbitControllerRef.current === orbitController) {
        orbitControllerRef.current = null;
      }
    };
  }, []);

  // ── Sync Base Map Imagery Stack ─────────────────────────
  const handleSwitchMapStack = useCallback((stack: SpatialMapStack) => {
    setMapStack(stack);
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;

    if (active3DTilesetRef.current) {
      viewer.scene.primitives.remove(active3DTilesetRef.current);
      active3DTilesetRef.current = null;
    }
    viewer.scene.globe.show = true;
    viewer.imageryLayers.removeAll();

    if (stack === 'ion-aerial') {
      Cesium.createWorldImageryAsync({
        style: Cesium.IonWorldImageryStyle.AERIAL_WITH_LABELS
      })
        .then(provider => {
          if (!viewer.isDestroyed()) {
            viewer.imageryLayers.removeAll();
            viewer.imageryLayers.addImageryProvider(provider);
          }
        })
        .catch(() => {
          Cesium.ArcGisMapServerImageryProvider.fromUrl(
            'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer',
            { enablePickFeatures: false }
          ).then(esri => {
            if (!viewer.isDestroyed()) {
              viewer.imageryLayers.removeAll();
              viewer.imageryLayers.addImageryProvider(esri);
            }
          });
        });
    } else if (stack === 'esri-imagery') {
      Cesium.ArcGisMapServerImageryProvider.fromUrl(
        'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer',
        { enablePickFeatures: false }
      ).then(provider => {
        if (!viewer.isDestroyed()) {
          viewer.imageryLayers.removeAll();
          viewer.imageryLayers.addImageryProvider(provider);
        }
      }).catch(() => {
        if (!viewer.isDestroyed()) {
          viewer.imageryLayers.removeAll();
          viewer.imageryLayers.addImageryProvider(new Cesium.OpenStreetMapImageryProvider({ url: 'https://tile.openstreetmap.org' }));
        }
      });
    } else if (stack === 'osm') {
      const osm = new Cesium.OpenStreetMapImageryProvider({
        url: 'https://tile.openstreetmap.org'
      });
      viewer.imageryLayers.addImageryProvider(osm);
    } else if (stack === 'photoreal') {
      const googleKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) || '';

      const load3DTileset = async () => {
        try {
          let tileset: Cesium.Cesium3DTileset;
          if (googleKey) {
            tileset = await Cesium.createGooglePhotorealistic3DTileset({ key: googleKey });
          } else if (hasIonToken) {
            tileset = await Cesium.Cesium3DTileset.fromIonAssetId(2275207);
          } else {
            throw new Error('Neither Google Maps API key nor Cesium Ion token configured');
          }

          if (!viewer.isDestroyed()) {
            active3DTilesetRef.current = tileset;
            viewer.scene.primitives.add(tileset);
            viewer.scene.globe.show = false;
          }
        } catch {
          if (!viewer.isDestroyed()) {
            viewer.scene.globe.show = true;
            Cesium.ArcGisMapServerImageryProvider.fromUrl(
              'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer',
              { enablePickFeatures: false }
            ).then(esri => {
              if (!viewer.isDestroyed()) {
                viewer.imageryLayers.removeAll();
                viewer.imageryLayers.addImageryProvider(esri);
              }
            });
          }
        }
      };

      load3DTileset();
    }
  }, [hasIonToken]);

  // ── Render Infrastructure Project Markers on Globe ─────
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed() || !isViewerReady) return;

    // Clear previous Cesium primitives
    entityPrimitivesRef.current.forEach(e => {
      try {
        if (!viewer.isDestroyed() && viewer.entities.contains(e)) {
          viewer.entities.remove(e);
        }
      } catch {}
    });
    entityPrimitivesRef.current.clear();

    dropLinesRef.current.forEach(e => {
      try {
        if (!viewer.isDestroyed() && viewer.entities.contains(e)) {
          viewer.entities.remove(e);
        }
      } catch {}
    });
    dropLinesRef.current.clear();

    displayedEntities.forEach(ent => {
      try {
        if (
          typeof ent.latitude !== 'number' || typeof ent.longitude !== 'number' ||
          isNaN(ent.latitude) || isNaN(ent.longitude) ||
          !isFinite(ent.latitude) || !isFinite(ent.longitude)
        ) {
          return;
        }

        const isSelected = ent.id === selectedEntityId;
        const project = ent.projectData;
        const status = project?.status || ent.status;
        const riskLevel = project?.riskLevel || ent.riskLevel;

        // Visual indicator color mapping for project status & risk
        let color = Cesium.Color.fromCssColorString('#10b981'); // Emerald: On Schedule / Low Risk
        let pixelSize = 13;

        if (status === 'CRITICAL' || riskLevel === 'CRITICAL') {
          color = Cesium.Color.fromCssColorString('#ef4444'); // Red: Critical Risk
          pixelSize = 16;
        } else if (status === 'DELAYED' || riskLevel === 'HIGH') {
          color = Cesium.Color.fromCssColorString('#f97316'); // Orange: Delayed / High Risk
          pixelSize = 15;
        } else if (riskLevel === 'MEDIUM') {
          color = Cesium.Color.fromCssColorString('#f59e0b'); // Amber: Medium Risk
          pixelSize = 14;
        } else if (status === 'COMPLETED') {
          color = Cesium.Color.fromCssColorString('#06b6d4'); // Cyan: Completed
          pixelSize = 13;
        } else if (status === 'PLANNING') {
          color = Cesium.Color.fromCssColorString('#8b5cf6'); // Purple: Planning
          pixelSize = 12;
        }

        // Selected marker prominence
        if (isSelected) {
          color = Cesium.Color.fromCssColorString('#fbbf24'); // Bright Gold
          pixelSize += 5;
        }

        const entityAlt = ent.altitude || 30;
        const position = Cesium.Cartesian3.fromDegrees(ent.longitude!, ent.latitude!, entityAlt);

        const progressStr = project?.physicalProgress !== undefined ? `${project.physicalProgress}%` : 'N/A';
        const labelText = ` 📍 ${ent.name.length > 25 ? ent.name.slice(0, 23) + '...' : ent.name}\n [${project?.sector || ent.attributes?.['Sector'] || 'PROJECT'}] • ${progressStr} `;

        const existingEntity = viewer.entities.getById(`entity-${ent.id}`);
        if (existingEntity) {
          viewer.entities.remove(existingEntity);
        }

        const cesiumEntity = viewer.entities.add({
          id: `entity-${ent.id}`,
          name: ent.name,
          position,
          point: {
            pixelSize,
            color,
            outlineColor: isSelected ? Cesium.Color.WHITE : Cesium.Color.BLACK,
            outlineWidth: isSelected ? 3.0 : 2.0,
            disableDepthTestDistance: Number.POSITIVE_INFINITY
          },
          label: {
            text: labelText,
            font: 'bold 11px Inter, system-ui, sans-serif',
            fillColor: Cesium.Color.WHITE,
            backgroundColor: new Cesium.Color(0.05, 0.08, 0.13, 0.88),
            showBackground: true,
            style: Cesium.LabelStyle.FILL,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -18),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 450000)
          }
        });

        entityPrimitivesRef.current.set(ent.id, cesiumEntity);

        // Ground drop stem grounding project to terrain
        if (entityAlt > 8) {
          const dropLine = viewer.entities.add({
            polyline: {
              positions: [
                Cesium.Cartesian3.fromDegrees(ent.longitude!, ent.latitude!, 0),
                position
              ],
              width: isSelected ? 2.5 : 1.5,
              material: new Cesium.ColorMaterialProperty(
                isSelected
                  ? Cesium.Color.fromCssColorString('#fbbf24').withAlpha(0.9)
                  : color.withAlpha(0.4)
              )
            }
          });
          dropLinesRef.current.set(ent.id, dropLine);
        }
      } catch (err) {
        console.warn(`[SpatialView] Failed adding entity ${ent.id}:`, err);
      }
    });

    // ── Render 3D Corridor Network Links ──────────────────
    if (showCorridors) {
      const entityMap = new Map<string, SpatialEntity>();
      displayedEntities.forEach(ent => entityMap.set(ent.id, ent));

      const activeLinkIds = new Set<string>();

      relationships.forEach(r => {
        const srcEnt = entityMap.get(r.source);
        const tgtEnt = entityMap.get(r.target);

        if (!srcEnt || !tgtEnt || !srcEnt.latitude || !tgtEnt.latitude) return;

        const linkId = r.id || `corridor-${r.source}-${r.target}`;
        activeLinkIds.add(linkId);

        const pos1 = Cesium.Cartesian3.fromDegrees(srcEnt.longitude!, srcEnt.latitude!, srcEnt.altitude || 20);
        const pos2 = Cesium.Cartesian3.fromDegrees(tgtEnt.longitude!, tgtEnt.latitude!, tgtEnt.altitude || 20);

        const isSelectedLink = selectedRelationshipId === linkId;
        const isConnectedToSelected = Boolean(selectedEntityId && (selectedEntityId === r.source || selectedEntityId === r.target));
        const baseColor = getCorridorLinkColor(r.type);

        let lineColor = baseColor;
        let lineWidth = 2.0;

        if (isSelectedLink) {
          lineColor = Cesium.Color.GOLD.withAlpha(1.0);
          lineWidth = 4.0;
        } else if (isConnectedToSelected) {
          lineColor = Cesium.Color.GOLD.withAlpha(0.85);
          lineWidth = 2.8;
        }

        const existingLinkEntity = networkLinkEntitiesRef.current.get(linkId);
        if (existingLinkEntity && !viewer.isDestroyed() && viewer.entities.contains(existingLinkEntity)) {
          if (existingLinkEntity.polyline) {
            existingLinkEntity.polyline.positions = new Cesium.ConstantProperty([pos1, pos2]);
            existingLinkEntity.polyline.width = new Cesium.ConstantProperty(lineWidth);
            existingLinkEntity.polyline.material = new Cesium.ColorMaterialProperty(lineColor);
          }
        } else {
          const polylineEntity = viewer.entities.add({
            id: linkId,
            name: `${r.type}: ${srcEnt.name} ↔ ${tgtEnt.name}`,
            properties: new Cesium.PropertyBag({
              relationshipId: r.id || linkId,
              type: r.type,
              sourceId: r.source,
              targetId: r.target
            }),
            polyline: {
              positions: [pos1, pos2],
              width: lineWidth,
              material: new Cesium.ColorMaterialProperty(lineColor),
              arcType: Cesium.ArcType.NONE,
              distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 1500000)
            }
          });
          networkLinkEntitiesRef.current.set(linkId, polylineEntity);
        }
      });

      networkLinkEntitiesRef.current.forEach((entity, id) => {
        if (!activeLinkIds.has(id)) {
          try {
            if (!viewer.isDestroyed() && viewer.entities.contains(entity)) {
              viewer.entities.remove(entity);
            }
          } catch {}
          networkLinkEntitiesRef.current.delete(id);
        }
      });
    }

    return () => {
      if (!viewer.isDestroyed()) {
        entityPrimitivesRef.current.forEach(e => {
          try {
            if (viewer.entities.contains(e)) viewer.entities.remove(e);
          } catch {}
        });
        dropLinesRef.current.forEach(e => {
          try {
            if (viewer.entities.contains(e)) viewer.entities.remove(e);
          } catch {}
        });
        networkLinkEntitiesRef.current.forEach(e => {
          try {
            if (viewer.entities.contains(e)) viewer.entities.remove(e);
          } catch {}
        });
      }
      entityPrimitivesRef.current.clear();
      dropLinesRef.current.clear();
      networkLinkEntitiesRef.current.clear();
    };
  }, [viewerInstance, displayedEntities, relationships, selectedEntityId, selectedRelationshipId, showCorridors, isViewerReady]);

  // ── Camera Navigation Controls ──────────────────────────
  const flyToEntity = useCallback((ent: SpatialEntity) => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;

    orbitControllerRef.current?.stop();
    setIsOrbiting(false);

    if (
      typeof ent.latitude === 'number' &&
      typeof ent.longitude === 'number' &&
      isFinite(ent.latitude) &&
      isFinite(ent.longitude)
    ) {
      const alt = ent.altitude || 30;
      const targetPosition = Cesium.Cartesian3.fromDegrees(ent.longitude, ent.latitude, alt);
      const boundingSphere = new Cesium.BoundingSphere(targetPosition, 0);

      // Optimal tactical altitude: 8,500m gives a clear view of the site and surrounding corridor
      viewer.camera.flyToBoundingSphere(boundingSphere, {
        offset: new Cesium.HeadingPitchRange(
          Cesium.Math.toRadians(30),
          Cesium.Math.toRadians(-45),
          8500
        ),
        duration: 1.8
      });
    }
    // Note: When coordinates are missing, we retain the current camera position to prevent arbitrary jumps.
  }, []);

  // Track last flown project ID to prevent repeated camera flight animations on re-renders or manual camera movements
  const lastFlownProjectIdRef = useRef<string | null>(null);

  // Auto-fly to project when selectedEntityId changes and Cesium viewer is initialized
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed() || !isViewerReady) return;
    if (!selectedEntityId) return;

    // Prevent repeated camera animations on re-renders or manual camera movements
    if (lastFlownProjectIdRef.current === selectedEntityId) return;
    lastFlownProjectIdRef.current = selectedEntityId;

    const targetProject = projects.find(p => p.id === selectedEntityId);
    if (!targetProject) return;

    if (
      targetProject.hasCoordinates &&
      typeof targetProject.latitude === 'number' &&
      typeof targetProject.longitude === 'number' &&
      isFinite(targetProject.latitude) &&
      isFinite(targetProject.longitude)
    ) {
      const ent = displayedEntities.find(e => e.id === targetProject.id) || projectToSpatialEntity(targetProject);
      flyToEntity(ent);
    }
  }, [selectedEntityId, isViewerReady, projects, displayedEntities, flyToEntity]);

  const flyToLocation = useCallback((latitude: number, longitude: number, boundingBox?: [number, number, number, number]) => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed() || typeof latitude !== 'number' || typeof longitude !== 'number') return;

    orbitControllerRef.current?.stop();
    setIsOrbiting(false);

    let range = 25000;
    if (boundingBox && boundingBox.length === 4) {
      const latDiff = Math.abs(boundingBox[1] - boundingBox[0]);
      const lonDiff = Math.abs(boundingBox[3] - boundingBox[2]);
      const spanDeg = Math.max(latDiff, lonDiff);
      const spanMeters = spanDeg * 111000;
      range = Math.max(10000, Math.min(80000, spanMeters * 1.5));
    }

    const targetPos = Cesium.Cartesian3.fromDegrees(longitude, latitude, 0);
    const boundingSphere = new Cesium.BoundingSphere(targetPos, 0);

    viewer.camera.flyToBoundingSphere(boundingSphere, {
      offset: new Cesium.HeadingPitchRange(
        Cesium.Math.toRadians(0),
        Cesium.Math.toRadians(-45),
        range
      ),
      duration: 2.0
    });
  }, []);

  const flyToCoordinates = useCallback((latitude: number, longitude: number) => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed() || typeof latitude !== 'number' || typeof longitude !== 'number') return;

    orbitControllerRef.current?.stop();
    setIsOrbiting(false);

    const targetPos = Cesium.Cartesian3.fromDegrees(longitude, latitude, 0);
    const boundingSphere = new Cesium.BoundingSphere(targetPos, 0);

    viewer.camera.flyToBoundingSphere(boundingSphere, {
      offset: new Cesium.HeadingPitchRange(
        Cesium.Math.toRadians(0),
        Cesium.Math.toRadians(-45),
        10000
      ),
      duration: 1.8
    });
  }, []);

  const handleSelectLocation = useCallback((loc: UniversalLocationTarget) => {
    setSelectedEntityId(null);
    setSelectedRelationshipId(null);
    setActiveLocationTarget(loc);
    flyToLocation(loc.latitude, loc.longitude, loc.boundingBox);
  }, [flyToLocation]);

  const handleSelectCoordinates = useCallback((coords: { latitude: number; longitude: number; label: string }) => {
    setSelectedEntityId(null);
    setSelectedRelationshipId(null);
    setActiveLocationTarget({
      name: coords.label,
      latitude: coords.latitude,
      longitude: coords.longitude
    });
    flyToCoordinates(coords.latitude, coords.longitude);
  }, [flyToCoordinates]);

  const handleClearTracking = useCallback(() => {
    setActiveLocationTarget(null);
  }, []);

  const handleSelectProjectFromSearch = useCallback((p: InfrastructureProject) => {
    setActiveLocationTarget(null);
    setSelectedRelationshipId(null);
    setSelectedEntityId(p.id);

    if (onSelectProject) {
      onSelectProject(p);
    }

    const ent = displayedEntities.find(e => e.id === p.id) || projectToSpatialEntity(p);
    flyToEntity(ent);
  }, [displayedEntities, flyToEntity, onSelectProject]);

  const handleSelectEntity = useCallback((ent: SpatialEntity) => {
    setActiveLocationTarget(null);
    setSelectedRelationshipId(null);
    setSelectedEntityId(ent.id);

    if (onSelectProject) {
      onSelectProject(ent.projectData || null);
    }

    flyToEntity(ent);
  }, [flyToEntity, onSelectProject]);

  // Click picking handler on Cesium 3D canvas
  useEffect(() => {
    onCesiumClickRef.current = (movement: { position: Cesium.Cartesian2 }) => {
      const viewer = viewerRef.current;
      if (!viewer || viewer.isDestroyed()) return;

      let picked = viewer.scene.pick(movement.position);

      if (!picked || !picked.id || (typeof picked.id.id === 'string' && !picked.id.id.startsWith('corridor-') && !picked.id.id.startsWith('entity-'))) {
        const radius = 7;
        const offsets = [
          [-radius, 0], [radius, 0], [0, -radius], [0, radius],
          [-radius, -radius], [radius, radius], [-radius, radius], [radius, -radius]
        ];
        for (const [dx, dy] of offsets) {
          const nearPos = new Cesium.Cartesian2(movement.position.x + dx, movement.position.y + dy);
          const nearPicked = viewer.scene.pick(nearPos);
          if (nearPicked && nearPicked.id && typeof nearPicked.id.id === 'string' && nearPicked.id.id.startsWith('corridor-')) {
            picked = nearPicked;
            break;
          }
        }
      }

      if (picked && picked.id && typeof picked.id.id === 'string') {
        const entity = picked.id as Cesium.Entity;
        const entityId = entity.id;

        if (entityId.startsWith('corridor-')) {
          const relId = entity.properties?.relationshipId?.getValue?.() || entityId;
          setSelectedRelationshipId(relId);
          setSelectedEntityId(null);
          setActiveLocationTarget(null);
          return;
        }

        if (entityId.startsWith('entity-')) {
          const rawId = entityId.replace('entity-', '');
          const ent = displayedEntities.find(e => e.id === rawId);
          if (ent) {
            handleSelectEntity(ent);
          }
          return;
        }
      }

      setSelectedRelationshipId(null);
      setSelectedEntityId(null);
      setActiveLocationTarget(null);
      onSelectProject?.(null);
    };
  }, [displayedEntities, handleSelectEntity, onSelectProject]);

  const handlePresetCamera = (mode: 'sector' | 'overhead' | 'oblique' | 'global') => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;

    orbitControllerRef.current?.stop();
    setIsOrbiting(false);

    const selected = displayedEntities.find(e => e.id === selectedEntityId);
    const targetLon = selected?.longitude || 75.5000;
    const targetLat = selected?.latitude || 21.0000;

    if (mode === 'sector') {
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(targetLon, targetLat, 8500),
        orientation: {
          heading: Cesium.Math.toRadians(20),
          pitch: Cesium.Math.toRadians(-40),
          roll: 0.0
        },
        duration: 1.8
      });
    } else if (mode === 'overhead') {
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(targetLon, targetLat, 3200),
        orientation: {
          heading: 0,
          pitch: Cesium.Math.toRadians(-89.9),
          roll: 0.0
        },
        duration: 1.5
      });
    } else if (mode === 'oblique') {
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(targetLon - 0.02, targetLat - 0.02, 2400),
        orientation: {
          heading: Cesium.Math.toRadians(45),
          pitch: Cesium.Math.toRadians(-30),
          roll: 0.0
        },
        duration: 1.6
      });
    } else if (mode === 'global') {
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(78.9629, 20.5937, 7500000),
        orientation: {
          heading: 0,
          pitch: Cesium.Math.toRadians(-89),
          roll: 0.0
        },
        duration: 2.2
      });
    }
  };

  const handleToggleOrbit = () => {
    const orbit = orbitControllerRef.current;
    const viewer = viewerRef.current;
    if (!orbit || !viewer || viewer.isDestroyed()) return;

    const selected = displayedEntities.find(e => e.id === selectedEntityId);
    let targetPos: Cesium.Cartesian3 | null = null;

    if (selected && typeof selected.latitude === 'number' && typeof selected.longitude === 'number') {
      targetPos = Cesium.Cartesian3.fromDegrees(selected.longitude, selected.latitude, selected.altitude || 25);
    } else {
      const center = viewer.camera.pickEllipsoid(
        new Cesium.Cartesian2(viewer.canvas.clientWidth / 2, viewer.canvas.clientHeight / 2)
      );
      if (center) targetPos = center;
    }

    if (targetPos) {
      const active = orbit.toggle(targetPos, { radius: 3500, pitch: -30, speed: 6 });
      setIsOrbiting(active);
    }
  };

  const selectedEntity = displayedEntities.find(e => e.id === selectedEntityId);
  const selectedProject = selectedEntity?.projectData || projects.find(p => p.id === selectedEntityId);
  const selectedRelationship = relationships.find(r => r.id === selectedRelationshipId);
  const sourceEntity = selectedRelationship ? displayedEntities.find(e => e.id === selectedRelationship.source) : null;
  const targetEntity = selectedRelationship ? displayedEntities.find(e => e.id === selectedRelationship.target) : null;
  const currentSector = resolveSector(cameraCenter.latitude, cameraCenter.longitude);

  const isDatasetSynthetic = projects.length > 0 && projects.every(p => p.isSynthetic);

  return (
    <div className="flex-1 w-full h-full flex flex-col min-h-0 bg-[#07090E] select-none text-slate-100 font-sans">
      {/* ── MAIN TOOLBAR: TITLE, INTEGRATED SEARCH & MAP CONTROLS ── */}
      <div className="bg-[#0C1017] px-3 py-1.5 sm:py-2 border-b border-slate-800 shadow-md flex flex-wrap items-center justify-between gap-2 shrink-0 z-30">
        {/* Brand Title */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold shrink-0">
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold text-slate-100 uppercase tracking-wider font-mono m-0">
              DRISHTI • 3D GOD'S EYE
            </h2>
            <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono font-semibold">
              {filteredProjects.length} / {projects.length} SITES
            </span>
          </div>
        </div>

        {/* Integrated Search Bar (Projects, Locations & Coordinates) */}
        <FlightSearchControl
          projects={projects}
          onSelectProject={handleSelectProjectFromSearch}
          onSelectLocation={handleSelectLocation}
          onSelectCoordinates={handleSelectCoordinates}
          selectedEntityId={selectedEntityId}
          activeLocationTarget={activeLocationTarget}
          onClearTracking={handleClearTracking}
        />

        {/* Controls: Filter Toggle, Corridors & Imagery */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap text-xs font-mono">
          <button
            onClick={() => setShowFilterBar(!showFilterBar)}
            className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 transition cursor-pointer font-bold text-[10.5px] ${
              hasActiveFilters
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 ring-1 ring-amber-500/40'
                : showFilterBar
                ? 'bg-cyan-950/80 text-cyan-400 border-cyan-800'
                : 'bg-[#090C12] text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
            title="Toggle Filter Controls"
          >
            <Filter className="w-3 h-3" />
            <span>FILTERS</span>
            {hasActiveFilters && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setShowCorridors(!showCorridors)}
            className={`px-2.5 py-1 rounded-lg border flex items-center gap-1 transition cursor-pointer font-bold text-[10.5px] ${
              showCorridors
                ? 'bg-sky-950/80 text-sky-400 border-sky-800'
                : 'bg-[#090C12] text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
            title="Toggle 3D Corridor Connections"
          >
            <GitFork className="w-3 h-3" />
            <span>CORRIDORS</span>
          </button>

          {/* Base Imagery Switcher */}
          <div className="h-3.5 w-[1px] bg-slate-800 mx-0.5" />
          <select
            value={mapStack}
            onChange={(e) => handleSwitchMapStack(e.target.value as SpatialMapStack)}
            className="bg-[#070A0F] border border-slate-700/80 text-slate-300 text-[10.5px] rounded-lg px-2 py-1 font-mono cursor-pointer focus:outline-none focus:border-cyan-500"
          >
            {hasIonToken && (
              <option value="ion-aerial">Cesium Ion Aerial</option>
            )}
            <option value="esri-imagery">Satellite</option>
            <option value="osm">OpenStreetMap</option>
            <option value="photoreal">Google 3D Tiles</option>
          </select>
        </div>
      </div>

      {/* ── FILTER TOOLBAR: SECTOR, STATE, STATUS, RISK, GEOCODING & RESET ── */}
      {showFilterBar && (
        <div className="bg-[#090D14] px-3 py-1.5 border-b border-slate-800/90 flex flex-wrap items-center justify-between gap-2 shrink-0 z-20 text-xs font-mono">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
              <Filter className="w-3 h-3 text-cyan-400" /> FILTER BY:
            </span>

            {/* Dynamic Sector Filter */}
            <select
              value={filterSector}
              onChange={(e) => setFilterSector(e.target.value)}
              className="bg-[#0E131C] border border-slate-700/80 text-slate-200 text-[10px] rounded px-2 py-1 cursor-pointer focus:outline-none focus:border-cyan-500 max-w-[160px] truncate"
            >
              <option value="ALL">All Sectors ({projects.length})</option>
              {availableSectors.map(sec => (
                <option key={sec} value={sec}>{sec}</option>
              ))}
            </select>

            {/* State Filter */}
            <select
              value={filterState}
              onChange={(e) => setFilterState(e.target.value)}
              className="bg-[#0E131C] border border-slate-700/80 text-slate-200 text-[10px] rounded px-2 py-1 cursor-pointer focus:outline-none focus:border-cyan-500 max-w-[140px] truncate"
            >
              <option value="ALL">All States ({availableStates.length})</option>
              {availableStates.map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as ProjectStatus | 'ALL')}
              className="bg-[#0E131C] border border-slate-700/80 text-slate-200 text-[10px] rounded px-2 py-1 cursor-pointer focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="ON_SCHEDULE">On Schedule</option>
              <option value="DELAYED">Delayed</option>
              <option value="CRITICAL">Critical</option>
              <option value="COMPLETED">Completed</option>
              <option value="PLANNING">Planning</option>
              <option value="IN_PROGRESS">In Progress</option>
            </select>

            {/* Risk Level Filter */}
            <select
              value={filterRisk}
              onChange={(e) => setFilterRisk(e.target.value as ProjectRiskLevel | 'ALL')}
              className="bg-[#0E131C] border border-slate-700/80 text-slate-200 text-[10px] rounded px-2 py-1 cursor-pointer focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Risk Levels</option>
              <option value="LOW">Low Risk</option>
              <option value="MEDIUM">Medium Risk</option>
              <option value="HIGH">High Risk</option>
              <option value="CRITICAL">Critical Risk</option>
            </select>

            {/* Geocoding Status Filter */}
            <select
              value={filterGeocoding}
              onChange={(e) => setFilterGeocoding(e.target.value as 'ALL' | 'GEOLOCATED_ONLY' | 'PENDING_GEOCODING')}
              className="bg-[#0E131C] border border-slate-700/80 text-slate-200 text-[10px] rounded px-2 py-1 cursor-pointer focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Geocoding ({projects.length})</option>
              <option value="GEOLOCATED_ONLY">📍 3D Globe Sites ({projects.filter(p => p.hasCoordinates).length})</option>
              <option value="PENDING_GEOCODING">⚠️ State-Level Pending ({projects.filter(p => !p.hasCoordinates).length})</option>
            </select>

            {/* Reset Filters Button */}
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="px-2 py-1 bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-800 rounded text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 shadow-sm"
              >
                <RotateCcw className="w-3 h-3" />
                <span>RESET FILTERS</span>
              </button>
            )}
          </div>

          <div className="text-[10px] text-slate-400">
            SHOWING <strong className="text-cyan-400">{filteredProjects.length}</strong> OF <strong className="text-slate-200">{projects.length}</strong> PROJECTS (<strong className="text-emerald-400">{geocodedCount}</strong> ON 3D GLOBE)
          </div>
        </div>
      )}

      {/* ── MAIN WORKSPACE: GLOBE VIEWPORT + PROJECT DETAILS PANEL ── */}
      <div className="flex-1 flex flex-col md:flex-row gap-2.5 lg:gap-3 min-h-0 relative overflow-hidden p-2 sm:p-2.5">
        {/* Globe Viewport */}
        <div className="flex-1 relative rounded-xl overflow-hidden border border-slate-800/90 shadow-2xl bg-[#04060A] flex flex-col min-w-0 min-h-0">
          <div
            ref={cesiumContainerRef}
            className="w-full h-full flex-1 min-h-0 relative"
          />

          {/* 2D Screen-space Detection Callout Brackets */}
          <DetectionOverlay
            viewer={viewerInstance}
            entities={displayedEntities}
            selectedEntityId={selectedEntityId}
            sensorMode="normal"
            onSelectEntity={handleSelectEntity}
            enabled={showDetectionOverlay}
          />

          {/* Clean Professional GIS HUD Overlay */}
          <TacticalHUD
            telemetry={telemetry}
            visible={showHUD}
            sectorName={currentSector}
            isOrbiting={isOrbiting}
          />

          {/* Camera Preset Toolbar Dock */}
          <div className="absolute bottom-3 left-3 z-30 flex items-center flex-wrap gap-1 bg-[#090C12]/92 border border-slate-700/70 p-1 rounded-lg backdrop-blur-md shadow-2xl text-[10px] sm:text-[11px] font-mono">
            <button
              onClick={handleToggleOrbit}
              className={`px-2.5 py-1 rounded-md border flex items-center gap-1 font-bold transition-all cursor-pointer ${
                isOrbiting
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md animate-pulse'
                  : 'bg-[#111620] text-amber-400 border-amber-800/50 hover:bg-amber-950/60'
              }`}
              title="Toggle Smooth 60fps Target Orbiting"
            >
              <RefreshCw className={`w-3 h-3 ${isOrbiting ? 'animate-spin' : ''}`} /> ORBIT 360°
            </button>

            <button
              onClick={() => handlePresetCamera('sector')}
              className="px-2 py-1 rounded-md bg-[#111620] hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold transition-all cursor-pointer flex items-center gap-1"
            >
              <Compass className="w-3 h-3 text-cyan-400" /> SECTOR
            </button>

            <button
              onClick={() => handlePresetCamera('overhead')}
              className="px-2 py-1 rounded-md bg-[#111620] hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold transition-all cursor-pointer flex items-center gap-1"
            >
              <Camera className="w-3 h-3 text-emerald-400" /> NADIR 90°
            </button>

            <button
              onClick={() => handlePresetCamera('oblique')}
              className="px-2 py-1 rounded-md bg-[#111620] hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold transition-all cursor-pointer flex items-center gap-1"
            >
              <Navigation className="w-3 h-3 text-orange-400" /> OBLIQUE 45°
            </button>

            <button
              onClick={() => handlePresetCamera('global')}
              className="px-2 py-1 rounded-md bg-[#111620] hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold transition-all cursor-pointer flex items-center gap-1"
            >
              <Globe className="w-3 h-3 text-violet-400" /> ALL INDIA
            </button>
          </div>
        </div>

        {/* ── RIGHT COLUMN: PROFESSIONAL PROJECT DETAILS PANEL ── */}
        <div className="w-full md:w-84 lg:w-92 xl:w-96 shrink-0 bg-[#0D1118]/95 border border-slate-800/90 rounded-xl p-3 sm:p-3.5 flex flex-col min-h-0 shadow-2xl backdrop-blur-md">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 shrink-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <Building2 className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="font-mono text-xs font-bold text-slate-200 uppercase tracking-wider truncate">
                {selectedRelationship ? 'CORRIDOR CONNECTION' : 'PROJECT DETAILS PANEL'}
              </span>
            </div>
            {selectedProject && (
              <span className="text-[9.5px] font-mono font-bold text-emerald-400 shrink-0 ml-1">
                MONITORING ACTIVE
              </span>
            )}
          </div>

          {/* Details Panel Body */}
          <div className="flex-1 min-h-0 overflow-y-auto py-2 pr-1 space-y-2.5 text-xs">
            <AnimatePresence mode="wait">
              {selectedRelationship ? (
                <motion.div
                  key={selectedRelationship.id}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-2.5 font-sans"
                >
                  <div className="p-2.5 bg-[#070A0F] rounded-lg border border-slate-800/90 space-y-1">
                    <span className="font-mono text-[9px] text-slate-400 uppercase">INTER-PROJECT LINK</span>
                    <div className="text-sm font-bold text-cyan-400">{selectedRelationship.type}</div>
                    <div className="text-[10.5px] text-slate-300">
                      Geospatial freight and multimodal connectivity between major infrastructure nodes.
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <span className="font-mono text-[9.5px] text-slate-400 block mb-0.5 uppercase font-bold">NODE 1</span>
                      <div
                        onClick={() => sourceEntity && handleSelectEntity(sourceEntity)}
                        className="p-2 bg-[#070A0F] hover:bg-slate-800/80 rounded-lg border border-slate-800 cursor-pointer transition-all"
                      >
                        <div className="font-bold text-slate-200 text-xs truncate">{sourceEntity?.name || selectedRelationship.source}</div>
                        <div className="text-[9.5px] text-cyan-400 font-mono">{sourceEntity?.id}</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-center text-slate-500 font-mono text-[9.5px]">
                      ↕ 3D CORRIDOR ALIGNMENT
                    </div>

                    <div>
                      <span className="font-mono text-[9.5px] text-slate-400 block mb-0.5 uppercase font-bold">NODE 2</span>
                      <div
                        onClick={() => targetEntity && handleSelectEntity(targetEntity)}
                        className="p-2 bg-[#070A0F] hover:bg-slate-800/80 rounded-lg border border-slate-800 cursor-pointer transition-all"
                      >
                        <div className="font-bold text-slate-200 text-xs truncate">{targetEntity?.name || selectedRelationship.target}</div>
                        <div className="text-[9.5px] text-cyan-400 font-mono">{targetEntity?.id}</div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : selectedProject ? (
                <motion.div
                  key={selectedProject.id}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-2.5 font-sans"
                >
                  {/* Identification & Sector */}
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      <Badge variant="sector" sector={selectedProject.sector}>
                        {selectedProject.sector}
                      </Badge>
                      <Badge variant="status" status={selectedProject.status}>
                        {selectedProject.status.replace('_', ' ')}
                      </Badge>
                      <Badge variant="risk" riskLevel={selectedProject.riskLevel}>
                        RISK: {selectedProject.riskLevel}
                      </Badge>
                      {selectedProject.hasCoordinates ? (
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-emerald-950/80 text-emerald-400 border border-emerald-800 flex items-center gap-1">
                            <MapPin className="w-2.5 h-2.5" /> 3D GEOCODED
                          </span>
                          <button
                            onClick={() => {
                              const ent =
                                displayedEntities.find(e => e.id === selectedProject.id) ||
                                projectToSpatialEntity(selectedProject);
                              flyToEntity(ent);
                            }}
                            className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 flex items-center gap-1 cursor-pointer transition"
                            title="Refocus 3D camera to this site"
                          >
                            <Crosshair className="w-2.5 h-2.5" /> REFOCUS
                          </button>
                        </div>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-amber-950/80 text-amber-400 border border-amber-800 flex items-center gap-1">
                          <AlertTriangle className="w-2.5 h-2.5" /> PENDING GEOCODING
                        </span>
                      )}
                    </div>

                    {!selectedProject.hasCoordinates && (
                      <div className="mb-1.5 p-1.5 rounded bg-amber-950/30 border border-amber-800/50 text-[10px] font-mono text-amber-300/90 flex items-start gap-1.5">
                        <Info className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <span>Official GPS coordinates pending in gazetteer. Camera position retained.</span>
                      </div>
                    )}
                    <h3 className="font-bold text-slate-100 text-sm leading-snug break-words">
                      {selectedProject.name}
                    </h3>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center justify-between flex-wrap gap-1">
                      <span>CODE: <strong className="text-slate-200">{selectedProject.code}</strong></span>
                      {selectedProject.legacyOcmsCode && (
                        <span>OCMS: <strong className="text-amber-400">{selectedProject.legacyOcmsCode}</strong></span>
                      )}
                      <span>ID: <strong className="text-cyan-400">{selectedProject.id}</strong></span>
                    </div>
                    {selectedProject.ministry && (
                      <div className="text-[10px] text-cyan-300/90 font-mono mt-0.5 truncate">
                        {selectedProject.ministry}
                      </div>
                    )}
                  </div>

                  {/* Physical & Financial Progress Gauges */}
                  <div className="p-2.5 bg-[#070A0F] rounded-lg border border-slate-800/90 space-y-2 font-mono">
                    <div>
                      <div className="flex justify-between text-[10px] mb-1">
                        <span className="text-slate-400">PHYSICAL PROGRESS:</span>
                        <span className="font-bold text-cyan-400">
                          {selectedProject.physicalProgress !== undefined && selectedProject.physicalProgress !== null ? `${selectedProject.physicalProgress}%` : 'Not Reported'}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full transition-all"
                          style={{ width: `${selectedProject.physicalProgress || 0}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[10px] mb-1">
                        <span className="text-slate-400">FINANCIAL PROGRESS:</span>
                        <span className="font-bold text-emerald-400">
                          {selectedProject.financialProgress !== undefined && selectedProject.financialProgress !== null ? `${selectedProject.financialProgress}%` : 'Not Reported'}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-300 rounded-full transition-all"
                          style={{ width: `${selectedProject.financialProgress || 0}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Financial Budget & Expenditure Card */}
                  <div className="p-2 bg-[#070A0F] rounded-lg border border-slate-800/90 font-mono space-y-1.5">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-[9px] text-slate-500 uppercase">SANCTIONED BUDGET</div>
                        <div className="text-xs sm:text-sm font-bold text-slate-100 mt-0.5">
                          {selectedProject.budget !== undefined && selectedProject.budget !== null ? `₹${selectedProject.budget.toLocaleString()} Cr` : 'Not Reported'}
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] text-slate-500 uppercase">EXPENDITURE</div>
                        <div className="text-xs sm:text-sm font-bold text-emerald-400 mt-0.5">
                          {selectedProject.expenditure !== undefined && selectedProject.expenditure !== null ? `₹${selectedProject.expenditure.toLocaleString()} Cr` : 'Not Reported'}
                        </div>
                      </div>
                    </div>
                    {(selectedProject.revisedCost || (selectedProject.costOverrunPct !== undefined && selectedProject.costOverrunPct !== null && selectedProject.costOverrunPct > 0)) && (
                      <div className="border-t border-slate-800/80 pt-1 flex items-center justify-between text-[9.5px]">
                        {selectedProject.revisedCost ? (
                          <span className="text-slate-400">REVISED: <strong className="text-amber-300">₹{selectedProject.revisedCost.toLocaleString()} Cr</strong></span>
                        ) : <span />}
                        {selectedProject.costOverrunPct !== undefined && selectedProject.costOverrunPct !== null && selectedProject.costOverrunPct > 0 && (
                          <span className="text-rose-400 font-bold bg-rose-950/60 px-1.5 py-0.2 rounded border border-rose-900/60">
                            +{selectedProject.costOverrunPct.toFixed(1)}% OVERRUN
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Geospatial Site Telemetry */}
                  <div className="p-2 bg-[#070A0F] rounded-lg border border-slate-800/90 space-y-1 font-mono text-[10px]">
                    <div className="flex justify-between">
                      <span className="text-slate-400">STATE:</span>
                      <span className="text-slate-200 font-bold">{selectedProject.state || 'Not Reported'}</span>
                    </div>
                    {selectedProject.district && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">DISTRICT:</span>
                        <span className="text-slate-200">{selectedProject.district}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-400">COORDINATES:</span>
                      {selectedProject.hasCoordinates && typeof selectedProject.latitude === 'number' && typeof selectedProject.longitude === 'number' ? (
                        <span className="text-emerald-400 font-bold">
                          {selectedProject.latitude.toFixed(4)}°N, {selectedProject.longitude.toFixed(4)}°E
                        </span>
                      ) : (
                        <span className="text-amber-400 italic">
                          State Centroid (Pending Survey)
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">AGENCY / DEPT:</span>
                      <span className="text-cyan-400 font-bold truncate max-w-[180px]">{selectedProject.implementingAgency || 'Not Reported'}</span>
                    </div>
                    {selectedProject.contractor && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">CONTRACTOR:</span>
                        <span className="text-slate-300 truncate max-w-[160px]">{selectedProject.contractor}</span>
                      </div>
                    )}
                  </div>

                  {/* Timeline & Target Completion */}
                  <div className="p-2 bg-[#070A0F] rounded-lg border border-slate-800/90 space-y-1 font-mono text-[10px]">
                    <div className="flex justify-between">
                      <span className="text-slate-400">START DATE:</span>
                      <span className="text-slate-300">{selectedProject.startDate || 'Not Reported'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">TARGET COMPLETION:</span>
                      <span className={`font-bold ${selectedProject.revisedCompletionDate ? 'line-through text-slate-500' : 'text-emerald-400'}`}>
                        {selectedProject.targetCompletionDate || 'Not Reported'}
                      </span>
                    </div>
                    {selectedProject.revisedCompletionDate && (
                      <div className="flex justify-between">
                        <span className="text-amber-400 font-bold">REVISED TARGET:</span>
                        <span className="text-amber-400 font-bold">{selectedProject.revisedCompletionDate}</span>
                      </div>
                    )}
                    {selectedProject.timeOverrunMonths !== undefined && selectedProject.timeOverrunMonths !== null && selectedProject.timeOverrunMonths > 0 && (
                      <div className="flex justify-between pt-0.5 border-t border-slate-800/80">
                        <span className="text-rose-400 font-bold">SCHEDULE DELAY:</span>
                        <span className="text-rose-400 font-bold bg-rose-950/60 px-1.5 py-0.2 rounded border border-rose-900/60">
                          +{selectedProject.timeOverrunMonths} MONTHS
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Historical Trajectory & Reporting Time-Series */}
                  {selectedProject.history && selectedProject.history.length > 0 && (
                    <ProjectHistoryChart
                      history={selectedProject.history}
                      projectName={selectedProject.name}
                      projectId={selectedProject.id}
                    />
                  )}

                  {/* Link to Analytics Tab */}
                  <div className="flex items-center justify-between p-2 bg-[#080B10] rounded-lg border border-slate-800 text-[10px] font-mono">
                    <span className="text-slate-400">Forecasting & Delay Risk:</span>
                    <button
                      onClick={() => {
                        if (selectedProject) {
                          onSelectProject?.(selectedProject);
                          onNavigateTab?.('analytics');
                        }
                      }}
                      className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <span>Open Analytics →</span>
                    </button>
                  </div>

                  {/* Project Description */}
                  {selectedProject.description && (
                    <div>
                      <span className="font-mono text-[9.5px] text-slate-400 block mb-0.5 uppercase tracking-wider font-bold">
                        PROJECT SCOPE & OBJECTIVE
                      </span>
                      <p className="text-slate-300 leading-relaxed bg-[#070A0F] p-2 rounded-lg border border-slate-800 text-[10.5px]">
                        {selectedProject.description}
                      </p>
                    </div>
                  )}

                  {/* Delay Factors / Risks */}
                  {selectedProject.delayReasons && selectedProject.delayReasons.length > 0 && (
                    <div>
                      <span className="font-mono text-[9.5px] text-rose-400 block mb-1 uppercase tracking-wider flex items-center gap-1 font-bold">
                        <AlertTriangle className="w-3 h-3 text-rose-400" />
                        RECORDED DELAY FACTORS ({selectedProject.delayReasons.length})
                      </span>
                      <div className="space-y-1">
                        {selectedProject.delayReasons.map((reason, idx) => (
                          <div key={idx} className="p-1.5 bg-rose-950/40 border border-rose-900/60 rounded text-rose-200 text-[10px] flex items-start gap-1.5">
                            <span className="text-rose-400 font-bold">•</span>
                            <span>{reason}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Milestones Checklist */}
                  {selectedProject.milestones && selectedProject.milestones.length > 0 && (
                    <div>
                      <span className="font-mono text-[9.5px] text-slate-400 block mb-1 uppercase tracking-wider font-bold">
                        KEY PROJECT MILESTONES ({selectedProject.milestones.length})
                      </span>
                      <div className="space-y-1 max-h-36 overflow-y-auto">
                        {selectedProject.milestones.map((m) => (
                          <div key={m.id} className="p-1.5 bg-[#070A0F] rounded border border-slate-800 text-[10px] flex items-center justify-between">
                            <div className="flex items-center gap-1.5 truncate">
                              {m.completed ? (
                                <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                              ) : (
                                <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                              )}
                              <span className="truncate text-slate-300">{m.title}</span>
                            </div>
                            <span className={`text-[8.5px] font-mono shrink-0 ml-1.5 ${m.completed ? 'text-emerald-400' : 'text-slate-400'}`}>
                              {m.targetDate}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Connected Projects */}
                  {selectedProject.connectedProjectIds && selectedProject.connectedProjectIds.length > 0 && (
                    <div>
                      <span className="font-mono text-[9.5px] text-slate-400 block mb-1 uppercase tracking-wider font-bold">
                        INTERCONNECTED CORRIDORS ({selectedProject.connectedProjectIds.length})
                      </span>
                      <div className="space-y-1">
                        {selectedProject.connectedProjectIds.map(connId => {
                          const connPrj = projects.find(p => p.id === connId);
                          return (
                            <div
                              key={connId}
                              onClick={() => {
                                if (connPrj) handleSelectProjectFromSearch(connPrj);
                              }}
                              className="p-1.5 bg-[#070A0F] hover:bg-slate-800/80 rounded border border-slate-800 text-[10px] flex items-center justify-between cursor-pointer transition-all"
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                <GitFork className="w-3 h-3 text-cyan-400 shrink-0" />
                                <span className="text-slate-200 font-bold truncate">{connPrj?.name || connId}</span>
                              </div>
                              <span className="text-[9px] font-mono text-cyan-400 shrink-0">VIEW SITE →</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </motion.div>
              ) : (
                <div className="text-center py-16 text-slate-500 text-xs font-mono space-y-2">
                  <Building2 className="w-8 h-8 mx-auto text-slate-600 opacity-60" />
                  <p>Click any project marker on the 3D globe or search by name to view project details.</p>
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Action Dock */}
          {selectedProject && (
            <div className="pt-2 border-t border-slate-800 shrink-0 space-y-1.5 font-mono">
              {selectedProject.hasCoordinates ? (
                <button
                  onClick={() => {
                    const ent = displayedEntities.find(e => e.id === selectedProject.id) || projectToSpatialEntity(selectedProject);
                    lastFlownProjectIdRef.current = null; // Reset so manual click always triggers camera flight
                    flyToEntity(ent);
                  }}
                  className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 active:scale-[0.98] text-slate-950 font-bold text-xs rounded-lg transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Refocus camera on this 3D project site"
                >
                  <Crosshair className="w-3.5 h-3.5 text-slate-950 shrink-0" />
                  <span>REFOCUS 3D PROJECT SITE</span>
                </button>
              ) : (
                <div className="p-2.5 bg-amber-950/40 border border-amber-800/60 rounded-lg text-[10.5px] text-amber-300 flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="leading-snug">
                    <strong className="block text-amber-200">State-Level Profile ({selectedProject.state || 'Central Sector'})</strong>
                    Detailed GPS coordinates are pending official gazetteer mapping. Camera position retained to avoid arbitrary jump.
                  </div>
                </div>
              )}

              {selectedProject.hasCoordinates && (
                <button
                  onClick={handleToggleOrbit}
                  className="w-full py-1.5 bg-[#131823] hover:bg-[#1c2436] text-amber-400 border border-slate-700 font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>ORBIT 360° INSPECTION</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SpatialIntelligenceView;
