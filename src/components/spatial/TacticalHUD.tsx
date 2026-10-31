import React from 'react';
import type { SpatialTelemetry } from '../../types/spatial';
import { resolveSector } from './sectorResolver';

interface ProjectMapHUDProps {
  telemetry: SpatialTelemetry;
  visible: boolean;
  sectorName?: string;
  isOrbiting?: boolean;
}

export const TacticalHUD: React.FC<ProjectMapHUDProps> = ({
  telemetry,
  visible,
  sectorName,
  isOrbiting = false
}) => {
  if (!visible) return null;

  const formatCoord = (val: number, pos: string, neg: string) => {
    const dir = val >= 0 ? pos : neg;
    const abs = Math.abs(val);
    const deg = Math.floor(abs);
    const min = Math.floor((abs - deg) * 60);
    const sec = ((abs - deg - min / 60) * 3600).toFixed(1);
    return `${deg}°${min}'${sec}"${dir}`;
  };

  const latFormatted = formatCoord(telemetry.latitude, 'N', 'S');
  const lonFormatted = formatCoord(telemetry.longitude, 'E', 'W');

  const altFormatted =
    telemetry.altitude > 10000
      ? `${(telemetry.altitude / 1000).toFixed(1)} KM`
      : `${Math.round(telemetry.altitude)} M`;

  const displaySector =
    sectorName ||
    (typeof telemetry?.latitude === 'number' && typeof telemetry?.longitude === 'number'
      ? resolveSector(telemetry.latitude, telemetry.longitude)
      : 'NATIONAL CAPITAL / REGIONAL SECTOR');

  return (
    <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden font-mono select-none">
      {/* Top Left: Clean Discreet Coordinate & Altitude Chip */}
      <div className="absolute top-3 left-3 sm:top-3.5 sm:left-3.5 flex items-center gap-2 bg-[#090C12]/80 border border-slate-800/80 px-2.5 py-1 rounded-lg backdrop-blur-xs text-[10px] text-slate-300 shadow-sm">
        <span className={`w-1.5 h-1.5 rounded-full ${isOrbiting ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
        <span className="font-semibold text-slate-200">{displaySector}</span>
        <span className="text-slate-600">•</span>
        <span className="text-cyan-300">{latFormatted}, {lonFormatted}</span>
        <span className="text-slate-600">•</span>
        <span className="text-slate-400">{altFormatted}</span>
        {isOrbiting && (
          <>
            <span className="text-slate-600">•</span>
            <span className="text-amber-400 font-bold">360° ORBIT</span>
          </>
        )}
      </div>
    </div>
  );
};
