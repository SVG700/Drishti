import React, { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import type { SpatialEntity, SpatialSensorMode } from '../../types/spatial';

interface DetectionOverlayProps {
  viewer: Cesium.Viewer | null;
  entities: SpatialEntity[];
  selectedEntityId: string | null;
  sensorMode: SpatialSensorMode;
  onSelectEntity: (entity: SpatialEntity) => void;
  enabled?: boolean;
}

const THEME_COLORS: Record<SpatialSensorMode, {
  accent: string;
  plateBg: string;
  border: string;
  text: string;
  selectedGlow: string;
}> = {
  normal: {
    accent: '#06b6d4',
    plateBg: 'rgba(9, 12, 18, 0.88)',
    border: 'rgba(6, 182, 212, 0.5)',
    text: '#e2e8f0',
    selectedGlow: '#f59e0b'
  },
  surveillance: {
    accent: '#16ff38',
    plateBg: 'rgba(4, 16, 6, 0.9)',
    border: 'rgba(22, 255, 56, 0.6)',
    text: '#d1fae5',
    selectedGlow: '#22c55e'
  },
  thermal: {
    accent: '#ff5500',
    plateBg: 'rgba(20, 8, 4, 0.9)',
    border: 'rgba(255, 85, 0, 0.65)',
    text: '#ffedd5',
    selectedGlow: '#f97316'
  },
  retro: {
    accent: '#ffb020',
    plateBg: 'rgba(24, 16, 4, 0.92)',
    border: 'rgba(255, 176, 32, 0.65)',
    text: '#fef3c7',
    selectedGlow: '#fbbf24'
  },
  noir: {
    accent: '#f1f5f9',
    plateBg: 'rgba(10, 10, 10, 0.92)',
    border: 'rgba(241, 245, 249, 0.5)',
    text: '#ffffff',
    selectedGlow: '#94a3b8'
  },
  snow: {
    accent: '#7dd3fc',
    plateBg: 'rgba(8, 18, 28, 0.88)',
    border: 'rgba(125, 211, 252, 0.55)',
    text: '#f0f9ff',
    selectedGlow: '#38bdf8'
  }
};

interface BoundingBoxItem {
  entity: SpatialEntity;
  screenX: number;
  screenY: number;
  plateX: number;
  plateY: number;
  plateW: number;
  plateH: number;
}

export const DetectionOverlay: React.FC<DetectionOverlayProps> = ({
  viewer,
  entities,
  selectedEntityId,
  sensorMode,
  onSelectEntity,
  enabled = true
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const clickableItemsRef = useRef<BoundingBoxItem[]>([]);

  useEffect(() => {
    if (!viewer || !enabled) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrameId: number;

    const renderOverlay = () => {
      if (viewer.isDestroyed()) return;

      const width = canvas.clientWidth || canvas.parentElement?.clientWidth || 0;
      const height = canvas.clientHeight || canvas.parentElement?.clientHeight || 0;

      if (width === 0 || height === 0) {
        animFrameId = requestAnimationFrame(renderOverlay);
        return;
      }

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      ctx.clearRect(0, 0, width, height);

      const theme = THEME_COLORS[sensorMode] || THEME_COLORS.normal;
      const items: BoundingBoxItem[] = [];
      const cameraPosition = viewer.camera.position;
      const scene = viewer.scene;

      // Filter spatial entities
      const spatialEntities = entities.filter(
        e => typeof e.latitude === 'number' && typeof e.longitude === 'number'
      );

      for (const entity of spatialEntities) {
        try {
          if (
            typeof entity.latitude !== 'number' || typeof entity.longitude !== 'number' ||
            isNaN(entity.latitude) || isNaN(entity.longitude) ||
            !isFinite(entity.latitude) || !isFinite(entity.longitude)
          ) {
            continue;
          }

          const cartesian = Cesium.Cartesian3.fromDegrees(
            entity.longitude!,
            entity.latitude!,
            entity.altitude || 10
          );
          if (!cartesian) continue;

          // Check if behind globe horizon (occlusion)
          const toCamera = Cesium.Cartesian3.subtract(cameraPosition, cartesian, new Cesium.Cartesian3());
          const surfaceNormal = scene.globe?.ellipsoid?.geodeticSurfaceNormal(cartesian);
          if (!surfaceNormal) continue;

          const dot = Cesium.Cartesian3.dot(toCamera, surfaceNormal);
          if (dot < 0) continue; // Behind earth horizon

          // Project Cartesian to 2D window coordinate
          const winPos = Cesium.SceneTransforms.worldToWindowCoordinates(scene, cartesian);
          if (!winPos || isNaN(winPos.x) || isNaN(winPos.y)) continue;

          // Skip if outside viewport bounds (with margin)
          if (winPos.x < -50 || winPos.x > width + 50 || winPos.y < -50 || winPos.y > height + 50) {
            continue;
          }

        const isSelected = entity.id === selectedEntityId;
        const targetColor = isSelected ? theme.selectedGlow : theme.accent;

        // 1. Draw Tactical Corner Brackets around target anchor
        const boxSize = isSelected ? 28 : 22;
        const half = boxSize / 2;
        const arm = isSelected ? 8 : 6;

        ctx.save();
        ctx.strokeStyle = targetColor;
        ctx.lineWidth = isSelected ? 2.2 : 1.5;
        ctx.lineCap = 'round';

        // Top-left bracket
        ctx.beginPath();
        ctx.moveTo(winPos.x - half, winPos.y - half + arm);
        ctx.lineTo(winPos.x - half, winPos.y - half);
        ctx.lineTo(winPos.x - half + arm, winPos.y - half);
        ctx.stroke();

        // Top-right bracket
        ctx.beginPath();
        ctx.moveTo(winPos.x + half - arm, winPos.y - half);
        ctx.lineTo(winPos.x + half, winPos.y - half);
        ctx.lineTo(winPos.x + half, winPos.y - half + arm);
        ctx.stroke();

        // Bottom-left bracket
        ctx.beginPath();
        ctx.moveTo(winPos.x - half, winPos.y + half - arm);
        ctx.lineTo(winPos.x - half, winPos.y + half);
        ctx.lineTo(winPos.x - half + arm, winPos.y + half);
        ctx.stroke();

        // Bottom-right bracket
        ctx.beginPath();
        ctx.moveTo(winPos.x + half - arm, winPos.y + half);
        ctx.lineTo(winPos.x + half, winPos.y + half);
        ctx.lineTo(winPos.x + half, winPos.y + half - arm);
        ctx.stroke();

        // Center dot
        ctx.beginPath();
        ctx.arc(winPos.x, winPos.y, isSelected ? 3 : 2, 0, Math.PI * 2);
        ctx.fillStyle = targetColor;
        ctx.fill();

        // 2. Leader line to Callout Plate
        const plateW = 150;
        const plateH = 46;
        const plateX = winPos.x + 24;
        const plateY = winPos.y - plateH - 12;

        ctx.beginPath();
        ctx.moveTo(winPos.x + half, winPos.y - half);
        ctx.lineTo(plateX, plateY + plateH);
        ctx.strokeStyle = targetColor;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 2]);
        ctx.stroke();
        ctx.setLineDash([]);

        // 3. Floating Callout Card Plate
        ctx.fillStyle = theme.plateBg;
        ctx.beginPath();
        ctx.roundRect(plateX, plateY, plateW, plateH, 4);
        ctx.fill();

        ctx.strokeStyle = isSelected ? theme.selectedGlow : theme.border;
        ctx.lineWidth = isSelected ? 1.8 : 1;
        ctx.stroke();

        // Callout Text Readout
        ctx.font = 'bold 9.5px "JetBrains Mono", monospace';
        ctx.fillStyle = targetColor;
        const tagType = entity.sector ? entity.sector.slice(0, 12).toUpperCase() : entity.type;
        ctx.fillText(`[${tagType}] ${entity.id}`, plateX + 8, plateY + 14);

        ctx.font = '600 11px Inter, system-ui, sans-serif';
        ctx.fillStyle = theme.text;
        const truncatedName = entity.name.length > 18 ? entity.name.slice(0, 16) + '...' : entity.name;
        ctx.fillText(truncatedName, plateX + 8, plateY + 28);

        ctx.font = '500 9px "JetBrains Mono", monospace';
        const riskColor = entity.riskScore >= 70 ? '#f43f5e' : entity.riskScore >= 45 ? '#f59e0b' : '#10b981';
        ctx.fillStyle = riskColor;
        ctx.fillText(`RISK: ${entity.riskScore}`, plateX + 8, plateY + 40);

        ctx.fillStyle = entity.physicalProgress !== undefined ? '#38bdf8' : '#94a3b8';
        const progressLabel = entity.physicalProgress !== undefined
          ? `PROG: ${entity.physicalProgress}%`
          : `CONF: ${entity.confidence}%`;
        ctx.fillText(progressLabel, plateX + 74, plateY + 40);

        ctx.restore();

        items.push({
          entity,
          screenX: winPos.x,
          screenY: winPos.y,
          plateX,
          plateY,
          plateW,
          plateH
        });
        } catch {
          // Ignore individual entity projection error
        }
      }

      clickableItemsRef.current = items;
      animFrameId = requestAnimationFrame(renderOverlay);
    };

    animFrameId = requestAnimationFrame(renderOverlay);

    return () => {
      cancelAnimationFrame(animFrameId);
    };
  }, [viewer, entities, selectedEntityId, sensorMode, enabled]);

  // Handle Click Selection on Cesium Canvas while keeping overlay pointer-events-none
  useEffect(() => {
    if (!viewer || viewer.isDestroyed() || !enabled) return;

    const cesiumCanvas = viewer.canvas;
    if (!cesiumCanvas) return;

    let downPos = { x: 0, y: 0 };

    const handlePointerDown = (e: PointerEvent) => {
      downPos = { x: e.clientX, y: e.clientY };
    };

    const handleClick = (e: MouseEvent) => {
      // If user dragged to pan/rotate/tilt the globe (> 6px movement), ignore entity selection
      const dragDist = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y);
      if (dragDist > 6) return;

      const rect = cesiumCanvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      for (const item of clickableItemsRef.current) {
        // Hit test target bracket or card plate
        const inBracket = Math.abs(clickX - item.screenX) <= 16 && Math.abs(clickY - item.screenY) <= 16;
        const inPlate =
          clickX >= item.plateX &&
          clickX <= item.plateX + item.plateW &&
          clickY >= item.plateY &&
          clickY <= item.plateY + item.plateH;

        if (inBracket || inPlate) {
          onSelectEntity(item.entity);
          return;
        }
      }
    };

    cesiumCanvas.addEventListener('pointerdown', handlePointerDown);
    cesiumCanvas.addEventListener('click', handleClick);

    return () => {
      cesiumCanvas.removeEventListener('pointerdown', handlePointerDown);
      cesiumCanvas.removeEventListener('click', handleClick);
    };
  }, [viewer, enabled, onSelectEntity]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-10"
    />
  );
};
